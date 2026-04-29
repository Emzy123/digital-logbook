import { Response } from 'express';
import { Types } from 'mongoose';
import { AuthRequest } from '../middleware/authMiddleware';
import { CompanyRequest, CompanyRequestStatus } from '../models/CompanyRequest';
import { Establishment } from '../models/Establishment';
import { StudentProfile } from '../models/StudentProfile';
import { Notification } from '../models/Notification';
import { UserRole } from '../models/User';

export const createCompanyRequest = async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user?.userId;
    const {
      company_name,
      address,
      city,
      state,
      nature_of_business,
      contact_person,
      contact_phone,
      contact_email,
      company_website,
      company_size,
      reasoning
    } = req.body;

    // Check if student has profile
    const studentProfile = await StudentProfile.findOne({ user_id: userId });
    if (!studentProfile) {
      return res.status(404).json({ message: 'Student profile not found' });
    }

    // Check if there's already a pending request for this company
    const existingRequest = await CompanyRequest.findOne({
      student_id: studentProfile._id,
      company_name: company_name.trim(),
      status: { $in: [CompanyRequestStatus.PENDING, CompanyRequestStatus.NEEDS_INFO] }
    });

    if (existingRequest) {
      return res.status(400).json({ message: 'You already have a pending request for this company' });
    }

    const newRequest = await CompanyRequest.create({
      student_id: studentProfile._id,
      company_name: company_name.trim(),
      address,
      city,
      state,
      nature_of_business,
      contact_person,
      contact_phone,
      contact_email,
      company_website,
      company_size,
      reasoning
    });

    // Create notification for coordinators and admins
    await Notification.create({
      user_id: undefined, // System notification
      title: 'New Company Request',
      message: `New company request submitted for ${company_name}`,
      type: 'company_request',
      related_id: newRequest._id,
      is_system: true
    });

    res.status(201).json({
      message: 'Company request submitted successfully',
      request: newRequest
    });
  } catch (error) {
    console.error('createCompanyRequest error:', error);
    res.status(500).json({ message: 'Error submitting company request' });
  }
};

export const getCompanyRequests = async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user?.userId;
    const userRole = req.user?.role;
    const { status, page = 1, limit = 10 } = req.query;

    const query: any = {};
    
    if (status) {
      query.status = status;
    }

    // Students can only see their own requests
    if (userRole === UserRole.STUDENT) {
      const studentProfile = await StudentProfile.findOne({ user_id: userId });
      if (!studentProfile) {
        return res.status(404).json({ message: 'Student profile not found' });
      }
      query.student_id = studentProfile._id;
    }

    const skip = (Number(page) - 1) * Number(limit);
    
    const requests = await CompanyRequest.find(query)
      .populate('student_id', 'matriculation_number')
      .populate('reviewed_by', 'first_name last_name email')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(Number(limit));

    const total = await CompanyRequest.countDocuments(query);

    res.status(200).json({
      requests,
      pagination: {
        page: Number(page),
        limit: Number(limit),
        total,
        pages: Math.ceil(total / Number(limit))
      }
    });
  } catch (error) {
    console.error('getCompanyRequests error:', error);
    res.status(500).json({ message: 'Error retrieving company requests' });
  }
};

export const reviewCompanyRequest = async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user?.userId;
    const { id } = req.params;
    const { status, rejection_reason, admin_notes } = req.body;

    if (!Object.values(CompanyRequestStatus).includes(status)) {
      return res.status(400).json({ message: 'Invalid status' });
    }

    const request = await CompanyRequest.findById(id)
      .populate('student_id', 'user_id matriculation_number');

    if (!request) {
      return res.status(404).json({ message: 'Company request not found' });
    }

    // Update request
    request.status = status;
    request.reviewed_by = new Types.ObjectId(userId);
    request.reviewed_at = new Date();
    
    if (status === CompanyRequestStatus.REJECTED && rejection_reason) {
      request.rejection_reason = rejection_reason;
    }
    
    if (admin_notes) {
      request.admin_notes = admin_notes;
    }

    await request.save();

    // If approved, create establishment
    if (status === CompanyRequestStatus.APPROVED) {
      const existingEstablishment = await Establishment.findOne({ 
        name: request.company_name,
        address: request.address 
      });

      if (!existingEstablishment) {
        await Establishment.create({
          name: request.company_name,
          address: request.address,
          city: request.city,
          state: request.state,
          nature_of_business: request.nature_of_business,
          contact_person: request.contact_person,
          contact_phone: request.contact_phone,
          contact_email: request.contact_email,
          is_active: true
        });
      }

      // Update student profile with the new establishment
      const newEstablishment = await Establishment.findOne({ name: request.company_name });
      if (newEstablishment && request.student_id) {
        await StudentProfile.findByIdAndUpdate(
          request.student_id._id,
          { establishment_id: newEstablishment._id }
        );
      }
    }

    // Create notification for student
    if (request.student_id && 'user_id' in request.student_id) {
      await Notification.create({
        user_id: (request.student_id as any).user_id,
        title: `Company Request ${status.charAt(0).toUpperCase() + status.slice(1)}`,
        message: `Your request for ${request.company_name} has been ${status}`,
        type: 'company_request_update',
        related_id: request._id
      });
    }

    res.status(200).json({
      message: `Company request ${status} successfully`,
      request
    });
  } catch (error) {
    console.error('reviewCompanyRequest error:', error);
    res.status(500).json({ message: 'Error reviewing company request' });
  }
};

export const getCompanyRequestById = async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user?.userId;
    const userRole = req.user?.role;
    const { id } = req.params;

    const request = await CompanyRequest.findById(id)
      .populate('student_id', 'matriculation_number user_id')
      .populate('reviewed_by', 'first_name last_name email');

    if (!request) {
      return res.status(404).json({ message: 'Company request not found' });
    }

    // Students can only see their own requests
    if (userRole === UserRole.STUDENT) {
      const studentProfile = await StudentProfile.findOne({ user_id: userId });
      if (!studentProfile || request.student_id._id.toString() !== studentProfile._id.toString()) {
        return res.status(403).json({ message: 'Access denied' });
      }
    }

    res.status(200).json(request);
  } catch (error) {
    console.error('getCompanyRequestById error:', error);
    res.status(500).json({ message: 'Error retrieving company request' });
  }
};

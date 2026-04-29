import { Request, Response } from 'express';
import { Establishment } from '../models/Establishment';
import { AuthRequest } from '../middleware/authMiddleware';

export const getEstablishments = async (req: AuthRequest, res: Response) => {
  try {
    const establishments = await Establishment.find({ is_active: true }).sort({ name: 1 });
    res.status(200).json(establishments);
  } catch (error) {
    console.error('getEstablishments error:', error);
    res.status(500).json({ message: 'Error retrieving establishments' });
  }
};

export const createEstablishment = async (req: AuthRequest, res: Response) => {
  try {
    const { name, address, city, state, nature_of_business, contact_person, contact_phone, contact_email } = req.body;

    if (!name) {
      return res.status(400).json({ message: 'Establishment name is required' });
    }

    const newEstablishment = await Establishment.create({
      name, address, city, state, nature_of_business, contact_person, contact_phone, contact_email
    });

    res.status(201).json({ message: 'Establishment created successfully', establishment: newEstablishment });
  } catch (error) {
    console.error('createEstablishment error:', error);
    res.status(500).json({ message: 'Error creating establishment' });
  }
};

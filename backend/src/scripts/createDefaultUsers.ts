import dotenv from 'dotenv';
dotenv.config();

import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';
import { User, UserRole } from '../models/User';
import { StudentProfile } from '../models/StudentProfile';
import { Establishment } from '../models/Establishment';
import { SupervisorAssignment } from '../models/SupervisorAssignment';

// Default user credentials for testing
const defaultUsers = [
  // ITF Administrator
  {
    email: 'itf-admin@siwes.gov.ng',
    password: 'Itf@2024!',
    first_name: 'Ahmed',
    last_name: 'Ibrahim',
    role: UserRole.ITF_ADMIN,
    phone: '+2348000000001'
  },
  // System Administrator
  {
    email: 'sysadmin@siwes.gov.ng',
    password: 'Admin@2024!',
    first_name: 'Sarah',
    last_name: 'Johnson',
    role: UserRole.SYSTEM_ADMIN,
    phone: '+2348000000002'
  },
  // Coordinator
  {
    email: 'coordinator@university.edu.ng',
    password: 'Coord@2024!',
    first_name: 'Dr. Michael',
    last_name: 'Okafor',
    role: UserRole.COORDINATOR,
    phone: '+2348000000003'
  },
  // Industry Supervisors
  {
    email: 'industry.supervisor1@company.com',
    password: 'Industry@2024!',
    first_name: 'James',
    last_name: 'Williams',
    role: UserRole.INDUSTRY_SUPERVISOR,
    phone: '+2348000000004'
  },
  {
    email: 'industry.supervisor2@techcorp.com',
    password: 'Industry@2024!',
    first_name: 'Fatima',
    last_name: 'Aliyu',
    role: UserRole.INDUSTRY_SUPERVISOR,
    phone: '+2348000000005'
  },
  // School Supervisors
  {
    email: 'school.supervisor1@university.edu.ng',
    password: 'School@2024!',
    first_name: 'Prof. Grace',
    last_name: 'Obi',
    role: UserRole.SCHOOL_SUPERVISOR,
    phone: '+2348000000006'
  },
  {
    email: 'school.supervisor2@university.edu.ng',
    password: 'School@2024!',
    first_name: 'Dr. Samuel',
    last_name: 'Adebayo',
    role: UserRole.SCHOOL_SUPERVISOR,
    phone: '+2348000000007'
  },
  // Students
  {
    email: 'student1@university.edu.ng',
    password: 'Student@2024!',
    first_name: 'John',
    last_name: 'Doe',
    role: UserRole.STUDENT,
    phone: '+2348000000008',
    matriculation_number: '2024001'
  },
  {
    email: 'student2@university.edu.ng',
    password: 'Student@2024!',
    first_name: 'Mary',
    last_name: 'Smith',
    role: UserRole.STUDENT,
    phone: '+2348000000009',
    matriculation_number: '2024002'
  },
  {
    email: 'student3@university.edu.ng',
    password: 'Student@2024!',
    first_name: 'David',
    last_name: 'Wilson',
    role: UserRole.STUDENT,
    phone: '+2348000000010',
    matriculation_number: '2024003'
  }
];

// Default establishments for testing
const defaultEstablishments = [
  {
    name: 'TechCorp Nigeria Limited',
    address: '123 Tech Avenue, Victoria Island, Lagos',
    city: 'Lagos',
    state: 'Lagos',
    nature_of_business: 'Information Technology',
    contact_person: 'James Williams',
    contact_phone: '+2348000000004',
    contact_email: 'info@techcorp.com',
    company_website: 'https://techcorp.com.ng',
    company_size: '500-1000',
    is_active: true
  },
  {
    name: 'Global Engineering Solutions',
    address: '456 Industrial Road, Ikeja, Lagos',
    city: 'Lagos',
    state: 'Lagos',
    nature_of_business: 'Engineering Services',
    contact_person: 'Fatima Aliyu',
    contact_phone: '+2348000000005',
    contact_email: 'contact@globaleng.com',
    company_website: 'https://globaleng.com.ng',
    company_size: '100-500',
    is_active: true
  },
  {
    name: 'Digital Innovations Hub',
    address: '789 Innovation Street, Lekki, Lagos',
    city: 'Lagos',
    state: 'Lagos',
    nature_of_business: 'Software Development',
    contact_person: 'HR Department',
    contact_phone: '+2348000000011',
    contact_email: 'hr@digitalhub.ng',
    company_website: 'https://digitalhub.ng',
    company_size: '50-100',
    is_active: true
  }
];

async function createDefaultUsers() {
  try {
    // Connect to MongoDB
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/siwes');
    console.log('Connected to MongoDB');

    // Clear existing users (optional - remove if you want to keep existing data)
    console.log('Clearing existing test users...');
    await User.deleteMany({ email: { $in: defaultUsers.map(u => u.email) } });
    await StudentProfile.deleteMany({});

    // Create establishments
    console.log('Creating default establishments...');
    const createdEstablishments = [];
    for (const establishment of defaultEstablishments) {
      const existing = await Establishment.findOne({ name: establishment.name });
      if (!existing) {
        const created = await Establishment.create(establishment);
        createdEstablishments.push(created);
        console.log(`✅ Created establishment: ${establishment.name}`);
      } else {
        createdEstablishments.push(existing);
        console.log(`ℹ️  Establishment already exists: ${establishment.name}`);
      }
    }

    // Create users
    console.log('Creating default users...');
    const createdUsers = [];
    for (const userData of defaultUsers) {
      const hashedPassword = await bcrypt.hash(userData.password, 10);
      
      const user = new User({
        email: userData.email,
        password_hash: hashedPassword,
        role: userData.role,
        first_name: userData.first_name,
        last_name: userData.last_name,
        phone: userData.phone,
        is_active: true,
        email_verified: true
      });

      const created = await user.save();
      createdUsers.push(created);
      console.log(`✅ Created user: ${userData.email} (${userData.role})`);
    }

    // Create student profiles and assignments
    console.log('Creating student profiles and assignments...');
    const students = createdUsers.filter(u => u.role === UserRole.STUDENT);
    const industrySupervisors = createdUsers.filter(u => u.role === UserRole.INDUSTRY_SUPERVISOR);
    const schoolSupervisors = createdUsers.filter(u => u.role === UserRole.SCHOOL_SUPERVISOR);

    for (let i = 0; i < students.length; i++) {
      const student = students[i];
      const studentData = defaultUsers.find(u => u.email === student.email);
      
      // Create student profile
      const studentProfile = new StudentProfile({
        user_id: student._id,
        matriculation_number: studentData!.matriculation_number,
        program_level: 'Undergraduate',
        department: 'Computer Science',
        start_date: new Date('2024-01-15'),
        end_date: new Date('2024-12-15'),
        establishment_id: createdEstablishments[i % createdEstablishments.length]._id,
        is_active: true
      });

      await studentProfile.save();
      console.log(`✅ Created student profile for: ${student.email}`);

      // Create supervisor assignment
      const assignment = new SupervisorAssignment({
        student_id: studentProfile._id,
        industry_supervisor_id: industrySupervisors[i % industrySupervisors.length]._id,
        school_supervisor_id: schoolSupervisors[i % schoolSupervisors.length]._id,
        is_active: true,
        assigned_date: new Date()
      });

      await assignment.save();
      console.log(`✅ Created supervisor assignment for: ${student.email}`);
    }

    console.log('\n🎉 Default users created successfully!');
    console.log('\n📋 Login Credentials:');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    
    defaultUsers.forEach(user => {
      console.log(`📧 ${user.email}`);
      console.log(`🔑 Password: ${user.password}`);
      console.log(`👤 Role: ${user.role}`);
      console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    });

    console.log('\n🏢 Establishments Created:');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    
    defaultEstablishments.forEach(establishment => {
      console.log(`🏢 ${establishment.name}`);
      console.log(`📍 ${establishment.address}, ${establishment.city}, ${establishment.state}`);
      console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    });

    console.log('\n📝 Quick Test Instructions:');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('1. 🎓 Students: Log in and create log entries, submit for approval');
    console.log('2. 👨‍💼 Industry Supervisors: Review and approve student log entries');
    console.log('3. 👩‍🏫 School Supervisors: Monitor student progress and conduct virtual visits');
    console.log('4. 📊 Coordinators: Manage assignments and generate reports');
    console.log('5. 🛡️  ITF/Admins: Access system analytics and oversight');
    console.log('6. 📈 Test assessment workflows and digital record keeping');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');

  } catch (error) {
    console.error('❌ Error creating default users:', error);
  } finally {
    await mongoose.disconnect();
    console.log('Disconnected from MongoDB');
  }
}

// Run the script
if (require.main === module) {
  createDefaultUsers();
}

export default createDefaultUsers;

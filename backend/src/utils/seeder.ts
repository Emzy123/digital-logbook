import { User, UserRole } from '../models/User';
import bcrypt from 'bcrypt';

export const seedDefaultUsers = async () => {
  try {
    const adminExists = await User.findOne({ email: 'admin@siwes.local' });
    if (!adminExists) {
      const password_hash = await bcrypt.hash('admin123', 12);
      await User.create({
        email: 'admin@siwes.local',
        password_hash,
        role: UserRole.SYSTEM_ADMIN,
        first_name: 'System',
        last_name: 'Admin',
        is_active: true,
      });
      console.log('Seeded default admin (admin@siwes.local / admin123)');
    }

    const studentExists = await User.findOne({ email: 'student@siwes.local' });
    if (!studentExists) {
      const password_hash = await bcrypt.hash('student123', 12);
      await User.create({
        email: 'student@siwes.local',
        password_hash,
        role: UserRole.STUDENT,
        first_name: 'Demo',
        last_name: 'Student',
        is_active: true,
      });
      console.log('Seeded default student (student@siwes.local / student123)');
    }

    const supervisorExists = await User.findOne({ email: 'supervisor@siwes.local' });
    if (!supervisorExists) {
      const password_hash = await bcrypt.hash('supervisor123', 12);
      await User.create({
        email: 'supervisor@siwes.local',
        password_hash,
        role: UserRole.INDUSTRY_SUPERVISOR,
        first_name: 'Demo',
        last_name: 'Supervisor',
        is_active: true,
      });
      console.log('Seeded default supervisor (supervisor@siwes.local / supervisor123)');
    }
  } catch (error) {
    console.error('Error seeding default users:', error);
  }
};

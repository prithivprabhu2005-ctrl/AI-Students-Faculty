const User = require('../models/User');

const seedDefaultAdmin = async () => {
  try {
    const existingAdmin = await User.findOne({ role: 'admin' });

    if (existingAdmin) {
      console.log('Admin account already exists.');
      return existingAdmin;
    }

    const existingEmail = await User.findOne({ email: 'admin@college.com' });

    if (existingEmail) {
      console.log('Default admin email is already in use. Skipping admin seeding.');
      return null;
    }

    const adminUser = await User.create({
      name: 'Admin User',
      email: 'admin@college.com',
      password: 'Admin@123',
      role: 'admin',
      isActive: true
    });

    console.log('Default admin account created successfully.');
    return adminUser;
  } catch (error) {
    console.error('Error seeding default admin:', error);
    throw error;
  }
};

module.exports = seedDefaultAdmin;

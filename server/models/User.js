const mongoose = require('mongoose');
const bcrypt = require('bcrypt');

const departments = ['CSE', 'ECE', 'EEE', 'MECH', 'CIVIL', 'IT', 'AI&DS'];

const userSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true
    },
    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true
    },
    password: {
      type: String,
      required: true,
      minlength: 6,
      select: false
    },
    role: {
      type: String,
      required: true,
      enum: ['admin', 'student']
    },
    department: {
      type: String,
      enum: departments,
      default: undefined
    },
    phone: {
      type: String,
      trim: true,
      default: ''
    },
    registerNumber: {
      type: String,
      unique: true,
      sparse: true,
      uppercase: true,
      trim: true,
      default: undefined
    },
    staffId: {
      type: String,
      unique: true,
      sparse: true,
      uppercase: true,
      trim: true,
      default: undefined
    },
    isActive: {
      type: Boolean,
      default: true
    },
    status: {
      type: String,
      enum: ['pending', 'active', 'inactive', 'rejected'],
      default: 'active'
    },
    resetPasswordToken: {
      type: String,
      default: null
    },
    resetPasswordExpires: {
      type: Date,
      default: null
    }
  },
  {
    timestamps: true
  }
);

userSchema.pre('save', async function(next) {
  try {
    if (!this.isModified('password')) {
      return next();
    }

    const salt = await bcrypt.genSalt(10);
    this.password = await bcrypt.hash(this.password, salt);
    next();
  } catch (error) {
    next(error);
  }
});

userSchema.methods.comparePassword = function(candidatePassword) {
  return bcrypt.compare(candidatePassword, this.password);
};

const User = mongoose.model('User', userSchema);

module.exports = User;

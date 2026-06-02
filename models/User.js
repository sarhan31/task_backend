import mongoose from 'mongoose';
import bcryptjs from 'bcryptjs';

const userSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, 'Name is required']
    },
    email: {
      type: String,
      required: [true, 'Email is required'],
      unique: true,
      lowercase: true,
      trim: true,
      match: [/\S+@\S+\.\S+/, 'Please use a valid email address']
    },
    password: {
      type: String,
      required: [true, 'Password is required']
    },
    role: {
      type: String,
      enum: ['user', 'admin', 'premium', 'ultra', 'developer', 'designer'],
      default: 'user'
    },
    status: {
      type: String,
      enum: ['active', 'inactive', 'fired'],
      default: 'active'
    },
    firedReason: {
      type: String,
      default: ''
    },
    firedAt: {
      type: Date
    },
    firedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    rehiredAt: {
      type: Date
    },
    rehiredBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    rehireMessage: {
      type: String,
      default: ''
    }
  },
  {
    timestamps: true
  }
);

// Method to compare candidate password with stored hash
userSchema.methods.matchPassword = async function (enteredPassword) {
  return await bcryptjs.compare(enteredPassword, this.password);
};

// Pre-save hook to hash password before writing
userSchema.pre('save', async function (next) {
  if (!this.isModified('password')) {
    next();
    return;
  }

  const salt = await bcryptjs.genSalt(10);
  this.password = await bcryptjs.hash(this.password, salt);
  next();
});

const User = mongoose.model('User', userSchema);

export default User;

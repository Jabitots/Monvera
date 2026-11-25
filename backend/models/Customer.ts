import mongoose, { Document, Model, Schema } from 'mongoose';

export interface ICustomer extends Document {
  fullName: string;
  email: string;
  contactNumber: string;
  address: string;
  isArchived: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const customerSchema = new Schema<ICustomer>(
  {
    fullName: {
      type: String,
      required: [true, 'Full name is required'],
      trim: true,
      minlength: [2, 'Full name must be at least 2 characters'],
      maxlength: [120, 'Full name cannot exceed 120 characters'],
    },
    email: {
      type: String,
      required: [true, 'Email address is required'],
      trim: true,
      lowercase: true,
      unique: true,
      match: [
        /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
        'Please provide a valid email address',
      ],
    },
    contactNumber: {
      type: String,
      required: [true, 'Contact number is required'],
      trim: true,
      minlength: [5, 'Contact number must be at least 5 characters'],
      maxlength: [32, 'Contact number cannot exceed 32 characters'],
    },
    address: {
      type: String,
      required: [true, 'Complete address is required'],
      trim: true,
      minlength: [5, 'Address must be at least 5 characters'],
      maxlength: [300, 'Address cannot exceed 300 characters'],
    },
    isArchived: {
      type: Boolean,
      default: false,
    },
  },
  {
    timestamps: true,
  }
);

customerSchema.index({ fullName: 1 });
customerSchema.index({ isArchived: 1, createdAt: -1 });

export const Customer: Model<ICustomer> =
  (mongoose.models.Customer as Model<ICustomer>) ||
  mongoose.model<ICustomer>('Customer', customerSchema);

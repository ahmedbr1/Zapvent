// Vendors need to be verified
import mongoose, { Document, Schema } from "mongoose";

export interface IVendor extends Document {
  firstName: string;
  lastName: string;
  email: string;
  isVerified: boolean;
  password: string;
}
const vendorSchema = new Schema<IVendor>(
  {
    firstName: { type: String, required: true },
    lastName: { type: String, required: true },
    email: { type: String, required: true, unique: true },
    isVerified: { type: Boolean, default: false },
    password: { type: String, required: true },
  },
  { timestamps: true }
);
const vendorModel =
  mongoose.models.User || mongoose.model<IVendor>("User", vendorSchema);

export default vendorModel;

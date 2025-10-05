// Vendors need to be verified
import mongoose, { Schema } from "mongoose";
import { IBaseModel } from "./BaseModel";

export interface IVendor extends IBaseModel {
  email: string;
  isVerified: boolean;
  password: string;
  companyName: string;
  // docuements: string[];
  logo: URL;
  taxCard: URL;
  requests?: string[];
}
const vendorSchema = new Schema<IVendor>(
  {
    email: { type: String, required: true, unique: true },
    isVerified: { type: Boolean, default: false },
    password: { type: String, required: true },
    companyName: { type: String, required: true },
    // docuements: [{ type: String }],
    logo: { type: URL, required: true },
    taxCard: { type: URL, required: true },
    requests: [{ type: String }],
  },
  { timestamps: true }
);
const vendorModel =
  mongoose.models.User || mongoose.model<IVendor>("User", vendorSchema);

export default vendorModel;

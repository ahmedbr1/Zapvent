// Vendors need to be verified
import mongoose, { Schema } from "mongoose";
import { IBaseModel } from "./BaseModel";
import bcrypt from "bcrypt";

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
vendorSchema.pre("save", async function (next) {
  if (!this.isModified("password")) return next();
  try {
    const salt = await bcrypt.genSalt(10);
    this.password = await bcrypt.hash(this.password, salt);
    next();
  } catch (err) {
    next(err as Error);
  }
});

const vendorModel =
  mongoose.models.Vendor || mongoose.model<IVendor>("Vendor", vendorSchema);

export default vendorModel;

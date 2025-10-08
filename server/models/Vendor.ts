// Vendors need to be verified
import mongoose, { Schema } from "mongoose";
import { IBaseModel } from "./BaseModel";
import bcrypt from "bcrypt";

export enum VendorStatus {
  PENDING = "pending",
  APPROVED = "approved",
  REJECTED = "rejected",
}

export interface IVendor extends IBaseModel {
  email: string;
  isVerified?: boolean;
  password: string;
  companyName: string;
  documents?: string;
  logo?: string;
  taxCard?: string;
  requests?: string[];
  status?: VendorStatus;
  // bazaar type ?
  boothSize?: number;
  boothLocation?: string;
  boothStartTime?: Date;
  boothEndTime?: Date;
  namesOfMembers?: string; // A URL to a document containing the names of members
  loyaltyForum: string; // URL containing the forum link
}
const vendorSchema = new Schema<IVendor>(
  {
    email: { type: String, required: true, unique: true },
    isVerified: { type: Boolean, default: false },
    password: { type: String, select: false },
    companyName: { type: String, required: true },
    documents: { type: String },
    logo: { type: String },
    taxCard: { type: String},
    requests: [{ type: String }],
    status: {
      type: String,
      enum: Object.values(VendorStatus),
      default: VendorStatus.PENDING,
    },
    boothSize: { type: Number },
    boothLocation: { type: String },
    boothStartTime: { type: Date },
    boothEndTime: { type: Date },
    namesOfMembers: { type: String }, // URL
    loyaltyForum: { type: String}, // URL
  },
  { timestamps: true }
);
vendorSchema.pre("save", async function (next) {
  if (!this.isModified("password")) return next();
  try {
    const saltRounds = Number(process.env.ENCRYPTION_SALT_ROUNDS) || 10;
    const salt = await bcrypt.genSalt(saltRounds);
    this.password = await bcrypt.hash(this.password, salt);
    next();
  } catch (err) {
    next(err as Error);
  }
});

const vendorModel =
  mongoose.models.Vendor || mongoose.model<IVendor>("Vendor", vendorSchema);

export default vendorModel;

// Vendors need to be verified
import mongoose, { Schema, Types } from "mongoose";
import { IBaseModel } from "./BaseModel";
import bcrypt from "bcrypt";
import { BazaarBoothSize } from "./Event";

export enum VendorStatus {
  PENDING = "pending",
  APPROVED = "approved",
  REJECTED = "rejected",
}

export interface BoothInfo {
  boothLocation?: string;
  boothStartTime?: Date;
  boothEndTime?: Date;
}

export interface BazaarApplication {
  eventId: Types.ObjectId;
  status: VendorStatus;
  applicationDate?: Date;
  attendees: {
    name: string;
    email: string;
  }[];
  boothSize: BazaarBoothSize;
  boothInfo?: BoothInfo; // Only filled after approval
}

export interface IVendor extends IBaseModel {
  email: string;
  password: string;
  companyName: string;
  documents?: string;
  logo?: string;
  taxCard?: string;
  verified: boolean; // Vendor account verification status
  verificationStatus: VendorStatus; // Pending, Approved, Rejected
  applications?: BazaarApplication[];
  loyaltyForum?: string; // URL containing the forum link
  isVerified?: boolean;
}
const vendorSchema = new Schema<IVendor>(
  {
    email: { type: String, required: true, unique: true },
    password: { type: String, select: false, required: true },
    companyName: { type: String, required: true },
    documents: { type: String },
    logo: { type: String },
    taxCard: { type: String },
    verified: { type: Boolean, default: false },
    verificationStatus: {
      type: String,
      enum: Object.values(VendorStatus),
      default: VendorStatus.PENDING,
    },
    applications: {
      type: [
        {
          eventId: {
            type: Schema.Types.ObjectId,
            ref: "Event",
            required: true,
          },
          status: {
            type: String,
            enum: Object.values(VendorStatus),
            required: true,
            default: VendorStatus.PENDING,
          },
          applicationDate: { type: Date, required: true, default: Date.now },
          attendees: {
            type: [
              {
                name: { type: String, required: true, trim: true },
                email: {
                  type: String,
                  required: true,
                  trim: true,
                  lowercase: true,
                  match: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
                },
              },
            ],
            validate: {
              validator: (arr: unknown[]) =>
                Array.isArray(arr) && arr.length > 0 && arr.length <= 5,
              message: "Attendees must include 1 to 5 entries.",
            },
          },
          boothSize: {
            type: String,
            enum: Object.values(BazaarBoothSize),
            required: true,
          },
          boothInfo: {
            boothLocation: { type: String },
            boothStartTime: { type: Date },
            boothEndTime: { type: Date },
          },
        },
      ],
      default: [],
    },
    loyaltyForum: { type: String }, // URL
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

// Vendors need to be verified
import mongoose, {
  Schema,
  StringExpressionOperatorReturningArray,
} from "mongoose";
import { IBaseModel } from "./BaseModel";
import bcrypt from "bcrypt";

export enum VendorStatus {
  PENDING = "pending",
  APPROVED = "approved",
  REJECTED = "rejected",
}

export interface BoothInfo {
  boothSize?: number;
  boothLocation?: string;
  boothStartTime?: Date;
  boothEndTime?: Date;
  namesOfMembers?: string;
}

export interface BazaarApplication {
  eventId: string;
  status: VendorStatus;
  applicationDate: Date;
  attendees: {
    name: string;
    email: string;
  }[];
  boothSize: number;
  boothInfo?: BoothInfo; // Only filled after approval
}

export interface IVendor extends IBaseModel {
  email: string;
  isVerified: boolean;
  password: string;
  companyName: string;
  documents: string;
  logo: string;
  taxCard: string;
  applications?: BazaarApplication[];
  loyaltyForum: string; // URL containing the forum link
}
const vendorSchema = new Schema<IVendor>(
  {
    email: { type: String, required: true, unique: true },
    isVerified: { type: Boolean, default: false },
    password: { type: String, required: true, select: false },
    companyName: { type: String, required: true },
    documents: { type: String, required: true },
    logo: { type: String, required: true },
    taxCard: { type: String, required: true },
    applications: [
      {
        eventId: { type: Schema.Types.ObjectId, ref: "Event", required: true },
        status: {
          type: String,
          enum: Object.values(VendorStatus),
          required: true,
        },
        applicationDate: { type: Date, required: true },
        attendees: [
          {
            name: { type: String, required: true },
            email: { type: String, required: true },
          },
        ],
        boothSize: { type: Number, required: true },
        boothInfo: {
          boothSize: { type: Number },
          namesOfMembers: { type: String },
          boothLocation: { type: String },
          boothStartTime: { type: Date },
          boothEndTime: { type: Date },
        },
      },
    ],
    loyaltyForum: { type: String, required: true }, // URL
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

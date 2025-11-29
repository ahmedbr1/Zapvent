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
  boothDurationWeeks?: number;
}

export interface VendorAttendee {
  name: string;
  email: string;
  idDocumentPath?: string;
}

export type LoyaltyProgramStatus = "active" | "cancelled";

export interface LoyaltyProgramDetails {
  discountRate: number;
  promoCode: string;
  termsAndConditions: string;
  status: LoyaltyProgramStatus;
  appliedAt?: Date;
  cancelledAt?: Date;
}

export type PaymentStatus = "pending" | "paid" | "overdue";

export interface ApplicationPayment {
  amount: number;
  currency: string;
  status: PaymentStatus;
  dueDate: Date;
  paidAt?: Date;
  receiptNumber?: string;
  transactionReference?: string;
}

export interface VisitorQrCode {
  visitorEmail: string;
  qrCodeUrl: string;
  issuedAt: Date;
}

export interface BazaarApplication {
  eventId: Types.ObjectId;
  status: VendorStatus;
  applicationDate?: Date;
  attendees: VendorAttendee[];
  boothSize: BazaarBoothSize;
  hasPaid?: boolean;
  boothInfo?: BoothInfo; // Only filled after approval
  payment?: ApplicationPayment;
  decisionDate?: Date;
  qrCodes?: VisitorQrCode[];
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
  loyaltyProgram?: LoyaltyProgramDetails;
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
                idDocumentPath: { type: String },
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
          hasPaid: {
            type: Boolean,
            default: false,
          },
          boothInfo: {
            boothLocation: { type: String },
            boothStartTime: { type: Date },
            boothEndTime: { type: Date },
            boothDurationWeeks: { type: Number, min: 1, max: 4 },
          },
          payment: {
            amount: { type: Number },
            currency: { type: String, default: "EGP" },
            status: {
              type: String,
              enum: ["pending", "paid", "overdue"],
            },
            dueDate: { type: Date },
            paidAt: { type: Date },
            receiptNumber: { type: String },
            transactionReference: { type: String },
          },
          decisionDate: { type: Date },
          qrCodes: {
            type: [
              {
                visitorEmail: { type: String, required: true },
                qrCodeUrl: { type: String, required: true },
                issuedAt: { type: Date, required: true },
              },
            ],
            default: [],
          },
        },
      ],
      default: [],
    },
    loyaltyForum: { type: String }, // URL
    loyaltyProgram: {
      discountRate: { type: Number, min: 1, max: 100 },
      promoCode: { type: String, trim: true },
      termsAndConditions: { type: String },
      status: {
        type: String,
        enum: ["active", "cancelled"],
        default: "active",
      },
      appliedAt: { type: Date },
      cancelledAt: { type: Date },
    },
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

vendorSchema.index({ "loyaltyProgram.status": 1 });

const vendorModel =
  mongoose.models.Vendor || mongoose.model<IVendor>("Vendor", vendorSchema);

export default vendorModel;

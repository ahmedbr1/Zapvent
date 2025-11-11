import mongoose, { Schema, Types } from "mongoose";
import { IBaseModel } from "./BaseModel";

export type PaymentMethod = "Wallet" | "CreditCard" | "DebitCard" | "Mixed";
export type PaymentStatus = "Paid" | "Refunded";

export interface IUserPayment extends IBaseModel {
  userId: Types.ObjectId;
  eventId: Types.ObjectId;
  amount: number;
  currency: string;
  method: PaymentMethod;
  walletPortion: number;
  cardPortion: number;
  cardType?: "CreditCard" | "DebitCard";
  cardLast4?: string;
  status: PaymentStatus;
  receiptNumber: string;
  paidAt: Date;
  transactionReference?: string;
  refundAmount?: number;
  refundedAt?: Date;
  refundReference?: string;
}

const UserPaymentSchema = new Schema<IUserPayment>(
  {
    userId: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    eventId: {
      type: Schema.Types.ObjectId,
      ref: "Event",
      required: true,
      index: true,
    },
    amount: { type: Number, required: true },
    currency: { type: String, default: "EGP" },
    method: {
      type: String,
      enum: ["Wallet", "CreditCard", "DebitCard", "Mixed"],
      default: "Wallet",
    },
    walletPortion: { type: Number, default: 0 },
    cardPortion: { type: Number, default: 0 },
    cardType: {
      type: String,
      enum: ["CreditCard", "DebitCard"],
    },
    cardLast4: { type: String },
    status: {
      type: String,
      enum: ["Paid", "Refunded"],
      default: "Paid",
      index: true,
    },
    receiptNumber: { type: String, required: true },
    paidAt: { type: Date, default: Date.now },
    transactionReference: { type: String },
    refundAmount: { type: Number },
    refundedAt: { type: Date },
    refundReference: { type: String },
  },
  { timestamps: true }
);

UserPaymentSchema.index({ userId: 1, eventId: 1, status: 1 }, { unique: false });
UserPaymentSchema.index({ receiptNumber: 1 }, { unique: true });

const UserPaymentModel =
  mongoose.models.UserPayment ||
  mongoose.model<IUserPayment>("UserPayment", UserPaymentSchema);

export default UserPaymentModel;

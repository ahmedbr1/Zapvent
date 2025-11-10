import mongoose, { Schema, Types } from "mongoose";
import { IBaseModel } from "./BaseModel";

export interface IEmailVerificationToken extends IBaseModel {
  user: Types.ObjectId;
  token: string;
  expiresAt: Date;
}

const EmailVerificationTokenSchema = new Schema<IEmailVerificationToken>(
  {
    user: { type: Schema.Types.ObjectId, ref: "User", required: true, unique: true },
    token: { type: String, required: true, unique: true },
    expiresAt: { type: Date, required: true },
  },
  { timestamps: true }
);

EmailVerificationTokenSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

const EmailVerificationTokenModel =
  mongoose.models.EmailVerificationToken ||
  mongoose.model<IEmailVerificationToken>("EmailVerificationToken", EmailVerificationTokenSchema);

export default EmailVerificationTokenModel;

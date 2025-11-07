import crypto from "crypto";
import { Types } from "mongoose";
import EmailVerificationTokenModel from "../models/EmailVerificationToken";
import UserModel, { IUser } from "../models/User";
import { emailService } from "./emailService";

const frontendUrl = process.env.FRONTEND_URL || "http://localhost:3000";
const backendUrl =
  process.env.BACKEND_URL ||
  process.env.API_BASE_URL ||
  `http://localhost:${process.env.PORT ?? 4000}`;

const tokenTtlHours = Number(process.env.EMAIL_VERIFICATION_TOKEN_TTL_HOURS || 24);
const tokenTtlMs = tokenTtlHours * 60 * 60 * 1000;

function buildVerificationUrl(token: string) {
  const normalizedBackend = backendUrl.replace(/\/$/, "");
  const url = new URL(`${normalizedBackend}/api/auth/verify-email`);
  url.searchParams.set("token", token);
  return url.toString();
}

export async function issueStudentVerification(user: IUser & { _id: Types.ObjectId }) {
  const token = crypto.randomBytes(32).toString("hex");
  const expiresAt = new Date(Date.now() + tokenTtlMs);

  await EmailVerificationTokenModel.findOneAndUpdate(
    { user: user._id },
    { user: user._id, token, expiresAt },
    { upsert: true, new: true, setDefaultsOnInsert: true }
  );

  await emailService.sendStudentVerificationEmail({
    user,
    verificationUrl: buildVerificationUrl(token),
    loginUrl: `${frontendUrl.replace(/\/$/, "")}/login/user`,
    expiresAt,
  });
}

type VerificationResult =
  | { success: true; userId: string }
  | { success: false; reason: "missing-token" | "invalid-token" | "expired" };

export async function verifyEmailByToken(token?: string | null): Promise<VerificationResult> {
  if (!token || typeof token !== "string" || token.trim().length === 0) {
    return { success: false, reason: "missing-token" };
  }

  const record = await EmailVerificationTokenModel.findOne({ token }).lean<{
    _id: Types.ObjectId;
    user: Types.ObjectId;
    expiresAt: Date;
  } | null>();

  if (!record) {
    return { success: false, reason: "invalid-token" };
  }

  if (record.expiresAt.getTime() < Date.now()) {
    await EmailVerificationTokenModel.deleteOne({ _id: record._id });
    return { success: false, reason: "expired" };
  }

  await Promise.all([
    UserModel.findByIdAndUpdate(record.user, { verified: true }, { new: true }),
    EmailVerificationTokenModel.deleteOne({ _id: record._id }),
  ]);

  return { success: true, userId: record.user.toString() };
}

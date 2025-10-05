import mongoose, { Schema } from "mongoose";
import { IBaseModel } from "./BaseModel";

export enum userRole {
  STUDENT = "Student",
  STAFF = "Staff",
  PROFESSOR = "Professor",
  TA = "TA",
}

export enum userStatus {
  ACTIVE = "Active",
  BLOCKED = "Blocked",
}

export interface IUser extends IBaseModel {
  firstName: string;
  lastName: string;
  email: string;
  password: string;
  role: userRole;
  id: string;
  status: userStatus;
  registeredEvents?: string[];
  balance?: number;
  verified: boolean;
  favorites?: string[];
  notifications?: string[];
  workshops?: string[];
  registedGymSessions?: string[];
  reservedCourts?: string[];
}

const UserSchema = new Schema<IUser>(
  {
    firstName: { type: String, required: true },
    lastName: { type: String, required: true },
    email: { type: String, required: true, unique: true },
    password: { type: String, required: true },
    role: {
      type: String,
      enum: Object.values(userRole),
      required: true,
    },
    id: { type: String, required: true, unique: true },
    status: {
      type: String,
      required: true,
      enum: Object.values(userStatus),
      default: userStatus.ACTIVE,
    },
    registeredEvents: [{ type: String }],
    balance: { type: Number, default: 0 },
    verified: { type: Boolean, default: false },
    favorites: [{ type: String }],
    notifications: [{ type: String }],
    workshops: [{ type: String }],
    registedGymSessions: [{ type: String }],
    reservedCourts: [{ type: String }],
  },
  { timestamps: true }
);

const UserModel =
  mongoose.models.User || mongoose.model<IUser>("User", UserSchema);

export default UserModel;

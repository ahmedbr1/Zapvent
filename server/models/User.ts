// Normal Users are Students, Staff, Professors and TAs
import mongoose, { Document, Schema } from "mongoose";

export interface IUser extends Document {
  firstName: string;
  lastName: string;
  email: string;
  password: string;
  role: "Student" | "Staff" | "Professor" | "TA";
  id: string;
  status: "Active" | "Blocked";
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
      enum: ["Student", "Staff", "Professor", "TA"],
      required: true,
    },
    id: { type: String, required: true, unique: true },
    status: { type: String, enum: ["Active", "Blocked"], default: "Active" },
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

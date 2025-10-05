import mongoose, { Schema } from "mongoose";
import { IBaseModel } from "./BaseModel";
import bcrypt from "bcrypt";

export interface IUser extends IBaseModel {
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
    password: { type: String, required: true, select: false },
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

UserSchema.pre("save", async function (next) {
  if (!this.isModified("password")) return next();

  try {
    const salt = await bcrypt.genSalt(10);
    this.password = await bcrypt.hash(this.password, salt);
    next();
  } catch (error) {
    next(error as Error);
  }
});

const UserModel =
  mongoose.models.User || mongoose.model<IUser>("User", UserSchema);

export default UserModel;

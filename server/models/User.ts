import mongoose, { Schema, Types } from "mongoose";
import { IBaseModel } from "./BaseModel";
import bcrypt from "bcrypt";

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

export enum FriendRequestStatus {
  PENDING = "pending",
  ACCEPTED = "accepted",
  REJECTED = "rejected",
}

export interface IFriendRequest {
  odId: Types.ObjectId;
  odName: string;
  status: FriendRequestStatus;
  createdAt: Date;
}

export interface IUserNotification {
  message: string;
  seen: boolean;
  createdAt?: Date;
}

export interface IUserPrivacySettings {
  hideEventAttendance: boolean;
}

export interface IUser extends IBaseModel {
  firstName: string;
  lastName: string;
  email: string;
  password: string;
  role: userRole;
  status: userStatus;
  studentId?: string;
  staffId?: string;
  registeredEvents?: string[];
  balance?: number;
  verified: boolean;
  favorites?: string[];
  notifications?: IUserNotification[];
  workshops?: string[];
  registeredGymSessions?: string[];
  reservedCourts?: string[];
  // Friends system
  friends?: Types.ObjectId[];
  friendRequestsSent?: IFriendRequest[];
  friendRequestsReceived?: IFriendRequest[];
  privacySettings?: IUserPrivacySettings;
}

const NotificationSchema = new Schema<IUserNotification>(
  {
    message: { type: String, required: true },
    seen: { type: Boolean, default: false },
    createdAt: { type: Date, default: Date.now },
  },
  { _id: false }
);

const FriendRequestSchema = new Schema<IFriendRequest>(
  {
    odId: { type: Schema.Types.ObjectId, required: true },
    odName: { type: String, required: true },
    status: {
      type: String,
      enum: Object.values(FriendRequestStatus),
      default: FriendRequestStatus.PENDING,
    },
    createdAt: { type: Date, default: Date.now },
  },
  { _id: false }
);

const PrivacySettingsSchema = new Schema<IUserPrivacySettings>(
  {
    hideEventAttendance: { type: Boolean, default: false },
  },
  { _id: false }
);

const UserSchema = new Schema<IUser>(
  {
    firstName: { type: String, required: true },
    lastName: { type: String, required: true },
    email: { type: String, required: true, unique: true },
    password: { type: String, required: true, select: false },
    role: {
      type: String,
      enum: Object.values(userRole),
      required: true,
    },
    status: {
      type: String,
      required: true,
      enum: Object.values(userStatus),
      default: userStatus.ACTIVE,
    },
    studentId: {
      type: String,
      unique: true,
      sparse: true,
      required: function (this: IUser) {
        return this.role === userRole.STUDENT;
      },
    },
    staffId: {
      type: String,
      unique: true,
      sparse: true,
      required: function (this: IUser) {
        return [userRole.STAFF, userRole.PROFESSOR, userRole.TA].includes(
          this.role
        );
      },
    },
    registeredEvents: [{ type: String }],
    balance: { type: Number, default: 0 },
    verified: {
      type: Boolean,
      default: false,
    },
    favorites: [{ type: String }],
    notifications: { type: [NotificationSchema], default: [] },
    workshops: [{ type: String }],
    registeredGymSessions: [{ type: String }],
    reservedCourts: [{ type: String }],
    // Friends system
    friends: [{ type: Schema.Types.ObjectId, ref: "User" }],
    friendRequestsSent: { type: [FriendRequestSchema], default: [] },
    friendRequestsReceived: { type: [FriendRequestSchema], default: [] },
    privacySettings: {
      type: PrivacySettingsSchema,
      default: { hideEventAttendance: false },
    },
  },
  { timestamps: true }
);

UserSchema.pre("save", async function (next) {
  if (!this.isModified("password")) return next();

  try {
    const saltRounds = Number(process.env.ENCRYPTION_SALT_ROUNDS) || 10;
    const salt = await bcrypt.genSalt(saltRounds);
    this.password = await bcrypt.hash(this.password, salt);
    next();
  } catch (error) {
    next(error as Error);
  }
});

const UserModel =
  mongoose.models.User || mongoose.model<IUser>("User", UserSchema);

export default UserModel;

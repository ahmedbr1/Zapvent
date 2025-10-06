import mongoose, { Schema } from "mongoose";
import { IBaseModel } from "./BaseModel";

export enum CourtStatus {
  ACTIVE = "active",
  MAINTENANCE = "maintenance",
}

export enum CourtType {
  TENNIS = "tennis",
  FOOTBALL = "football",
  BASKETBALL = "basketball",
  // Add more court types as needed
}

export interface IOpeningHour {
  weekday: number; // 0=Sunday, 6=Saturday
  startTime: string; // "HH:mm"
  endTime: string; // "HH:mm"
}

export interface IException {
  startDate: Date;
  endDate: Date;
  reason?: string;
}

export interface ICourt extends IBaseModel {
  type: CourtType;
  venue: string;
  timezone: string;
  surface?: string;
  isIndoor?: boolean;
  lightsAvailable?: boolean;
  pricePerHour?: number;
  currency?: string;
  capacity?: number;
  bookingSlotMinutes?: number;
  bufferMinutes?: number;
  status?: CourtStatus;
  openingHours: IOpeningHour[];
  exceptions?: IException[];
}

const OpeningHourSchema = new Schema<IOpeningHour>(
  {
    weekday: { type: Number, required: true },
    startTime: { type: String, required: true },
    endTime: { type: String, required: true },
  },
  { _id: false }
);

const ExceptionSchema = new Schema<IException>(
  {
    startDate: { type: Date, required: true },
    endDate: { type: Date, required: true },
    reason: { type: String },
  },
  { _id: false }
);

const CourtSchema = new Schema<ICourt>(
  {
    type: {
      type: String,
      required: true,
      enum: Object.values(CourtType),
    },
    venue: { type: String, required: true },
    timezone: { type: String, required: true },
    surface: { type: String },
    isIndoor: { type: Boolean },
    lightsAvailable: { type: Boolean },
    pricePerHour: { type: Number },
    currency: { type: String },
    capacity: { type: Number },
    bookingSlotMinutes: { type: Number },
    bufferMinutes: { type: Number },
    status: {
      type: String,
      enum: Object.values(CourtStatus),
      default: CourtStatus.ACTIVE,
    },
    openingHours: { type: [OpeningHourSchema], required: true },
    exceptions: { type: [ExceptionSchema], default: [] },
  },
  { timestamps: true }
);

const CourtModel =
  mongoose.models.Court || mongoose.model<ICourt>("Court", CourtSchema);

export default CourtModel;

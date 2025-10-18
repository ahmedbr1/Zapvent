import mongoose, { Schema } from "mongoose";
import { IBaseModel } from "./BaseModel";

export enum GymSessionType {
  YOGA = "Yoga",
  CARDIO = "Cardio",
  STRENGTH = "Strength",
  PILATES = "Pilates",
  CROSSFIT = "CrossFit",
}
//assumption Date and time are separated
export interface IGymSession extends IBaseModel {
  date: Date;
  time: string; // Store time as string in HH:mm format
  duration: number;
  type: GymSessionType;
  maxParticipants: number;
  registeredUsers: string[];
}

const GymSessionSchema = new Schema<IGymSession>(
  {
    date: { type: Date, required: true },
    time: { type: String, required: true }, // Changed to String to store time in HH:mm format
    duration: { type: Number, required: true, min: 1 },
    type: { type: String, enum: Object.values(GymSessionType), required: true },
    maxParticipants: { type: Number, required: true, min: 1 },
    registeredUsers: [{ type: String }],
  },
  { timestamps: true }
);

const GymSessionModel =
  mongoose.models.GymSession ||
  mongoose.model<IGymSession>("GymSession", GymSessionSchema);

export default GymSessionModel;

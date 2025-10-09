import mongoose, { Schema } from "mongoose";
import { IBaseModel } from "./BaseModel";

export enum Location {
  GUCCAIRO = "GUC Cairo",
  GUCCBERLIN = "GUC Berlin",
}
export enum Faculty {
  // can be added to later
  MET = "MET",
  IET = "IET",
  MCTR = "MCTR",
  ARCH = "ARCH",
  BI = "BI",
  CIVIL = "Civil",
  DENTISTRY = "Dentistry",
  PHARMACY = "Pharmacy",
}
export enum FundingSource {
  EXTERNAL = "External",
  GUC = "GUC",
}

export interface IEvent extends IBaseModel {
  // Event type? workshop, seminar, etc. Not decided yet
  name: string;
  description: string;
  date: Date;
  location: Location; // which hall or online
  capacity?: number; // workshops and trips only
  startDate: Date;
  endDate: Date;
  registrationDeadline: Date;
  price?: number; //trips only
  fullAgenda?: string; // A URL to a document containing the full agenda maybe?
  faculty?: Faculty; // Only for workshops
  requiredBudget?: number; // For conferences and workshops only
  participatingProfessors?: string[]; // List of professor pr professor IDs
  fundingSource: FundingSource;
  websiteLink?: string; // Only for conferences
  revenue: number;
  archived: boolean;
  registeredUsers: string[]; // List of users
  vendors: string[]; // List of vendors
}
const EventSchema = new Schema<IEvent>(
  {
    name: { type: String, required: true },
    description: { type: String, required: true },
    date: { type: Date, required: true },
    location: {
      type: String,
      enum: Object.values(Location),
      required: true,
    },
    capacity: { type: Number },
    startDate: { type: Date, required: true },
    endDate: { type: Date, required: true },
    registrationDeadline: { type: Date, required: true },
    price: { type: Number },
    fullAgenda: { type: String }, // URL
    faculty: {
      type: String,
      enum: Object.values(Faculty),
    },
    requiredBudget: { type: Number },
    participatingProfessors: [{ type: String }],
    fundingSource: {
      type: String,
      enum: Object.values(FundingSource),
      required: true,
    },
    websiteLink: { type: String }, // URL
    revenue: { type: Number, default: 0 },
    archived: { type: Boolean, default: false },
    registeredUsers: [{ type: String }],
    vendors: [{ type: String }]
  },
  { timestamps: true }
);
const EventModel =
  mongoose.models.Event || mongoose.model<IEvent>("Event", EventSchema);
export default EventModel;

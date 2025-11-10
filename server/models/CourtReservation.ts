import mongoose, { Schema } from "mongoose";
import { IBaseModel } from "./BaseModel";

export interface ICourtReservation extends IBaseModel {
  court: Schema.Types.ObjectId;
  user: Schema.Types.ObjectId;
  date: Date;
  startTime: string; // HH:mm
  endTime: string; // HH:mm
  studentName: string;
  studentGucId: string;
}

const CourtReservationSchema = new Schema<ICourtReservation>(
  {
    court: { type: Schema.Types.ObjectId, ref: "Court", required: true },
    user: { type: Schema.Types.ObjectId, ref: "User", required: true },
    date: { type: Date, required: true },
    startTime: { type: String, required: true },
    endTime: { type: String, required: true },
    studentName: { type: String, required: true },
    studentGucId: { type: String, required: true },
  },
  { timestamps: true }
);

CourtReservationSchema.index({ court: 1, date: 1, startTime: 1 }, { unique: true });

const CourtReservationModel =
  mongoose.models.CourtReservation ||
  mongoose.model<ICourtReservation>("CourtReservation", CourtReservationSchema);

export default CourtReservationModel;

import mongoose, { Document, Schema } from "mongoose";

export interface IEvent extends Document {
  title: string;
  description: string;
  date: Date;
  location: string; // which hall or online
  capacity?: number;
}
const EventSchema = new Schema<IEvent>(
  {
    title: { type: String, required: true },
    description: { type: String, required: true },
    date: { type: Date, required: true },
    location: { type: String, required: true },
    capacity: { type: Number, required: true },
  },
  { timestamps: true }
);
const EventModel =
  mongoose.models.Event || mongoose.model<IEvent>("Event", EventSchema);

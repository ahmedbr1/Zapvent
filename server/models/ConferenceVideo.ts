import mongoose, { Schema, Types } from "mongoose";
import { IBaseModel } from "./BaseModel";

export enum MediaType {
  IMAGE = "image",
  VIDEO = "video",
}

export interface IConferenceVideo extends IBaseModel {
  eventId: Types.ObjectId;
  uploadedBy: Types.ObjectId; // Professor user ID
  uploaderName: string;
  title: string;
  description?: string;
  filePath: string;
  mediaType: MediaType;
  thumbnailPath?: string;
  duration?: number; // in seconds, for videos
  fileSize: number; // in bytes
}

const ConferenceVideoSchema = new Schema<IConferenceVideo>(
  {
    eventId: { type: Schema.Types.ObjectId, ref: "Event", required: true },
    uploadedBy: { type: Schema.Types.ObjectId, ref: "User", required: true },
    uploaderName: { type: String, required: true },
    title: { type: String, required: true, maxlength: 200 },
    description: { type: String, maxlength: 1000 },
    filePath: { type: String, required: true },
    mediaType: { type: String, enum: Object.values(MediaType), required: true },
    thumbnailPath: { type: String },
    duration: { type: Number },
    fileSize: { type: Number, required: true },
  },
  { timestamps: true }
);

// Indexes
ConferenceVideoSchema.index({ eventId: 1 });
ConferenceVideoSchema.index({ uploadedBy: 1 });
ConferenceVideoSchema.index({ createdAt: -1 });

const ConferenceVideoModel =
  mongoose.models.ConferenceVideo ||
  mongoose.model<IConferenceVideo>("ConferenceVideo", ConferenceVideoSchema);

export default ConferenceVideoModel;

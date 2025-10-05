import mongoose, { Schema, Types } from "mongoose";
import { IBaseModel } from "./BaseModel";

export interface IRating extends IBaseModel {
  user: Types.ObjectId;
  event: Types.ObjectId;
  rating: number;
  comment?: string;
}

const RatingSchema = new Schema<IRating>(
  {
    user: { type: Schema.Types.ObjectId, ref: "User", required: true },
    event: { type: Schema.Types.ObjectId, ref: "Event", required: true },
    rating: { type: Number, required: true, min: 0, max: 5 },
    comment: { type: String },
  },
  { timestamps: { createdAt: true, updatedAt: true } }
);

RatingSchema.index({ user: 1, event: 1 }, { unique: true });

const RatingModel =
  mongoose.models.Rating || mongoose.model<IRating>("Rating", RatingSchema);

export default RatingModel;

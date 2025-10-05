import mongoose, { Schema, Types } from "mongoose";
import { IBaseModel } from "./BaseModel";

export enum CommentStatus {
  VISIBLE = "visible",
  HIDDEN = "hidden",
  FLAGGED = "flagged",
}

export interface IComment extends IBaseModel {
  user: Types.ObjectId;
  event: Types.ObjectId;
  content: string;
  status?: CommentStatus;
  parentComment?: Types.ObjectId;
  editedAt?: Date;
  editCount?: number;
}

const CommentSchema = new Schema<IComment>(
  {
    user: { type: Schema.Types.ObjectId, ref: "User", required: true },
    event: { type: Schema.Types.ObjectId, ref: "Event", required: true },
    content: { type: String, required: true },
    status: {
      type: String,
      enum: Object.values(CommentStatus),
      default: CommentStatus.VISIBLE,
    },
    parentComment: { type: Schema.Types.ObjectId, ref: "Comment" },
    editedAt: { type: Date },
    editCount: { type: Number, default: 0 },
  },
  { timestamps: true }
);

const CommentModel =
  mongoose.models.Comment || mongoose.model<IComment>("Comment", CommentSchema);

export default CommentModel;

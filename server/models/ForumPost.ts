import mongoose, { Schema, Types } from "mongoose";
import { IBaseModel } from "./BaseModel";

export enum ForumPostStatus {
  OPEN = "open",
  CLOSED = "closed",
  PINNED = "pinned",
}

export interface IForumVote {
  odId: Types.ObjectId;
  odType: "User" | "Vendor" | "Admin";
  vote: 1 | -1;
}

export interface IForumComment {
  _id?: Types.ObjectId;
  authorId: Types.ObjectId;
  authorType: "User" | "Vendor" | "Admin";
  authorName: string;
  content: string;
  createdAt: Date;
  updatedAt?: Date;
}

export interface IForumAnswer {
  _id?: Types.ObjectId;
  authorId: Types.ObjectId;
  authorType: "User" | "Vendor" | "Admin";
  authorName: string;
  content: string;
  votes: IForumVote[];
  voteCount: number;
  isAccepted: boolean;
  comments: IForumComment[];
  createdAt: Date;
  updatedAt?: Date;
}

export interface IForumPost extends IBaseModel {
  title: string;
  content: string;
  authorId: Types.ObjectId;
  authorType: "User" | "Vendor" | "Admin";
  authorName: string;
  tags: string[];
  votes: IForumVote[];
  voteCount: number;
  answers: IForumAnswer[];
  answerCount: number;
  acceptedAnswerId?: Types.ObjectId;
  status: ForumPostStatus;
  viewCount: number;
}

const VoteSchema = new Schema<IForumVote>(
  {
    odId: { type: Schema.Types.ObjectId, required: true },
    odType: { type: String, enum: ["User", "Vendor", "Admin"], required: true },
    vote: { type: Number, enum: [1, -1], required: true },
  },
  { _id: false }
);

const CommentSchema = new Schema<IForumComment>(
  {
    authorId: { type: Schema.Types.ObjectId, required: true },
    authorType: {
      type: String,
      enum: ["User", "Vendor", "Admin"],
      required: true,
    },
    authorName: { type: String, required: true },
    content: { type: String, required: true, maxlength: 1000 },
    createdAt: { type: Date, default: Date.now },
    updatedAt: { type: Date },
  },
  { _id: true }
);

const AnswerSchema = new Schema<IForumAnswer>(
  {
    authorId: { type: Schema.Types.ObjectId, required: true },
    authorType: {
      type: String,
      enum: ["User", "Vendor", "Admin"],
      required: true,
    },
    authorName: { type: String, required: true },
    content: { type: String, required: true, maxlength: 10000 },
    votes: { type: [VoteSchema], default: [] },
    voteCount: { type: Number, default: 0 },
    isAccepted: { type: Boolean, default: false },
    comments: { type: [CommentSchema], default: [] },
    createdAt: { type: Date, default: Date.now },
    updatedAt: { type: Date },
  },
  { _id: true }
);

const ForumPostSchema = new Schema<IForumPost>(
  {
    title: { type: String, required: true, maxlength: 200 },
    content: { type: String, required: true, maxlength: 10000 },
    authorId: { type: Schema.Types.ObjectId, required: true },
    authorType: {
      type: String,
      enum: ["User", "Vendor", "Admin"],
      required: true,
    },
    authorName: { type: String, required: true },
    tags: {
      type: [String],
      default: [],
      validate: [(v: string[]) => v.length <= 5, "Maximum 5 tags allowed"],
    },
    votes: { type: [VoteSchema], default: [] },
    voteCount: { type: Number, default: 0 },
    answers: { type: [AnswerSchema], default: [] },
    answerCount: { type: Number, default: 0 },
    acceptedAnswerId: { type: Schema.Types.ObjectId },
    status: {
      type: String,
      enum: Object.values(ForumPostStatus),
      default: ForumPostStatus.OPEN,
    },
    viewCount: { type: Number, default: 0 },
  },
  { timestamps: true }
);

// Indexes for performance
ForumPostSchema.index({ createdAt: -1 });
ForumPostSchema.index({ voteCount: -1 });
ForumPostSchema.index({ answerCount: -1 });
ForumPostSchema.index({ tags: 1 });
ForumPostSchema.index({ authorId: 1, authorType: 1 });
ForumPostSchema.index({ status: 1 });
ForumPostSchema.index({ title: "text", content: "text", tags: "text" });

const ForumPostModel =
  mongoose.models.ForumPost ||
  mongoose.model<IForumPost>("ForumPost", ForumPostSchema);

export default ForumPostModel;

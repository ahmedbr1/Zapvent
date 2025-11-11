import mongoose, { Schema } from "mongoose";
import { IBaseModel } from "./BaseModel";

export interface IDurationRange {
  start: Date;
  end: Date;
}

export interface IVendorVote {
  vendor: mongoose.Types.ObjectId;   
  votes: number;
}

export interface IUserVendorVote {
  user: mongoose.Types.ObjectId;
  vendor: mongoose.Types.ObjectId;
}

export interface IPoll extends IBaseModel {
  boothName: string;
  durations: IDurationRange[];
  vendorsWithVotes: IVendorVote[];
  votesByUser: IUserVendorVote[];
}

const DurationRangeSchema = new Schema<IDurationRange>({
  start: { type: Date, required: true },
  end: { type: Date, required: true },
});

const VendorVoteSchema = new Schema<IVendorVote>({
  vendor: { type: Schema.Types.ObjectId, ref: "Vendor", required: true },
  votes: { type: Number, default: 0 },
});

const UserVendorVoteSchema = new Schema<IUserVendorVote>({
  user: { type: Schema.Types.ObjectId, ref: "User", required: true },
  vendor: { type: Schema.Types.ObjectId, ref: "Vendor", required: true },
});

const PollSchema = new Schema<IPoll>(
  {
    boothName: { type: String, required: true, trim: true },
    durations: { type: [DurationRangeSchema], default: [] },
    vendorsWithVotes: { type: [VendorVoteSchema], default: [] },
    votesByUser: { type: [UserVendorVoteSchema], default: [] },
  },
  { timestamps: true }
);

const PollModel =
  (mongoose.models.Poll as mongoose.Model<IPoll>) ||
  mongoose.model<IPoll>("Poll", PollSchema);

export default PollModel;

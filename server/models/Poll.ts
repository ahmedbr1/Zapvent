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

export interface IPoll extends IBaseModel {
  boothName: string;
  durations: IDurationRange[];       
  vendorsWithVotes: IVendorVote[];
}

const DurationRangeSchema = new Schema<IDurationRange>({
  start: { type: Date, required: true },
  end: { type: Date, required: true },
});

const VendorVoteSchema = new Schema<IVendorVote>({
  vendor: { type: Schema.Types.ObjectId, ref: "Vendor", required: true },
  votes: { type: Number, default: 0 },
});

const PollSchema = new Schema<IPoll>(
  {
    boothName: { type: String, required: true, trim: true },
    durations: { type: [DurationRangeSchema], default: [] },
    vendorsWithVotes: { type: [VendorVoteSchema], default: [] },
  },
  { timestamps: true }
);

const PollModel =
  (mongoose.models.Poll as mongoose.Model<IPoll>) ||
  mongoose.model<IPoll>("Poll", PollSchema);

export default PollModel;
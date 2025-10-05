import mongoose, { Schema } from "mongoose";
import { IBaseModel } from "./BaseModel";

export interface IUser extends IBaseModel {
  name: string;
  email: string;
}

const UserSchema = new Schema<IUser>(
  {
    name: { type: String, required: true },
    email: { type: String, required: true, unique: true },
  },
  { timestamps: true }
);

const UserModel =
  mongoose.models.User || mongoose.model<IUser>("User", UserSchema);

export default UserModel;

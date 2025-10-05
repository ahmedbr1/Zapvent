import mongoose, { Schema } from "mongoose";
import { IBaseModel } from "./BaseModel";

export interface IAdmin extends IBaseModel {
  firstName: string;
  lastName: string;
  email: string;
  password: string;
  status: "Active" | "Blocked";
}
const AdminSchema = new Schema<IAdmin>(
  {
    firstName: { type: String, required: true },
    lastName: { type: String, required: true },
    email: { type: String, required: true, unique: true },
    password: { type: String, required: true },
    status: { type: String, enum: ["Active", "Blocked"], default: "Active" },
  },
  { timestamps: true }
);
const AdminModel =
  mongoose.models.Admin || mongoose.model<IAdmin>("Admin", AdminSchema);
export default AdminModel;

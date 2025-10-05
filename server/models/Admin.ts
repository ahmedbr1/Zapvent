import mongoose, { Schema } from "mongoose";
import { IBaseModel } from "./BaseModel";
import bcrypt from "bcrypt";

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

AdminSchema.pre("save", async function (next) {
  if (!this.isModified("password")) return next();
  try {
    const saltRounds = Number(process.env.ENCRYPTION_SALT_ROUNDS) || 10;
    const salt = await bcrypt.genSalt(saltRounds);
    this.password = await bcrypt.hash(this.password, salt);
    next();
  } catch (err) {
    next(err as Error);
  }
});

const AdminModel =
  mongoose.models.Admin || mongoose.model<IAdmin>("Admin", AdminSchema);
export default AdminModel;

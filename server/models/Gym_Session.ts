import mongoose, { Schema } from "mongoose";
import { IBaseModel } from "./BaseModel";


export interface IGym_Session extends IBaseModel {
  date: Date;                
  time: string;              
  duration: number;          
  type: string;              
  max_participants: number;  
}


const Gym_SessionSchema = new Schema<IGym_Session>(
  {
    date: { type: Date, required: true },
    time: { type: String, required: true },
    duration: { type: Number, required: true, min: 1 },
    type: { type: String, required: true, trim: true },
    max_participants: { type: Number, required: true, min: 1 },
  },
  { timestamps: true }
);

// 3. Model export
const Gym_SessionModel =
  mongoose.models.Gym_Session ||
  mongoose.model<IGym_Session>("Gym_Session", Gym_SessionSchema);

export default Gym_SessionModel;
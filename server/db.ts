import mongoose from "mongoose";

export async function connectDB(uri: string) {
  if (!uri) throw new Error("Missing MONGODB_URI");
  if (mongoose.connection.readyState >= 1) return;
  await mongoose.connect(uri);
  console.log("✅ MongoDB connected");
}

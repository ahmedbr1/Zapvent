import { Router } from "express";
import userRoutes from "./userRoutes";
import loginRoutes from "./loginRoutes";
import eventRoutes from "./eventRoutes";

const api = Router();
api.use("/users", userRoutes);
api.use("/auth", loginRoutes);
// Mount event routes (e.g., DELETE /api/events/:eventId)
api.use("/", eventRoutes);

export default api;

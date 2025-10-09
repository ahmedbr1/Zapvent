import { Router } from "express";
import userRoutes from "./userRoutes";
import eventRoutes from "./eventRoutes";

const api = Router();
api.use("/users", userRoutes);
api.use("/events", eventRoutes);

export default api;

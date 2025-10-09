import { Router } from "express";
import userRoutes from "./userRoutes";
import loginRoutes from "./loginRoutes";
import courtRoutes from "./courtRoutes";
import eventRoutes from "./eventRoutes";
import gymSessionRoutes from "./gymSessionRoutes";

const api = Router();
api.use("/users", userRoutes);
api.use("/auth", loginRoutes);
api.use("/courts", courtRoutes);
api.use("/events", eventRoutes);
api.use("/gym-sessions", gymSessionRoutes);

export default api;

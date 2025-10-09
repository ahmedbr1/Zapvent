import { Router } from "express";
import userRoutes from "./userRoutes";
import loginRoutes from "./loginRoutes";
import eventRoutes from "./eventRoutes";
import gymSessionRoutes from "./gymSessionRoutes";
import adminRoutes from "./adminRoutes";

const api = Router();
api.use("/users", userRoutes);
api.use("/auth", loginRoutes);
api.use("/events", eventRoutes);
api.use("/gym-sessions", gymSessionRoutes);
api.use("/admin", adminRoutes);

export default api;

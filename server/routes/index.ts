import { Router } from "express";
import userRoutes from "./userRoutes";
import loginRoutes from "./loginRoutes";
import gymSessionRoutes from "./gymSessionRoutes";


const api = Router();
api.use("/users", userRoutes);
api.use("/auth", loginRoutes);
api.use("/api/gym-sessions", gymSessionRoutes);

export default api;

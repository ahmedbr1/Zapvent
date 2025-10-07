import { Router } from "express";
import userRoutes from "./userRoutes";
import loginRoutes from "./loginRoutes";

const api = Router();
api.use("/users", userRoutes);
api.use("/auth", loginRoutes);

export default api;

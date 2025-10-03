import { Router } from "express";
import userRoutes from "./userRoutes";

const api = Router();
api.use("/users", userRoutes);

export default api;

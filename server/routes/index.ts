import { Router } from "express";
import userRoutes from "./userRoutes";
import loginRoutes from "./loginRoutes";
import vendorRoutes from "./vendorRoutes";

const api = Router();
api.use("/users", userRoutes);
api.use("/auth", loginRoutes);
api.use("/vendors", vendorRoutes);

export default api;

import { Router } from "express";
import { adminController } from "../controllers/adminController";
import { loginRequired } from "../middleware/authMiddleware";

const adminRoutes = Router();

adminRoutes.use(loginRequired);

adminRoutes.post("/approve/:userId", adminController.approveUser.bind(adminController));

adminRoutes.post("/reject/:userId", adminController.rejectUser.bind(adminController));

export default adminRoutes;

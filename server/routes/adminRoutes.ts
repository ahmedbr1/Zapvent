import { Router } from "express";
import { adminController } from "../controllers/adminController";

const router = Router();

router.get("/", adminController.getAllAdmins.bind(adminController));
router.get("/:id", adminController.getAdminById.bind(adminController));
router.post("/", adminController.createAdmin.bind(adminController));
router.delete("/:id", adminController.deleteAdmin.bind(adminController));

export default router;

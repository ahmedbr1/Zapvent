import { Router } from "express";
import { adminController } from "../controllers/adminController";
import { loginRequired } from "../middleware/authMiddleware";

const router = Router();

// Temporary public endpoints for comment testing (remove in production)

router.use(loginRequired);

router.post("/approve/:userId", adminController.approveUser.bind(adminController));
router.post("/reject/:userId", adminController.rejectUser.bind(adminController));
router.post("/", adminController.createAdmin.bind(adminController));

router.get("/", adminController.getAllAdmins.bind(adminController));
router.get("/:id", adminController.getAdminById.bind(adminController));

router.delete("/:id", adminController.deleteAdmin.bind(adminController));
router.delete(
  "/comments/:commentId",
  adminController.deleteComment.bind(adminController)
);

export default router;

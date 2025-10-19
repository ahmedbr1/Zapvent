import { Router } from "express";
import { loginRequired, allowedRoles } from "../middleware/authMiddleware";
import { userController } from "../controllers/userController";

const router = Router();

router.post("/signUp", userController.signup.bind(userController));
router.get(
  "/professors",
  loginRequired,
  allowedRoles(["Student", "Professor", "Staff", "TA", "Admin"]),
  userController.getProfessors.bind(userController)
);
router.get(
  "/:userId/registered-events",
  userController.getUserRegisteredEvents.bind(userController)
);

export default router;

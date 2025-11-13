import { Router } from "express";
import courtController from "../controllers/courtController";
import { loginRequired, allowedRoles } from "../middleware/authMiddleware";

const router = Router();

router.get("/", courtController.viewAllCourts);
router.get(
  "/:courtId/availability",
  loginRequired,
  allowedRoles(["Student"]),
  courtController.viewCourtAvailability
);
router.post(
  "/:courtId/reservations",
  loginRequired,
  allowedRoles(["Student"]),
  courtController.reserveCourt
);

export default router;

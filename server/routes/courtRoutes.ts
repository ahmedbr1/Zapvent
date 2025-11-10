import { Router } from "express";
import {
  viewAllCourts,
  viewCourtAvailability,
  reserveCourt,
} from "../controllers/courtController";
import { loginRequired, allowedRoles } from "../middleware/authMiddleware";

const router = Router();

router.get("/", viewAllCourts);
router.get(
  "/:courtId/availability",
    loginRequired,
  allowedRoles(["Student"]),
  viewCourtAvailability
);
router.post(
  "/:courtId/reservations",
  loginRequired,
  allowedRoles(["Student"]),
  reserveCourt
);

export default router;

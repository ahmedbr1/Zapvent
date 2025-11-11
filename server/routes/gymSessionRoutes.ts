import express from "express";
import {
  cancelGymSessionController,
  createGymSessionController,
  viewGymScheduleByMonthController,
  editGymSessionController,
  registerForGymSessionController,
} from "../controllers/gymSessionController";
import { allowedRoles, loginRequired } from "../middleware/authMiddleware";

const router = express.Router();

// POST /api/gym-sessions - Create a new gym session (EventsOffice or Admin only)
router.post(
  "/",
  allowedRoles(["EventOffice", "Admin"]),
  createGymSessionController
);

// DELETE /api/gym-sessions/:id - Delete a gym session (EventsOffice or Admin only)
router.delete(
  "/:id",
  // allowedRoles(["EventOffice", "Admin"]),
  cancelGymSessionController
);

// GET /api/gym-sessions/schedule?year=2025&month=10 - View schedule (no auth required or optional)
router.get("/schedule", viewGymScheduleByMonthController);

// PUT /api/gym-sessions/:id - Update a gym session (EventsOffice or Admin only)
router.put(
  "/:id",
  // allowedRoles(["EventOffice", "Admin"]),
  editGymSessionController
);

router.post(
  "/:id/register",
  loginRequired,
  allowedRoles(["Student", "Staff", "Professor", "TA"]),
  registerForGymSessionController
);
export default router;

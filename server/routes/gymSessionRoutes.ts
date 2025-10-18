import express from "express";
import {
  cancelGymSessionController,
  createGymSessionController,
  viewGymScheduleByMonthController,
  editGymSessionController,
} from "../controllers/gymSessionController";
import { allowedRoles } from "../middleware/authMiddleware";

const router = express.Router();

// POST /api/gym-sessions - Create a new gym session (EventsOffice or Admin only)
router.post(
  "/",
  allowedRoles(["EventsOffice", "Admin"]),
  createGymSessionController
);

// DELETE /api/gym-sessions/:id - Delete a gym session (EventsOffice or Admin only)
router.delete(
  "/:id",
  allowedRoles(["EventsOffice", "Admin"]),
  cancelGymSessionController
);

// GET /api/gym-sessions/schedule?year=2025&month=10 - View schedule (no auth required or optional)
router.get("/schedule", viewGymScheduleByMonthController);

// PUT /api/gym-sessions/:id - Update a gym session (EventsOffice or Admin only)
router.put(
  "/:id",
  allowedRoles(["EventsOffice", "Admin"]),
  editGymSessionController
);
export default router;

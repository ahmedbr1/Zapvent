import express from "express";
import gymSessionController from "../controllers/gymSessionController";
import { allowedRoles, loginRequired } from "../middleware/authMiddleware";

const router = express.Router();

// POST /api/gym-sessions - Create a new gym session (EventsOffice or Admin only)
router.post(
  "/",
  allowedRoles(["EventOffice", "Admin"]),
  gymSessionController.create
);

// DELETE /api/gym-sessions/:id - Delete a gym session (EventsOffice or Admin only)
router.delete(
  "/:id",
  allowedRoles(["EventOffice", "Admin"]),
  gymSessionController.cancel
);

// GET /api/gym-sessions/schedule?year=2025&month=10 - View schedule (no auth required or optional)
router.get("/schedule", gymSessionController.viewScheduleByMonth);

// PUT /api/gym-sessions/:id - Update a gym session (EventsOffice or Admin only)
router.put(
  "/:id",
  allowedRoles(["EventOffice", "Admin"]),
  gymSessionController.edit
);

router.post(
  "/:id/register",
  loginRequired,
  allowedRoles(["Student", "Staff", "Professor", "TA"]),
  gymSessionController.register
);
export default router;

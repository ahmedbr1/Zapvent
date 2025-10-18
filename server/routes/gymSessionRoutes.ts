import express from "express";
import {
  cancelGymSessionController,
  createGymSessionController,
  viewGymScheduleByMonthController,
  editGymSessionController,
} from "../controllers/gymSessionController";
import { allowedRoles } from "../middleware/authMiddleware";

const router = express.Router();

// POST /api/gym-sessions
router.post("/", createGymSessionController);

// DELETE /api/gym-sessions/:id
router.delete("/:id", cancelGymSessionController);

// GET /api/gym-sessions/schedule?year=2025&month=10
router.get("/schedule", viewGymScheduleByMonthController);

router.put("/:id", allowedRoles(["EventsOffice"]), editGymSessionController);
export default router;

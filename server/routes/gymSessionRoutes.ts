import express from "express";
import { cancelGymSessionController, createGymSessionController, viewGymScheduleByMonthController } from "../controllers/gymSessionController";

const router = express.Router();

// POST /api/gym-sessions
router.post("/", createGymSessionController);

// DELETE /api/gym-sessions/:id
router.delete("/:id", cancelGymSessionController);

// GET /api/gym-sessions/schedule?year=2025&month=10
router.get("/schedule", viewGymScheduleByMonthController);

export default router;

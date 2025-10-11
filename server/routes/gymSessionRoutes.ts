import express from "express";
import { cancelGymSessionController, createGymSessionController } from "../controllers/gymSessionController";

const router = express.Router();

// POST /api/gym-sessions
router.post("/", createGymSessionController);

// DELETE /api/gym-sessions/:id
router.delete("/:id", cancelGymSessionController);

export default router;

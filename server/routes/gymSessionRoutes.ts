import express from "express";
import { cancelGymSessionController } from "../controllers/gymSessionController";

const router = express.Router();

// DELETE /api/gym-sessions/:id
router.delete("/:id", cancelGymSessionController);

export default router;

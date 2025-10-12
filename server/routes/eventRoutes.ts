import { Router } from "express";
import {
  createBazaarController,
  editGymSessionController,
  getAllEventsController,
} from "../controllers/eventController";

const router = Router();

router.get("/", getAllEventsController);
router.post("/", createBazaarController);
router.put("/:id", editGymSessionController);
export default router;

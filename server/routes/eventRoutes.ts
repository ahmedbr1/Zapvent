import { Router } from "express";
import {
  createBazaarController,
  getAllEventsController,
} from "../controllers/eventController";

const router = Router();

router.get("/", getAllEventsController);
router.post("/", createBazaarController);

export default router;

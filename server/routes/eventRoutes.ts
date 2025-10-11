import { Router } from "express";
import {
  getAllEventsController,
  registerForEventController,
} from "../controllers/eventController";

const router = Router();

router.get("/", getAllEventsController);

//router.post("/:eventId/register", registerForEventController);
router.post("/", registerForEventController);

export default router;

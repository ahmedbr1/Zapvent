import { Router } from "express";
import eventController from "../controllers/eventController";
const router = Router();

router.get("/", eventController.getAllEventsController);
router.put("/conferences/:eventId", eventController.updateConferenceController);
export default router;

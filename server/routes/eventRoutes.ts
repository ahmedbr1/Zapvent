import { Router } from "express";
import eventController from "../controllers/eventController";

const router = Router();

router.get("/", eventController.getAllEventsController);
router.get("/upcoming-bazaars", eventController.getUpcomingBazaarsController);

export default router;
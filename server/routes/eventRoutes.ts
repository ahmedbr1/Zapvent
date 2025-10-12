import { Router } from "express";
import eventController from "../controllers/eventController";

const router = Router();

router.get("/", eventController.getAllEventsController);
router.get("/upcoming-bazaars", eventController.getUpcomingBazaarsController);
router.post("/bazaar", eventController.createBazaarController);

export default router;

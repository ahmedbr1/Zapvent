import { Router } from "express";
import {
  updateBazaarDetails,
  createNewTrip,
  updateTripDetails,
} from "../controllers/eventController";
import { adminRequired } from "../middleware/authMiddleware";

const router = Router();

router.put("/:id", adminRequired, updateBazaarDetails);
router.post("/trip", adminRequired, createNewTrip);
router.put("/trip/:id", adminRequired, updateTripDetails);
import eventController from "../controllers/eventController";
router.get("/", eventController.getAllEventsController);
router.get("/upcoming-bazaars", eventController.getUpcomingBazaarsController);
router.post("/bazaar", eventController.createBazaarController);

export default router;

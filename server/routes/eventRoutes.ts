import { Router } from "express";
import { allowedRoles } from "../middleware/authMiddleware";
import {
  createBazaarController,
  getAllEventsController,
} from "../controllers/eventController";
import { editGymSessionController } from "../controllers/gymSessionController";
import { adminRequired } from "../middleware/authMiddleware";
import eventController from "../controllers/eventController";

const router = Router();

router.get("/", getAllEventsController);
router.post("/", createBazaarController);
router.get("/upcoming-bazaars", eventController.getUpcomingBazaarsController);

router.put("/:id", allowedRoles(["EventsOffice"]), editGymSessionController);

router.put("/conferences/:eventId", eventController.updateConferenceController);

// quick check route
router.get("/events/health", (_req, res) => res.json({ ok: true }));

// EventOffice/Admin deletes any event
router.delete("/events/:eventId", (req, res) =>
  eventController.deleteAnyEvent(req, res)
);
// Admin-only routes
router.put("/:id", adminRequired, eventController.updateBazaarDetails);
router.post("/trip", adminRequired, eventController.createNewTrip);
router.put("/trip/:id", adminRequired, eventController.updateTripDetails);


export default router;

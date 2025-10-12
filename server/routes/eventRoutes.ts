import { Router } from "express";
import { adminRequired } from "../middleware/authMiddleware";
import eventController from "../controllers/eventController";

const router = Router();

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

// Public/authenticated routes
router.get("/", eventController.getAllEventsController);
router.get("/upcoming-bazaars", eventController.getUpcomingBazaarsController);
router.post("/bazaar", eventController.createBazaarController);

export default router;

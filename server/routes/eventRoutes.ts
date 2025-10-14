import { Router } from "express";
import {
  loginRequired,
  adminRequired,
  allowedRoles,
} from "../middleware/authMiddleware";
import eventController from "../controllers/eventController";

const router = Router();

router.get("/", eventController.getAllEventsController);
router.post("/", eventController.createBazaarController);
router.get("/upcoming-bazaars", eventController.getUpcomingBazaarsController);
router.get(
  "/accepted-upcoming-bazaars",
  loginRequired,
  allowedRoles(["Vendor"]),
  eventController.getAcceptedUpcomingBazaarsController
);

router.put("/conferences/:eventId", eventController.updateConferenceController);

// quick check route
router.get("/health", (_req, res) => res.json({ ok: true }));

// EventOffice/Admin deletes any event
router.delete("/:eventId", (req, res) =>
  eventController.deleteAnyEvent(req, res)
);
// Admin-only routes
// use distinct path for bazaar update to avoid clashing with gym-session edit route
router.put("/bazaar/:id", adminRequired, eventController.updateBazaarDetails);
router.post("/trip", adminRequired, eventController.createNewTrip);
router.put("/trip/:id", adminRequired, eventController.updateTripDetails);

export default router;

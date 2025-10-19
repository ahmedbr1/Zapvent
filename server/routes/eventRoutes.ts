import { Router } from "express";
import { loginRequired, allowedRoles } from "../middleware/authMiddleware";
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
router.get(
  "/requested-upcoming-bazaars",
  loginRequired,
  allowedRoles(["Vendor"]),
  eventController.getRequestedUpcomingBazaarsController
);
router.get(
  "/:eventId/applications",
  loginRequired,
  allowedRoles(["Admin", "EventOffice"]),
  eventController.getVendorApplicationsForBazaarController
);

router.put("/conferences/:eventId", eventController.updateConferenceController);

// quick check route
router.get("/health", (_req, res) => res.json({ ok: true }));

// Events Office/Admin deletes any event
router.delete("/:eventId", (req, res) =>
  eventController.deleteAnyEvent(req, res)
);
// Authenticated management routes
// use distinct path for bazaar update to avoid clashing with gym-session edit route
router.get("/bazaar", eventController.getAllBazaarsController);
router.put("/bazaar/:id", eventController.updateBazaarDetails);
router.get("/trip", eventController.getAllTripsController);
router.post("/trip", eventController.createNewTrip);
router.put("/trip/:id", eventController.updateTripDetails);

// Professor (User) routes for workshops
router.post("/workshop", eventController.createWorkshopController);
router.put("/workshop/:id", eventController.editWorkshopController);
router.post("/workshop/:id/register",eventController.registerForWorkshopController);
router.get("/my-workshops", eventController.getMyWorkshopsController);

// Events Office routes for conferences
router.post("/conference", eventController.createConferenceController);

export default router;

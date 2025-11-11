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
  "/reports/attendance",
  loginRequired,
  allowedRoles(["Admin", "EventOffice"]),
  eventController.getAttendanceReportController
);
router.get(
  "/reports/sales",
  loginRequired,
  allowedRoles(["Admin", "EventOffice"]),
  eventController.getSalesReportController
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
router.post(
  "/workshop/:id/register",
  eventController.registerForWorkshopController
);
router.post(
  "/:id/pay-by-wallet",
  loginRequired,
  allowedRoles(["Student", "Staff", "Professor", "TA"]),
  eventController.payByWalletController
);
router.post(
  "/:id/cancel-registration",
  loginRequired,
  allowedRoles(["Student", "Staff", "Professor", "TA"]),
  eventController.cancelRegistrationAndRefundController
);
router.get(
  "/workshop/:id/participants",
  eventController.getWorkshopParticipantsController
);
router.get("/workshop/:id/status", eventController.getWorkshopStatusController);
router.get("/my-workshops", eventController.getMyWorkshopsController);

// Event Office routes for workshop approval
router.patch(
  "/workshop/:id/approve",
  eventController.approveWorkshopController
);
router.patch("/workshop/:id/reject", eventController.rejectWorkshopController);
router.patch(
  "/workshop/:id/request-edits",
  eventController.requestWorkshopEditsController
);

// Event Office route for archiving events
router.patch("/:id/archive", eventController.archiveEventController);

// Event Office route for setting role restrictions on events
router.patch(
  "/:id/role-restrictions",
  eventController.setEventRoleRestrictionsController
);

// Event Office route for exporting event registrations
router.get(
  "/:id/export-registrations",
  eventController.exportEventRegistrationsController
);

// Event Office route for generating QR codes
router.get("/:id/generate-qr", eventController.generateEventQRCodeController);

// Route for sending workshop certificates (Student, Staff, TA, Professor)
router.post(
  "/workshop/:id/send-certificates",
  eventController.sendWorkshopCertificatesController
);

// Events Office routes for conferences
router.post("/conference", eventController.createConferenceController);

export default router;

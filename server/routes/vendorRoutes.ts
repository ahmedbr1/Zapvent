import { Router } from "express";
import vendorController from "../controllers/vendorController";
import multer from "multer";
import { loginRequired, allowedRoles } from "../middleware/authMiddleware";

const router = Router();
const upload = multer({ dest: "uploads/" });

// Accept multipart/form-data from the onboarding form (text fields + optional files)
router.post(
  "/signUp",
  upload.fields([
    { name: "logo", maxCount: 1 },
    { name: "taxCard", maxCount: 1 },
    { name: "documents", maxCount: 1 },
  ]),
  vendorController.vendorSignup.bind(vendorController)
);

router.post(
  "/apply-bazaar",
  loginRequired,
  allowedRoles(["Vendor"]),
  upload.fields([{ name: "attendeeIds", maxCount: 5 }]),
  vendorController.applyToBazaar.bind(vendorController)
);

router.post(
  "/applications/:eventId/attendees",
  loginRequired,
  allowedRoles(["Vendor"]),
  upload.fields([{ name: "attendeeIds", maxCount: 5 }]),
  vendorController.uploadApplicationAttendees.bind(vendorController)
);

router.post(
  "/applications/:eventId/payment/intent",
  loginRequired,
  allowedRoles(["Vendor"]),
  vendorController.createStripePaymentIntent.bind(vendorController)
);

router.post(
  "/applications/:eventId/payment/confirm",
  loginRequired,
  allowedRoles(["Vendor"]),
  vendorController.confirmStripePayment.bind(vendorController)
);

router.post(
  "/applications/:eventId/payment",
  loginRequired,
  allowedRoles(["Vendor"]),
  vendorController.payForApplication.bind(vendorController)
);

// Get vendor's own applications
router.get(
  "/my-applications",
  loginRequired,
  allowedRoles(["Vendor"]),
  vendorController.getMyApplications.bind(vendorController)
);

router.delete(
  "/my-applications/:eventId",
  loginRequired,
  allowedRoles(["Vendor"]),
  vendorController.cancelMyApplication.bind(vendorController)
);

// Profile routes - protected with decorators in controller
router.get(
  "/profile",
  loginRequired,
  allowedRoles(["Vendor"]),
  vendorController.getProfile.bind(vendorController)
);
router.patch(
  "/profile",
  loginRequired,
  allowedRoles(["Vendor"]),
  upload.fields([
    { name: "logo", maxCount: 1 },
    { name: "taxCard", maxCount: 1 },
    { name: "documents", maxCount: 1 },
  ]),
  vendorController.updateProfile.bind(vendorController)
);

router.post(
  "/loyalty/apply",
  loginRequired,
  allowedRoles(["Vendor"]),
  vendorController.applyToLoyaltyProgram.bind(vendorController)
);

router.post(
  "/loyalty/cancel",
  loginRequired,
  allowedRoles(["Vendor"]),
  vendorController.cancelLoyaltyProgram.bind(vendorController)
);

router.get(
  "/loyalty/me",
  loginRequired,
  allowedRoles(["Vendor"]),
  vendorController.getMyLoyaltyProgram.bind(vendorController)
);

router.get(
  "/loyalty",
  loginRequired,
  allowedRoles(["Student", "Staff", "TA", "Professor", "EventOffice", "Admin"]),
  vendorController.listLoyaltyVendors.bind(vendorController)
);

router.patch(
  "/bazaar-application/status",
  loginRequired,
  allowedRoles(["Admin", "EventOffice"]),
  vendorController.updateBazaarApplicationStatus.bind(vendorController)
);
// Admin routes - properly protected with middleware
router.get(
  "/admin",
  loginRequired,
  allowedRoles(["Admin", "EventOffice"]),
  vendorController.listVendorsForAdmin.bind(vendorController)
);

router.patch(
  "/admin/:vendorId/approve",
  vendorController.approveVendorAccount.bind(vendorController)
);

router.patch(
  "/admin/:vendorId/reject",
  vendorController.rejectVendorAccount.bind(vendorController)
);

router.patch(
  "/admin/:vendorId/verify",
  loginRequired,
  allowedRoles(["Admin"]),
  vendorController.verifyVendor.bind(vendorController)
);

export default router;

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
router.get("/profile", vendorController.getProfile.bind(vendorController));
router.patch(
  "/profile",
  upload.fields([
    { name: "logo", maxCount: 1 },
    { name: "taxCard", maxCount: 1 },
    { name: "documents", maxCount: 1 },
  ]),
  vendorController.updateProfile.bind(vendorController)
);

router.patch(
  "/bazaar-application/status",
  vendorController.updateBazaarApplicationStatus.bind(vendorController)
);
// Admin routes - properly protected with middleware
router.get(
  "/admin",
  loginRequired,
  allowedRoles(["Admin"]),
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

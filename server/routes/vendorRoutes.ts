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
  vendorController.applyToBazaar.bind(vendorController)
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
  "/admin/:vendorId/verify",
  loginRequired,
  allowedRoles(["Admin"]),
  vendorController.verifyVendor.bind(vendorController)
);

export default router;
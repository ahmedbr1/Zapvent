import { Router } from "express";
import multer from "multer";
import vendorGalleryController from "../controllers/vendorGalleryController";
import { loginRequired, allowedRoles } from "../middleware/authMiddleware";

const router = Router();
const upload = multer({
  dest: "uploads/vendor-gallery/",
  limits: {
    fileSize: 100 * 1024 * 1024, // 100MB limit
  },
  fileFilter: (_req, file, cb) => {
    if (
      file.mimetype.startsWith("video/") ||
      file.mimetype.startsWith("image/")
    ) {
      cb(null, true);
    } else {
      cb(new Error("Only video and image files are allowed."));
    }
  },
});

// Public route for viewing vendor gallery
router.get(
  "/public/:vendorId",
  vendorGalleryController.getPublicGallery.bind(vendorGalleryController)
);

// Vendor routes (owner only)
router.get(
  "/",
  loginRequired,
  allowedRoles(["Vendor"]),
  vendorGalleryController.getMyGallery.bind(vendorGalleryController)
);

router.post(
  "/",
  loginRequired,
  allowedRoles(["Vendor"]),
  upload.single("file"),
  vendorGalleryController.addGalleryItem.bind(vendorGalleryController)
);

router.put(
  "/:itemId",
  loginRequired,
  allowedRoles(["Vendor"]),
  vendorGalleryController.updateGalleryItem.bind(vendorGalleryController)
);

router.delete(
  "/:itemId",
  loginRequired,
  allowedRoles(["Vendor"]),
  vendorGalleryController.deleteGalleryItem.bind(vendorGalleryController)
);

router.put(
  "/reorder",
  loginRequired,
  allowedRoles(["Vendor"]),
  vendorGalleryController.reorderGallery.bind(vendorGalleryController)
);

export default router;

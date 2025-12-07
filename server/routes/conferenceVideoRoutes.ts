import { Router } from "express";
import multer from "multer";
import conferenceVideoController from "../controllers/conferenceVideoController";
import { loginRequired, allowedRoles } from "../middleware/authMiddleware";

const router = Router();
const upload = multer({
  dest: "uploads/conference-videos/",
  limits: {
    fileSize: 500 * 1024 * 1024, // 500MB limit for videos
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

// Public routes
router.get(
  "/conferences",
  conferenceVideoController.getConferencesWithVideos.bind(
    conferenceVideoController
  )
);
router.get(
  "/events/:eventId",
  conferenceVideoController.getConferenceVideos.bind(conferenceVideoController)
);

// Event Office routes
router.get(
  "/eligible-conferences",
  loginRequired,
  allowedRoles(["EventOffice"]),
  conferenceVideoController.getEligibleConferences.bind(
    conferenceVideoController
  )
);
router.post(
  "/events/:eventId",
  loginRequired,
  allowedRoles(["EventOffice"]),
  upload.single("file"),
  conferenceVideoController.uploadVideo.bind(conferenceVideoController)
);
router.get(
  "/my-videos",
  loginRequired,
  allowedRoles(["EventOffice"]),
  conferenceVideoController.getUploaderVideos.bind(conferenceVideoController)
);
router.put(
  "/:videoId",
  loginRequired,
  allowedRoles(["EventOffice"]),
  conferenceVideoController.updateVideo.bind(conferenceVideoController)
);
router.delete(
  "/:videoId",
  loginRequired,
  allowedRoles(["EventOffice", "Admin"]),
  conferenceVideoController.deleteVideo.bind(conferenceVideoController)
);

export default router;

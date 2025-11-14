import { Router } from "express";
import { adminController } from "../controllers/adminController";
import { pollController } from "../controllers/pollController";
import { loginRequired, allowedRoles } from "../middleware/authMiddleware";

const router = Router();

router.use(loginRequired);

// Events Office routes
router.get(
  "/events-office",
  adminController.getAllEventsOffice.bind(adminController)
);
router.post(
  "/events-office",
  adminController.createEventsOffice.bind(adminController)
);
router.patch(
  "/events-office/:id",
  adminController.updateEventsOffice.bind(adminController)
);
router.delete(
  "/events-office/:id",
  adminController.deleteEventsOffice.bind(adminController)
);
router.get(
  "/notifications",
  adminController.getMyNotifications.bind(adminController)
);
router.patch(
  "/notifications/seen",
  allowedRoles(["EventOffice"]),
  adminController.markMyNotificationsSeen.bind(adminController)
);

router.post(
  "/polls",
  allowedRoles(["EventOffice"]),
  pollController.createVendorBoothPoll.bind(pollController)
);

// Admins only routes (adminType: "Admin")
router.get(
  "/admins-only",
  adminController.getAllAdminsOnly.bind(adminController)
);
router.patch(
  "/admins/:id/block",
  adminController.blockAdminAccount.bind(adminController)
);
router.patch(
  "/admins/:id/unblock",
  adminController.unblockAdminAccount.bind(adminController)
);

// Admin routes
router.post(
  "/approve/:userId",
  adminController.approveUser.bind(adminController)
);
router.post(
  "/reject/:userId",
  adminController.rejectUser.bind(adminController)
);
router.post("/", adminController.createAdmin.bind(adminController));
router.patch("/:id", adminController.updateAdmin.bind(adminController));
router.patch(
  "/users/:userId/block",
  adminController.blockUser.bind(adminController)
);

router.get("/", adminController.getAllAdmins.bind(adminController));
router.get("/users", adminController.viewAllUsers.bind(adminController));
router.get("/:id", adminController.getAdminById.bind(adminController));

router.delete("/:id", adminController.deleteAdmin.bind(adminController));

export default router;

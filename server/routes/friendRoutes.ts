import { Router } from "express";
import friendController from "../controllers/friendController";
import { loginRequired, allowedRoles } from "../middleware/authMiddleware";

const router = Router();

// All friend routes require authentication and Student role
const studentAuth = [loginRequired, allowedRoles(["Student"])];

// Get friend list
router.get(
  "/",
  ...studentAuth,
  friendController.getFriendsList.bind(friendController)
);

// Search for students to add as friends
router.get(
  "/search",
  ...studentAuth,
  friendController.searchStudents.bind(friendController)
);

// Get pending friend requests
router.get(
  "/requests",
  ...studentAuth,
  friendController.getPendingRequests.bind(friendController)
);

// Send friend request
router.post(
  "/request/:userId",
  ...studentAuth,
  friendController.sendFriendRequest.bind(friendController)
);

// Accept friend request
router.post(
  "/accept/:userId",
  ...studentAuth,
  friendController.acceptFriendRequest.bind(friendController)
);

// Reject friend request
router.post(
  "/reject/:userId",
  ...studentAuth,
  friendController.rejectFriendRequest.bind(friendController)
);

// Cancel outgoing friend request
router.delete(
  "/cancel/:userId",
  ...studentAuth,
  friendController.cancelFriendRequest.bind(friendController)
);

// Remove friend
router.delete(
  "/:userId",
  ...studentAuth,
  friendController.removeFriend.bind(friendController)
);

// Get friends attending a specific event
router.get(
  "/attending/:eventId",
  ...studentAuth,
  friendController.getFriendsAttendingEvent.bind(friendController)
);

// Get friends attending multiple events (bulk)
router.post(
  "/attending/bulk",
  ...studentAuth,
  friendController.getFriendsAttendingEvents.bind(friendController)
);

// Update privacy settings
router.put(
  "/privacy",
  ...studentAuth,
  friendController.updatePrivacySettings.bind(friendController)
);

export default router;

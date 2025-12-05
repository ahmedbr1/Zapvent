import { Router } from "express";
import forumController from "../controllers/forumController";
import { loginRequired, allowedRoles } from "../middleware/authMiddleware";

const router = Router();

// Public routes
router.get("/posts", forumController.getPosts.bind(forumController));
router.get("/posts/:postId", forumController.getPost.bind(forumController));
router.get("/tags", forumController.getPopularTags.bind(forumController));

// Authenticated routes - anyone can participate
router.post(
  "/posts",
  loginRequired,
  forumController.createPost.bind(forumController)
);
router.delete(
  "/posts/:postId",
  loginRequired,
  forumController.deletePost.bind(forumController)
);
router.post(
  "/posts/:postId/vote",
  loginRequired,
  forumController.voteOnPost.bind(forumController)
);

// Answers
router.post(
  "/posts/:postId/answers",
  loginRequired,
  forumController.createAnswer.bind(forumController)
);
router.post(
  "/posts/:postId/answers/:answerId/vote",
  loginRequired,
  forumController.voteOnAnswer.bind(forumController)
);
router.post(
  "/posts/:postId/answers/:answerId/accept",
  loginRequired,
  forumController.acceptAnswer.bind(forumController)
);
router.delete(
  "/posts/:postId/answers/:answerId",
  loginRequired,
  forumController.deleteAnswer.bind(forumController)
);

// Comments
router.post(
  "/posts/:postId/answers/:answerId/comments",
  loginRequired,
  forumController.createComment.bind(forumController)
);
router.delete(
  "/posts/:postId/answers/:answerId/comments/:commentId",
  loginRequired,
  forumController.deleteComment.bind(forumController)
);

// Moderation - Admin/EventOffice only
router.post(
  "/posts/:postId/pin",
  loginRequired,
  allowedRoles(["Admin", "EventOffice"]),
  forumController.pinPost.bind(forumController)
);
router.post(
  "/posts/:postId/close",
  loginRequired,
  allowedRoles(["Admin", "EventOffice"]),
  forumController.closePost.bind(forumController)
);
router.post(
  "/posts/:postId/reopen",
  loginRequired,
  allowedRoles(["Admin", "EventOffice"]),
  forumController.reopenPost.bind(forumController)
);

export default router;

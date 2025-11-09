import { Router } from "express";
import commentController from "../controllers/commentController";

const router = Router();

router.post(
  "/events/:eventId",
  commentController.createComment.bind(commentController)
);

router.get(
  "/events/:eventId",
  commentController.getEventComments.bind(commentController)
);

router.delete(
  "/:commentId",
  commentController.deleteInappropriateComment.bind(commentController)
);

export default router;

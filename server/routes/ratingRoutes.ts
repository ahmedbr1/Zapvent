import { Router } from "express";
import ratingController from "../controllers/ratingController";

const router = Router();

router.post(
  "/events/:eventId",
  ratingController.submitRating.bind(ratingController)
);

router.get(
  "/events/:eventId/feedback",
  ratingController.getEventFeedback.bind(ratingController)
);

export default router;

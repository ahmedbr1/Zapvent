import type { Response } from "express";
import type { AuthRequest } from "../middleware/authMiddleware";
import { LoginRequired, AllowedRoles } from "../middleware/authDecorators";
import * as ratingService from "../services/ratingService";
import * as commentService from "../services/commentService";

export class RatingController {
  @LoginRequired()
  @AllowedRoles(["Student", "Staff", "TA", "Professor"])
  async submitRating(req: AuthRequest, res: Response) {
    try {
      const userId = req.user?.id;
      const { eventId } = req.params;
      const { rating, comment } = req.body ?? {};

      if (!userId) {
        return res.status(401).json({
          success: false,
          message: "Authentication required.",
        });
      }

      const result = await ratingService.submitRating(userId, {
        eventId,
        rating: typeof rating === "string" ? Number(rating) : rating,
        comment,
      });

      const status = result.success ? 201 : result.statusCode ?? 400;
      return res.status(status).json({
        success: result.success,
        message: result.message,
        data: result.data,
      });
    } catch (error) {
      console.error("Submit rating error:", error);
      return res.status(500).json({
        success: false,
        message: "Failed to submit rating.",
      });
    }
  }

  @LoginRequired()
  @AllowedRoles(["Student", "Staff", "TA", "Professor", "EventOffice", "Admin"])
  async getEventFeedback(req: AuthRequest, res: Response) {
    try {
      const { eventId } = req.params;

      const [ratingsResult, commentsResult] = await Promise.all([
        ratingService.getEventRatings(eventId),
        commentService.getEventComments(eventId),
      ]);

      if (!ratingsResult.success) {
        return res.status(ratingsResult.statusCode ?? 400).json({
          success: false,
          message: ratingsResult.message,
        });
      }

      if (!commentsResult.success) {
        return res.status(commentsResult.statusCode ?? 400).json({
          success: false,
          message: commentsResult.message,
        });
      }

      return res.status(200).json({
        success: true,
        data: {
          ratings: ratingsResult.data,
          comments: commentsResult.data,
        },
      });
    } catch (error) {
      console.error("Get event feedback error:", error);
      return res.status(500).json({
        success: false,
        message: "Failed to load event feedback.",
      });
    }
  }
}

export const ratingController = new RatingController();
export default ratingController;

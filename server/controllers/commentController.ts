import type { Response } from "express";
import type { AuthRequest } from "../middleware/authMiddleware";
import { LoginRequired, AllowedRoles } from "../middleware/authDecorators";
import * as commentService from "../services/commentService";

export class CommentController {
  @LoginRequired()
  @AllowedRoles(["Student", "Staff", "TA", "Professor"])
  async createComment(req: AuthRequest, res: Response) {
    try {
      const userId = req.user?.id;
      const { eventId } = req.params;
      const { content, parentCommentId } = req.body ?? {};

      if (!userId) {
        return res.status(401).json({
          success: false,
          message: "Authentication required.",
        });
      }

      const result = await commentService.createComment(userId, {
        eventId,
        content,
        parentCommentId,
      });

      const status = result.success ? 201 : result.statusCode ?? 400;
      return res.status(status).json({
        success: result.success,
        message: result.message,
        data: result.data,
      });
    } catch (error) {
      console.error("Create comment error:", error);
      return res.status(500).json({
        success: false,
        message: "Failed to create comment.",
      });
    }
  }

  @LoginRequired()
  @AllowedRoles(["Student", "Staff", "TA", "Professor", "EventOffice", "Admin"])
  async getEventComments(req: AuthRequest, res: Response) {
    try {
      const { eventId } = req.params;
      const result = await commentService.getEventComments(eventId);
      const status = result.success ? 200 : result.statusCode ?? 400;

      return res.status(status).json({
        success: result.success,
        message: result.message,
        data: result.data,
      });
    } catch (error) {
      console.error("Get event comments error:", error);
      return res.status(500).json({
        success: false,
        message: "Failed to load comments.",
      });
    }
  }

  @LoginRequired()
  @AllowedRoles(["Admin"])
  async deleteInappropriateComment(req: AuthRequest, res: Response) {
    try {
      const { commentId } = req.params;
      const { reason } = req.body ?? {};

      const result = await commentService.deleteCommentAsAdmin(commentId, reason);
      const status = result.success ? 200 : result.statusCode ?? 400;

      return res.status(status).json({
        success: result.success,
        message: result.message,
        data: result.data,
      });
    } catch (error) {
      console.error("Delete comment error:", error);
      return res.status(500).json({
        success: false,
        message: "Failed to delete comment.",
      });
    }
  }
}

export const commentController = new CommentController();
export default commentController;

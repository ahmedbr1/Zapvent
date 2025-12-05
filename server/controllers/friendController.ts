import { Response } from "express";
import type { AuthRequest } from "../middleware/authMiddleware";
import * as friendService from "../services/friendService";

export class FriendController {
  async sendFriendRequest(req: AuthRequest, res: Response) {
    if (!req.user) {
      return res
        .status(401)
        .json({ success: false, message: "Authentication required." });
    }

    const { userId } = req.body;
    if (!userId) {
      return res
        .status(400)
        .json({ success: false, message: "User ID is required." });
    }

    const result = await friendService.sendFriendRequest(req.user.id, userId);
    return res
      .status(result.statusCode || (result.success ? 200 : 400))
      .json(result);
  }

  async acceptFriendRequest(req: AuthRequest, res: Response) {
    if (!req.user) {
      return res
        .status(401)
        .json({ success: false, message: "Authentication required." });
    }

    const { userId } = req.params;
    const result = await friendService.acceptFriendRequest(req.user.id, userId);
    return res
      .status(result.statusCode || (result.success ? 200 : 400))
      .json(result);
  }

  async rejectFriendRequest(req: AuthRequest, res: Response) {
    if (!req.user) {
      return res
        .status(401)
        .json({ success: false, message: "Authentication required." });
    }

    const { userId } = req.params;
    const result = await friendService.rejectFriendRequest(req.user.id, userId);
    return res
      .status(result.statusCode || (result.success ? 200 : 400))
      .json(result);
  }

  async removeFriend(req: AuthRequest, res: Response) {
    if (!req.user) {
      return res
        .status(401)
        .json({ success: false, message: "Authentication required." });
    }

    const { userId } = req.params;
    const result = await friendService.removeFriend(req.user.id, userId);
    return res
      .status(result.statusCode || (result.success ? 200 : 400))
      .json(result);
  }

  async cancelFriendRequest(req: AuthRequest, res: Response) {
    if (!req.user) {
      return res
        .status(401)
        .json({ success: false, message: "Authentication required." });
    }

    const { userId } = req.params;
    const result = await friendService.cancelFriendRequest(req.user.id, userId);
    return res
      .status(result.statusCode || (result.success ? 200 : 400))
      .json(result);
  }

  async getFriendsList(req: AuthRequest, res: Response) {
    if (!req.user) {
      return res
        .status(401)
        .json({ success: false, message: "Authentication required." });
    }

    const result = await friendService.getFriendsList(req.user.id);
    return res.status(result.success ? 200 : 400).json(result);
  }

  async getPendingRequests(req: AuthRequest, res: Response) {
    if (!req.user) {
      return res
        .status(401)
        .json({ success: false, message: "Authentication required." });
    }

    const result = await friendService.getPendingFriendRequests(req.user.id);
    return res.status(result.success ? 200 : 400).json(result);
  }

  async getFriendsAttendingEvent(req: AuthRequest, res: Response) {
    if (!req.user) {
      return res
        .status(401)
        .json({ success: false, message: "Authentication required." });
    }

    const { eventId } = req.params;
    const result = await friendService.getFriendsAttendingEvent(
      req.user.id,
      eventId
    );
    return res
      .status(result.statusCode || (result.success ? 200 : 400))
      .json(result);
  }

  async getFriendsAttendingEvents(req: AuthRequest, res: Response) {
    if (!req.user) {
      return res
        .status(401)
        .json({ success: false, message: "Authentication required." });
    }

    const eventIds = req.body.eventIds as string[];
    if (!Array.isArray(eventIds)) {
      return res
        .status(400)
        .json({ success: false, message: "Event IDs array is required." });
    }

    const result = await friendService.getFriendsAttendingEvents(
      req.user.id,
      eventIds
    );
    return res.status(result.success ? 200 : 400).json(result);
  }

  async updatePrivacySettings(req: AuthRequest, res: Response) {
    if (!req.user) {
      return res
        .status(401)
        .json({ success: false, message: "Authentication required." });
    }

    const { hideEventAttendance } = req.body;
    const result = await friendService.updatePrivacySettings(req.user.id, {
      hideEventAttendance,
    });
    return res
      .status(result.statusCode || (result.success ? 200 : 400))
      .json(result);
  }

  async searchStudents(req: AuthRequest, res: Response) {
    if (!req.user) {
      return res
        .status(401)
        .json({ success: false, message: "Authentication required." });
    }

    const query = req.query.q as string;
    if (!query?.trim()) {
      return res
        .status(400)
        .json({ success: false, message: "Search query is required." });
    }

    const limit = Math.min(parseInt(req.query.limit as string) || 20, 50);
    const result = await friendService.searchStudents(
      query,
      req.user.id,
      limit
    );
    return res.status(result.success ? 200 : 400).json(result);
  }
}

const friendController = new FriendController();
export default friendController;

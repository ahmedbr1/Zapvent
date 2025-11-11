import { Response } from "express";
import type { AuthRequest } from "../middleware/authMiddleware";
import {
  createVendorBoothPoll,
  voteForVendor,
  type CreateVendorBoothPollInput,
} from "../services/pollService";

class PollController {
  async createVendorBoothPoll(req: AuthRequest, res: Response) {
    const payload = req.body as CreateVendorBoothPollInput;

    const result = await createVendorBoothPoll(payload);
    return res
      .status(result.statusCode ?? (result.success ? 200 : 400))
      .json(result);
  }

  async voteForVendor(req: AuthRequest, res: Response) {
    const { pollId } = req.params;
    const { vendorId, userId: overrideUserId } = req.body ?? {};

    if (!vendorId) {
      return res.status(400).json({
        success: false,
        message: "vendorId is required",
      });
    }

    const actingUserId =
      req.user?.id ||
      (typeof overrideUserId === "string" && overrideUserId.length > 0
        ? overrideUserId
        : undefined);

    if (!actingUserId) {
      return res.status(401).json({
        success: false,
        message: "Authentication required",
      });
    }

    const result = await voteForVendor(pollId, actingUserId, vendorId);
    return res
      .status(result.statusCode ?? (result.success ? 200 : 400))
      .json(result);
  }
}

export const pollController = new PollController();

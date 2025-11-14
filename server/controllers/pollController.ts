import { Response } from "express";
import type { AuthRequest } from "../middleware/authMiddleware";
import {
  createVendorBoothPoll,
  voteForVendor,
  listVendorBoothPolls,
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
    const { vendorId } = req.body ?? {};

    if (!vendorId) {
      return res.status(400).json({
        success: false,
        message: "vendorId is required",
      });
    }

    if (!req.user?.id) {
      return res.status(401).json({
        success: false,
        message: "Authentication required",
      });
    }

    const result = await voteForVendor(pollId, req.user.id, vendorId);
    return res
      .status(result.statusCode ?? (result.success ? 200 : 400))
      .json(result);
  }

  async listPolls(req: AuthRequest, res: Response) {
    try {
      const result = await listVendorBoothPolls(req.user?.id);

      if (!result.success) {
        return res.status(400).json({
          success: false,
          message: result.message ?? "Failed to load polls.",
        });
      }

      return res.status(200).json({
        success: true,
        polls: result.polls,
      });
    } catch (error) {
      console.error("List polls error:", error);
      return res.status(500).json({
        success: false,
        message: "Failed to load polls.",
      });
    }
  }
}

export const pollController = new PollController();

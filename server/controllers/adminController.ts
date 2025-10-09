import type { Response } from "express";
import * as adminService from "../services/adminService";
import { AdminRequired } from "../middleware/authDecorators";
import type { AuthRequest } from "../middleware/authMiddleware";

export class AdminController {

  @AdminRequired()
  async approveUser(req: AuthRequest, res: Response) {
    try {
      const { userId } = req.params;

      const result = await adminService.approveUser(userId);
      
      res.status(200).json({
        success: true,
        ...result
      });
    } catch (error: unknown) {
      console.error('Approve user error:', error);
      res.status(400).json({
        success: false,
        message: error instanceof Error ? error.message : 'Failed to approve user'
      });
    }
  }

  @AdminRequired()
  async rejectUser(req: AuthRequest, res: Response) {
    try {
      const { userId } = req.params;
      const { reason } = req.body;

      const result = await adminService.rejectUser(userId, reason);
      
      res.status(200).json({
        success: true,
        ...result
      });
    } catch (error: unknown) {
      console.error('Reject user error:', error);
      res.status(400).json({
        success: false,
        message: error instanceof Error ? error.message : 'Failed to reject user'
      });
    }
  }
}

// Export an instance
export const adminController = new AdminController();
import type { Response } from "express";
import type { AuthRequest } from "../middleware/authMiddleware";
import { applyToBazaar } from "../services/vendorService";
import { LoginRequired, AllowedRoles } from "../middleware/authDecorators";

class VendorController {
  @LoginRequired()
  @AllowedRoles(["Vendor"])
  async applyToBazaar(req: AuthRequest, res: Response) {
    try {
      const vendorId = req.user?.id; // From authentication middleware
      const { eventId, attendees, boothSize } = req.body;

      // Validate input
      if (!eventId || !attendees || !boothSize) {
        return res.status(400).json({
          success: false,
          message: "eventId, attendees, and boothSize are required",
        });
      }

      if (!vendorId) {
        return res.status(401).json({
          success: false,
          message: "User not authenticated",
        });
      }
      const result = await applyToBazaar(vendorId, {
        eventId,
        attendees,
        boothSize,
      });

      if (!result.success) {
        return res.status(400).json(result);
      }

      return res.status(201).json(result);
    } catch (error) {
      console.error("Apply to bazaar controller error:", error);
      return res.status(500).json({
        success: false,
        message: "Internal server error",
      });
    }
  }
}

const vendorController = new VendorController();
export default vendorController;

import { Request, Response } from "express";
import * as vendorService from "../services/vendorService";
import { z } from "zod";
import type { Response } from "express";
import type { AuthRequest } from "../middleware/authMiddleware";
import { applyToBazaar } from "../services/vendorService";
import { LoginRequired, AllowedRoles } from "../middleware/authDecorators";

export class vendorController {
  
  async vendorSignup(req: Request, res: Response) {
    try {
      const vendor = await vendorService.signup(req.body);
      
      res.status(201).json({
        success: true,
        message: 'Vendor registered successfully. Please complete your profile.',
        data: vendor
      });

    } catch (error) {
      // Handle Zod validation errors
      if (error instanceof z.ZodError) {
        return res.status(400).json({
          success: false,
          message: 'Validation failed',
          errors: error.issues
        });
      }
      
      // Handle MongoDB duplicate key errors
      if (error && typeof error === 'object' && 'code' in error && error.code === 11000) {
        return res.status(400).json({
          success: false,
          message: 'Email already exists'
        });
      }
      
      // Handle other errors
      res.status(500).json({
        success: false,
        message: 'Internal server error'
      });
    }
  }



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

export const vendorController = new VendorController();
export default vendorController;

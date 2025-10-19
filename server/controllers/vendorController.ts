import type { Request, Response } from "express";
import * as vendorService from "../services/vendorService";
import { z } from "zod";
import type { AuthRequest } from "../middleware/authMiddleware";
import { applyToBazaar } from "../services/vendorService";
import { LoginRequired, AllowedRoles } from "../middleware/authDecorators";
import vendorModel, { VendorStatus } from "../models/Vendor";

export class VendorController {
  async vendorSignup(req: Request, res: Response) {
    try {
      // Validate required file uploads
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const files = (req as any).files as Record<string, any[]> | undefined;

      if (!files || !files.logo || !files.taxCard || !files.documents) {
        return res.status(400).json({
          success: false,
          message:
            "All required documents must be uploaded (logo, tax card, and documents)",
        });
      }

      const vendor = await vendorService.signup(req.body);

      res.status(201).json({
        success: true,
        message:
          "Vendor registered successfully. Please complete your profile.",
        data: vendor,
      });
    } catch (error) {
      // Handle Zod validation errors
      if (error instanceof z.ZodError) {
        return res.status(400).json({
          success: false,
          message: "Validation failed",
          errors: error.issues,
        });
      }

      // Handle MongoDB duplicate key errors
      if (
        error &&
        typeof error === "object" &&
        "code" in error &&
        error.code === 11000
      ) {
        return res.status(400).json({
          success: false,
          message: "Email already exists",
        });
      }

      // Handle other errors
      res.status(500).json({
        success: false,
        message: "Internal server error",
      });
    }
  }

  @LoginRequired()
  @AllowedRoles(["Vendor"])
  async applyToBazaar(req: AuthRequest, res: Response) {
    try {
      const vendorId = req.user?.id; // From authentication middleware
      const {
        eventId,
        attendees,
        boothSize,
        boothLocation,
        boothStartTime,
        boothEndTime,
      } = req.body;

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
        boothInfo: {
          boothLocation,
          boothStartTime,
          boothEndTime,
        },
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

  @LoginRequired()
  @AllowedRoles(["Admin"])
  async updateBazaarApplicationStatus(req: AuthRequest, res: Response) {
    try {
      const { vendorId, eventId, status } = req.body;

      if (!vendorId || !eventId || !status) {
        return res.status(400).json({
          success: false,
          message: "vendorId, eventId, and status are required",
        });
      }

      if (![VendorStatus.APPROVED, VendorStatus.REJECTED].includes(status)) {
        return res.status(400).json({
          success: false,
          message: "Status must be 'approved' or 'rejected'",
        });
      }

      const vendor = await vendorModel.findById(vendorId);
      if (!vendor) {
        return res.status(404).json({
          success: false,
          message: "Vendor not found",
        });
      }

      interface VendorApplication {
        eventId: string;
        status: VendorStatus;
        attendees?: number;
        boothSize?: string;
        // Add other fields as needed
      }

      interface VendorDocument {
        applications?: VendorApplication[];
        // Add other fields as needed
        save: () => Promise<void>;
      }

      const vendorTyped = vendor as VendorDocument;

      const application: VendorApplication | undefined =
        vendorTyped.applications?.find(
          (app: VendorApplication) => app.eventId.toString() === eventId
        );
      if (!application) {
        return res.status(404).json({
          success: false,
          message: "Application not found",
        });
      }

      application.status = status;
      await vendor.save();

      return res.json({
        success: true,
        message: `Application status updated to '${status}'`,
      });
    } catch (error) {
      console.error("Update bazaar application status error:", error);
      return res.status(500).json({
        success: false,
        message: "Internal server error",
      });
    }
  }

  @LoginRequired()
  @AllowedRoles(["Admin"])
  async listVendorsForAdmin(req: AuthRequest, res: Response) {
    try {
      const result = await vendorService.findAllForAdmin();

      if (!result.success) {
        return res.status(500).json({
          success: false,
          message: result.message,
        });
      }

      return res.status(200).json(result);
    } catch (error: unknown) {
      console.error("List vendors for admin error:", error);
      return res.status(500).json({
        success: false,
        message:
          error instanceof Error ? error.message : "Failed to retrieve vendors",
      });
    }
  }

  @LoginRequired()
  @AllowedRoles(["Admin"])
  async verifyVendor(req: AuthRequest, res: Response) {
    try {
      const { vendorId } = req.params;

      if (!vendorId) {
        return res.status(400).json({
          success: false,
          message: "Vendor ID is required",
        });
      }

      // Call the verify service (you'll need to implement this)
      const result = await vendorService.verifyVendor(vendorId);

      if (!result.success) {
        const statusCode = result.message === "Vendor not found" ? 404 : 400;
        return res.status(statusCode).json(result);
      }

      return res.status(200).json(result);
    } catch (error: unknown) {
      console.error("Verify vendor error:", error);
      return res.status(500).json({
        success: false,
        message:
          error instanceof Error ? error.message : "Failed to verify vendor",
      });
    }
  }
}

export const vendorController = new VendorController();
export default vendorController;

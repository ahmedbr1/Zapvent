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
      console.log("=== Apply to Bazaar Controller Entry ===");
      console.log("Request Headers:", JSON.stringify(req.headers, null, 2));
      console.log("User from Auth Middleware:", req.user);

      const vendorId = req.user?.id; // From authentication middleware
      if (!vendorId) {
        console.log("❌ NO VENDOR ID - Authentication failed");
        return res.status(401).json({
          success: false,
          message: "Authentication required",
        });
      }

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const body = (req as any).body;

      console.log("=== Apply to Bazaar Request ===");
      console.log("Vendor ID:", vendorId);
      console.log("Request Body:", JSON.stringify(body, null, 2));

      const {
        eventId,
        attendees,
        boothSize,
        boothLocation,
        boothStartTime,
        boothEndTime,
        vendorEmail,
        companyName,
      } = body;

      // Validate input
      if (!eventId || !attendees || !boothSize) {
        console.log("Validation failed: missing required fields");
        return res.status(400).json({
          success: false,
          message: "eventId, attendees, and boothSize are required",
        });
      }

      if (boothSize !== "2x2" && boothSize !== "4x4") {
        console.log("Validation failed: invalid booth size");
        return res.status(400).json({
          success: false,
          message: "Booth size must be '2x2' or '4x4'",
        });
      }

      // Validate attendees limit
      if (attendees > 5) {
        console.log("Validation failed: too many attendees");
        return res.status(400).json({
          success: false,
          message: "Maximum 5 attendees allowed per booth",
        });
      }

      if (!vendorId) {
        console.log("Validation failed: no vendor ID");
        return res.status(401).json({
          success: false,
          message: "User not authenticated",
        });
      }

      // Build attendees array with vendor info
      const attendeesArray = [];
      for (let i = 0; i < attendees; i++) {
        attendeesArray.push({
          name: companyName || "Vendor",
          email: vendorEmail || req.user?.email || "",
        });
      }

      console.log(
        "Built attendees array:",
        JSON.stringify(attendeesArray, null, 2)
      );

      const result = await applyToBazaar(vendorId, {
        eventId,
        attendees: attendeesArray,
        boothSize,
        boothInfo: {
          boothLocation,
          boothStartTime,
          boothEndTime,
        },
      });

      console.log("Service result:", JSON.stringify(result, null, 2));

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
  @AllowedRoles(["Vendor"])
  async getMyApplications(req: AuthRequest, res: Response) {
    try {
      const vendorId = req.user?.id;
      if (!vendorId) {
        return res.status(401).json({
          success: false,
          message: "Authentication required",
        });
      }

      const result = await vendorService.getVendorApplications(vendorId);
      if (!result.success) {
        return res.status(400).json(result);
      }

      return res.status(200).json(result);
    } catch (error) {
      console.error("Get vendor applications error:", error);
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

  @LoginRequired()
  @AllowedRoles(["Vendor"])
  async getProfile(req: AuthRequest, res: Response) {
    try {
      const vendorId = req.user?.id;

      if (!vendorId) {
        return res.status(401).json({
          success: false,
          message: "User not authenticated",
        });
      }

      const result = await vendorService.getVendorProfile(vendorId);

      if (!result.success) {
        const statusCode = result.message === "Vendor not found" ? 404 : 400;
        return res.status(statusCode).json(result);
      }

      return res.status(200).json(result);
    } catch (error) {
      console.error("Get vendor profile error:", error);
      return res.status(500).json({
        success: false,
        message: "Internal server error",
      });
    }
  }

  @LoginRequired()
  @AllowedRoles(["Vendor"])
  async updateProfile(req: AuthRequest, res: Response) {
    try {
      const vendorId = req.user?.id;

      if (!vendorId) {
        return res.status(401).json({
          success: false,
          message: "User not authenticated",
        });
      }

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const updateData = (req as any).body;

      // Handle file uploads if present
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const files = (req as any).files as Record<string, any[]> | undefined;

      if (files) {
        if (files.logo && files.logo[0]) {
          updateData.logo = files.logo[0].path;
        }
        if (files.taxCard && files.taxCard[0]) {
          updateData.taxCard = files.taxCard[0].path;
        }
        if (files.documents && files.documents[0]) {
          updateData.documents = files.documents[0].path;
        }
      }

      const result = await vendorService.updateVendorProfile(
        vendorId,
        updateData
      );

      if (!result.success) {
        const statusCode = result.message === "Vendor not found" ? 404 : 400;
        return res.status(statusCode).json(result);
      }

      return res.status(200).json(result);
    } catch (error) {
      console.error("Update vendor profile error:", error);
      return res.status(500).json({
        success: false,
        message: "Internal server error",
      });
    }
  }
  @LoginRequired()
  @AllowedRoles(["Admin"])
  async approveVendorAccount(req: AuthRequest, res: Response) {
    try {
      const { vendorId } = req.params;

      if (!vendorId) {
        return res.status(400).json({
          success: false,
          message: "Vendor ID is required",
        });
      }

      const result = await vendorService.approveVendorAccount(vendorId);

      const statusCode = result.success ? 200 : 400;
      return res.status(statusCode).json(result);
    } catch (error) {
      console.error("Approve vendor account error:", error);
      return res.status(500).json({
        success: false,
        message: "Internal server error",
      });
    }
  }

  @LoginRequired()
  @AllowedRoles(["Admin"])
  async rejectVendorAccount(req: AuthRequest, res: Response) {
    try {
      const { vendorId } = req.params;

      if (!vendorId) {
        return res.status(400).json({
          success: false,
          message: "Vendor ID is required",
        });
      }

      const result = await vendorService.rejectVendorAccount(vendorId);

      const statusCode = result.success ? 200 : 400;
      return res.status(statusCode).json(result);
    } catch (error) {
      console.error("Reject vendor account error:", error);
      return res.status(500).json({
        success: false,
        message: "Internal server error",
      });
    }
  }
}

export const vendorController = new VendorController();
export default vendorController;

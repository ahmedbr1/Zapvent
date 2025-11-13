import type { Request, Response } from "express";
import * as vendorService from "../services/vendorService";
import { z } from "zod";
import type { AuthRequest } from "../middleware/authMiddleware";
import { LoginRequired, AllowedRoles } from "../middleware/authDecorators";
import { VendorStatus, VendorAttendee } from "../models/Vendor";
import { BazaarBoothSize } from "../models/Event";
import { imageSync } from "qr-image";
import fs from "fs";
import path from "path";
interface UploadedFile {
  path?: string;
}

type MulterFilesField =
  | UploadedFile[]
  | Record<string, UploadedFile[]>
  | undefined;

function parseOptionalDate(value: unknown): Date | undefined {
  if (value instanceof Date) {
    return value;
  }

  if (typeof value === "string" && value.trim()) {
    const parsed = new Date(value);
    if (!Number.isNaN(parsed.getTime())) {
      return parsed;
    }
  }

  return undefined;
}

function parseAttendeesFromRequest(
  req: AuthRequest
):
  | { success: true; attendees: VendorAttendee[] }
  | { success: false; message: string } {
  const body = (req.body ?? {}) as Record<string, unknown>;
  const attendeesPayload = body.attendees;

  const filesField = (req as AuthRequest & { files?: MulterFilesField }).files;
  let idFiles: UploadedFile[] = [];

  if (Array.isArray(filesField)) {
    idFiles = filesField;
  } else if (filesField && typeof filesField === "object") {
    const fileRecord = filesField as Record<string, UploadedFile[]>;
    if (Array.isArray(fileRecord.attendeeIds)) {
      idFiles = fileRecord.attendeeIds;
    }
  }

  if (attendeesPayload === undefined || attendeesPayload === null) {
    return {
      success: true,
      attendees: [],
    };
  }

  let attendeesArray: unknown;
  if (typeof attendeesPayload === "string") {
    try {
      attendeesArray = JSON.parse(attendeesPayload);
    } catch {
      return {
        success: false,
        message: "Attendees payload must be valid JSON.",
      };
    }
  } else {
    attendeesArray = attendeesPayload;
  }

  if (!Array.isArray(attendeesArray)) {
    return {
      success: false,
      message: "Attendees must be provided as an array.",
    };
  }

  if (attendeesArray.length === 0) {
    return {
      success: true,
      attendees: [],
    };
  }

  if (attendeesArray.length > 5) {
    return {
      success: false,
      message: "Maximum 5 attendees allowed per booth",
    };
  }

  const normalizedAttendees: VendorAttendee[] = [];
  for (let index = 0; index < attendeesArray.length; index++) {
    const entry = attendeesArray[index];
    if (!entry || typeof entry !== "object") {
      return {
        success: false,
        message:
          "Invalid attendees provided. Ensure each attendee includes name and email.",
      };
    }
    const { name, email, idDocumentPath } = entry as {
      name?: string;
      email?: string;
      idDocumentPath?: string;
    };

    const fallbackEmail = req.user?.email ?? "";
    const attendeeEmail = (email ?? fallbackEmail).trim();
    let assignedPath = idDocumentPath || idFiles[index]?.path;

    if (!assignedPath) {
      // Generate a QR image for this attendee and save it to uploads/
      try {
        const uploadsDir = path.join(process.cwd(), "uploads");
        if (!fs.existsSync(uploadsDir)) {
          fs.mkdirSync(uploadsDir, { recursive: true });
        }

        const vendorId = req.user?.id ?? "unknown";
        const filename = `attendee-${vendorId}-${Date.now()}-${index}.png`;
        const filePath = path.join(uploadsDir, filename);

        const payload = JSON.stringify({
          name: name ?? "Attendee",
          email: email ?? "",
        });
        const pngBuffer = imageSync(payload, { type: "png" }) as Buffer;
        fs.writeFileSync(filePath, pngBuffer);

        // Use relative path for storage consistency with uploaded files
        assignedPath = `uploads/${filename}`;
      } catch (err) {
        console.error("Failed to generate QR image for attendee:", err);
        return {
          success: false,
          message: `Missing ID document for attendee #${index + 1} and failed to generate QR.`,
        };
      }
    }

    normalizedAttendees.push({
      name: typeof name === "string" && name.trim() ? name.trim() : "Attendee",
      email: attendeeEmail,
      idDocumentPath: assignedPath,
    });
  }

  return {
    success: true,
    attendees: normalizedAttendees,
  };
}

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

      const body = (req.body ?? {}) as Record<string, unknown>;

      console.log("=== Apply to Bazaar Request ===");
      console.log("Vendor ID:", vendorId);
      console.log("Request Body:", JSON.stringify(body, null, 2));

      const {
        eventId,
        boothSize,
        boothLocation,
        boothStartTime,
        boothEndTime,
      } = body;

      // Validate input
      if (!eventId || !boothSize) {
        console.log("Validation failed: missing required fields");
        return res.status(400).json({
          success: false,
          message: "eventId and boothSize are required",
        });
      }

      if (typeof boothSize !== "string") {
        return res.status(400).json({
          success: false,
          message: "boothSize must be provided as a string value.",
        });
      }

      const normalizedBoothSize = boothSize.trim();

      if (normalizedBoothSize !== "2x2" && normalizedBoothSize !== "4x4") {
        console.log("Validation failed: invalid booth size");
        return res.status(400).json({
          success: false,
          message: "Booth size must be '2x2' or '4x4'",
        });
      }

      const attendeeParseResult = parseAttendeesFromRequest(req);
      if (!attendeeParseResult.success) {
        return res.status(400).json({
          success: false,
          message: attendeeParseResult.message,
        });
      }

      const boothInfo = {
        boothLocation:
          typeof boothLocation === "string" && boothLocation.trim()
            ? boothLocation.trim()
            : undefined,
        boothStartTime: parseOptionalDate(boothStartTime),
        boothEndTime: parseOptionalDate(boothEndTime),
      };

      const boothInfoPayload =
        boothInfo.boothLocation ||
        boothInfo.boothStartTime ||
        boothInfo.boothEndTime
          ? boothInfo
          : undefined;

      const result = await vendorService.applyToBazaar(vendorId, {
        eventId: eventId as string,
        attendees: attendeeParseResult.attendees,
        boothSize: normalizedBoothSize as BazaarBoothSize,
        boothInfo: boothInfoPayload,
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
  @AllowedRoles(["Vendor"])
  async cancelMyApplication(req: AuthRequest, res: Response) {
    try {
      const vendorId = req.user?.id;
      const { eventId } = req.params;

      if (!vendorId) {
        return res.status(401).json({
          success: false,
          message: "Authentication required",
        });
      }

      if (!eventId) {
        return res.status(400).json({
          success: false,
          message: "eventId is required",
        });
      }

      const result = await vendorService.cancelBazaarApplication(
        vendorId,
        eventId
      );

      const statusCode = result.success ? 200 : 400;
      return res.status(statusCode).json(result);
    } catch (error) {
      console.error("Cancel vendor application error:", error);
      return res.status(500).json({
        success: false,
        message: "Internal server error",
      });
    }
  }

  @LoginRequired()
  @AllowedRoles(["Admin", "EventOffice"])
  async updateBazaarApplicationStatus(req: AuthRequest, res: Response) {
    try {
      const { vendorId, eventId, status, reason } = req.body;

      console.log("Update bazaar application status request:", {
        vendorId,
        eventId,
        status,
        hasUser: !!req.user,
        userRole: req.user?.role,
      });

      if (!vendorId || !eventId || !status) {
        return res.status(400).json({
          success: false,
          message: "vendorId, eventId, and status are required",
        });
      }

      // Normalize status to lowercase for comparison
      const normalizedStatus = String(status).toLowerCase().trim();

      // Validate status
      if (
        normalizedStatus !== VendorStatus.APPROVED &&
        normalizedStatus !== VendorStatus.REJECTED
      ) {
        return res.status(400).json({
          success: false,
          message: `Status must be 'approved' or 'rejected'. Received: '${normalizedStatus}'`,
        });
      }

      // Cast to VendorStatus enum
      const applicationStatus = normalizedStatus as VendorStatus;

      console.log("Calling vendorService.updateBazaarApplicationStatus with:", {
        vendorId,
        eventId,
        status: applicationStatus,
      });

      const result = await vendorService.updateBazaarApplicationStatus({
        vendorId,
        eventId,
        status: applicationStatus,
        reason,
      });

      console.log("Service result:", result);

      const statusCode = result.success
        ? 200
        : result.message.includes("not found")
          ? 404
          : 400;

      return res.status(statusCode).json(result);
    } catch (error) {
      console.error("Update bazaar application status error:", error);
      const errorMessage =
        error instanceof Error
          ? error.message
          : typeof error === "string"
            ? error
            : "Internal server error";
      return res.status(500).json({
        success: false,
        message: errorMessage,
      });
    }
  }

  @LoginRequired()
  @AllowedRoles(["Vendor"])
  async uploadApplicationAttendees(req: AuthRequest, res: Response) {
    try {
      const vendorId = req.user?.id;
      const eventId = (req.params?.eventId ?? req.body?.eventId) as
        | string
        | undefined;

      if (!vendorId) {
        return res.status(401).json({
          success: false,
          message: "Authentication required",
        });
      }

      if (!eventId) {
        return res.status(400).json({
          success: false,
          message: "Event ID is required",
        });
      }

      const attendeeParseResult = parseAttendeesFromRequest(req);
      if (!attendeeParseResult.success) {
        return res.status(400).json({
          success: false,
          message: attendeeParseResult.message,
        });
      }

      const result = await vendorService.updateApplicationAttendees({
        vendorId,
        eventId,
        attendees: attendeeParseResult.attendees,
      });

      const statusCode = result.success ? 200 : 400;
      return res.status(statusCode).json(result);
    } catch (error) {
      console.error("Upload application attendees error:", error);
      return res.status(500).json({
        success: false,
        message: "Internal server error",
      });
    }
  }

  @LoginRequired()
  @AllowedRoles(["Vendor"])
  async payForApplication(req: AuthRequest, res: Response) {
    try {
      const vendorId = req.user?.id;
      const eventId = (req.params?.eventId ?? req.body?.eventId) as
        | string
        | undefined;
      const amountPaid = Number(req.body?.amountPaid);
      const transactionReference =
        typeof req.body?.transactionReference === "string"
          ? req.body.transactionReference
          : undefined;

      if (!vendorId) {
        return res.status(401).json({
          success: false,
          message: "Authentication required",
        });
      }

      if (!eventId) {
        return res.status(400).json({
          success: false,
          message: "Event ID is required",
        });
      }

      if (!Number.isFinite(amountPaid) || amountPaid <= 0) {
        return res.status(400).json({
          success: false,
          message: "Valid payment amount is required",
        });
      }

      const result = await vendorService.recordVendorPayment({
        vendorId,
        eventId,
        amountPaid,
        transactionReference,
      });

      const statusCode = result.success ? 200 : 400;
      return res.status(statusCode).json(result);
    } catch (error) {
      console.error("Record vendor payment error:", error);
      return res.status(500).json({
        success: false,
        message: "Internal server error",
      });
    }
  }

  @LoginRequired()
  @AllowedRoles(["Admin", "EventOffice"])
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
  @AllowedRoles(["Vendor"])
  async applyToLoyaltyProgram(req: AuthRequest, res: Response) {
    try {
      //const vendorId = "690d1f16c11accb382a0fd06"; // for testing without authentication
      const vendorId = req.user?.id;
      if (!vendorId) {
        return res.status(401).json({
          success: false,
          message: "User not authenticated",
        });
      }

      const result = await vendorService.applyToLoyaltyProgram(
        vendorId,
        req.body
      );

      const statusCode = result.success ? 200 : 400;
      return res.status(statusCode).json(result);
    } catch (error) {
      console.error("Apply loyalty program error:", error);
      return res.status(500).json({
        success: false,
        message: "Internal server error",
      });
    }
  }

  @LoginRequired()
  @AllowedRoles(["Vendor"])
  async cancelLoyaltyProgram(req: AuthRequest, res: Response) {
    try {
      // const vendorId = "690d1f16c11accb382a0fd06"; // for testing without authentication
      const vendorId = req.user?.id;

      if (!vendorId) {
        return res.status(401).json({
          success: false,
          message: "User not authenticated",
        });
      }

      const result = await vendorService.cancelLoyaltyProgram(vendorId);
      const statusCode = result.success ? 200 : 400;
      return res.status(statusCode).json(result);
    } catch (error) {
      console.error("Cancel loyalty program error:", error);
      return res.status(500).json({
        success: false,
        message: "Internal server error",
      });
    }
  }

  @LoginRequired()
  @AllowedRoles(["Vendor"])
  async getMyLoyaltyProgram(req: AuthRequest, res: Response) {
    try {
      const vendorId = req.user?.id;

      if (!vendorId) {
        return res.status(401).json({
          success: false,
          message: "User not authenticated",
        });
      }

      const result = await vendorService.getVendorLoyaltyProgram(vendorId);
      const statusCode =
        result.success ||
        result.message === "Vendor has not joined the loyalty program"
          ? 200
          : result.message === "Vendor not found"
            ? 404
            : 400;
      return res.status(statusCode).json(result);
    } catch (error) {
      console.error("Get loyalty program error:", error);
      return res.status(500).json({
        success: false,
        message: "Internal server error",
      });
    }
  }

  @LoginRequired()
  @AllowedRoles(["Student", "Staff", "TA", "Professor", "EventOffice", "Admin"])
  async listLoyaltyVendors(_req: AuthRequest, res: Response) {
    try {
      const result = await vendorService.listLoyaltyVendors();
      const statusCode = result.success ? 200 : 500;
      return res.status(statusCode).json(result);
    } catch (error) {
      console.error("List loyalty vendors error:", error);
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

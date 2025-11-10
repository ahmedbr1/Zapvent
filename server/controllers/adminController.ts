import type { Response } from "express";
import * as adminService from "../services/adminService";
import {
  AdminRequired,
  LoginRequired,
  AllowedRoles,
} from "../middleware/authDecorators";
import type { AuthRequest } from "../middleware/authMiddleware";
import { ValidateBody } from "../middleware/validationDecorators";

export class AdminController {
  @AdminRequired()
  async approveUser(req: AuthRequest, res: Response) {
    try {
      const { userId } = req.params;

      const result = await adminService.approveUser(userId);

      res.status(200).json({
        success: true,
        ...result,
      });
    } catch (error: unknown) {
      console.error("Approve user error:", error);
      res.status(400).json({
        success: false,
        message:
          error instanceof Error ? error.message : "Failed to approve user",
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
        ...result,
      });
    } catch (error: unknown) {
      console.error("Reject user error:", error);
      res.status(400).json({
        success: false,
        message:
          error instanceof Error ? error.message : "Failed to reject user",
      });
    }
  }

  @AdminRequired()
  async getAllAdmins(req: AuthRequest, res: Response) {
    const admins = await adminService.findAll();

    return res.status(200).json({
      success: true,
      count: admins.length,
      admins,
    });
  }

  @AdminRequired()
  async getAdminById(req: AuthRequest, res: Response) {
    const { id } = req.params;

    const admin = await adminService.findById(id);

    if (!admin) {
      return res.status(404).json({
        success: false,
        message: "Admin not found",
      });
    }

    return res.status(200).json({
      success: true,
      admin,
    });
  }

  @AdminRequired()
  @ValidateBody({ required: ["firstName", "lastName", "email", "password"] })
  async createAdmin(req: AuthRequest, res: Response) {
    const { firstName, lastName, email, password, status, adminType } =
      req.body;

    // ValidateBody already ensures these fields are required and non-empty
    // Duplicate email check is handled in the service layer
    const result = await adminService.createAdmin({
      firstName: firstName.trim(),
      lastName: lastName.trim(),
      email: email.trim().toLowerCase(),
      password,
      status,
      adminType,
    });

    if (!result.success) {
      return res.status(400).json({
        success: false,
        message: result.message,
      });
    }

    return res.status(201).json({
      success: true,
      message: "Admin created successfully",
      admin: result.admin,
      createdBy: {
        id: req.user?.id,
        email: req.user?.email,
      },
    });
  }

  @AdminRequired()
  @ValidateBody({ required: ["firstName", "lastName", "email"] })
  async updateAdmin(req: AuthRequest, res: Response) {
    const { id } = req.params;
    const { firstName, lastName, email } = req.body;

    // Authorization: Only aaadmin@gmail.com can update other admins
    // All admins can update their own profile
    const isOriginalAdmin = req.user?.email === "aaadmin@gmail.com";
    const isUpdatingSelf = id === req.user?.id;

    if (!isOriginalAdmin && !isUpdatingSelf) {
      return res.status(403).json({
        success: false,
        message: "You can only update your own profile",
      });
    }

    // ValidateBody already ensures these fields are required and non-empty
    // No need for redundant checks
    const result = await adminService.updateAdmin(id, {
      firstName: firstName.trim(),
      lastName: lastName.trim(),
      email: email.trim().toLowerCase(),
    });

    if (!result.success) {
      return res.status(400).json({
        success: false,
        message: result.message,
      });
    }

    return res.status(200).json({
      success: true,
      message: "Admin updated successfully",
      admin: result.admin,
    });
  }

  @AdminRequired()
  async blockAdminAccount(req: AuthRequest, res: Response) {
    const { id } = req.params;

    // Only aaadmin@gmail.com can block other admins
    if (req.user?.email !== "aaadmin@gmail.com") {
      return res.status(403).json({
        success: false,
        message: "Only the original admin can block other admins",
      });
    }

    // Prevent admin from blocking themselves
    if (id === req.user?.id) {
      return res.status(400).json({
        success: false,
        message: "You cannot block yourself",
      });
    }

    const result = await adminService.blockAdminAccount(id);

    if (!result.success) {
      return res.status(400).json({
        success: false,
        message: result.message,
      });
    }

    return res.status(200).json({
      success: true,
      message: result.message,
    });
  }

  @AdminRequired()
  async unblockAdminAccount(req: AuthRequest, res: Response) {
    const { id } = req.params;

    // Only aaadmin@gmail.com can unblock other admins
    if (req.user?.email !== "aaadmin@gmail.com") {
      return res.status(403).json({
        success: false,
        message: "Only the original admin can unblock other admins",
      });
    }

    const result = await adminService.unblockAdminAccount(id);

    if (!result.success) {
      return res.status(400).json({
        success: false,
        message: result.message,
      });
    }

    return res.status(200).json({
      success: true,
      message: result.message,
    });
  }

  @AdminRequired()
  async deleteAdmin(req: AuthRequest, res: Response) {
    const { id } = req.params;

    // Prevent admin from deleting themselves
    if (id === req.user?.id) {
      return res.status(400).json({
        success: false,
        message: "You cannot delete yourself",
      });
    }

    const result = await adminService.deleteAdmin(id);

    if (!result.success) {
      return res.status(404).json({
        success: false,
        message: result.message,
      });
    }

    return res.status(200).json({
      success: true,
      message: result.message,
      deletedBy: {
        id: req.user?.id,
        email: req.user?.email,
      },
    });
  }

  @AdminRequired()
  async blockUser(req: AuthRequest, res: Response) {
    try {
      const { userId } = req.params;

      // Prevent admin from blocking themselves
      if (userId === req.user?.id) {
        return res.status(400).json({
          success: false,
          message: "You cannot block yourself",
        });
      }

      const result = await adminService.blockUser(userId);

      if (!result.success) {
        const status =
          result.message === "Invalid user ID"
            ? 400
            : result.message === "User not found"
              ? 404
              : 500;

        return res.status(status).json({
          success: false,
          message: result.message,
        });
      }

      return res.status(200).json({
        success: true,
        message: result.message,
        blockedBy: {
          id: req.user?.id,
          email: req.user?.email,
        },
      });
    } catch (error: unknown) {
      console.error("Block user error:", error);
      return res.status(500).json({
        success: false,
        message:
          error instanceof Error ? error.message : "Failed to block user",
      });
    }
  }

  @AdminRequired()
  async viewAllUsers(req: AuthRequest, res: Response) {
    try {
      const result = await adminService.viewAllUsers();

      if (!result.success) {
        return res.status(500).json({
          success: false,
          message: result.message,
        });
      }

      return res.status(200).json({
        success: true,
        message: result.message,
        count: result.count,
        users: result.users,
      });
    } catch (error: unknown) {
      console.error("View all users error:", error);
      return res.status(500).json({
        success: false,
        message:
          error instanceof Error ? error.message : "Failed to retrieve users",
      });
    }
  }

  // Events Office Management
  @AdminRequired()
  async getAllEventsOffice(req: AuthRequest, res: Response) {
    try {
      const accounts = await adminService.findAllEventsOffice();

      return res.status(200).json({
        success: true,
        count: accounts.length,
        accounts,
      });
    } catch (error: unknown) {
      console.error("Get events office accounts error:", error);
      return res.status(500).json({
        success: false,
        message:
          error instanceof Error
            ? error.message
            : "Failed to retrieve events office accounts",
      });
    }
  }

  // Admin Management (adminType: "Admin")
  @AdminRequired()
  async getAllAdminsOnly(req: AuthRequest, res: Response) {
    try {
      const admins = await adminService.findAllAdmins();

      return res.status(200).json({
        success: true,
        count: admins.length,
        admins,
      });
    } catch (error: unknown) {
      console.error("Get admins error:", error);
      return res.status(500).json({
        success: false,
        message:
          error instanceof Error ? error.message : "Failed to retrieve admins",
      });
    }
  }

  @AdminRequired()
  @ValidateBody({ required: ["firstName", "lastName", "email", "password"] })
  async createEventsOffice(req: AuthRequest, res: Response) {
    const { firstName, lastName, email, password } = req.body;

    // ValidateBody already ensures these fields are required and non-empty
    // Duplicate email check is handled in the service layer
    const result = await adminService.createAdmin({
      firstName: firstName.trim(),
      lastName: lastName.trim(),
      email: email.trim().toLowerCase(),
      password,
      adminType: "EventOffice",
      status: "Active",
    });

    if (!result.success) {
      return res.status(400).json({
        success: false,
        message: result.message,
      });
    }

    return res.status(201).json({
      success: true,
      message: "Events Office account created successfully",
      account: result.admin,
    });
  }

  @AdminRequired()
  @ValidateBody({ required: ["firstName", "lastName", "email"] })
  async updateEventsOffice(req: AuthRequest, res: Response) {
    const { id } = req.params;
    const { firstName, lastName, email } = req.body;

    // ValidateBody already ensures these fields are required and non-empty
    // Duplicate email check is handled in the service layer
    const result = await adminService.updateAdmin(id, {
      firstName: firstName.trim(),
      lastName: lastName.trim(),
      email: email.trim().toLowerCase(),
    });

    if (!result.success) {
      return res.status(400).json({
        success: false,
        message: result.message,
      });
    }

    return res.status(200).json({
      success: true,
      message: "Events Office account updated successfully",
      account: result.admin,
    });
  }

  @AdminRequired()
  async deleteEventsOffice(req: AuthRequest, res: Response) {
    const { id } = req.params;

    // Prevent admin from deleting themselves
    if (id === req.user?.id) {
      return res.status(400).json({
        success: false,
        message: "You cannot delete yourself",
      });
    }

    const result = await adminService.deleteAdmin(id);

    if (!result.success) {
      return res.status(404).json({
        success: false,
        message: result.message,
      });
    }

    return res.status(200).json({
      success: true,
      message: "Events Office account deleted successfully",
    });
  }

  @LoginRequired()
  @AllowedRoles(["EventOffice"])
  async getMyNotifications(req: AuthRequest, res: Response) {
    try {
      const adminId = req.user?.id;

      if (!adminId) {
        return res.status(401).json({
          success: false,
          message: "Unauthorized",
        });
      }

      const result = await adminService.getEventOfficeNotifications(adminId);

      if (!result.success) {
        return res.status(400).json({
          success: false,
          message: result.message,
        });
      }

      return res.status(200).json({
        success: true,
        notifications: result.notifications,
      });
    } catch (error) {
      console.error("Get notifications error:", error);
      return res.status(500).json({
        success: false,
        message: "Failed to fetch notifications",
      });
    }
  }
}

export const adminController = new AdminController();

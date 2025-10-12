import type { Response } from "express";
import type { AuthRequest } from "../middleware/authMiddleware";
import { AdminRequired } from "../middleware/authDecorators";
import { ValidateBody } from "../middleware/validationDecorators";
import * as adminService from "../services/adminService";

export class AdminController {
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
    const { firstName, lastName, email, password, status } = req.body;

    // Validate input
    if (!firstName.trim() || !lastName.trim()) {
      return res.status(400).json({
        success: false,
        message: "First name and last name cannot be empty",
      });
    }

    const result = await adminService.createAdmin({
      firstName: firstName.trim(),
      lastName: lastName.trim(),
      email: email.trim().toLowerCase(),
      password,
      status,
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
}

export const adminController = new AdminController();

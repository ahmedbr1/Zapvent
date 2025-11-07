import type { Request, Response } from "express";
import * as userService from "../services/userService";
import { SignupConflictError } from "../services/userService";
import { z } from "zod";
import type { AuthRequest } from "../middleware/authMiddleware";
import { LoginRequired, AllowedRoles } from "../middleware/authDecorators";

export class UserController {
  async signup(req: Request, res: Response) {
    try {
      // Call service - all business logic is there
      const result = await userService.signup(req.body);

      res.status(201).json({
        success: true,
        message: result.message,
        data: result.user,
        needsApproval: result.needsApproval,
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

      if (error instanceof SignupConflictError) {
        return res.status(400).json({
          success: false,
          message: error.message,
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
          message: "Email or ID already exists",
        });
      }

      // Handle other errors
      res.status(500).json({
        success: false,
        message: "Internal server error",
      });
    }
  }

  async getUserRegisteredEvents(req: Request, res: Response) {
    const userId =
      (req.params.userId as string | undefined) ??
      (req.query.userId as string | undefined);

    if (!userId) {
      return res.status(400).json({
        success: false,
        message: "Missing user id.",
      });
    }

    const result = await userService.findRegisteredEvents(userId);

    if (!result.success) {
      const status = result.message === "User not found." ? 404 : 400;
      return res.status(status).json(result);
    }

    return res.json(result);
  }

  async getProfessors(_req: Request, res: Response) {
    try {
      const professors = await userService.findProfessors();
      return res.json({
        success: true,
        data: professors,
      });
    } catch (error) {
      console.error("Failed to fetch professors:", error);
      return res.status(500).json({
        success: false,
        message: "An error occurred while fetching professors.",
      });
    }
  }

  @LoginRequired()
  @AllowedRoles(["Student", "Staff", "TA", "Professor"])
  async addEventToFavorites(req: AuthRequest, res: Response) {
    try {
      const userId = req.user?.id;
      const { eventId } = req.params;

      if (!userId) {
        return res.status(401).json({
          success: false,
          message: "Authentication required.",
        });
      }

      const result = await userService.addEventToFavorites(userId, eventId);
      const status = result.success ? 200 : result.statusCode ?? 400;

      return res.status(status).json({
        success: result.success,
        message: result.message,
        data: result.data,
      });
    } catch (error) {
      console.error("Add event to favorites error:", error);
      return res.status(500).json({
        success: false,
        message: "Failed to update favorites.",
      });
    }
  }
}

export const userController = new UserController();

import { Request, Response } from "express";

import {
  cancelGymSession,
  createGymSession,
  getGymSessionsByMonth,
  editGymSession,
  registerForGymSession,
} from "../services/gymSessionService";
import type { AuthRequest } from "../middleware/authMiddleware";
import type { IGymSession } from "../models/GymSession";

const EVENT_OFFICE_EDITABLE_FIELDS = new Set(["date", "time", "duration"]);

export async function cancelGymSessionController(
  req: AuthRequest,
  res: Response
) {
  try {
    const { id } = req.params;

    if (!id) {
      return res.status(400).json({
        success: false,
        message: "Session ID is required.",
      });
    }

    const result = await cancelGymSession(id);

    if (!result.success) {
      return res.status(404).json(result);
    }

    return res.status(200).json(result);
  } catch (error) {
    console.error("Cancel gym session controller error:", error);
    return res.status(500).json({
      success: false,
      message: "Internal server error.",
    });
  }
}

export async function editGymSessionController(
  req: AuthRequest,
  res: Response
) {
  try {
    const { id } = req.params;
    if (!id) {
      return res.status(400).json({
        success: false,
        message: "Gym session id is missing",
      });
    }

    const updates = req.body as Partial<IGymSession> & Record<string, unknown>;
    if (!updates || Object.keys(updates).length === 0) {
      return res.status(400).json({
        success: false,
        message: "No updates provided",
      });
    }

    const isEventOffice =
      req.user?.role === "EventOffice" ||
      (req.user?.role === "Admin" && req.user?.adminType === "EventOffice");

    if (true) {
      const disallowedFields = Object.keys(updates).filter(
        (field) => !EVENT_OFFICE_EDITABLE_FIELDS.has(field)
      );

      if (disallowedFields.length > 0) {
        return res.status(403).json({
          success: false,
          message:
            "Events office accounts can only update date, time, or duration for gym sessions.",
        });
      }
    }

    const sanitizedUpdates = (
      isEventOffice
        ? Object.fromEntries(
            Object.entries(updates).filter(([field]) =>
              EVENT_OFFICE_EDITABLE_FIELDS.has(field)
            )
          )
        : updates
    ) as Partial<IGymSession>;

    if (Object.keys(sanitizedUpdates).length === 0) {
      return res.status(400).json({
        success: false,
        message: "No valid updates provided.",
      });
    }

    const result = await editGymSession(id, sanitizedUpdates);

    if (result.statusCode !== 200) {
      return res.status(result.statusCode ?? 500).json(result);
    }
    return res.status(200).json(result);
  } catch (error) {
    console.error("Edit gym session controller error:", error);
    return res.status(500).json({
      success: false,
      message: "Internal server error ",
    });
  }
}

export async function createGymSessionController(
  req: AuthRequest,
  res: Response
) {
  try {
    // Optionally check user role here if you have authentication middleware
    const { date, time, duration, type, maxParticipants } = req.body;

    if (!date || !time || !duration || !type || !maxParticipants) {
      return res.status(400).json({
        success: false,
        message: "All fields are required.",
      });
    }

    const result = await createGymSession({
      date,
      time,
      duration,
      type,
      maxParticipants,
    });

    if (!result.success) {
      return res.status(400).json(result);
    }

    return res.status(201).json(result);
  } catch (error) {
    console.error("Create gym session controller error:", error);
    return res.status(500).json({
      success: false,
      message: "Internal server error.",
    });
  }
}

export async function viewGymScheduleByMonthController(
  req: Request,
  res: Response
) {
  try {
    const year = parseInt(req.query.year as string);
    const month = parseInt(req.query.month as string);

    if (!year || !month || month < 1 || month > 12) {
      return res.status(400).json({
        success: false,
        message: "Valid year and month are required.",
      });
    }

    const result = await getGymSessionsByMonth(year, month);

    if (!result.success) {
      return res.status(400).json(result);
    }

    return res.status(200).json(result);
  } catch (error) {
    console.error("View gym schedule controller error:", error);
    return res.status(500).json({
      success: false,
      message: "Internal server error.",
    });
  }
}

export async function registerForGymSessionController(
  req: AuthRequest,
  res: Response
) {
  try {
    const { id } = req.params;

    if (!id) {
      return res.status(400).json({
        success: false,
        message: "Gym session id is required",
      });
    }

    if (!req.user?.id) {
      return res.status(401).json({
        success: false,
        message: "Authentication required",
      });
    }

    const result = await registerForGymSession(id, req.user.id);
    return res
      .status(result.statusCode ?? (result.success ? 200 : 400))
      .json(result);
  } catch (error) {
    console.error("Register for gym session controller error:", error);
    return res.status(500).json({
      success: false,
      message: "Internal server error.",
    });
  }
}

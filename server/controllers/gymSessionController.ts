import { Request, Response } from "express";
import { cancelGymSession, createGymSession, getGymSessionsByMonth } from "../services/gymSessionService";

export async function cancelGymSessionController(req: Request, res: Response) {
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

export async function createGymSessionController(req: Request, res: Response) {
  try {
    // Optionally check user role here if you have authentication middleware
    const { date, time, duration, type, maxParticipants } = req.body;

    if (!date || !time || !duration || !type || !maxParticipants) {
      return res.status(400).json({
        success: false,
        message: "All fields are required.",
      });
    }

    const result = await createGymSession({ date, time, duration, type, maxParticipants });

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

export async function viewGymScheduleByMonthController(req: Request, res: Response) {
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

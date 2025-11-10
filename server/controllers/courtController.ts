import { Request, Response } from "express";
import type { AuthRequest } from "../middleware/authMiddleware";
import {
  viewAllCourts as fetchCourts,
  getCourtAvailability,
  reserveCourtSlot,
} from "../services/courtService";

export async function viewAllCourts(req: Request, res: Response) {
  try {
    const result = await fetchCourts();

    if (!result.success) {
      return res.status(404).json(result); 
    }

    res.status(200).json(result); 
  } catch (error) {
    console.error("Error fetching courts:", error);
    res.status(500).json({ success: false, message: "Failed to fetch courts" });
  }
}

export async function viewCourtAvailability(req: AuthRequest, res: Response) {
  try {
    const { courtId } = req.params;
    const date = typeof req.query.date === "string" ? req.query.date : undefined;

    if (!date) {
      return res.status(400).json({
        success: false,
        message: "Query parameter 'date' is required (YYYY-MM-DD)",
      });
    }

    const result = await getCourtAvailability(courtId, date);
    return res
      .status(result.statusCode ?? (result.success ? 200 : 400))
      .json(result);
  } catch (error) {
    console.error("Error fetching court availability:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to load court availability",
    });
  }
}

export async function reserveCourt(req: AuthRequest, res: Response) {
  try {
    const { courtId } = req.params;
    const { date, startTime, endTime } = req.body ?? {};

    if (!date || !startTime) {
      return res.status(400).json({
        success: false,
        message: "date and startTime are required",
      });
    }

    if (!req.user?.id) {
      return res.status(401).json({
        success: false,
        message: "Authentication required",
      });
    }

    const result = await reserveCourtSlot(courtId, req.user.id, {
      date,
      startTime,
      endTime,
    });

    return res
      .status(result.statusCode ?? (result.success ? 200 : 400))
      .json(result);
  } catch (error) {
    console.error("Error reserving court:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to reserve court",
    });
  }
}

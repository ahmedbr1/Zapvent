import { Request, Response } from "express";
import { getAllEvents } from "../services/eventService";

export async function getAllEventsController(req: Request, res: Response) {
  try {
    const sortQuery = Array.isArray(req.query.sortOrder)
      ? req.query.sortOrder[0]
      : req.query.sortOrder ?? (Array.isArray(req.query.sort) ? req.query.sort[0] : req.query.sort);

    let sortOrder = 0;

    if (typeof sortQuery === "string") {
      const parsed = parseInt(sortQuery, 10);
      if (parsed === 1 || parsed === -1) {
        sortOrder = parsed;
      } else if (parsed === 0) {
        sortOrder = 0;
      }
    }

    const result = await getAllEvents(sortOrder);

    if (!result.success) {
      return res.status(500).json(result);
    }

    return res.status(200).json(result);
  } catch (error) {
    console.error("Get all events controller error:", error);
    return res.status(500).json({
      success: false,
      message: "Internal server error",
    });
  }
}

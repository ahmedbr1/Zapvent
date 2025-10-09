import { Request, Response } from "express";
import { getAllEvents } from "../services/eventService";

export async function getAllEventsController(req: Request, res: Response) {
  try {
    const result = await getAllEvents();

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

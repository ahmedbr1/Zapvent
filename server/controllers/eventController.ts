import { Request, Response } from "express";
import {
  getAllEvents,
  registerUserForEvent,
} from "../services/eventService";

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

export async function registerForEventController(req: Request, res: Response) {
  try {
    const { eventId } = req.params;
    const payload = {
      fullName: req.body.fullName,
      email: req.body.email,
      universityId: req.body.universityId,
      role: req.body.role,
    };

    const result = await registerUserForEvent(eventId, payload);

    if (!result.success) {
      return res.status(result.statusCode ?? 400).json({
        success: false,
        message:
          result.message ??
          "Unable to complete registration for this event at this time.",
      });
    }

    return res.status(result.statusCode ?? 201).json({
      success: true,
      data: result.data,
    });
  } catch (error) {
    console.error("Register for event controller error:", error);
    return res.status(500).json({
      success: false,
      message: "Internal server error",
    });
  }
}

import { Request, Response } from "express";
import { createBazaar, getAllEvents } from "../services/eventService";

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

export async function createBazaarController(req: Request, res: Response) {
  try {
    const {
      name,
      description,
      startDate,
      endDate,
      location,
      registrationDeadline,
    } = req.body;

    if (
      !name ||
      !description ||
      !startDate ||
      !endDate ||
      !location ||
      !registrationDeadline
    ) {
      return res.status(400).json({
        success: false,
        message:
          "name, description, startDate, endDate, location and registrationDeadline are required.",
      });
    }

    const result = await createBazaar({
      name,
      description,
      startDate,
      endDate,
      location,
      registrationDeadline,
    });

    const status = result.success ? 201 : 400;
    return res.status(status).json(result);
  } catch (error) {
    console.error("Create bazaar controller error:", error);
    return res.status(500).json({
      success: false,
      message: "Internal server error",
    });
  }
}

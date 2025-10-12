import type { Request, Response } from "express";
import {
  editBazaarDetails,
  createTrip,
  editTripDetails,
} from "../services/eventService";
import type { IEvent } from "../models/Event";
import { AdminRequired } from "../middleware/authDecorators";
import { getAllEvents } from "../services/eventService";
import { getUpcomingBazaars } from "../services/eventService";
import { AllowedRoles, LoginRequired } from "../middleware/authDecorators";
import type { AuthRequest } from "../middleware/authMiddleware";
import { createBazaar } from "../services/eventService";

export class EventController {
  @AdminRequired()
  async updateBazaarDetails(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const updateData: Partial<IEvent> = req.body;

      const result = await editBazaarDetails(id, updateData);

      if (!result) {
        return res
          .status(404)
          .json({ success: false, message: "Event not found" });
      }

      res.status(200).json({ success: true, data: result });
    } catch (error) {
      console.error("Error updating event:", error);
      res
        .status(500)
        .json({ success: false, message: "Failed to update event" });
    }
  }

  @AdminRequired()
  async createNewTrip(req: Request, res: Response) {
    try {
      const tripData: Partial<IEvent> = req.body;

      const result = await createTrip(tripData);

      res.status(201).json({ success: true, data: result });
    } catch (error) {
      console.error("Error creating trip:", error);
      res
        .status(500)
        .json({ success: false, message: "Failed to create trip" });
    }
  }

  @AdminRequired()
  async updateTripDetails(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const updateData: Partial<IEvent> = req.body;

      const result = await editTripDetails(id, updateData);

      if (!result) {
        return res
          .status(404)
          .json({ success: false, message: "Trip not found" });
      }

      res.status(200).json({ success: true, data: result });
    } catch (error) {
      console.error("Error updating trip:", error);
      res
        .status(500)
        .json({ success: false, message: "Failed to update trip" });
    }
  }
  async getAllEventsController(req: Request, res: Response) {
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
  @LoginRequired()
  @AllowedRoles(["Vendor"])
  async getUpcomingBazaarsController(req: AuthRequest, res: Response) {
    try {
      const bazaars = await getUpcomingBazaars();
      res.status(200).json({ success: true, bazaars });
    } catch {
      res
        .status(500)
        .json({ success: false, message: "Internal server error" });
    }
  }
  @LoginRequired()
  @AllowedRoles(["Admin"])
  async createBazaarController(req: AuthRequest, res: Response) {
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
}

// Create an instance and export the bound methods for use in routes
const eventController = new EventController();

export const updateBazaarDetails =
  eventController.updateBazaarDetails.bind(eventController);
export const createNewTrip =
  eventController.createNewTrip.bind(eventController);
export const updateTripDetails =
  eventController.updateTripDetails.bind(eventController);

export default eventController;

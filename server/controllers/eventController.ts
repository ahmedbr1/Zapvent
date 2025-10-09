import type { Request, Response } from "express";
import {
  editBazaarDetails,
  createTrip,
  editTripDetails,
} from "../services/eventService";
import type { IEvent } from "../models/Event";
import { AdminRequired } from "../middleware/authDecorators";

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
}

// Create an instance and export the bound methods for use in routes
const eventController = new EventController();

export const updateBazaarDetails =
  eventController.updateBazaarDetails.bind(eventController);
export const createNewTrip =
  eventController.createNewTrip.bind(eventController);
export const updateTripDetails =
  eventController.updateTripDetails.bind(eventController);

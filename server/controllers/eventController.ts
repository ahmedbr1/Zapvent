import { Request, Response } from "express";
import { editBazaarDetails } from "../services/eventService";
import { IEvent } from "../models/Event";

export async function updateBazaarDetails(req: Request, res: Response) {
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
    res.status(500).json({ success: false, message: "Failed to update event" });
  }
}

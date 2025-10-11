import type { Request, Response } from "express";
import { getAllEvents, updateConferenceById } from "../services/eventService";
import { AllowedRoles, LoginRequired } from "../middleware/authDecorators";
import type { AuthRequest } from "../middleware/authMiddleware";

class EventController {
  async getAllEventsController(req: Request, res: Response) {
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

  @LoginRequired()
  @AllowedRoles(["EventOffice"])
  async updateConferenceController(req: AuthRequest, res: Response) {
    try {
      const { eventId } = req.params;
      const updateData = req.body;
      const updated = await updateConferenceById(eventId, updateData);
      if (!updated) {
        return res
          .status(404)
          .json({ success: false, message: "Conference not found" });
      }
      return res.status(200).json({ success: true, data: updated });
    } catch {
      return res
        .status(500)
        .json({ success: false, message: "Internal server error" });
    }
  }
}
const eventController = new EventController();
export default eventController;

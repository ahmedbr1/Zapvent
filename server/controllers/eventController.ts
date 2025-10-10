import type { Request, Response } from "express";
import { getAllEvents } from "../services/eventService";
import { getUpcomingBazaars } from "../services/eventService";
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
  @AllowedRoles(["Vendor"])
  async getUpcomingBazaarsController(req: AuthRequest, res: Response) {
    try {
      const bazaars = await getUpcomingBazaars();
      res.status(200).json({ success: true, bazaars });
    } catch (error) {
      res
        .status(500)
        .json({ success: false, message: "Internal server error" });
    }
  }
}

export default new EventController();

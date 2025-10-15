import type { Request, Response } from "express";
import { type AuthRequest } from "../middleware/authMiddleware";
import {
  LoginRequired,
  AllowedRoles,
  AdminRequired,
} from "../middleware/authDecorators";
import {
  deleteEventById,
  getAllEvents,
  getUpcomingBazaars,
  createBazaar,
  updateConferenceById,
  getAcceptedUpcomingBazaars,
  getVendorApplicationsForBazaar,
} from "../services/eventService";
import type { IEvent } from "../models/Event";
import {
  editBazaarDetails,
  createTrip,
  editTripDetails,
  getRequestedUpcomingBazaars,
  createWorkshop,
  editWorkshop,
  getWorkshopsByCreator,
  createConference,
  registerUserForWorkshop,
} from "../services/eventService";

function extractUserId(user: unknown): string | undefined {
  if (!user || typeof user !== "object") return undefined;
  const u = user as Record<string, unknown>;
  if (typeof u.id === "string") return u.id;
  if (typeof u._id === "string") return u._id;
  return undefined;
}
export class EventController {
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
  @LoginRequired()
  @AllowedRoles(["Admin", "EventOffice"])
  async deleteAnyEvent(req: AuthRequest, res: Response) {
    try {
      const { eventId } = req.params as { eventId: string };
      const deleted = await deleteEventById(eventId);

      if (!deleted) {
        return res.status(404).json({ message: "Event not found" });
      }
      return res.status(204).send();
    } catch (err: unknown) {
      if (err instanceof Error && err.message === "INVALID_EVENT_ID") {
        return res.status(400).json({ message: "Invalid event id" });
      }
      console.error(err);
      return res.status(500).json({ message: "Failed to delete event" });
    }
  }
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
        : (req.query.sortOrder ??
          (Array.isArray(req.query.sort) ? req.query.sort[0] : req.query.sort));

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

  @LoginRequired()
  @AllowedRoles(["Vendor"])
  async getAcceptedUpcomingBazaarsController(req: AuthRequest, res: Response) {
    try {
      const vendorId = extractUserId(req.user);
      if (!vendorId) {
        return res
          .status(401)
          .json({ success: false, message: "Unauthorized" });
      }

      const result = await getAcceptedUpcomingBazaars(vendorId);
      if (!result.success) {
        return res
          .status(result.statusCode || 500)
          .json({ success: false, message: result.message });
      }
      return res.status(200).json({ success: true, data: result.data });
    } catch (error) {
      console.error("Get accepted upcoming bazaars controller error:", error);
      return res.status(500).json({
        success: false,
        message: "Internal server error",
      });
    }
  }
  @LoginRequired()
  @AllowedRoles(["Vendor"])
  async getRequestedUpcomingBazaarsController(req: AuthRequest, res: Response) {
    try {
      const vendorId = extractUserId(req.user);
      if (!vendorId) {
        return res
          .status(401)
          .json({ success: false, message: "Unauthorized" });
      }

      const result = await getRequestedUpcomingBazaars(vendorId);
      if (!result.success) {
        return res
          .status(result.statusCode || 500)
          .json({ success: false, message: result.message });
      }
      return res.status(200).json({ success: true, data: result.data });
    } catch (error) {
      console.error("Get requested upcoming bazaars controller error:", error);
      return res.status(500).json({
        success: false,
        message: "Internal server error",
      });
    }
  }
  @LoginRequired()
  @AllowedRoles(["Admin", "EventOffice"])
  async getVendorApplicationsForBazaarController(
    req: AuthRequest,
    res: Response
  ) {
    try {
      const { eventId } = req.params;
      if (!eventId) {
        return res
          .status(400)
          .json({ success: false, message: "Event ID is required" });
      }
      const result = await getVendorApplicationsForBazaar(eventId);

      if (!result.success) {
        return res
          .status(result.statusCode || 500)
          .json({ success: false, message: result.message });
      }
      return res.status(200).json({ success: true, data: result.data });
    } catch (error) {
      console.error(
        "Get vendor applications for bazaar controller error:",
        error
      );
      return res.status(500).json({
        success: false,
        message: "Internal server error",
      });
    }
  }

  @LoginRequired()
  @AllowedRoles(["User"]) // should be professor 
  async createWorkshopController(req: AuthRequest, res: Response) {
    try {
      const {
        name,
        location,
        startDate,
        endDate,
        description,
        fullAgenda,
        faculty,
        participatingProfessors,
        requiredBudget,
        fundingSource,
        extraRequiredResources,
        capacity,
        registrationDeadline,
      } = req.body;

      const userId = extractUserId(req.user);
      if (!userId) {
        return res
          .status(401)
          .json({ success: false, message: "Unauthorized" });
      }

      if (
        !name ||
        !location ||
        !startDate ||
        !endDate ||
        !description ||
        !fullAgenda ||
        !faculty ||
        !participatingProfessors ||
        requiredBudget === undefined ||
        !fundingSource ||
        !capacity ||
        !registrationDeadline
      ) {
        return res.status(400).json({
          success: false,
          message:
            "All required fields must be provided: name, location, startDate, endDate, description, fullAgenda, faculty, participatingProfessors, requiredBudget, fundingSource, capacity, and registrationDeadline.",
        });
      }

      const result = await createWorkshop({
        name,
        location,
        startDate,
        endDate,
        description,
        fullAgenda,
        faculty,
        participatingProfessors,
        requiredBudget,
        fundingSource,
        extraRequiredResources,
        capacity,
        registrationDeadline,
        createdBy: userId,
      });

      const status = result.success ? 201 : 400;
      return res.status(status).json(result);
    } catch (error) {
      console.error("Create workshop controller error:", error);
      return res.status(500).json({
        success: false,
        message: "Internal server error",
      });
    }
  }

  @LoginRequired()
  @AllowedRoles(["User"]) // should be professor
  async editWorkshopController(req: AuthRequest, res: Response) {
    try {
      const { id } = req.params;
      const updateData = req.body;

      const userId = extractUserId(req.user);
      if (!userId) {
        return res
          .status(401)
          .json({ success: false, message: "Unauthorized" });
      }

      const result = await editWorkshop(id, userId, updateData);

      const status = result.success ? 200 : 400;
      return res.status(status).json(result);
    } catch (error) {
      console.error("Edit workshop controller error:", error);
      return res.status(500).json({
        success: false,
        message: "Internal server error",
      });
    }
  }

  @LoginRequired()
  @AllowedRoles(["User"]) // should be professor
  async getMyWorkshopsController(req: AuthRequest, res: Response) {
    try {
      const userId = extractUserId(req.user);
      if (!userId) {
        return res
          .status(401)
          .json({ success: false, message: "Unauthorized" });
      }

      const result = await getWorkshopsByCreator(userId);

      const status = result.success ? 200 : 400;
      return res.status(status).json(result);
    } catch (error) {
      console.error("Get my workshops controller error:", error);
      return res.status(500).json({
        success: false,
        message: "Internal server error",
      });
    }
  }

  @LoginRequired()
  @AllowedRoles(["User", "EventOffice"])
  async registerForWorkshopController(req: AuthRequest, res: Response) {
    try {
      const { id } = req.params;
      if (!id) {
        return res.status(400).json({
          success: false,
          message: "Event ID is required.",
        });
      }

      const userId =
        typeof req.body?.userId === "string" && req.body.userId.trim().length > 0
          ? req.body.userId.trim()
          : extractUserId(req.user);
      if (!userId) {
        return res
          .status(400)
          .json({ success: false, message: "User ID is required." });
      }

      const result = await registerUserForWorkshop(id, userId);
      const statusCode = result.statusCode ?? (result.success ? 200 : 400);

      return res.status(statusCode).json(result);
    } catch (error) {
      console.error("Register for workshop controller error:", error);
      return res.status(500).json({
        success: false,
        message: "Internal server error",
      });
    }
  }

  @LoginRequired()
  @AllowedRoles(["EventOffice"])
  async createConferenceController(req: AuthRequest, res: Response) {
    try {
      const {
        name,
        startDate,
        endDate,
        description,
        fullAgenda,
        websiteLink,
        requiredBudget,
        fundingSource,
        extraRequiredResources,
      } = req.body;

      if (
        !name ||
        !startDate ||
        !endDate ||
        !description ||
        !fullAgenda ||
        !websiteLink ||
        requiredBudget === undefined ||
        !fundingSource
      ) {
        return res.status(400).json({
          success: false,
          message:
            "All required fields must be provided: name, startDate, endDate, description, fullAgenda, websiteLink, requiredBudget, and fundingSource.",
        });
      }

      const result = await createConference({
        name,
        startDate,
        endDate,
        description,
        fullAgenda,
        websiteLink,
        requiredBudget,
        fundingSource,
        extraRequiredResources,
      });

      const status = result.success ? 201 : 400;
      return res.status(status).json(result);
    } catch (error) {
      console.error("Create conference controller error:", error);
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
export const registerForWorkshopController =
  eventController.registerForWorkshopController.bind(eventController);

export default eventController;

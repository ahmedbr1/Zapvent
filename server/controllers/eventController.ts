import type { Request, Response } from "express";
import { type AuthRequest } from "../middleware/authMiddleware";
import { LoginRequired, AllowedRoles } from "../middleware/authDecorators";
import {
  deleteEventById,
  getAllEvents,
  getUpcomingBazaars,
  createBazaar,
  updateConferenceById,
  getAcceptedUpcomingBazaars,
  getVendorApplicationsForBazaar,
  getEventAttendanceReport,
  getEventSalesReport,
  getWorkshopParticipants,
  approveWorkshop,
  rejectWorkshop,
  requestWorkshopEdits,
  getWorkshopStatus,
  archiveEvent,
  setEventRoleRestrictions,
  exportEventRegistrations,
  generateEventQRCode,
  sendWorkshopCertificates,
} from "../services/eventService";
import { IEvent, EventType } from "../models/Event";
import {
  editBazaarDetails,
  createTrip,
  editTripDetails,
  getAllBazaars,
  getAllTrips,
  getBazaarById,
  getTripById,
  getRequestedUpcomingBazaars,
  createWorkshop,
  editWorkshop,
  getWorkshopsByCreator,
  getAllWorkshops,
  createConference,
  registerUserForWorkshop,
} from "../services/eventService";
import { userRole } from "../models/User";

function extractUserId(user: unknown): string | undefined {
  if (!user || typeof user !== "object") return undefined;
  const u = user as Record<string, unknown>;
  if (typeof u.id === "string") return u.id;
  if (typeof u._id === "string") return u._id;
  return undefined;
}

function extractQueryString(value: unknown): string | undefined {
  if (Array.isArray(value)) {
    const entry = value.find(
      (item) => typeof item === "string" && item.trim().length > 0
    );
    if (typeof entry === "string") {
      return entry.trim();
    }
    return undefined;
  }

  if (typeof value === "string") {
    const trimmed = value.trim();
    return trimmed.length ? trimmed : undefined;
  }

  return undefined;
}

function parseEventType(value?: string): EventType | undefined {
  if (!value) return undefined;
  const normalized = value.trim().toLowerCase();
  return (Object.values(EventType) as string[]).find(
    (type) => type.toLowerCase() === normalized
  ) as EventType | undefined;
}

function parseDate(value?: string): Date | undefined {
  if (!value) return undefined;
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) {
    return undefined;
  }
  return parsed;
}

type RevenueSortOrder = "asc" | "desc";

function parseSortOrder(value?: string): RevenueSortOrder | undefined {
  if (!value) return undefined;
  const normalized = value.trim().toLowerCase();
  if (["asc", "ascending", "1"].includes(normalized)) {
    return "asc";
  }
  if (["desc", "descending", "-1"].includes(normalized)) {
    return "desc";
  }
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
      if (
        err instanceof Error &&
        err.message === "Cannot delete event with registered users"
      ) {
        return res.status(400).json({
          message:
            "Cannot delete event with registered users. Please remove all registrations first.",
        });
      }
      console.error(err);
      return res.status(500).json({ message: "Failed to delete event" });
    }
  }

  @LoginRequired()
  @AllowedRoles(["Admin", "EventOffice"])
  async getAttendanceReportController(req: AuthRequest, res: Response) {
    try {
      const name = extractQueryString(req.query.name);
      const eventTypeRaw = extractQueryString(req.query.eventType);
      const eventType = parseEventType(eventTypeRaw);

      if (eventTypeRaw && !eventType) {
        return res.status(400).json({
          success: false,
          message: "Invalid event type provided.",
        });
      }

      const dateRaw = extractQueryString(req.query.date);
      const startDateRaw = extractQueryString(req.query.startDate);
      const endDateRaw = extractQueryString(req.query.endDate);

      const date = parseDate(dateRaw);
      if (dateRaw && !date) {
        return res.status(400).json({
          success: false,
          message: "Invalid date format for 'date'.",
        });
      }

      const startDate = parseDate(startDateRaw);
      if (startDateRaw && !startDate) {
        return res.status(400).json({
          success: false,
          message: "Invalid date format for 'startDate'.",
        });
      }

      const endDate = parseDate(endDateRaw);
      if (endDateRaw && !endDate) {
        return res.status(400).json({
          success: false,
          message: "Invalid date format for 'endDate'.",
        });
      }

      const result = await getEventAttendanceReport({
        name,
        eventType,
        date,
        startDate,
        endDate,
      });

      if (!result.success) {
        return res.status(500).json(result);
      }

      return res.status(200).json(result);
    } catch (error) {
      console.error("Get attendance report controller error:", error);
      return res.status(500).json({
        success: false,
        message: "Internal server error",
      });
    }
  }

  @LoginRequired()
  @AllowedRoles(["Admin", "EventOffice"])
  async getSalesReportController(req: AuthRequest, res: Response) {
    try {
      const eventTypeRaw = extractQueryString(req.query.eventType);
      const eventType = parseEventType(eventTypeRaw);

      if (eventTypeRaw && !eventType) {
        return res.status(400).json({
          success: false,
          message: "Invalid event type provided.",
        });
      }

      const dateRaw = extractQueryString(req.query.date);
      const startDateRaw = extractQueryString(req.query.startDate);
      const endDateRaw = extractQueryString(req.query.endDate);

      const date = parseDate(dateRaw);
      if (dateRaw && !date) {
        return res.status(400).json({
          success: false,
          message: "Invalid date format for 'date'.",
        });
      }

      const startDate = parseDate(startDateRaw);
      if (startDateRaw && !startDate) {
        return res.status(400).json({
          success: false,
          message: "Invalid date format for 'startDate'.",
        });
      }

      const endDate = parseDate(endDateRaw);
      if (endDateRaw && !endDate) {
        return res.status(400).json({
          success: false,
          message: "Invalid date format for 'endDate'.",
        });
      }

      const sortRaw = extractQueryString(req.query.sortOrder ?? req.query.sort);
      const sortOrder = parseSortOrder(sortRaw);

      if (sortRaw && !sortOrder) {
        return res.status(400).json({
          success: false,
          message: "Invalid sort order. Use 'asc' or 'desc'.",
        });
      }

      const result = await getEventSalesReport(
        {
          eventType,
          date,
          startDate,
          endDate,
        },
        sortOrder ?? "desc"
      );

      if (!result.success) {
        return res.status(500).json(result);
      }

      return res.status(200).json(result);
    } catch (error) {
      console.error("Get sales report controller error:", error);
      return res.status(500).json({
        success: false,
        message: "Internal server error",
      });
    }
  }
  @LoginRequired()
  @AllowedRoles(["Admin", "EventOffice"])
  async updateBazaarDetails(req: AuthRequest, res: Response) {
    try {
      const { id } = req.params;
      const updateData: Partial<IEvent> = req.body;

      const existingBazaar = await getBazaarById(id);

      if (!existingBazaar) {
        return res
          .status(404)
          .json({ success: false, message: "Event not found" });
      }

      const isEventsOffice =
        req.user?.role === "EventOffice" ||
        (req.user?.role === "Admin" && req.user?.adminType === "EventOffice");

      if (isEventsOffice) {
        const referenceDate =
          existingBazaar.startDate ?? existingBazaar.date ?? null;
        const hasBazaarStarted =
          referenceDate !== null &&
          new Date(referenceDate).getTime() <= Date.now();

        if (hasBazaarStarted) {
          return res.status(403).json({
            success: false,
            message:
              "Bazaars that have already started or passed can only be edited by administrators.",
          });
        }
      }

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

  @LoginRequired()
  @AllowedRoles(["Admin", "EventOffice"])
  async getAllBazaarsController(_req: AuthRequest, res: Response) {
    try {
      const result = await getAllBazaars();
      if (!result.success) {
        return res.status(500).json(result);
      }

      return res.status(200).json(result);
    } catch (error) {
      console.error("Error fetching bazaars:", error);
      return res.status(500).json({
        success: false,
        message: "Failed to load bazaars.",
      });
    }
  }

  @LoginRequired()
  @AllowedRoles(["Admin", "EventOffice"])
  async getAllTripsController(_req: AuthRequest, res: Response) {
    try {
      const result = await getAllTrips();
      if (!result.success) {
        return res.status(500).json(result);
      }

      return res.status(200).json(result);
    } catch (error) {
      console.error("Error fetching trips:", error);
      return res
        .status(500)
        .json({ success: false, message: "Failed to load trips." });
    }
  }

  @LoginRequired()
  @AllowedRoles(["Admin", "EventOffice"])
  async createNewTrip(req: AuthRequest, res: Response) {
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

  @LoginRequired()
  @AllowedRoles(["Admin", "EventOffice"])
  async updateTripDetails(req: AuthRequest, res: Response) {
    try {
      const { id } = req.params;
      const updateData: Partial<IEvent> = req.body;

      const existingTrip = await getTripById(id);

      if (!existingTrip) {
        return res
          .status(404)
          .json({ success: false, message: "Trip not found" });
      }

      const isEventsOffice =
        req.user?.role === "EventOffice" ||
        (req.user?.role === "Admin" && req.user?.adminType === "EventOffice");

      if (isEventsOffice) {
        const referenceDate =
          existingTrip.startDate ?? existingTrip.date ?? null;
        const hasTripStarted =
          referenceDate !== null &&
          new Date(referenceDate).getTime() <= Date.now();

        if (hasTripStarted) {
          return res.status(403).json({
            success: false,
            message:
              "Trips that have already started or passed can only be edited by administrators.",
          });
        }
      }

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
  @AllowedRoles(["Vendor", "EventOffice", "Admin"])
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
  @AllowedRoles(["Admin", "EventOffice"])
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
  @AllowedRoles(["Professor", "Admin"])
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
        participatingProfessorIds,
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

      const actorRole = req.user?.role;
      const sessionUserRole = (
        req.user as typeof req.user & { userRole?: string }
      )?.userRole;
      const isProfessor = sessionUserRole === userRole.PROFESSOR;
      const isAdmin = actorRole === "Admin";

      if (!isProfessor && !isAdmin) {
        return res.status(403).json({
          success: false,
          message: "Only professors or admins can create workshops.",
        });
      }

      const professorIds = Array.isArray(participatingProfessorIds)
        ? participatingProfessorIds
        : Array.isArray(participatingProfessors)
          ? participatingProfessors
          : [];

      if (
        !name ||
        !location ||
        !startDate ||
        !endDate ||
        !description ||
        !fullAgenda ||
        !faculty ||
        professorIds.length === 0 ||
        requiredBudget === undefined ||
        !fundingSource ||
        !capacity ||
        !registrationDeadline
      ) {
        return res.status(400).json({
          success: false,
          message:
            "All required fields must be provided: name, location, startDate, endDate, description, fullAgenda, faculty, participatingProfessorIds, requiredBudget, fundingSource, capacity, and registrationDeadline.",
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
        participatingProfessorIds: professorIds,
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
  @AllowedRoles(["Professor", "EventOffice", "Admin"])
  async editWorkshopController(req: AuthRequest, res: Response) {
    try {
      const { id } = req.params;
      const { participatingProfessorIds, participatingProfessors, ...rest } =
        req.body ?? {};

      const userId = extractUserId(req.user);
      if (!userId) {
        return res
          .status(401)
          .json({ success: false, message: "Unauthorized" });
      }

      const actorRole = req.user?.role;
      const sessionUserRole = (
        req.user as typeof req.user & { userRole?: string }
      )?.userRole;
      const canManageWorkshop =
        sessionUserRole === userRole.PROFESSOR ||
        actorRole === "EventOffice" ||
        actorRole === "Admin";

      if (!canManageWorkshop) {
        return res.status(403).json({
          success: false,
          message:
            "Only professors or Events Office or Admins can manage workshops.",
        });
      }

      const professorIds = Array.isArray(participatingProfessorIds)
        ? participatingProfessorIds
        : Array.isArray(participatingProfessors)
          ? participatingProfessors
          : undefined;

      const updatePayload = {
        ...rest,
        ...(professorIds ? { participatingProfessorIds: professorIds } : {}),
      };

      const result = await editWorkshop(id, userId, updatePayload, actorRole);

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
  @AllowedRoles(["Professor", "EventOffice", "Admin"])
  async getMyWorkshopsController(req: AuthRequest, res: Response) {
    try {
      const userId = extractUserId(req.user);
      if (!userId) {
        return res
          .status(401)
          .json({ success: false, message: "Unauthorized" });
      }

      const actorRole = req.user?.role;
      const sessionUserRole = (
        req.user as typeof req.user & { userRole?: string }
      )?.userRole;
      const isProfessor = sessionUserRole === userRole.PROFESSOR;
      const isEventsOffice = actorRole === "EventOffice";
      const isAdmin = actorRole === "Admin";

      if (isEventsOffice || isAdmin) {
        const result = await getAllWorkshops();
        const status = result.success ? 200 : 400;
        return res.status(status).json(result);
      }

      if (!isProfessor) {
        return res.status(403).json({
          success: false,
          message: "Only professors can access their workshops.",
        });
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
  @AllowedRoles(["Student", "Staff", "Professor", "EventOffice", "TA"])
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
        typeof req.body?.userId === "string" &&
        req.body.userId.trim().length > 0
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

  @LoginRequired()
  @AllowedRoles(["Professor"])
  async getWorkshopParticipantsController(req: AuthRequest, res: Response) {
    try {
      const { id } = req.params;
      if (!id) {
        return res.status(400).json({
          success: false,
          message: "Workshop ID is required.",
        });
      }

      const userId = extractUserId(req.user);
      if (!userId) {
        return res
          .status(401)
          .json({ success: false, message: "Unauthorized" });
      }

      const result = await getWorkshopParticipants(id, userId);
      const status = result.success ? 200 : 400;
      return res.status(status).json(result);
    } catch (error) {
      console.error("Get workshop participants controller error:", error);
      return res.status(500).json({
        success: false,
        message: "Internal server error",
      });
    }
  }

  @LoginRequired()
  @AllowedRoles(["EventOffice"])
  async approveWorkshopController(req: AuthRequest, res: Response) {
    try {
      const { id } = req.params;
      if (!id) {
        return res.status(400).json({
          success: false,
          message: "Workshop ID is required.",
        });
      }

      const result = await approveWorkshop(id);
      const status = result.success ? 200 : 400;
      return res.status(status).json(result);
    } catch (error) {
      console.error("Approve workshop controller error:", error);
      return res.status(500).json({
        success: false,
        message: "Internal server error",
      });
    }
  }

  @LoginRequired()
  @AllowedRoles(["EventOffice", "Admin"])
  async rejectWorkshopController(req: AuthRequest, res: Response) {
    try {
      const { id } = req.params;
      const { reason } = req.body;

      if (!id) {
        return res.status(400).json({
          success: false,
          message: "Workshop ID is required.",
        });
      }

      const result = await rejectWorkshop(id, reason);
      const status = result.success ? 200 : 400;
      return res.status(status).json(result);
    } catch (error) {
      console.error("Reject workshop controller error:", error);
      return res.status(500).json({
        success: false,
        message: "Internal server error",
      });
    }
  }

  @LoginRequired()
  @AllowedRoles(["EventOffice"])
  async requestWorkshopEditsController(req: AuthRequest, res: Response) {
    try {
      const { id } = req.params;
      const { message } = req.body;

      if (!id) {
        return res.status(400).json({
          success: false,
          message: "Workshop ID is required.",
        });
      }

      if (!message) {
        return res.status(400).json({
          success: false,
          message: "Edit request message is required.",
        });
      }

      const result = await requestWorkshopEdits(id, message);
      const status = result.success ? 200 : 400;
      return res.status(status).json(result);
    } catch (error) {
      console.error("Request workshop edits controller error:", error);
      return res.status(500).json({
        success: false,
        message: "Internal server error",
      });
    }
  }

  @LoginRequired()
  @AllowedRoles(["Professor"])
  async getWorkshopStatusController(req: AuthRequest, res: Response) {
    try {
      const { id } = req.params;
      if (!id) {
        return res.status(400).json({
          success: false,
          message: "Workshop ID is required.",
        });
      }

      const userId = extractUserId(req.user);
      if (!userId) {
        return res
          .status(401)
          .json({ success: false, message: "Unauthorized" });
      }

      const result = await getWorkshopStatus(id, userId);
      const status = result.success ? 200 : 400;
      return res.status(status).json(result);
    } catch (error) {
      console.error("Get workshop status controller error:", error);
      return res.status(500).json({
        success: false,
        message: "Internal server error",
      });
    }
  }

  @LoginRequired()
  @AllowedRoles(["EventOffice"])
  async archiveEventController(req: AuthRequest, res: Response) {
    try {
      const { id } = req.params;
      if (!id) {
        return res.status(400).json({
          success: false,
          message: "Event ID is required.",
        });
      }

      const result = await archiveEvent(id);
      const status = result.success ? 200 : 400;
      return res.status(status).json(result);
    } catch (error) {
      console.error("Archive event controller error:", error);
      return res.status(500).json({
        success: false,
        message: "Internal server error",
      });
    }
  }

  @LoginRequired()
  @AllowedRoles(["EventOffice"])
  async setEventRoleRestrictionsController(req: AuthRequest, res: Response) {
    try {
      const { id } = req.params;
      const { allowedRoles } = req.body;

      if (!id) {
        return res.status(400).json({
          success: false,
          message: "Event ID is required.",
        });
      }

      if (!allowedRoles) {
        return res.status(400).json({
          success: false,
          message: "allowedRoles field is required.",
        });
      }

      const result = await setEventRoleRestrictions(id, allowedRoles);
      const status = result.success ? 200 : 400;
      return res.status(status).json(result);
    } catch (error) {
      console.error("Set event role restrictions controller error:", error);
      return res.status(500).json({
        success: false,
        message: "Internal server error",
      });
    }
  }

  @LoginRequired()
  @AllowedRoles(["EventOffice"])
  async exportEventRegistrationsController(req: AuthRequest, res: Response) {
    try {
      const { id } = req.params;
      if (!id) {
        return res.status(400).json({
          success: false,
          message: "Event ID is required.",
        });
      }

      const result = await exportEventRegistrations(id);

      if (!result.success) {
        const status = result.message === "Event not found." ? 404 : 400;
        return res.status(status).json({
          success: result.success,
          message: result.message,
        });
      }

      // Set headers for file download
      res.setHeader(
        "Content-Type",
        "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
      );
      res.setHeader(
        "Content-Disposition",
        `attachment; filename="${result.filename}"`
      );

      // Send the Excel file buffer
      return res.send(result.buffer);
    } catch (error) {
      console.error("Export event registrations controller error:", error);
      return res.status(500).json({
        success: false,
        message: "Internal server error",
      });
    }
  }

  @LoginRequired()
  @AllowedRoles(["EventOffice"])
  async generateEventQRCodeController(req: AuthRequest, res: Response) {
    try {
      const { id } = req.params;
      if (!id) {
        return res.status(400).json({
          success: false,
          message: "Event ID is required.",
        });
      }

      const result = await generateEventQRCode(id);

      if (!result.success) {
        const status = result.message === "Event not found." ? 404 : 400;
        return res.status(status).json({
          success: result.success,
          message: result.message,
        });
      }

      // Set headers for image download
      res.setHeader("Content-Type", "image/png");
      res.setHeader(
        "Content-Disposition",
        `attachment; filename="${result.filename}"`
      );

      // Send the QR code image buffer
      return res.send(result.buffer);
    } catch (error) {
      console.error("Generate event QR code controller error:", error);
      return res.status(500).json({
        success: false,
        message: "Internal server error",
      });
    }
  }

  @LoginRequired()
  @AllowedRoles(["Student", "Staff", "TA", "Professor"])
  async sendWorkshopCertificatesController(req: AuthRequest, res: Response) {
    try {
      const { id } = req.params;
      if (!id) {
        return res.status(400).json({
          success: false,
          message: "Workshop ID is required.",
        });
      }

      const result = await sendWorkshopCertificates(id);
      const status = result.success ? 200 : 400;
      return res.status(status).json(result);
    } catch (error) {
      console.error("Send workshop certificates controller error:", error);
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
export const getAllBazaarsController =
  eventController.getAllBazaarsController.bind(eventController);
export const getAllTripsController =
  eventController.getAllTripsController.bind(eventController);
export const createNewTrip =
  eventController.createNewTrip.bind(eventController);
export const updateTripDetails =
  eventController.updateTripDetails.bind(eventController);
export const registerForWorkshopController =
  eventController.registerForWorkshopController.bind(eventController);

export default eventController;

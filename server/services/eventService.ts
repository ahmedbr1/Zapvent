// server/services/eventService.ts
import { Types } from "mongoose";
import Comment from "../models/Comment";
import Rating from "../models/Rating";
import EventModel, {
  EventType,
  FundingSource,
  Location,
  IEvent,
  WorkshopStatus,
} from "../models/Event";
import AdminModel, { IAdmin } from "../models/Admin";
import vendorModel, {
  IVendor,
  VendorStatus,
  BazaarApplication,
} from "../models/Vendor";
import UserModel, { IUser, userRole } from "../models/User";
import * as XLSX from "xlsx";

function buildProfessorName(
  user: Pick<IUser, "firstName" | "lastName">
): string {
  return [user.firstName, user.lastName].filter(Boolean).join(" ").trim();
}

interface ProfessorSelectionResult {
  success: true;
  ids: string[];
  names: string[];
}

interface ProfessorSelectionError {
  success: false;
  message: string;
}

type ProfessorSelection = ProfessorSelectionResult | ProfessorSelectionError;

async function validateProfessorSelection(
  input: unknown
): Promise<ProfessorSelection> {
  if (!Array.isArray(input) || input.length === 0) {
    return {
      success: false,
      message: "At least one participating professor is required.",
    };
  }

  const seen = new Set<string>();
  const ids = input
    .map((value) => (typeof value === "string" ? value.trim() : ""))
    .filter((value) => {
      if (!value) return false;
      if (seen.has(value)) {
        return false;
      }
      seen.add(value);
      return true;
    });

  if (ids.length === 0) {
    return {
      success: false,
      message: "At least one participating professor is required.",
    };
  }

  if (ids.some((id) => !Types.ObjectId.isValid(id))) {
    return {
      success: false,
      message: "Invalid professor identifier provided.",
    };
  }

  const professors = await UserModel.find({
    _id: { $in: ids },
    role: userRole.PROFESSOR,
  })
    .select(["firstName", "lastName"])
    .lean<Array<IUser & { _id: Types.ObjectId }>>();

  if (professors.length !== ids.length) {
    return {
      success: false,
      message:
        "All participating professors must be verified professor accounts.",
    };
  }

  const nameMap = new Map<string, string>();
  professors.forEach((professor) => {
    nameMap.set(professor._id.toString(), buildProfessorName(professor));
  });

  const names = ids.map((id) => nameMap.get(id) ?? "Professor");

  return {
    success: true,
    ids,
    names,
  };
}

async function enrichEventsWithProfessors<
  T extends { participatingProfessors?: string[] },
>(
  events: Array<T>
): Promise<
  Array<
    T & {
      participatingProfessorIds: string[];
      participatingProfessors: string[];
    }
  >
> {
  const uniqueIds = new Set<string>();
  events.forEach((event) => {
    (event.participatingProfessors ?? []).forEach((value) => {
      if (Types.ObjectId.isValid(value)) {
        uniqueIds.add(value);
      }
    });
  });

  const professorMap = uniqueIds.size
    ? new Map(
        (
          await UserModel.find({
            _id: { $in: Array.from(uniqueIds) },
            role: userRole.PROFESSOR,
          })
            .select(["firstName", "lastName"])
            .lean<Array<IUser & { _id: Types.ObjectId }>>()
        ).map((professor) => [
          professor._id.toString(),
          buildProfessorName(professor),
        ])
      )
    : new Map<string, string>();

  return events.map((event) => {
    const rawList = event.participatingProfessors ?? [];
    const ids = rawList.filter((entry) => Types.ObjectId.isValid(entry));
    const namesFromIds = ids
      .map((id) => professorMap.get(id))
      .filter((name): name is string => Boolean(name));
    const embeddedNames = rawList.filter(
      (entry) => !Types.ObjectId.isValid(entry)
    );
    const names = [...namesFromIds, ...embeddedNames];

    return {
      ...event,
      participatingProfessorIds: ids,
      participatingProfessors: names,
    };
  });
}

export async function deleteEventById(eventId: string) {
  if (!Types.ObjectId.isValid(eventId)) {
    throw new Error("INVALID_EVENT_ID");
  }

  const event = await EventModel.findById(eventId);
  if (!event) return null;

  // OPTIONAL: cleanup related docs if they reference Event by id
  await Promise.all([
    Comment.deleteMany({ event: event._id }),
    Rating.deleteMany({ event: event._id }),
  ]);
  if (event.registeredUsers.length == 0) {
    await event.deleteOne(); // or Event.findByIdAndDelete(eventId)
  } else {
    throw new Error("Cannot delete event with registered users");
  }

  return event;
}

export const editBazaarDetails = async (
  eventId: string,
  updateData: Partial<IEvent>
): Promise<IEvent | null> => {
  try {
    const updatedEvent = await EventModel.findByIdAndUpdate(
      eventId,
      updateData,
      { new: true, runValidators: true }
    );
    return updatedEvent;
  } catch (error) {
    console.error("Error updating event:", error);
    throw error;
  }
};

export interface IGetAllBazaarsResponse {
  success: boolean;
  data?: Array<IEvent & { _id: Types.ObjectId }>;
  message?: string;
}

export const getAllBazaars = async (): Promise<IGetAllBazaarsResponse> => {
  try {
    const bazaars = await EventModel.find({
      eventType: EventType.BAZAAR,
    })
      .sort({ startDate: 1 })
      .lean<Array<IEvent & { _id: Types.ObjectId }>>();

    return {
      success: true,
      data: bazaars,
    };
  } catch (error) {
    console.error("Error fetching bazaars:", error);
    return {
      success: false,
      message: "Failed to fetch bazaars.",
    };
  }
};

export const getBazaarById = async (
  eventId: string
): Promise<IEvent | null> => {
  try {
    return await EventModel.findById(eventId);
  } catch (error) {
    console.error("Error fetching bazaar:", error);
    throw error;
  }
};

export const createTrip = async (
  tripData: Partial<IEvent>
): Promise<IEvent> => {
  try {
    const newTrip = await EventModel.create(tripData);
    return newTrip;
  } catch (error) {
    console.error("Error creating trip:", error);
    throw error;
  }
};

export interface IGetAllTripsResponse {
  success: boolean;
  data?: Array<IEvent & { _id: Types.ObjectId }>;
  message?: string;
}

export const getAllTrips = async (): Promise<IGetAllTripsResponse> => {
  try {
    const trips = await EventModel.find({
      eventType: EventType.TRIP,
    })
      .sort({ startDate: 1 })
      .lean<Array<IEvent & { _id: Types.ObjectId }>>();

    return {
      success: true,
      data: trips,
    };
  } catch (error) {
    console.error("Error fetching trips:", error);
    return {
      success: false,
      message: "Failed to fetch trips.",
    };
  }
};

export const getTripById = async (tripId: string): Promise<IEvent | null> => {
  try {
    return await EventModel.findById(tripId);
  } catch (error) {
    console.error("Error fetching trip:", error);
    throw error;
  }
};

export const editTripDetails = async (
  tripId: string,
  updateData: Partial<IEvent>
): Promise<IEvent | null> => {
  try {
    const updatedTrip = await EventModel.findByIdAndUpdate(tripId, updateData, {
      new: true,
      runValidators: true,
    });
    return updatedTrip;
  } catch (error) {
    console.error("Error updating trip:", error);
    throw error;
  }
};

export interface IGetAllEventsResponse {
  success: boolean;
  data?: unknown;
  message?: string;
}

export interface ICreateBazaarInput {
  name: string;
  description: string;
  startDate: string | Date;
  endDate: string | Date;
  registrationDeadline: string | Date;
  location: Location;
}

export interface ICreateBazaarResponse {
  success: boolean;
  message: string;
  data?: unknown;
}

export interface ICreateWorkshopInput {
  name: string;
  location: Location;
  startDate: string | Date;
  endDate: string | Date;
  description: string;
  fullAgenda: string;
  faculty: string;
  participatingProfessorIds: string[];
  requiredBudget: number;
  fundingSource: FundingSource;
  extraRequiredResources?: string;
  capacity: number;
  registrationDeadline: string | Date;
  createdBy: string;
}

export interface ICreateWorkshopResponse {
  success: boolean;
  message: string;
  data?: unknown;
}

export interface IEditWorkshopInput {
  name?: string;
  location?: Location;
  startDate?: string | Date;
  endDate?: string | Date;
  description?: string;
  fullAgenda?: string;
  faculty?: string;
  participatingProfessorIds?: string[];
  requiredBudget?: number;
  fundingSource?: FundingSource;
  extraRequiredResources?: string;
  capacity?: number;
  registrationDeadline?: string | Date;
}

export interface ICreateConferenceInput {
  name: string;
  startDate: string | Date;
  endDate: string | Date;
  description: string;
  fullAgenda: string;
  websiteLink: string;
  requiredBudget: number;
  fundingSource: FundingSource;
  extraRequiredResources?: string;
}

export async function getAllEvents(
  sortOrder: number = 0
): Promise<IGetAllEventsResponse> {
  try {
    const currentDate = new Date();

    // Create the base query for events that haven't ended yet
    // Only show approved workshops (including legacy ones with null/missing status) or non-workshop events
    let query = EventModel.find({
      endDate: { $gte: currentDate },
      $or: [
        { eventType: { $ne: EventType.WORKSHOP } },
        {
          eventType: EventType.WORKSHOP,
          $or: [
            { workshopStatus: WorkshopStatus.APPROVED },
            { workshopStatus: null },
            { workshopStatus: { $exists: false } },
          ],
        },
      ],
    });

    // Apply sorting if specified
    if (sortOrder === 1 || sortOrder === -1) {
      query = query.sort({ startDate: sortOrder });
    }

    const events = await query.lean<Array<IEvent & { _id: Types.ObjectId }>>();
    const enrichedEvents = await enrichEventsWithProfessors(events);

    return {
      success: true,
      data: enrichedEvents,
    };
  } catch (error) {
    console.error("Error fetching events:", error);
    return {
      success: false,
      message: "An error occurred while fetching events.",
    };
  }
}

export async function updateConferenceById(
  eventId: string,
  updateData: Partial<IEvent>
): Promise<IEvent | null> {
  try {
    const event = await EventModel.findById(eventId);

    if (!event) {
      throw new Error("Event not found");
    }

    if (event.eventType !== EventType.CONFERENCE) {
      throw new Error("Event is not a conference");
    }

    return await EventModel.findByIdAndUpdate(eventId, updateData, {
      new: true,
      runValidators: true,
    });
  } catch (error) {
    console.error("Error updating conference:", error);
    throw error;
  }
}

export async function getUpcomingBazaars() {
  const now = new Date();

  const allBazaars = await EventModel.find({
    eventType: EventType.BAZAAR,
    archived: false,
  });

  allBazaars.forEach((bazaar) => {
    console.log(
      `- ${bazaar.name}: startDate = ${bazaar.startDate}, comparison: ${bazaar.startDate >= now}`
    );
  });

  const bazaars = allBazaars.filter((bazaar) => bazaar.startDate >= now);
  return bazaars;
}

export async function createBazaar(
  payload: ICreateBazaarInput
): Promise<ICreateBazaarResponse> {
  try {
    const {
      name,
      description,
      startDate,
      endDate,
      registrationDeadline,
      location,
    } = payload;

    const parsedStart = new Date(startDate);
    const parsedEnd = new Date(endDate);
    const parsedDeadline = new Date(registrationDeadline);

    if (
      Number.isNaN(parsedStart.getTime()) ||
      Number.isNaN(parsedEnd.getTime()) ||
      Number.isNaN(parsedDeadline.getTime())
    ) {
      return {
        success: false,
        message: "Invalid date format provided.",
      };
    }

    if (parsedStart > parsedEnd) {
      return {
        success: false,
        message: "Start date must be before end date.",
      };
    }

    if (parsedDeadline >= parsedStart) {
      return {
        success: false,
        message: "Registration deadline must be before the start date.",
      };
    }

    const bazaar = await EventModel.create({
      name,
      description,
      eventType: EventType.BAZAAR,
      startDate: parsedStart,
      endDate: parsedEnd,
      date: parsedStart,
      registrationDeadline: parsedDeadline,
      location,
      fundingSource: FundingSource.GUC,
    });

    return {
      success: true,
      message: "Bazaar created successfully.",
      data: {
        id: bazaar._id.toString(),
        name: bazaar.name,
        startDate: bazaar.startDate,
        endDate: bazaar.endDate,
        location: bazaar.location,
        registrationDeadline: bazaar.registrationDeadline,
        description: bazaar.description,
      },
    };
  } catch (error) {
    console.error("Error creating bazaar:", error);
    return {
      success: false,
      message: "An error occurred while creating the bazaar.",
    };
  }
}

export async function createWorkshop(
  payload: ICreateWorkshopInput
): Promise<ICreateWorkshopResponse> {
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
      requiredBudget,
      fundingSource,
      extraRequiredResources,
      capacity,
      registrationDeadline,
      createdBy,
    } = payload;

    // Parse and validate dates
    const parsedStart = new Date(startDate);
    const parsedEnd = new Date(endDate);
    const parsedDeadline = new Date(registrationDeadline);

    if (
      Number.isNaN(parsedStart.getTime()) ||
      Number.isNaN(parsedEnd.getTime()) ||
      Number.isNaN(parsedDeadline.getTime())
    ) {
      return {
        success: false,
        message: "Invalid date format provided.",
      };
    }

    // Validate date logic
    if (parsedStart >= parsedEnd) {
      return {
        success: false,
        message: "Start date must be before end date.",
      };
    }

    if (parsedDeadline >= parsedStart) {
      return {
        success: false,
        message: "Registration deadline must be before the start date.",
      };
    }

    // Validate required fields
    if (!name || !description || !fullAgenda || !faculty) {
      return {
        success: false,
        message: "Name, description, full agenda, and faculty are required.",
      };
    }

    const professorValidation = await validateProfessorSelection(
      participatingProfessorIds
    );
    if (!professorValidation.success) {
      return professorValidation;
    }
    const professorIds = professorValidation.ids;
    const professorNames = professorValidation.names;

    if (!capacity || capacity <= 0) {
      return {
        success: false,
        message: "Capacity must be a positive number.",
      };
    }

    if (requiredBudget === undefined || requiredBudget < 0) {
      return {
        success: false,
        message: "Required budget must be a non-negative number.",
      };
    }

    // Create the workshop
    const workshop = await EventModel.create({
      name,
      eventType: EventType.WORKSHOP,
      description,
      date: parsedStart,
      location,
      capacity,
      startDate: parsedStart,
      endDate: parsedEnd,
      registrationDeadline: parsedDeadline,
      fullAgenda,
      faculty,
      participatingProfessors: professorIds,
      requiredBudget,
      fundingSource,
      extraRequiredResources: extraRequiredResources || "",
      createdBy,
      workshopStatus: WorkshopStatus.PENDING,
    });

    const plainWorkshop = workshop.toObject({ virtuals: false }) as Pick<
      IEvent,
      | "name"
      | "location"
      | "startDate"
      | "endDate"
      | "description"
      | "fullAgenda"
      | "faculty"
      | "requiredBudget"
      | "fundingSource"
      | "extraRequiredResources"
      | "capacity"
      | "registrationDeadline"
      | "createdBy"
      | "participatingProfessors"
    > & { _id: Types.ObjectId };

    const creatorDetails = await resolveWorkshopCreators([plainWorkshop]);
    const serialized = serializeWorkshopRecord(
      {
        ...plainWorkshop,
        participatingProfessorIds: professorIds,
        participatingProfessors: professorNames,
      },
      creatorDetails
    );

    // Notify Event Office about the new workshop request
    const creatorName = creatorDetails.get(createdBy)?.name || "A professor";
    const notificationMessage = `${creatorName} has submitted a new workshop request: "${name}" scheduled for ${parsedStart.toLocaleDateString()}`;
    await notifyEventOffice(notificationMessage);

    return {
      success: true,
      message: "Workshop created successfully.",
      data: serialized,
    };
  } catch (error) {
    console.error("Error creating workshop:", error);
    return {
      success: false,
      message: "An error occurred while creating the workshop.",
    };
  }
}

export async function editWorkshop(
  workshopId: string,
  userId: string,
  updateData: IEditWorkshopInput,
  actorRole?: string
): Promise<ICreateWorkshopResponse> {
  try {
    if (!Types.ObjectId.isValid(workshopId)) {
      return {
        success: false,
        message: "Invalid workshop ID.",
      };
    }

    const workshop = await EventModel.findById(workshopId);

    if (!workshop) {
      return {
        success: false,
        message: "Workshop not found.",
      };
    }

    if (workshop.eventType !== EventType.WORKSHOP) {
      return {
        success: false,
        message: "Event is not a workshop.",
      };
    }

    // Check if the user is the creator
    if (
      workshop.createdBy !== userId &&
      actorRole !== "EventOffice" &&
      actorRole !== "Admin"
    ) {
      return {
        success: false,
        message: "You are not authorized to edit this workshop.",
      };
    }

    let updates: IEditWorkshopInput = { ...updateData };

    // Validate dates if provided
    if (updates.startDate || updates.endDate || updates.registrationDeadline) {
      const parsedStart = updates.startDate
        ? new Date(updates.startDate)
        : workshop.startDate;
      const parsedEnd = updates.endDate
        ? new Date(updates.endDate)
        : workshop.endDate;
      const parsedDeadline = updates.registrationDeadline
        ? new Date(updates.registrationDeadline)
        : workshop.registrationDeadline;

      if (
        (updates.startDate && Number.isNaN(parsedStart.getTime())) ||
        (updates.endDate && Number.isNaN(parsedEnd.getTime())) ||
        (updates.registrationDeadline && Number.isNaN(parsedDeadline.getTime()))
      ) {
        return {
          success: false,
          message: "Invalid date format provided.",
        };
      }

      if (parsedStart >= parsedEnd) {
        return {
          success: false,
          message: "Start date must be before end date.",
        };
      }

      if (parsedDeadline >= parsedStart) {
        return {
          success: false,
          message: "Registration deadline must be before the start date.",
        };
      }

      // Update date field if startDate is changed
      if (updates.startDate) {
        updates = { ...updates, date: parsedStart } as IEditWorkshopInput & {
          date: Date;
        };
      }
    }

    if (updates.capacity !== undefined && updates.capacity <= 0) {
      return {
        success: false,
        message: "Capacity must be a positive number.",
      };
    }

    if (updates.requiredBudget !== undefined && updates.requiredBudget < 0) {
      return {
        success: false,
        message: "Required budget must be a non-negative number.",
      };
    }

    let updatePayload: Partial<IEvent> & {
      participatingProfessors?: string[];
    } = {
      ...updates,
    } as Partial<IEvent> & { participatingProfessorIds?: string[] };

    if (updates.participatingProfessorIds) {
      const professorValidation = await validateProfessorSelection(
        updates.participatingProfessorIds
      );
      if (!professorValidation.success) {
        return professorValidation;
      }
      updatePayload = {
        ...updatePayload,
        participatingProfessors: professorValidation.ids,
      };
    }

    if ("participatingProfessorIds" in updatePayload) {
      delete (updatePayload as { participatingProfessorIds?: string[] })
        .participatingProfessorIds;
    }

    const updatedWorkshop = await EventModel.findByIdAndUpdate(
      workshopId,
      updatePayload,
      { new: true, runValidators: true }
    ).lean<(IEvent & { _id: Types.ObjectId }) | null>();

    if (!updatedWorkshop) {
      return {
        success: false,
        message: "Workshop not found.",
      };
    }

    const enriched = await enrichEventsWithProfessors([updatedWorkshop]);
    const creatorDetails = await resolveWorkshopCreators(enriched);
    const serialized = enriched.length
      ? serializeWorkshopRecord(enriched[0], creatorDetails)
      : null;

    return {
      success: true,
      message: "Workshop updated successfully.",
      data: serialized,
    };
  } catch (error) {
    console.error("Error editing workshop:", error);
    return {
      success: false,
      message: "An error occurred while editing the workshop.",
    };
  }
}

export interface IRegisterWorkshopResponse {
  success: boolean;
  message: string;
  statusCode?: number;
  data?: {
    eventId: string;
    userId: string;
    registeredCount: number;
    capacity?: number;
  };
}

export async function registerUserForWorkshop(
  eventId: string,
  userId: string
): Promise<IRegisterWorkshopResponse> {
  try {
    if (!Types.ObjectId.isValid(eventId)) {
      return {
        success: false,
        message: "Invalid event ID.",
        statusCode: 400,
      };
    }

    if (!Types.ObjectId.isValid(userId)) {
      return {
        success: false,
        message: "Invalid user ID.",
        statusCode: 400,
      };
    }

    const [event, user] = await Promise.all([
      EventModel.findById(eventId),
      UserModel.findById(userId),
    ]);

    if (!event) {
      return {
        success: false,
        message: "Event not found.",
        statusCode: 404,
      };
    }

    if (!user) {
      return {
        success: false,
        message: "User not found.",
        statusCode: 404,
      };
    }

    // Check if event has role restrictions
    if (event.allowedRoles && event.allowedRoles.length > 0) {
      if (!event.allowedRoles.includes(user.role)) {
        return {
          success: false,
          message: `This event is restricted to the following roles: ${event.allowedRoles.join(", ")}. Your role (${user.role}) is not allowed.`,
          statusCode: 403,
        };
      }
    }

    if (
      event.eventType !== EventType.WORKSHOP &&
      event.eventType !== EventType.TRIP
    ) {
      return {
        success: false,
        message: "Only workshops and trips support registrations.",
        statusCode: 400,
      };
    }

    const now = new Date();
    if (event.archived) {
      return {
        success: false,
        message: "Event is archived.",
        statusCode: 400,
      };
    }

    if (event.registrationDeadline < now) {
      return {
        success: false,
        message: "Registration deadline has passed.",
        statusCode: 400,
      };
    }

    const alreadyRegistered =
      event.registeredUsers?.some(
        (registeredId: string) => registeredId === userId
      ) ?? false;

    if (alreadyRegistered) {
      return {
        success: false,
        message: "User already registered for this event.",
        statusCode: 409,
      };
    }

    const currentRegistrations = event.registeredUsers?.length ?? 0;
    if (
      typeof event.capacity === "number" &&
      event.capacity > 0 &&
      currentRegistrations >= event.capacity
    ) {
      return {
        success: false,
        message: "Event has reached its capacity.",
        statusCode: 400,
      };
    }

    const updatedEvent = await EventModel.findByIdAndUpdate(
      eventId,
      { $addToSet: { registeredUsers: userId } },
      { new: true }
    );

    if (!updatedEvent) {
      return {
        success: false,
        message: "Failed to update event registration.",
        statusCode: 500,
      };
    }

    const addToSet: Record<string, unknown> = {
      registeredEvents: eventId,
    };

    if (event.eventType === EventType.WORKSHOP) {
      addToSet.workshops = eventId;
    }

    await UserModel.findByIdAndUpdate(userId, {
      $addToSet: addToSet,
    });

    const message =
      event.eventType === EventType.WORKSHOP
        ? "Registration successful."
        : `Successfully registered for ${event.eventType.toLowerCase()} event.`;

    return {
      success: true,
      message,
      data: {
        eventId,
        userId,
        registeredCount: updatedEvent.registeredUsers.length,
        capacity: updatedEvent.capacity,
      },
    };
  } catch (error) {
    console.error("Error registering user for event:", error);
    return {
      success: false,
      message: "An error occurred while registering for the event.",
      statusCode: 500,
    };
  }
}

function buildAdminName(admin: Pick<IAdmin, "firstName" | "lastName">): string {
  return [admin.firstName, admin.lastName].filter(Boolean).join(" ").trim();
}

async function notifyEventOffice(message: string): Promise<void> {
  try {
    await AdminModel.updateMany(
      { adminType: "EventOffice", status: "Active" },
      { $push: { notifications: message } }
    );
  } catch (error) {
    console.error("Error sending notification to Event Office:", error);
  }
}

async function notifyProfessorWorkshopStatus(
  professorId: string,
  workshopName: string,
  status: "approved" | "rejected",
  reason?: string
): Promise<void> {
  try {
    if (!Types.ObjectId.isValid(professorId)) {
      return;
    }

    let message: string;
    if (status === "approved") {
      message = `Your workshop "${workshopName}" has been approved and published by the Event Office.`;
    } else {
      message = reason
        ? `Your workshop "${workshopName}" has been rejected by the Event Office. Reason: ${reason}`
        : `Your workshop "${workshopName}" has been rejected by the Event Office.`;
    }

    await UserModel.findByIdAndUpdate(professorId, {
      $push: { notifications: message },
    });
  } catch (error) {
    console.error("Error sending notification to professor:", error);
  }
}

interface WorkshopCreatorDetails {
  name?: string;
  role?: string;
}

type WorkshopRecordInput = Pick<
  IEvent,
  | "name"
  | "location"
  | "startDate"
  | "endDate"
  | "description"
  | "fullAgenda"
  | "faculty"
  | "requiredBudget"
  | "fundingSource"
  | "extraRequiredResources"
  | "capacity"
  | "registrationDeadline"
  | "createdBy"
> & {
  _id: Types.ObjectId;
  participatingProfessorIds: string[];
  participatingProfessors: string[];
};

function serializeWorkshopRecord<T extends WorkshopRecordInput>(
  workshop: T,
  creatorMap: Map<string, WorkshopCreatorDetails>
) {
  const creatorDetails = workshop.createdBy
    ? creatorMap.get(workshop.createdBy)
    : undefined;

  return {
    id: workshop._id.toString(),
    name: workshop.name,
    location: workshop.location,
    startDate: workshop.startDate,
    endDate: workshop.endDate,
    description: workshop.description,
    fullAgenda: workshop.fullAgenda ?? "",
    faculty: workshop.faculty ?? "",
    participatingProfessorIds: workshop.participatingProfessorIds,
    participatingProfessors: workshop.participatingProfessors,
    requiredBudget: workshop.requiredBudget ?? 0,
    fundingSource: workshop.fundingSource,
    extraRequiredResources: workshop.extraRequiredResources ?? "",
    capacity: workshop.capacity ?? 0,
    registrationDeadline: workshop.registrationDeadline,
    createdBy: workshop.createdBy,
    createdByName: creatorDetails?.name,
    createdByRole: creatorDetails?.role,
  };
}

async function resolveWorkshopCreators(
  workshops: Array<Pick<WorkshopRecordInput, "createdBy">>
): Promise<Map<string, WorkshopCreatorDetails>> {
  const creatorIds = Array.from(
    new Set(
      workshops
        .map((workshop) => workshop.createdBy)
        .filter((value): value is string => Boolean(value))
    )
  );

  const validObjectIds = creatorIds
    .filter((id) => Types.ObjectId.isValid(id))
    .map((id) => new Types.ObjectId(id));

  if (!validObjectIds.length) {
    return new Map<string, WorkshopCreatorDetails>();
  }

  const [creatorUsers, creatorAdmins] = await Promise.all([
    UserModel.find({ _id: { $in: validObjectIds } })
      .select(["firstName", "lastName"])
      .lean<Array<IUser & { _id: Types.ObjectId }>>(),
    AdminModel.find({ _id: { $in: validObjectIds } })
      .select(["firstName", "lastName", "adminType"])
      .lean<Array<IAdmin & { _id: Types.ObjectId }>>(),
  ]);

  const map = new Map<string, WorkshopCreatorDetails>();

  creatorUsers.forEach((user) => {
    map.set(user._id.toString(), {
      name: buildProfessorName(user),
      role: "User",
    });
  });

  creatorAdmins.forEach((admin) => {
    const name = buildAdminName(admin) || "Events Office Admin";
    map.set(admin._id.toString(), {
      name,
      role: admin.adminType,
    });
  });

  return map;
}

export async function getWorkshopsByCreator(
  userId: string
): Promise<ICreateWorkshopResponse> {
  try {
    if (!userId) {
      return {
        success: false,
        message: "User ID is required.",
      };
    }

    const workshops = await EventModel.find({
      eventType: EventType.WORKSHOP,
      createdBy: userId,
      archived: false,
    })
      .sort({ startDate: -1 })
      .lean<Array<IEvent & { _id: Types.ObjectId }>>();

    const enriched = await enrichEventsWithProfessors(workshops);
    const creatorDetails = await resolveWorkshopCreators(enriched);

    return {
      success: true,
      message: "Workshops retrieved successfully.",
      data: enriched.map((workshop) =>
        serializeWorkshopRecord(workshop, creatorDetails)
      ),
    };
  } catch (error) {
    console.error("Error fetching workshops by creator:", error);
    return {
      success: false,
      message: "An error occurred while fetching workshops.",
    };
  }
}

export async function getWorkshopParticipants(
  workshopId: string,
  userId: string
): Promise<ICreateWorkshopResponse> {
  try {
    if (!Types.ObjectId.isValid(workshopId)) {
      return {
        success: false,
        message: "Invalid workshop ID.",
      };
    }

    const workshop = await EventModel.findById(workshopId).lean<
      (IEvent & { _id: Types.ObjectId }) | null
    >();

    if (!workshop) {
      return {
        success: false,
        message: "Workshop not found.",
      };
    }

    if (workshop.eventType !== EventType.WORKSHOP) {
      return {
        success: false,
        message: "Event is not a workshop.",
      };
    }

    // Check if the user is the creator
    if (workshop.createdBy !== userId) {
      return {
        success: false,
        message: "You are not authorized to view this workshop's participants.",
      };
    }

    const registeredUserIds = workshop.registeredUsers ?? [];
    const capacity = workshop.capacity ?? 0;
    const registeredCount = registeredUserIds.length;
    const remainingSpots = capacity > 0 ? capacity - registeredCount : 0;

    // Fetch participant details
    const validUserIds = registeredUserIds
      .filter((id) => Types.ObjectId.isValid(id))
      .map((id) => new Types.ObjectId(id));

    const participants = await UserModel.find({
      _id: { $in: validUserIds },
    })
      .select([
        "firstName",
        "lastName",
        "email",
        "role",
        "studentId",
        "staffId",
      ])
      .lean<Array<IUser & { _id: Types.ObjectId }>>();

    const participantList = participants.map((user) => ({
      id: user._id.toString(),
      firstName: user.firstName,
      lastName: user.lastName,
      email: user.email,
      role: user.role,
      studentId: user.studentId,
      staffId: user.staffId,
    }));

    return {
      success: true,
      message: "Workshop participants retrieved successfully.",
      data: {
        workshopId: workshop._id.toString(),
        workshopName: workshop.name,
        capacity,
        registeredCount,
        remainingSpots,
        participants: participantList,
      },
    };
  } catch (error) {
    console.error("Error fetching workshop participants:", error);
    return {
      success: false,
      message: "An error occurred while fetching workshop participants.",
    };
  }
}

export async function getAllWorkshops(): Promise<ICreateWorkshopResponse> {
  try {
    // For Event Office/Admin: show all workshops regardless of status
    // This function is called when Event Office/Admin views workshops
    const workshops = await EventModel.find({
      eventType: EventType.WORKSHOP,
      archived: false,
    })
      .sort({ startDate: -1 })
      .lean<Array<IEvent & { _id: Types.ObjectId }>>();

    const enriched = await enrichEventsWithProfessors(workshops);
    const creatorDetails = await resolveWorkshopCreators(enriched);

    return {
      success: true,
      message: "Workshops retrieved successfully.",
      data: enriched.map((workshop) =>
        serializeWorkshopRecord(workshop, creatorDetails)
      ),
    };
  } catch (error) {
    console.error("Error fetching workshops list:", error);
    return {
      success: false,
      message: "An error occurred while fetching workshops.",
    };
  }
}

export async function createConference(
  payload: ICreateConferenceInput
): Promise<ICreateWorkshopResponse> {
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
    } = payload;

    // Parse and validate dates
    const parsedStart = new Date(startDate);
    const parsedEnd = new Date(endDate);

    if (
      Number.isNaN(parsedStart.getTime()) ||
      Number.isNaN(parsedEnd.getTime())
    ) {
      return {
        success: false,
        message: "Invalid date format provided.",
      };
    }

    // Validate date logic
    if (parsedStart >= parsedEnd) {
      return {
        success: false,
        message: "Start date must be before end date.",
      };
    }

    // Validate required fields
    if (!name || !description || !fullAgenda || !websiteLink) {
      return {
        success: false,
        message:
          "Name, description, full agenda, and website link are required.",
      };
    }

    if (requiredBudget === undefined || requiredBudget < 0) {
      return {
        success: false,
        message: "Required budget must be a non-negative number.",
      };
    }

    // Create the conference - set default location and registration deadline
    const registrationDeadline = new Date(parsedStart);
    registrationDeadline.setDate(registrationDeadline.getDate() - 7); // Default: 7 days before start

    const conference = await EventModel.create({
      name,
      eventType: EventType.CONFERENCE,
      description,
      date: parsedStart,
      location: Location.GUCCAIRO, // Default location, can be changed later
      startDate: parsedStart,
      endDate: parsedEnd,
      registrationDeadline,
      fullAgenda,
      websiteLink,
      requiredBudget,
      fundingSource,
      extraRequiredResources: extraRequiredResources || "",
    });

    return {
      success: true,
      message: "Conference created successfully.",
      data: {
        id: conference._id.toString(),
        name: conference.name,
        startDate: conference.startDate,
        endDate: conference.endDate,
        description: conference.description,
        fullAgenda: conference.fullAgenda,
        websiteLink: conference.websiteLink,
        requiredBudget: conference.requiredBudget,
        fundingSource: conference.fundingSource,
        extraRequiredResources: conference.extraRequiredResources,
      },
    };
  } catch (error) {
    console.error("Error creating conference:", error);
    return {
      success: false,
      message: "An error occurred while creating the conference.",
    };
  }
}

// For vendor dashboard
export async function getAcceptedUpcomingBazaars(vendorId: string): Promise<{
  success: boolean;
  data?: Array<IEvent & { vendorApplication?: Partial<BazaarApplication> }>;
  message?: string;
  statusCode?: number;
}> {
  try {
    if (!vendorId || !Types.ObjectId.isValid(vendorId)) {
      return { success: false, message: "Invalid vendor id", statusCode: 400 };
    }

    const vendor = await vendorModel.findById(vendorId).lean<IVendor | null>();
    if (!vendor) {
      return { success: false, message: "Vendor not found", statusCode: 404 };
    }

    const approvedApps = (vendor.applications || []).filter(
      (app) => app.status === VendorStatus.APPROVED
    );

    if (approvedApps.length === 0) {
      return { success: true, data: [], statusCode: 200 };
    }

    const eventIds = approvedApps
      .map((app) => app.eventId)
      .filter((id): id is Types.ObjectId => Types.ObjectId.isValid(String(id)));

    if (eventIds.length === 0) {
      return { success: true, data: [], statusCode: 200 };
    }

    const now = new Date();

    const events = await EventModel.find({
      _id: { $in: eventIds },
      eventType: EventType.BAZAAR,
      archived: false,
      $or: [{ startDate: { $gte: now } }, { endDate: { $gte: now } }],
    })
      .sort({ startDate: 1 })
      .lean<IEvent[]>();

    const appByEventId = new Map<string, BazaarApplication>();
    for (const app of approvedApps) appByEventId.set(String(app.eventId), app);

    const mergedResults = events.map((event) => ({
      ...event,
      vendorApplication: appByEventId.get(String(event._id)) || undefined,
    })) as (IEvent & { vendorApplication?: Partial<BazaarApplication> })[];

    return { success: true, data: mergedResults, statusCode: 200 };
  } catch (error) {
    console.error(
      "Error fetching vendor accepted upcoming bazaars and booths:",
      error
    );
    return {
      success: false,
      message:
        "An error occurred while fetching vendor accepted upcoming bazaars and booths.",
      statusCode: 500,
    };
  }
}

export async function getRequestedUpcomingBazaars(vendorId: string): Promise<{
  success: boolean;
  data?: Array<IEvent & { vendorApplication?: Partial<BazaarApplication> }>;
  message?: string;
  statusCode?: number;
}> {
  try {
    if (!vendorId || !Types.ObjectId.isValid(vendorId)) {
      return { success: false, message: "Invalid vendor id", statusCode: 400 };
    }
    const vendor = await vendorModel.findById(vendorId).lean<IVendor | null>();
    if (!vendor) {
      return { success: false, message: "Vendor not found", statusCode: 404 };
    }
    const requestedApps = (vendor.applications || []).filter((app) =>
      [VendorStatus.PENDING, VendorStatus.REJECTED].includes(app.status)
    );
    if (requestedApps.length === 0) {
      return { success: true, data: [], statusCode: 200 };
    }

    const eventIds = requestedApps
      .map((app) => app.eventId)
      .filter((id): id is Types.ObjectId => Types.ObjectId.isValid(String(id)));
    if (eventIds.length === 0) {
      return { success: true, data: [], statusCode: 200 };
    }

    const now = new Date();
    const events = await EventModel.find({
      _id: { $in: eventIds },
      eventType: EventType.BAZAAR,
      archived: false,
      $or: [{ startDate: { $gte: now } }, { endDate: { $gte: now } }],
    })
      .sort({ startDate: 1 })
      .lean<IEvent[]>();

    const appByEventId = new Map<string, BazaarApplication>();
    for (const app of requestedApps) appByEventId.set(String(app.eventId), app);
    const mergedResults = events.map((event) => ({
      ...event,
      vendorApplication: appByEventId.get(String(event._id)) || undefined,
    })) as (IEvent & { vendorApplication?: Partial<BazaarApplication> })[];

    return { success: true, data: mergedResults, statusCode: 200 };
  } catch (error) {
    console.error(
      "Error fetching vendor requested upcoming bazaars and booths:",
      error
    );
    return {
      success: false,
      message:
        "An error occurred while fetching vendor requested upcoming bazaars and booths.",
      statusCode: 500,
    };
  }
}

export async function getVendorApplicationsForBazaar(eventId: string): Promise<{
  success: boolean;
  data?: Array<{
    vendorId: Types.ObjectId;
    companyName: string;
    email: string;
    logo: string;
    application: BazaarApplication[];
  }>;
  message?: string;
  statusCode?: number;
}> {
  try {
    if (!eventId || !Types.ObjectId.isValid(eventId)) {
      return { success: false, message: "Invalid event id", statusCode: 400 };
    }

    const objId = new Types.ObjectId(eventId);

    const results = await vendorModel.aggregate([
      { $match: { "applications.eventId": objId } },
      { $unwind: "$applications" },
      { $match: { "applications.eventId": objId } },
      {
        $project: {
          vendorId: "$_id",
          companyName: "$companyName",
          email: "$email",
          logo: "$logo",
          application: "$applications",
        },
      },
      { $sort: { "application.applicationDate": -1 } },
    ]);

    return { success: true, data: results, statusCode: 200 };
  } catch (error) {
    console.error("Error fetching vendor applications for bazaar:", error);
    return {
      success: false,
      message:
        "An error occurred while fetching vendor applications for bazaar.",
      statusCode: 500,
    };
  }
}

export async function approveWorkshop(
  workshopId: string
): Promise<ICreateWorkshopResponse> {
  try {
    if (!Types.ObjectId.isValid(workshopId)) {
      return {
        success: false,
        message: "Invalid workshop ID.",
      };
    }

    const workshop = await EventModel.findById(workshopId);

    if (!workshop) {
      return {
        success: false,
        message: "Workshop not found.",
      };
    }

    if (workshop.eventType !== EventType.WORKSHOP) {
      return {
        success: false,
        message: "Event is not a workshop.",
      };
    }

    if (workshop.workshopStatus === WorkshopStatus.APPROVED) {
      return {
        success: false,
        message: "Workshop is already approved.",
      };
    }

    workshop.workshopStatus = WorkshopStatus.APPROVED;
    await workshop.save();

    // Notify the professor about approval
    if (workshop.createdBy) {
      await notifyProfessorWorkshopStatus(
        workshop.createdBy,
        workshop.name,
        "approved"
      );
    }

    return {
      success: true,
      message: "Workshop approved and published successfully.",
      data: {
        id: workshop._id.toString(),
        name: workshop.name,
        status: workshop.workshopStatus,
      },
    };
  } catch (error) {
    console.error("Error approving workshop:", error);
    return {
      success: false,
      message: "An error occurred while approving the workshop.",
    };
  }
}

export async function rejectWorkshop(
  workshopId: string,
  reason?: string
): Promise<ICreateWorkshopResponse> {
  try {
    if (!Types.ObjectId.isValid(workshopId)) {
      return {
        success: false,
        message: "Invalid workshop ID.",
      };
    }

    const workshop = await EventModel.findById(workshopId);

    if (!workshop) {
      return {
        success: false,
        message: "Workshop not found.",
      };
    }

    if (workshop.eventType !== EventType.WORKSHOP) {
      return {
        success: false,
        message: "Event is not a workshop.",
      };
    }

    if (workshop.workshopStatus === WorkshopStatus.REJECTED) {
      return {
        success: false,
        message: "Workshop is already rejected.",
      };
    }

    workshop.workshopStatus = WorkshopStatus.REJECTED;
    await workshop.save();

    // Notify the professor about rejection
    if (workshop.createdBy) {
      await notifyProfessorWorkshopStatus(
        workshop.createdBy,
        workshop.name,
        "rejected",
        reason
      );
    }

    return {
      success: true,
      message: reason
        ? `Workshop rejected. Reason: ${reason}`
        : "Workshop rejected successfully.",
      data: {
        id: workshop._id.toString(),
        name: workshop.name,
        status: workshop.workshopStatus,
        reason,
      },
    };
  } catch (error) {
    console.error("Error rejecting workshop:", error);
    return {
      success: false,
      message: "An error occurred while rejecting the workshop.",
    };
  }
}

export async function requestWorkshopEdits(
  workshopId: string,
  message: string
): Promise<ICreateWorkshopResponse> {
  try {
    if (!Types.ObjectId.isValid(workshopId)) {
      return {
        success: false,
        message: "Invalid workshop ID.",
      };
    }

    if (!message || message.trim().length === 0) {
      return {
        success: false,
        message: "Edit request message is required.",
      };
    }

    const workshop = await EventModel.findById(workshopId);

    if (!workshop) {
      return {
        success: false,
        message: "Workshop not found.",
      };
    }

    if (workshop.eventType !== EventType.WORKSHOP) {
      return {
        success: false,
        message: "Event is not a workshop.",
      };
    }

    if (workshop.workshopStatus === WorkshopStatus.APPROVED) {
      return {
        success: false,
        message: "Cannot request edits for an already approved workshop.",
      };
    }

    workshop.requestedEdits = message.trim();
    await workshop.save();

    return {
      success: true,
      message: "Edit request sent to professor successfully.",
      data: {
        id: workshop._id.toString(),
        name: workshop.name,
        requestedEdits: workshop.requestedEdits,
      },
    };
  } catch (error) {
    console.error("Error requesting workshop edits:", error);
    return {
      success: false,
      message: "An error occurred while requesting workshop edits.",
    };
  }
}

export async function getWorkshopStatus(
  workshopId: string,
  userId: string
): Promise<ICreateWorkshopResponse> {
  try {
    if (!Types.ObjectId.isValid(workshopId)) {
      return {
        success: false,
        message: "Invalid workshop ID.",
      };
    }

    const workshop = await EventModel.findById(workshopId).lean<
      (IEvent & { _id: Types.ObjectId }) | null
    >();

    if (!workshop) {
      return {
        success: false,
        message: "Workshop not found.",
      };
    }

    if (workshop.eventType !== EventType.WORKSHOP) {
      return {
        success: false,
        message: "Event is not a workshop.",
      };
    }

    // Check if the user is the creator
    if (workshop.createdBy !== userId) {
      return {
        success: false,
        message: "You are not authorized to view this workshop's status.",
      };
    }

    return {
      success: true,
      message: "Workshop status retrieved successfully.",
      data: {
        id: workshop._id.toString(),
        name: workshop.name,
        status: workshop.workshopStatus ?? WorkshopStatus.PENDING,
        requestedEdits: workshop.requestedEdits ?? null,
      },
    };
  } catch (error) {
    console.error("Error fetching workshop status:", error);
    return {
      success: false,
      message: "An error occurred while fetching workshop status.",
    };
  }
}

export async function archiveEvent(eventId: string): Promise<{
  success: boolean;
  message: string;
  data?: { id: string; name: string; archived: boolean };
}> {
  try {
    if (!Types.ObjectId.isValid(eventId)) {
      return {
        success: false,
        message: "Invalid event ID.",
      };
    }

    const event = await EventModel.findById(eventId);

    if (!event) {
      return {
        success: false,
        message: "Event not found.",
      };
    }

    if (event.archived) {
      return {
        success: false,
        message: "Event is already archived.",
      };
    }

    // Check if the event has already passed (endDate is in the past)
    const currentDate = new Date();
    if (event.endDate > currentDate) {
      return {
        success: false,
        message:
          "Cannot archive an event that has not yet passed. Event ends on: " +
          event.endDate.toISOString(),
      };
    }

    event.archived = true;
    await event.save();

    return {
      success: true,
      message: "Event archived successfully.",
      data: {
        id: event._id.toString(),
        name: event.name,
        archived: event.archived,
      },
    };
  } catch (error) {
    console.error("Error archiving event:", error);
    return {
      success: false,
      message: "An error occurred while archiving the event.",
    };
  }
}

export async function setEventRoleRestrictions(
  eventId: string,
  allowedRoles: string[]
): Promise<{
  success: boolean;
  message: string;
  data?: { id: string; name: string; allowedRoles: string[] };
}> {
  try {
    if (!Types.ObjectId.isValid(eventId)) {
      return {
        success: false,
        message: "Invalid event ID.",
      };
    }

    // Validate that allowedRoles is an array
    if (!Array.isArray(allowedRoles)) {
      return {
        success: false,
        message: "allowedRoles must be an array.",
      };
    }

    // Valid roles from userRole enum
    const validRoles = ["Student", "Staff", "Professor", "TA"];

    // Filter out invalid roles
    const filteredRoles = allowedRoles.filter((role) =>
      validRoles.includes(role)
    );

    if (filteredRoles.length === 0 && allowedRoles.length > 0) {
      return {
        success: false,
        message: `Invalid roles provided. Valid roles are: ${validRoles.join(", ")}`,
      };
    }

    const event = await EventModel.findById(eventId);

    if (!event) {
      return {
        success: false,
        message: "Event not found.",
      };
    }

    // Empty array means no restrictions (all roles allowed)
    event.allowedRoles = filteredRoles.length > 0 ? filteredRoles : undefined;
    await event.save();

    return {
      success: true,
      message:
        filteredRoles.length > 0
          ? `Event restricted to roles: ${filteredRoles.join(", ")}`
          : "Event is now open to all roles.",
      data: {
        id: event._id.toString(),
        name: event.name,
        allowedRoles: event.allowedRoles ?? [],
      },
    };
  } catch (error) {
    console.error("Error setting event role restrictions:", error);
    return {
      success: false,
      message: "An error occurred while updating role restrictions.",
    };
  }
}

export async function exportEventRegistrations(eventId: string): Promise<{
  success: boolean;
  message: string;
  buffer?: Buffer;
  filename?: string;
}> {
  try {
    if (!Types.ObjectId.isValid(eventId)) {
      return {
        success: false,
        message: "Invalid event ID.",
      };
    }

    const event = await EventModel.findById(eventId);

    if (!event) {
      return {
        success: false,
        message: "Event not found.",
      };
    }

    // Conferences don't support user registrations export
    if (event.eventType === EventType.CONFERENCE) {
      return {
        success: false,
        message: "Conferences do not support registration exports.",
      };
    }

    // Get registered user IDs
    const registeredUserIds = event.registeredUsers ?? [];

    if (registeredUserIds.length === 0) {
      return {
        success: false,
        message: "No users registered for this event.",
      };
    }

    // Fetch user details for all registered users
    const users = await UserModel.find({
      _id: { $in: registeredUserIds },
    }).select("firstName lastName email role studentId staffId");

    if (users.length === 0) {
      return {
        success: false,
        message: "No valid user data found for registered users.",
      };
    }

    // Prepare data for Excel
    const excelData = users.map((user) => ({
      "First Name": user.firstName,
      "Last Name": user.lastName,
      Email: user.email,
      Role: user.role,
      "Student ID": user.studentId || "N/A",
      "Staff ID": user.staffId || "N/A",
    }));

    // Create workbook and worksheet
    const workbook = XLSX.utils.book_new();
    const worksheet = XLSX.utils.json_to_sheet(excelData);

    // Set column widths for better readability
    worksheet["!cols"] = [
      { wch: 15 }, // First Name
      { wch: 15 }, // Last Name
      { wch: 30 }, // Email
      { wch: 12 }, // Role
      { wch: 15 }, // Student ID
      { wch: 15 }, // Staff ID
    ];

    // Add worksheet to workbook
    XLSX.utils.book_append_sheet(workbook, worksheet, "Registrations");

    // Generate Excel file buffer
    const buffer = XLSX.write(workbook, { type: "buffer", bookType: "xlsx" });

    // Create filename with event name and date
    const sanitizedEventName = event.name.replace(/[^a-z0-9]/gi, "_");
    const dateStr = new Date().toISOString().split("T")[0];
    const filename = `${sanitizedEventName}_Registrations_${dateStr}.xlsx`;

    return {
      success: true,
      message: "Registration export generated successfully.",
      buffer: Buffer.from(buffer),
      filename,
    };
  } catch (error) {
    console.error("Error exporting event registrations:", error);
    return {
      success: false,
      message: "An error occurred while exporting registrations.",
    };
  }
}

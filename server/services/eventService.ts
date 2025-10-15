// server/services/eventService.ts
import { Types } from "mongoose";
import Comment from "../models/Comment";
import Rating from "../models/Rating";
import EventModel, {
  EventType,
  FundingSource,
  Location,
  IEvent,
} from "../models/Event";
import vendorModel, {
  IVendor,
  VendorStatus,
  BazaarApplication,
} from "../models/Vendor";

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

  await event.deleteOne(); // or Event.findByIdAndDelete(eventId)
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
  participatingProfessors: string[];
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
  participatingProfessors?: string[];
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

    // Create the base query for events that haven't started yet
    let query = EventModel.find({
      startDate: { $gt: currentDate },
    });

    // Apply sorting if specified
    if (sortOrder === 1 || sortOrder === -1) {
      query = query.sort({ startDate: sortOrder });
    }

    // Execute the query
    const events = await query;

    return {
      success: true,
      data: events,
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
      participatingProfessors,
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

    if (!participatingProfessors || participatingProfessors.length === 0) {
      return {
        success: false,
        message: "At least one participating professor is required.",
      };
    }

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
      participatingProfessors,
      requiredBudget,
      fundingSource,
      extraRequiredResources: extraRequiredResources || "",
      createdBy,
    });

    return {
      success: true,
      message: "Workshop created successfully.",
      data: {
        id: workshop._id.toString(),
        name: workshop.name,
        location: workshop.location,
        startDate: workshop.startDate,
        endDate: workshop.endDate,
        description: workshop.description,
        fullAgenda: workshop.fullAgenda,
        faculty: workshop.faculty,
        participatingProfessors: workshop.participatingProfessors,
        requiredBudget: workshop.requiredBudget,
        fundingSource: workshop.fundingSource,
        extraRequiredResources: workshop.extraRequiredResources,
        capacity: workshop.capacity,
        registrationDeadline: workshop.registrationDeadline,
      },
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
  updateData: IEditWorkshopInput
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
    if (workshop.createdBy !== userId) {
      return {
        success: false,
        message: "You are not authorized to edit this workshop.",
      };
    }

    // Validate dates if provided
    if (updateData.startDate || updateData.endDate || updateData.registrationDeadline) {
      const parsedStart = updateData.startDate ? new Date(updateData.startDate) : workshop.startDate;
      const parsedEnd = updateData.endDate ? new Date(updateData.endDate) : workshop.endDate;
      const parsedDeadline = updateData.registrationDeadline ? new Date(updateData.registrationDeadline) : workshop.registrationDeadline;

      if (
        (updateData.startDate && Number.isNaN(parsedStart.getTime())) ||
        (updateData.endDate && Number.isNaN(parsedEnd.getTime())) ||
        (updateData.registrationDeadline && Number.isNaN(parsedDeadline.getTime()))
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
      if (updateData.startDate) {
        updateData = { ...updateData, date: parsedStart } as IEditWorkshopInput & { date: Date };
      }
    }

    if (updateData.capacity !== undefined && updateData.capacity <= 0) {
      return {
        success: false,
        message: "Capacity must be a positive number.",
      };
    }

    if (updateData.requiredBudget !== undefined && updateData.requiredBudget < 0) {
      return {
        success: false,
        message: "Required budget must be a non-negative number.",
      };
    }

    const updatedWorkshop = await EventModel.findByIdAndUpdate(
      workshopId,
      updateData,
      { new: true, runValidators: true }
    );

    return {
      success: true,
      message: "Workshop updated successfully.",
      data: updatedWorkshop,
    };
  } catch (error) {
    console.error("Error editing workshop:", error);
    return {
      success: false,
      message: "An error occurred while editing the workshop.",
    };
  }
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
    }).sort({ startDate: -1 });

    return {
      success: true,
      message: "Workshops retrieved successfully.",
      data: workshops,
    };
  } catch (error) {
    console.error("Error fetching workshops by creator:", error);
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
        message: "Name, description, full agenda, and website link are required.",
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

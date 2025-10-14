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
  data?: Array<Partial<BazaarApplication> & { vendorInfo?: Partial<IVendor> }>;
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
          vendorName: "$name",
          email: "$email",
          vendorProfile: "$profile",
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

import mongoose from "mongoose";
import EventModel, { EventType, IEventRegistration } from "../models/Event";
import { userRole } from "../models/User";

const allowedRoles = new Set(Object.values(userRole));

interface RegisterForEventPayload {
  fullName: string;
  email: string;
  universityId: string;
  role: userRole;
}

interface ServiceResponse<T> {
  success: boolean;
  data?: T;
  message?: string;
  statusCode?: number;
}

export async function getAllEvents() {
    try {
      const currentDate = new Date();
  
      // Fetch only events that haven't started yet
      const events = await EventModel.find({
        startDate: { $gt: currentDate },
      });
  
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

export async function registerUserForEvent(
  eventId: string,
  payload: RegisterForEventPayload
): Promise<ServiceResponse<{ registration: IEventRegistration }>> {
  try {
    if (!mongoose.Types.ObjectId.isValid(eventId)) {
      return {
        success: false,
        statusCode: 400,
        message: "Invalid event id.",
      };
    }

    const trimmedName = payload.fullName?.trim();
    const normalizedEmail = payload.email?.trim().toLowerCase();
    const trimmedUniversityId = payload.universityId?.trim();
    const role = payload.role;

    if (!trimmedName || !normalizedEmail || !trimmedUniversityId || !role) {
      return {
        success: false,
        statusCode: 400,
        message: "fullName, email, universityId, and role are all required.",
      };
    }

    if (!allowedRoles.has(role)) {
      return {
        success: false,
        statusCode: 400,
        message: "role must be Student, Staff, TA, or Professor.",
      };
    }

    const event = await EventModel.findById(eventId);
    if (!event) {
      return {
        success: false,
        statusCode: 404,
        message: "Event not found.",
      };
    }

    if (
      event.eventType !== EventType.WORKSHOP &&
      event.eventType !== EventType.TRIP
    ) {
      return {
        success: false,
        statusCode: 403,
        message: "Registration is only available for workshops and trips.",
      };
    }

    if (event.archived) {
      return {
        success: false,
        statusCode: 409,
        message: "This event is archived and does not accept registrations.",
      };
    }

    const now = new Date();
    if (event.registrationDeadline < now) {
      return {
        success: false,
        statusCode: 409,
        message: "Registration deadline has passed.",
      };
    }

    const registrations = [
      ...(event.registrations ?? []),
    ] as IEventRegistration[];
    const duplicate = registrations.find(
      (registration) =>
        registration.email.toLowerCase() === normalizedEmail ||
        registration.universityId.toLowerCase() ===
          trimmedUniversityId.toLowerCase()
    );

    if (duplicate) {
      return {
        success: false,
        statusCode: 409,
        message:
          "A registration with this email or university ID already exists for this event.",
      };
    }

    if (
      typeof event.capacity === "number" &&
      event.capacity > 0 &&
      registrations.length >= event.capacity
    ) {
      return {
        success: false,
        statusCode: 409,
        message: "Event capacity has been reached.",
      };
    }

    const registrationEntry: IEventRegistration = {
      fullName: trimmedName,
      email: normalizedEmail,
      universityId: trimmedUniversityId,
      role,
      registeredAt: new Date(),
    };

    event.registrations = [...registrations, registrationEntry];
    await event.save();

    return {
      success: true,
      statusCode: 201,
      data: { registration: registrationEntry },
    };
  } catch (error) {
    console.error("Error registering for event:", error);
    return {
      success: false,
      statusCode: 500,
      message: "An error occurred while registering for this event.",
    };
  }
}

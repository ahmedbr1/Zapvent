import VendorModel, { VendorStatus } from "../models/Vendor";
import EventModel, { EventType } from "../models/Event";

export async function applyToBazaar(
  vendorId: string,
  applicationData: {
    eventId: string;
    attendees: { name: string; email: string }[];
    boothSize: number;
  }
) {
  try {
    // Validate event exists and is a bazaar
    const event = await EventModel.findById(applicationData.eventId);
    if (!event) {
      return { success: false, message: "Event not found" };
    }
    if (event.eventType !== EventType.BAZAAR) {
      return { success: false, message: "Event is not a bazaar" };
    }

    // Validate attendees count (1..5)
    if (
      !Array.isArray(applicationData.attendees) ||
      applicationData.attendees.length < 1
    ) {
      return { success: false, message: "At least 1 attendee is required" };
    }
    // Validate attendees count (max 5)
    if (applicationData.attendees.length > 5) {
      return { success: false, message: "Maximum 5 attendees allowed" };
    }
    // Validate booth size
    if (
      !Number.isFinite(applicationData.boothSize) ||
      applicationData.boothSize < 1
    ) {
      return { success: false, message: "boothSize must be a number >= 1" };
    }

    // Prepare application payload
    const newApplication = {
      eventId: applicationData.eventId,
      status: VendorStatus.PENDING,
      applicationDate: new Date(),
      attendees: applicationData.attendees,
      boothSize: applicationData.boothSize,
    };

    // Atomically insert only if no existing application for this event
    const updatedVendor = await VendorModel.findOneAndUpdate(
      {
        _id: vendorId,
        "applications.eventId": { $ne: applicationData.eventId },
      },
      { $push: { applications: newApplication } },
      {
        new: true,
        runValidators: true,
        projection: { applications: { $slice: -1 } }, // return only the inserted subdoc
      }
    );

    if (!updatedVendor) {
      const exists = await VendorModel.exists({ _id: vendorId });
      if (!exists) {
        return { success: false, message: "Vendor not found" };
      }
      return { success: false, message: "Already applied for this bazaar" };
    }

    const savedApp = updatedVendor.applications[0];
    return {
      success: true,
      message: "Application submitted successfully",
      data: savedApp,
    };
  } catch (error: unknown) {
    // Surface validation errors clearly
    if (
      error &&
      typeof error === "object" &&
      "name" in error &&
      error.name === "ValidationError"
    ) {
      return { success: false, message: (error as any).message };
    }
    console.error("Error applying to bazaar:", error);
    return {
      success: false,
      message: "An error occurred while submitting application",
    };
  }
}

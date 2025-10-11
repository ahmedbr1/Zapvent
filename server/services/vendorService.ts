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
    console.log("Looking for event with ID:", applicationData.eventId);
    const event = await EventModel.findById(applicationData.eventId);
    console.log("Found event:", event);
    if (!event) {
      return { success: false, message: "Event not found" };
    }
    if (event.eventType !== EventType.BAZAAR) {
      return { success: false, message: "Event is not a bazaar" };
    }

    // Validate attendees count (max 5)
    if (applicationData.attendees.length > 5) {
      return { success: false, message: "Maximum 5 attendees allowed" };
    }

    // Check if vendor already applied for this bazaar
    const vendor = await VendorModel.findById(vendorId);
    if (!vendor) {
      return { success: false, message: "Vendor not found" };
    }

    const existingApplication = vendor.applications.find(
      (app: { eventId: string }) => app.eventId === applicationData.eventId
    );
    if (existingApplication) {
      return { success: false, message: "Already applied for this bazaar" };
    }

    // Create application
    const newApplication = {
      eventId: applicationData.eventId,
      status: VendorStatus.PENDING,
      applicationDate: new Date(),
      attendees: applicationData.attendees,
      boothSize: applicationData.boothSize,
    };

    // Add application to vendor
    vendor.applications.push(newApplication);
    await vendor.save();

    return {
      success: true,
      message: "Application submitted successfully",
      data: newApplication,
    };
  } catch (error) {
    console.error("Error applying to bazaar:", error);
    return {
      success: false,
      message: "An error occurred while submitting application",
    };
  }
}

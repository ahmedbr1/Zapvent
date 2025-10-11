import EventModel from "../models/Event";
import VendorModel, { VendorStatus } from "../models/Vendor";

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

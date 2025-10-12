import EventModel, { IEvent } from "../models/Event";
import { EventType } from "../models/Event";

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

export async function updateConferenceById(
  eventId: string,
  updateData: Partial<IEvent>
) {
  const event = await EventModel.findById(eventId);

  if (!event) {
    throw new Error("Event not found");
  }

  if (event.eventType !== EventType.CONFERENCE) {
    throw new Error("Event is not a conference");
  }

  return EventModel.findByIdAndUpdate(eventId, updateData, { new: true });
}

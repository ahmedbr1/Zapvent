import EventModel from "../models/Event";

export async function getAllEvents(sortOrder: number = 0) {
  try {
    const currentDate = new Date();

    // Fetch only events that haven't started yet
    let query = EventModel.find({
      startDate: { $gt: currentDate },
    });

    if (sortOrder === 1 || sortOrder === -1) {
      query = query.sort({ startDate: sortOrder });
    }

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

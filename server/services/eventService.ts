import EventModel, { EventType } from "../models/Event";

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

export async function getUpcomingBazaars() {
  const now = new Date();
  console.log(now);
  const bazaars = await EventModel.find({})
    .where({
      eventType: EventType.BAZAAR,
      startDate: {
        $gte: new Date("2025-10-01T17:00:00.000Z"),
        $lt: new Date("2025-12-21T17:00:00.000Z"),
      },
      archived: false,
    })
    .sort({ startDate: 1 });
  console.log(bazaars);
  return bazaars;
}

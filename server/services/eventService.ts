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

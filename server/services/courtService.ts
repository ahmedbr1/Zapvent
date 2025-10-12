import CourtModel from "../models/Court";

export async function viewAllCourts() {
  try {
    const courts = await CourtModel.find().lean();

    if (!courts || courts.length === 0) {
      return {
        success: false,
        message: "No courts found.",
      };
    }

    // Format the data to include availability details
    const formattedCourts = courts.map((court) => ({
      id: court._id,
      type: court.type, // e.g., "Basketball", "Tennis"
      venue: court.venue,
      timezone: court.timezone,
      openingHours: court.openingHours, // Include opening hours
      exceptions: court.exceptions, // Include exceptions (if any)
    }));

    return {
      success: true,
      message: "Courts successfully retrieved.",
      data: formattedCourts,
    };
  } catch (error) {
    console.error("Error fetching courts:", error);
    return {
      success: false,
      message: "An error occurred while fetching the courts.",
    };
  }
}
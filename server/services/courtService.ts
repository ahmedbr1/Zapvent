import CourtModel from "../models/Court";

export async function viewAllCourts() {
  try {
    const courts = await CourtModel.find().lean();

    // Format the data to include availability details
    const formattedCourts = (courts ?? []).map((court) => ({
      id: court._id?.toString(),
      type: court.type, // e.g., "Basketball", "Tennis"
      venue: court.venue,
      timezone: court.timezone,
      openingHours: court.openingHours, // Include opening hours
      exceptions: court.exceptions, // Include exceptions (if any)
    }));

    return {
      success: true,
      message:
        formattedCourts.length > 0
          ? "Courts successfully retrieved."
          : "No courts found.",
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

import GymSessionModel, { IGymSession } from "../models/GymSession";

export async function cancelGymSession(sessionId: string) {
  try {
    const deletedSession = await GymSessionModel.findByIdAndDelete(sessionId);

    if (!deletedSession) {
      return {
        success: false,
        message: "Gym session not found.",
      };
    }

    return {
      success: true,
      message: "Gym session successfully cancelled.",
      data: deletedSession,
    };
  } catch (error) {
    console.error("Error cancelling gym session:", error);
    return {
      success: false,
      message: "An error occurred while cancelling the gym session.",
    };
  }
}

export async function createGymSession(sessionData: Partial<IGymSession>) {
  try {
    const newSession = await GymSessionModel.create(sessionData);
    return {
      success: true,
      message: "Gym session created successfully.",
      data: newSession,
    };
  } catch (error) {
    console.error("Error creating gym session:", error);
    return {
      success: false,
      message: "An error occurred while creating the gym session.",
    };
  }
}

export async function getGymSessionsByMonth(year: number, month: number) {
  try {
    // month: 1-12
    const startDate = new Date(year, month - 1, 1);
    const endDate = new Date(year, month, 1);

    const sessions = await GymSessionModel.find({
      date: { $gte: startDate, $lt: endDate },
    });

    return {
      success: true,
      data: sessions,
    };
  } catch (error) {
    console.error("Error fetching gym sessions by month:", error);
    return {
      success: false,
      message: "An error occurred while fetching gym sessions.",
    };
  }
}

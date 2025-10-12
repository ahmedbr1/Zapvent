import { isValidObjectId, UpdateQuery } from "mongoose";
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

export async function editGymSession(
  sessionId: string,
  updates: UpdateQuery<Partial<IGymSession>>
): Promise<{
  success: boolean;
  message: string;
  data?: IGymSession;
  statusCode?: number;
}> {
  try {
    if (!isValidObjectId(sessionId)) {
      return {
        success: false,
        message: "Invalid session ID",
        statusCode: 400,
      };
    }

    if (!updates || Object.keys(updates as object).length === 0) {
      return {
        success: false,
        message: "No updates provided",
        statusCode: 400,
      };
    }

    const updatedGymSession = await GymSessionModel.findByIdAndUpdate(
      sessionId,
      updates,
      { new: true }
    );

    if (!updatedGymSession) {
      return {
        success: false,
        message: "Gym session not found.",
        statusCode: 404,
      };
    }
    return {
      success: true,
      message: "Gym session successfully updated.",
      data: updatedGymSession,
      statusCode: 200,
    };
  } catch (error) {
    console.error("Error editing gym session", error);
    return {
      success: false,
      message: "An error occurred while editing the gym session.",
    };
  }
}

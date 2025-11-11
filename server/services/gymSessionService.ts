import { isValidObjectId, UpdateQuery } from "mongoose";
import GymSessionModel, { IGymSession } from "../models/GymSession";
import UserModel, { userRole, userStatus } from "../models/User";

const REGISTERABLE_ROLES = new Set<userRole>([
  userRole.STUDENT,
  userRole.STAFF,
  userRole.PROFESSOR,
  userRole.TA,
]);

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

export async function registerForGymSession(
  sessionId: string,
  userId: string
): Promise<{
  success: boolean;
  message: string;
  statusCode?: number;
  data?: { remainingSlots: number; session: IGymSession };
}> {
  try {
    if (!isValidObjectId(sessionId)) {
      return {
        success: false,
        message: "Invalid gym session ID",
        statusCode: 400,
      };
    }

    if (!isValidObjectId(userId)) {
      return {
        success: false,
        message: "Invalid user ID",
        statusCode: 400,
      };
    }

    const user = await UserModel.findById(userId);
    if (!user) {
      return {
        success: false,
        message: "User not found",
        statusCode: 404,
      };
    }

    if (!REGISTERABLE_ROLES.has(user.role)) {
      return {
        success: false,
        message: "Only students, staff, professors, and TAs can register for sessions",
        statusCode: 403,
      };
    }

    if (user.status === userStatus.BLOCKED) {
      return {
        success: false,
        message: "Blocked accounts cannot register for sessions",
        statusCode: 403,
      };
    }

    const session = await GymSessionModel.findById(sessionId);
    if (!session) {
      return {
        success: false,
        message: "Gym session not found",
        statusCode: 404,
      };
    }

    if (session.registeredUsers?.some((registeredId: string) => registeredId === userId)) {
      return {
        success: false,
        message: "You are already registered for this session",
        statusCode: 409,
      };
    }
    
    const currentCount = session.registeredUsers?.length ?? 0;
    if (currentCount >= session.maxParticipants) {
      return {
        success: false,
        message: "This session is already full",
        statusCode: 409,
      };
    }

    session.registeredUsers = session.registeredUsers ?? [];
    session.registeredUsers.push(userId);
    await session.save();

    await UserModel.findByIdAndUpdate(userId, {
      $addToSet: { registeredGymSessions: sessionId },
    });

    return {
      success: true,
      message: "Successfully registered for the gym session",
      statusCode: 200,
      data: {
        remainingSlots: session.maxParticipants - session.registeredUsers.length,
        session,
      },
    };
  } catch (error) {
    console.error("Error registering for gym session:", error);
    return {
      success: false,
      message: "Failed to register for gym session",
      statusCode: 500,
    };
  }
}

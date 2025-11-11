import { isValidObjectId, UpdateQuery } from "mongoose";
import GymSessionModel, { IGymSession } from "../models/GymSession";
import UserModel, { IUser, userRole, userStatus } from "../models/User";
import { emailService } from "./emailService";

const REGISTERABLE_ROLES = new Set<userRole>([
  userRole.STUDENT,
  userRole.STAFF,
  userRole.PROFESSOR,
  userRole.TA,
]);

type GymSessionNotificationSession = Pick<
  IGymSession,
  "type" | "date" | "time" | "duration" | "maxParticipants" | "registeredUsers"
>;

type SessionChangeDetail = {
  label: string;
  previous: string;
  current: string;
};

const SESSION_CHANGE_FIELDS = [
  { key: "date", label: "Date" },
  { key: "time", label: "Start time" },
  { key: "duration", label: "Duration" },
  { key: "type", label: "Session type" },
  { key: "maxParticipants", label: "Capacity" },
] as const;

type SessionChangeField = (typeof SESSION_CHANGE_FIELDS)[number]["key"];

function normalizeComparisonValue(
  field: SessionChangeField,
  value: unknown
): string | number | null {
  if (field === "date") {
    if (!value) {
      return null;
    }

    const parsed =
      value instanceof Date ? value : new Date(value as Date | string);
    const timestamp = parsed.getTime();
    return Number.isNaN(timestamp) ? null : timestamp;
  }

  if (field === "duration" || field === "maxParticipants") {
    if (typeof value === "number") {
      return Number.isNaN(value) ? null : value;
    }
    if (value == null) {
      return null;
    }
    const parsed = Number(value);
    return Number.isNaN(parsed) ? null : parsed;
  }

  if (typeof value === "string") {
    return value.trim();
  }

  return (value ?? null) as string | number | null;
}

function formatSessionChangeValue(
  field: SessionChangeField,
  value: unknown
): string {
  switch (field) {
    case "date": {
      if (!value) {
        return "TBD";
      }
      const parsed =
        value instanceof Date ? value : new Date(value as Date | string);
      if (Number.isNaN(parsed.getTime())) {
        return "TBD";
      }
      return parsed.toLocaleDateString("en-GB", {
        year: "numeric",
        month: "short",
        day: "2-digit",
      });
    }
    case "time":
      return typeof value === "string" && value.trim() ? value : "TBD";
    case "duration":
      return typeof value === "number" && !Number.isNaN(value)
        ? `${value} minutes`
        : "Unknown";
    case "maxParticipants":
      return typeof value === "number" && !Number.isNaN(value)
        ? `${value} attendees`
        : "Unknown";
    case "type":
      return typeof value === "string" && value.trim()
        ? value
        : "Not specified";
    default:
      return value?.toString?.() ?? "";
  }
}

function detectGymSessionChanges(
  previous: GymSessionNotificationSession,
  updated: GymSessionNotificationSession
): SessionChangeDetail[] {
  return SESSION_CHANGE_FIELDS.reduce<SessionChangeDetail[]>(
    (changes, descriptor) => {
      const key = descriptor.key;
      const prevValue = previous[key];
      const nextValue = updated[key];

      if (
        normalizeComparisonValue(key, prevValue) !==
        normalizeComparisonValue(key, nextValue)
      ) {
        changes.push({
          label: descriptor.label,
          previous: formatSessionChangeValue(key, prevValue),
          current: formatSessionChangeValue(key, nextValue),
        });
      }

      return changes;
    },
    []
  );
}

async function fetchRegisteredParticipants(
  registeredUsers?: string[] | null
): Promise<IUser[]> {
  if (!Array.isArray(registeredUsers) || registeredUsers.length === 0) {
    return [];
  }

  const candidateIds = Array.from(
    new Set(
      registeredUsers
        .map((id) => (typeof id === "string" ? id.trim() : ""))
        .filter((id) => id && isValidObjectId(id))
    )
  );

  if (!candidateIds.length) {
    return [];
  }

  return UserModel.find({
    _id: { $in: candidateIds },
    role: { $in: Array.from(REGISTERABLE_ROLES) },
    status: userStatus.ACTIVE,
  })
    .select(["email", "firstName", "lastName", "role"])
    .exec();
}

async function sendParticipantEmails(
  participants: Array<Pick<IUser, "email" | "firstName" | "lastName" | "role">>,
  sender: (
    user: Pick<IUser, "email" | "firstName" | "lastName" | "role">
  ) => Promise<unknown>,
  context: string
): Promise<void> {
  if (!participants.length) {
    return;
  }

  const results = await Promise.allSettled(
    participants.map((participant) => sender(participant))
  );

  results.forEach((result, index) => {
    if (result.status === "rejected") {
      console.error(
        `Failed to send ${context} email to ${participants[index]?.email}:`,
        result.reason
      );
    }
  });
}

async function notifyGymSessionCancellation(
  session: GymSessionNotificationSession
): Promise<void> {
  try {
    const participants = await fetchRegisteredParticipants(
      session.registeredUsers
    );
    await sendParticipantEmails(
      participants,
      (user) =>
        emailService.sendGymSessionCancellationEmail({
          user,
          session,
        }),
      "gym session cancellation"
    );
  } catch (error) {
    console.error(
      "Failed to process gym session cancellation notifications:",
      error
    );
  }
}

async function notifyGymSessionUpdate(
  session: GymSessionNotificationSession,
  changes: SessionChangeDetail[]
): Promise<void> {
  try {
    const participants = await fetchRegisteredParticipants(
      session.registeredUsers
    );
    await sendParticipantEmails(
      participants,
      (user) =>
        emailService.sendGymSessionUpdateEmail({
          user,
          session,
          changes,
        }),
      "gym session update"
    );
  } catch (error) {
    console.error("Failed to process gym session update notifications:", error);
  }
}

export async function cancelGymSession(sessionId: string) {
  try {
    const deletedSession = await GymSessionModel.findByIdAndDelete(sessionId);

    if (!deletedSession) {
      return {
        success: false,
        message: "Gym session not found.",
      };
    }

    const sessionSnapshot =
      deletedSession.toObject() as GymSessionNotificationSession;
    void notifyGymSessionCancellation(sessionSnapshot);

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

    const existingSession = await GymSessionModel.findById(sessionId);

    if (!existingSession) {
      return {
        success: false,
        message: "Gym session not found.",
        statusCode: 404,
      };
    }

    const previousSnapshot =
      existingSession.toObject() as GymSessionNotificationSession;

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

    const updatedSnapshot =
      updatedGymSession.toObject() as GymSessionNotificationSession;
    const changes = detectGymSessionChanges(previousSnapshot, updatedSnapshot);
    if (changes.length > 0) {
      void notifyGymSessionUpdate(updatedSnapshot, changes);
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
        message:
          "Only students, staff, professors, and TAs can register for sessions",
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

    if (
      session.registeredUsers?.some(
        (registeredId: string) => registeredId === userId
      )
    ) {
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
        remainingSlots:
          session.maxParticipants - session.registeredUsers.length,
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

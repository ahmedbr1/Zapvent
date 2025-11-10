import { Types } from "mongoose";
import EventModel, { IEvent } from "../models/Event";
import UserModel, { userRole } from "../models/User";
import AdminModel from "../models/Admin";
import { formatDate } from "../../lib/date";

const TARGET_USER_ROLES = [
  userRole.STUDENT,
  userRole.STAFF,
  userRole.PROFESSOR,
  userRole.TA,
];

const ONE_HOUR_MS = 60 * 60 * 1000;
const ONE_DAY_MS = 24 * ONE_HOUR_MS;
const REMINDER_WINDOW_MS = 10 * 60 * 1000; // 10 minutes
const REMINDER_INTERVAL_MS = 5 * 60 * 1000; // 5 minutes

async function pushNotificationsToUsers(
  userIds: Types.ObjectId[],
  message: string
): Promise<void> {
  if (!userIds.length) {
    return;
  }

  await UserModel.updateMany(
    {
      _id: { $in: userIds },
      role: { $in: TARGET_USER_ROLES },
    },
    {
      $addToSet: { notifications: message },
    }
  ).exec();
}

async function pushNotificationsToEventOfficeAdmins(
  adminIds: Types.ObjectId[],
  message: string
): Promise<void> {
  if (!adminIds.length) {
    return;
  }

  await AdminModel.updateMany(
    {
      _id: { $in: adminIds },
      adminType: "EventOffice",
    },
    {
      $addToSet: { notifications: message },
    }
  ).exec();
}

async function broadcastToEventOffice(message: string): Promise<void> {
  await AdminModel.updateMany(
    { adminType: "EventOffice" },
    { $addToSet: { notifications: message } }
  ).exec();
}

function toObjectIds(values: string[] | undefined | null): Types.ObjectId[] {
  if (!Array.isArray(values)) {
    return [];
  }

  const unique = new Set<string>();
  values.forEach((value) => {
    if (typeof value !== "string") {
      return;
    }
    const trimmed = value.trim();
    if (!trimmed || unique.has(trimmed)) {
      return;
    }
    if (!Types.ObjectId.isValid(trimmed)) {
      return;
    }
    unique.add(trimmed);
  });

  return Array.from(unique).map((id) => new Types.ObjectId(id));
}

export async function notifyUsersOfNewEvent(
  event: Pick<IEvent, "name" | "eventType" | "startDate">
): Promise<void> {
  try {
    const startDate = event.startDate instanceof Date
      ? event.startDate
      : new Date(event.startDate);

  const message = `New event "${event.name}" (${event.eventType}) scheduled for ${formatDate(startDate, "MMM D, YYYY HH:mm")}.`;

    await Promise.all([
      UserModel.updateMany(
        { role: { $in: TARGET_USER_ROLES } },
        { $addToSet: { notifications: message } }
      ).exec(),
      broadcastToEventOffice(message),
    ]);
  } catch (error) {
    console.error("Failed to send new event notification:", error);
  }
}

async function sendReminderForEvent(
  event: Pick<IEvent, "name" | "eventType" | "startDate" | "registeredUsers"> & {
    _id: Types.ObjectId;
  }
): Promise<void> {
  const now = new Date();
  const startDate = event.startDate instanceof Date
    ? event.startDate
    : new Date(event.startDate);

  const diff = startDate.getTime() - now.getTime();

  if (diff < 0 || diff > ONE_DAY_MS + REMINDER_WINDOW_MS) {
    return;
  }

  const shouldSendDayReminder =
    diff <= ONE_DAY_MS && diff > ONE_DAY_MS - REMINDER_WINDOW_MS;
  const shouldSendHourReminder =
    diff <= ONE_HOUR_MS && diff > ONE_HOUR_MS - REMINDER_WINDOW_MS;

  if (!shouldSendDayReminder && !shouldSendHourReminder) {
    return;
  }

  const recipientIds = toObjectIds(event.registeredUsers);

  if (!recipientIds.length) {
    return;
  }

  const formattedDate = formatDate(startDate, "MMM D, YYYY HH:mm");
  const messages: string[] = [];

  if (shouldSendDayReminder) {
    messages.push(
      `Reminder: "${event.name}" begins within 1 day (starts ${formattedDate}).`
    );
  }

  if (shouldSendHourReminder) {
    messages.push(
      `Reminder: "${event.name}" begins within 1 hour (starts ${formattedDate}).`
    );
  }

  await Promise.all(
    messages.map(async (message) => {
      await Promise.all([
        pushNotificationsToUsers(recipientIds, message),
        pushNotificationsToEventOfficeAdmins(recipientIds, message),
      ]);
    })
  );
}

export async function sendReminderNotifications(): Promise<void> {
  try {
    const now = new Date();
    const upperBound = new Date(now.getTime() + ONE_DAY_MS + REMINDER_WINDOW_MS);
    const lowerBound = new Date(now.getTime() - REMINDER_WINDOW_MS);

    const upcomingEvents = await EventModel.find({
      archived: { $ne: true },
      startDate: { $gte: lowerBound, $lte: upperBound },
      registeredUsers: { $exists: true, $ne: [] },
    })
      .select(["name", "eventType", "startDate", "registeredUsers"])
      .lean<Array<
        Pick<IEvent, "name" | "eventType" | "startDate" | "registeredUsers"> & {
          _id: Types.ObjectId;
        }
      >>();

    if (!upcomingEvents.length) {
      return;
    }

    await Promise.all(upcomingEvents.map((event) => sendReminderForEvent(event)));
  } catch (error) {
    console.error("Failed to send reminder notifications:", error);
  }
}

let reminderSchedulerStarted = false;

export function startReminderScheduler(): void {
  if (reminderSchedulerStarted) {
    return;
  }

  reminderSchedulerStarted = true;

  const tick = async () => {
    try {
      await sendReminderNotifications();
    } catch (error) {
      console.error("Reminder scheduler tick error:", error);
    }
  };

  void tick();

  setInterval(() => {
    void tick();
  }, REMINDER_INTERVAL_MS);
}

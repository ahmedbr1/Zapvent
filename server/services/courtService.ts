import { isValidObjectId } from "mongoose";
import CourtModel, { IOpeningHour } from "../models/Court";
import CourtReservationModel from "../models/CourtReservation";
import UserModel, { userRole } from "../models/User";

const TIME_PATTERN = /^([01]\d|2[0-3]):([0-5]\d)$/;
const DEFAULT_SLOT_MINUTES = 60;

type Slot = {
  startTime: string;
  endTime: string;
  isAvailable: boolean;
};

function parseDateInput(value: string) {
  if (typeof value !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    return null;
  }
  const [year, month, day] = value.split("-").map(Number);
  const utcDate = new Date(Date.UTC(year, month - 1, day));

  if (
    utcDate.getUTCFullYear() !== year ||
    utcDate.getUTCMonth() !== month - 1 ||
    utcDate.getUTCDate() !== day
  ) {
    return null;
  }

  const nextUtcDate = new Date(utcDate);
  nextUtcDate.setUTCDate(nextUtcDate.getUTCDate() + 1);
  return { utcDate, nextUtcDate, weekday: utcDate.getUTCDay() };
}

function parseTimeToMinutes(value: string): number | null {
  if (!TIME_PATTERN.test(value)) {
    return null;
  }
  const [hours, minutes] = value.split(":").map(Number);
  return hours * 60 + minutes;
}

function minutesToTime(value: number) {
  const hours = Math.floor(value / 60)
    .toString()
    .padStart(2, "0");
  const minutes = (value % 60).toString().padStart(2, "0");
  return `${hours}:${minutes}`;
}

function slotsOverlap(
  aStart: number,
  aEnd: number,
  bStart: number,
  bEnd: number
) {
  return aStart < bEnd && bStart < aEnd;
}

function buildSlots(
  windows: IOpeningHour[],
  bookingMinutes: number,
  bufferMinutes: number,
  existing: Array<{ startTime: string; endTime: string }>
): Slot[] {
  const slots: Slot[] = [];
  const reservations = existing.map((res) => ({
    start: parseTimeToMinutes(res.startTime) ?? -1,
    end: parseTimeToMinutes(res.endTime) ?? -1,
  }));

  windows.forEach((window) => {
    const windowStart = parseTimeToMinutes(window.startTime);
    const windowEnd = parseTimeToMinutes(window.endTime);

    if (
      windowStart === null ||
      windowEnd === null ||
      windowEnd <= windowStart
    ) {
      return;
    }

    let cursor = windowStart;
    while (cursor + bookingMinutes <= windowEnd) {
      const slotStart = cursor;
      const slotEnd = cursor + bookingMinutes;
      const hasConflict = reservations.some((reservation) =>
        reservation.start >= 0 && reservation.end >= 0
          ? slotsOverlap(slotStart, slotEnd, reservation.start, reservation.end)
          : false
      );

      slots.push({
        startTime: minutesToTime(slotStart),
        endTime: minutesToTime(slotEnd),
        isAvailable: !hasConflict,
      });

      cursor = slotEnd + bufferMinutes;
    }
  });

  return slots;
}

function isDateWithinExceptions(
  date: Date,
  exceptions?: Array<{ startDate: Date; endDate: Date }>
) {
  if (!exceptions || exceptions.length === 0) return false;
  return exceptions.some((exception) => {
    const start = new Date(exception.startDate);
    const end = new Date(exception.endDate);
    return start <= date && date <= end;
  });
}

export async function viewAllCourts() {
  try {
    const courts = await CourtModel.find().lean();

    const formattedCourts = (courts ?? []).map((court) => ({
      id: court._id?.toString(),
      type: court.type,
      venue: court.venue,
      timezone: court.timezone,
      openingHours: court.openingHours,
      exceptions: court.exceptions,
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

export async function getCourtAvailability(
  courtId: string,
  date: string
): Promise<{
  success: boolean;
  message: string;
  data?: { courtId: string; date: string; slots: Slot[] };
  statusCode?: number;
}> {
  try {
    if (!isValidObjectId(courtId)) {
      return { success: false, message: "Invalid court ID", statusCode: 400 };
    }

    const parsedDate = parseDateInput(date);
    if (!parsedDate) {
      return {
        success: false,
        message: "Date must be in YYYY-MM-DD format",
        statusCode: 400,
      };
    }

    const court = await CourtModel.findById(courtId);
    if (!court) {
      return { success: false, message: "Court not found", statusCode: 404 };
    }

    if (isDateWithinExceptions(parsedDate.utcDate, court.exceptions)) {
      return {
        success: true,
        message: "Court unavailable on this date",
        data: { courtId, date, slots: [] },
        statusCode: 200,
      };
    }

    const windows = (court.openingHours ?? []).filter(
      (window: IOpeningHour) => window.weekday === parsedDate.weekday
    );

    if (windows.length === 0) {
      return {
        success: true,
        message: "Court is closed on the selected date",
        data: { courtId, date, slots: [] },
        statusCode: 200,
      };
    }

    const reservations = (await CourtReservationModel.find({
      court: court._id,
      date: { $gte: parsedDate.utcDate, $lt: parsedDate.nextUtcDate },
    })
      .select("startTime endTime")
      .lean()) as unknown as Array<{ startTime: string; endTime: string }>;

    const bookingMinutes = court.bookingSlotMinutes ?? DEFAULT_SLOT_MINUTES;
    const bufferMinutes = court.bufferMinutes ?? 0;

    const slots = buildSlots(
      windows,
      bookingMinutes,
      bufferMinutes,
      reservations
    );

    return {
      success: true,
      message: slots.some((slot) => slot.isAvailable)
        ? "Availability loaded"
        : "No free slots for this date",
      data: { courtId, date, slots },
      statusCode: 200,
    };
  } catch (error) {
    console.error("Error loading court availability:", error);
    return {
      success: false,
      message: "Failed to load court availability",
      statusCode: 500,
    };
  }
}

export async function reserveCourtSlot(
  courtId: string,
  userId: string,
  payload: { date: string; startTime: string; endTime?: string }
): Promise<{
  success: boolean;
  message: string;
  statusCode?: number;
  data?: {
    reservation: {
      id: string;
      courtId: string;
      date: string;
      startTime: string;
      endTime: string;
      studentName: string;
      studentGucId: string;
    };
  };
}> {
  try {
    if (!isValidObjectId(courtId)) {
      return { success: false, message: "Invalid court ID", statusCode: 400 };
    }

    if (!isValidObjectId(userId)) {
      return { success: false, message: "Invalid user ID", statusCode: 400 };
    }

    const parsedDate = parseDateInput(payload.date);
    if (!parsedDate) {
      return {
        success: false,
        message: "Date must be in YYYY-MM-DD format",
        statusCode: 400,
      };
    }

    const slotStartMinutes = parseTimeToMinutes(payload.startTime);
    if (slotStartMinutes === null) {
      return {
        success: false,
        message: "startTime must use HH:mm",
        statusCode: 400,
      };
    }

    const court = await CourtModel.findById(courtId);
    if (!court) {
      return { success: false, message: "Court not found", statusCode: 404 };
    }

    const user = await UserModel.findById(userId);
    if (!user || user.role !== userRole.STUDENT) {
      return {
        success: false,
        message: "Only verified students can reserve courts",
        statusCode: 403,
      };
    }

    if (!user.studentId) {
      return {
        success: false,
        message: "Student record is missing a GUC ID",
        statusCode: 400,
      };
    }

    if (isDateWithinExceptions(parsedDate.utcDate, court.exceptions)) {
      return {
        success: false,
        message: "Court unavailable on this date",
        statusCode: 409,
      };
    }

    const windows = (court.openingHours ?? []).filter(
      (window: IOpeningHour) => window.weekday === parsedDate.weekday
    );

    if (windows.length === 0) {
      return {
        success: false,
        message: "Court is closed on the selected date",
        statusCode: 409,
      };
    }

    const bookingMinutes = court.bookingSlotMinutes ?? DEFAULT_SLOT_MINUTES;
    const bufferMinutes = court.bufferMinutes ?? 0;

    const slotEndMinutes = payload.endTime
      ? parseTimeToMinutes(payload.endTime)
      : slotStartMinutes + bookingMinutes;

    if (slotEndMinutes === null) {
      return {
        success: false,
        message: "endTime must use HH:mm",
        statusCode: 400,
      };
    }

    if (slotEndMinutes - slotStartMinutes !== bookingMinutes) {
      return {
        success: false,
        message: `Slot length must equal ${bookingMinutes} minutes`,
        statusCode: 400,
      };
    }

    const slotWithinWindow = windows.some((window: IOpeningHour) => {
      const windowStart = parseTimeToMinutes(window.startTime) ?? -1;
      const windowEnd = parseTimeToMinutes(window.endTime) ?? -1;
      return slotStartMinutes >= windowStart && slotEndMinutes <= windowEnd;
    });

    if (!slotWithinWindow) {
      return {
        success: false,
        message: "Requested time falls outside opening hours",
        statusCode: 400,
      };
    }

    const sameDayReservations = (await CourtReservationModel.find({
      court: court._id,
      date: { $gte: parsedDate.utcDate, $lt: parsedDate.nextUtcDate },
    })
      .select("startTime endTime")
      .lean()) as unknown as Array<{ startTime: string; endTime: string }>;

    const generatedSlots = buildSlots(
      windows,
      bookingMinutes,
      bufferMinutes,
      sameDayReservations
    );

    const formattedStart = minutesToTime(slotStartMinutes);
    const formattedEnd = minutesToTime(slotEndMinutes);
    const matchingSlot = generatedSlots.find(
      (slot) =>
        slot.startTime === formattedStart && slot.endTime === formattedEnd
    );

    if (!matchingSlot) {
      return {
        success: false,
        message: "Requested time does not match any available slot",
        statusCode: 400,
      };
    }

    if (!matchingSlot.isAvailable) {
      return {
        success: false,
        message: "Selected slot is already reserved",
        statusCode: 409,
      };
    }

    const reservationDoc = await CourtReservationModel.create({
      court: court._id,
      user: user._id,
      date: parsedDate.utcDate,
      startTime: formattedStart,
      endTime: formattedEnd,
      studentName: `${user.firstName} ${user.lastName}`,
      studentGucId: user.studentId,
    });

    user.reservedCourts = user.reservedCourts ?? [];
    user.reservedCourts.push(reservationDoc._id.toString());
    await user.save();

    return {
      success: true,
      message: "Court reserved successfully",
      statusCode: 201,
      data: {
        reservation: {
          id: reservationDoc._id.toString(),
          courtId: court._id.toString(),
          date: payload.date,
          startTime: reservationDoc.startTime,
          endTime: reservationDoc.endTime,
          studentName: reservationDoc.studentName,
          studentGucId: reservationDoc.studentGucId,
        },
      },
    };
  } catch (error) {
    console.error("Error reserving court:", error);
    return {
      success: false,
      message: "Failed to reserve court",
      statusCode: 500,
    };
  }
}

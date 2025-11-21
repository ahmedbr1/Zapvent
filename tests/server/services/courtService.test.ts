import { MongoMemoryServer } from "mongodb-memory-server";
import mongoose from "mongoose";
import CourtModel, { CourtType } from "../../../server/models/Court";
import CourtReservationModel from "../../../server/models/CourtReservation";
import UserModel from "../../../server/models/User";
import {
  viewAllCourts,
  getCourtAvailability,
  reserveCourtSlot,
} from "../../../server/services/courtService";

let mongoServer: MongoMemoryServer;

beforeAll(async () => {
  process.env.ENCRYPTION_SALT_ROUNDS =
    process.env.ENCRYPTION_SALT_ROUNDS || "4";

  mongoServer = await MongoMemoryServer.create();
  const mongoUri = mongoServer.getUri();
  await mongoose.connect(mongoUri);
});

beforeEach(() => {
  jest.spyOn(console, "error").mockImplementation(() => undefined);
});

afterAll(async () => {
  await mongoose.disconnect();
  await mongoServer.stop();
});

afterEach(async () => {
  const collections = mongoose.connection.collections;
  for (const key in collections) {
    await collections[key].deleteMany({});
  }
  jest.restoreAllMocks();
});

describe("viewAllCourts", () => {
  const validCourtData = {
    type: CourtType.TENNIS,
    venue: "Main Campus",
    timezone: "Africa/Cairo",
    openingHours: [
      { weekday: 1, startTime: "09:00", endTime: "17:00" },
      { weekday: 2, startTime: "09:00", endTime: "17:00" },
    ],
  };

  it("should return empty array when no courts exist", async () => {
    const result = await viewAllCourts();

    expect(result.success).toBe(true);
    expect(result.message).toBe("No courts found.");
    expect(result.data).toEqual([]);
  });

  it("should return all courts with correct fields", async () => {
    const court = new CourtModel(validCourtData);
    await court.save();

    const result = await viewAllCourts();

    expect(result.success).toBe(true);
    expect(result.message).toBe("Courts successfully retrieved.");
    expect(result.data).toHaveLength(1);
    expect(result.data![0].id).toBe(court._id.toString());
    expect(result.data![0].type).toBe(validCourtData.type);
    expect(result.data![0].venue).toBe(validCourtData.venue);
    expect(result.data![0].timezone).toBe(validCourtData.timezone);
    expect(result.data![0].openingHours).toEqual(validCourtData.openingHours);
  });

  it("should return multiple courts", async () => {
    await CourtModel.create(validCourtData);
    await CourtModel.create({
      ...validCourtData,
      type: CourtType.FOOTBALL,
      venue: "Sports Center",
    });
    await CourtModel.create({
      ...validCourtData,
      type: CourtType.BASKETBALL,
      venue: "Gym Hall",
    });

    const result = await viewAllCourts();

    expect(result.success).toBe(true);
    expect(result.data).toHaveLength(3);
  });

  it("should include exceptions when present", async () => {
    const courtWithExceptions = new CourtModel({
      ...validCourtData,
      exceptions: [
        {
          startDate: new Date("2024-12-25"),
          endDate: new Date("2024-12-26"),
          reason: "Holiday",
        },
      ],
    });
    await courtWithExceptions.save();

    const result = await viewAllCourts();

    expect(result.success).toBe(true);
    expect(result.data![0].exceptions).toHaveLength(1);
    expect(result.data![0].exceptions![0].reason).toBe("Holiday");
  });

  it("should handle courts with different types", async () => {
    for (const type of Object.values(CourtType)) {
      await CourtModel.create({
        ...validCourtData,
        type,
        venue: `${type} Court`,
      });
    }

    const result = await viewAllCourts();

    expect(result.success).toBe(true);
    expect(result.data).toHaveLength(Object.values(CourtType).length);
  });
});

describe("getCourtAvailability", () => {
  const validCourtData = {
    type: CourtType.TENNIS,
    venue: "Main Campus",
    timezone: "Africa/Cairo",
    bookingSlotMinutes: 60,
    bufferMinutes: 0,
    openingHours: [
      { weekday: 1, startTime: "09:00", endTime: "17:00" },
      { weekday: 2, startTime: "10:00", endTime: "18:00" },
    ],
  };

  it("should return error for invalid court ID", async () => {
    const result = await getCourtAvailability("invalid-id", "2024-12-16");

    expect(result.success).toBe(false);
    expect(result.message).toBe("Invalid court ID");
    expect(result.statusCode).toBe(400);
  });

  it("should return error for invalid date format", async () => {
    const court = new CourtModel(validCourtData);
    await court.save();

    const result = await getCourtAvailability(
      court._id.toString(),
      "16-12-2024"
    );

    expect(result.success).toBe(false);
    expect(result.message).toBe("Date must be in YYYY-MM-DD format");
    expect(result.statusCode).toBe(400);
  });

  it("should return error for invalid date string", async () => {
    const court = new CourtModel(validCourtData);
    await court.save();

    const result = await getCourtAvailability(
      court._id.toString(),
      "invalid-date"
    );

    expect(result.success).toBe(false);
    expect(result.message).toBe("Date must be in YYYY-MM-DD format");
    expect(result.statusCode).toBe(400);
  });

  it("should return error for non-existent court", async () => {
    const fakeId = new mongoose.Types.ObjectId().toString();
    const result = await getCourtAvailability(fakeId, "2024-12-16");

    expect(result.success).toBe(false);
    expect(result.message).toBe("Court not found");
    expect(result.statusCode).toBe(404);
  });

  it("should return empty slots for date within exceptions", async () => {
    const court = new CourtModel({
      ...validCourtData,
      exceptions: [
        {
          startDate: new Date("2024-12-25"),
          endDate: new Date("2024-12-26"),
          reason: "Holiday",
        },
      ],
    });
    await court.save();

    const result = await getCourtAvailability(
      court._id.toString(),
      "2024-12-25"
    );

    expect(result.success).toBe(true);
    expect(result.message).toBe("Court unavailable on this date");
    expect(result.data!.slots).toEqual([]);
    expect(result.statusCode).toBe(200);
  });

  it("should return empty slots for date when court is closed", async () => {
    const court = new CourtModel(validCourtData);
    await court.save();

    const result = await getCourtAvailability(
      court._id.toString(),
      "2024-12-15"
    );

    expect(result.success).toBe(true);
    expect(result.message).toBe("Court is closed on the selected date");
    expect(result.data!.slots).toEqual([]);
    expect(result.statusCode).toBe(200);
  });

  it("should return available slots for valid date", async () => {
    const court = new CourtModel(validCourtData);
    await court.save();

    const result = await getCourtAvailability(
      court._id.toString(),
      "2024-12-16"
    );

    expect(result.success).toBe(true);
    expect(result.message).toBe("Availability loaded");
    expect(result.data!.slots.length).toBeGreaterThan(0);
    expect(result.statusCode).toBe(200);
  });

  it("should mark slots as unavailable when reserved", async () => {
    const court = new CourtModel(validCourtData);
    await court.save();

    const user = new UserModel({
      studentId: "2023001",
      firstName: "John",
      lastName: "Doe",
      email: "john@example.com",
      password: "password123",
      role: "Student",
      status: "Active",
      verified: true,
    });
    await user.save();

    await CourtReservationModel.create({
      court: court._id,
      user: user._id,
      date: new Date(Date.UTC(2024, 11, 16)),
      startTime: "09:00",
      endTime: "10:00",
      studentName: "John Doe",
      studentGucId: "2023001",
    });

    const result = await getCourtAvailability(
      court._id.toString(),
      "2024-12-16"
    );

    expect(result.success).toBe(true);
    const reservedSlot = result.data!.slots.find(
      (s) => s.startTime === "09:00" && s.endTime === "10:00"
    );
    expect(reservedSlot).toBeDefined();
    expect(reservedSlot!.isAvailable).toBe(false);
  });

  it("should generate correct number of slots based on opening hours", async () => {
    const court = new CourtModel(validCourtData);
    await court.save();

    const result = await getCourtAvailability(
      court._id.toString(),
      "2024-12-16"
    );

    expect(result.success).toBe(true);
    expect(result.data!.slots).toHaveLength(8);
  });

  it("should respect buffer minutes between slots", async () => {
    const courtWithBuffer = new CourtModel({
      ...validCourtData,
      bufferMinutes: 15,
    });
    await courtWithBuffer.save();

    const result = await getCourtAvailability(
      courtWithBuffer._id.toString(),
      "2024-12-16"
    );

    expect(result.success).toBe(true);
    expect(result.data!.slots.length).toBeLessThan(8);
  });

  it("should use default slot minutes when not specified", async () => {
    const courtNoSlotMinutes = new CourtModel({
      type: CourtType.TENNIS,
      venue: "Main Campus",
      timezone: "Africa/Cairo",
      openingHours: [{ weekday: 1, startTime: "09:00", endTime: "11:00" }],
    });
    await courtNoSlotMinutes.save();

    const result = await getCourtAvailability(
      courtNoSlotMinutes._id.toString(),
      "2024-12-16"
    );

    expect(result.success).toBe(true);
    expect(result.data!.slots).toHaveLength(2);
  });

  it("should return correct weekday-specific hours", async () => {
    const court = new CourtModel(validCourtData);
    await court.save();

    const mondayResult = await getCourtAvailability(
      court._id.toString(),
      "2024-12-16"
    );
    const tuesdayResult = await getCourtAvailability(
      court._id.toString(),
      "2024-12-17"
    );

    expect(mondayResult.success).toBe(true);
    expect(tuesdayResult.success).toBe(true);
    expect(mondayResult.data!.slots).toHaveLength(8);
    expect(tuesdayResult.data!.slots).toHaveLength(8);
    expect(mondayResult.data!.slots[0].startTime).toBe("09:00");
    expect(tuesdayResult.data!.slots[0].startTime).toBe("10:00");
  });

  it("should handle multiple opening windows on same day", async () => {
    const courtMultipleWindows = new CourtModel({
      ...validCourtData,
      openingHours: [
        { weekday: 1, startTime: "09:00", endTime: "12:00" },
        { weekday: 1, startTime: "14:00", endTime: "17:00" },
      ],
    });
    await courtMultipleWindows.save();

    const result = await getCourtAvailability(
      courtMultipleWindows._id.toString(),
      "2024-12-16"
    );

    expect(result.success).toBe(true);
    expect(result.data!.slots).toHaveLength(6);
  });
});

describe("reserveCourtSlot", () => {
  const validCourtData = {
    type: CourtType.TENNIS,
    venue: "Main Campus",
    timezone: "Africa/Cairo",
    bookingSlotMinutes: 60,
    bufferMinutes: 0,
    openingHours: [{ weekday: 1, startTime: "09:00", endTime: "17:00" }],
  };

  const validUserData = {
    studentId: "2023001",
    firstName: "John",
    lastName: "Doe",
    email: "john@example.com",
    password: "password123",
    role: "Student",
    status: "Active",
    verified: true,
  };

  it("should return error for invalid court ID", async () => {
    const user = new UserModel(validUserData);
    await user.save();

    const result = await reserveCourtSlot("invalid-id", user._id.toString(), {
      date: "2024-12-16",
      startTime: "09:00",
    });

    expect(result.success).toBe(false);
    expect(result.message).toBe("Invalid court ID");
    expect(result.statusCode).toBe(400);
  });

  it("should return error for invalid user ID", async () => {
    const court = new CourtModel(validCourtData);
    await court.save();

    const result = await reserveCourtSlot(court._id.toString(), "invalid-id", {
      date: "2024-12-16",
      startTime: "09:00",
    });

    expect(result.success).toBe(false);
    expect(result.message).toBe("Invalid user ID");
    expect(result.statusCode).toBe(400);
  });

  it("should return error for invalid date format", async () => {
    const court = new CourtModel(validCourtData);
    await court.save();
    const user = new UserModel(validUserData);
    await user.save();

    const result = await reserveCourtSlot(
      court._id.toString(),
      user._id.toString(),
      {
        date: "16-12-2024",
        startTime: "09:00",
      }
    );

    expect(result.success).toBe(false);
    expect(result.message).toBe("Date must be in YYYY-MM-DD format");
    expect(result.statusCode).toBe(400);
  });

  it("should return error for invalid startTime format", async () => {
    const court = new CourtModel(validCourtData);
    await court.save();
    const user = new UserModel(validUserData);
    await user.save();

    const result = await reserveCourtSlot(
      court._id.toString(),
      user._id.toString(),
      {
        date: "2024-12-16",
        startTime: "9:00",
      }
    );

    expect(result.success).toBe(false);
    expect(result.message).toBe("startTime must use HH:mm");
    expect(result.statusCode).toBe(400);
  });

  it("should return error for invalid endTime format", async () => {
    const court = new CourtModel(validCourtData);
    await court.save();
    const user = new UserModel(validUserData);
    await user.save();

    const result = await reserveCourtSlot(
      court._id.toString(),
      user._id.toString(),
      {
        date: "2024-12-16",
        startTime: "09:00",
        endTime: "10:0",
      }
    );

    expect(result.success).toBe(false);
    expect(result.message).toBe("endTime must use HH:mm");
    expect(result.statusCode).toBe(400);
  });

  it("should return error for non-existent court", async () => {
    const fakeCourtId = new mongoose.Types.ObjectId().toString();
    const user = new UserModel(validUserData);
    await user.save();

    const result = await reserveCourtSlot(fakeCourtId, user._id.toString(), {
      date: "2024-12-16",
      startTime: "09:00",
    });

    expect(result.success).toBe(false);
    expect(result.message).toBe("Court not found");
    expect(result.statusCode).toBe(404);
  });

  it("should return error for non-existent user", async () => {
    const court = new CourtModel(validCourtData);
    await court.save();
    const fakeUserId = new mongoose.Types.ObjectId().toString();

    const result = await reserveCourtSlot(court._id.toString(), fakeUserId, {
      date: "2024-12-16",
      startTime: "09:00",
    });

    expect(result.success).toBe(false);
    expect(result.message).toBe("Only verified students can reserve courts");
    expect(result.statusCode).toBe(403);
  });

  it("should return error when user is not a student", async () => {
    const court = new CourtModel(validCourtData);
    await court.save();
    const professor = new UserModel({
      staffId: "S2023001",
      firstName: "Prof",
      lastName: "Smith",
      email: "prof@example.com",
      password: "password123",
      role: "Professor",
      status: "Active",
      verified: true,
    });
    await professor.save();

    const result = await reserveCourtSlot(
      court._id.toString(),
      professor._id.toString(),
      {
        date: "2024-12-16",
        startTime: "09:00",
      }
    );

    expect(result.success).toBe(false);
    expect(result.message).toBe("Only verified students can reserve courts");
    expect(result.statusCode).toBe(403);
  });

  it("should return error when date is within exception period", async () => {
    const court = new CourtModel({
      ...validCourtData,
      exceptions: [
        {
          startDate: new Date("2024-12-25"),
          endDate: new Date("2024-12-26"),
          reason: "Holiday",
        },
      ],
    });
    await court.save();
    const user = new UserModel(validUserData);
    await user.save();

    const result = await reserveCourtSlot(
      court._id.toString(),
      user._id.toString(),
      {
        date: "2024-12-25",
        startTime: "09:00",
      }
    );

    expect(result.success).toBe(false);
    expect(result.message).toBe("Court unavailable on this date");
    expect(result.statusCode).toBe(409);
  });

  it("should return error when court is closed on selected date", async () => {
    const court = new CourtModel(validCourtData);
    await court.save();
    const user = new UserModel(validUserData);
    await user.save();

    const result = await reserveCourtSlot(
      court._id.toString(),
      user._id.toString(),
      {
        date: "2024-12-15",
        startTime: "09:00",
      }
    );

    expect(result.success).toBe(false);
    expect(result.message).toBe("Court is closed on the selected date");
    expect(result.statusCode).toBe(409);
  });

  it("should return error when slot length does not match booking minutes", async () => {
    const court = new CourtModel(validCourtData);
    await court.save();
    const user = new UserModel(validUserData);
    await user.save();

    const result = await reserveCourtSlot(
      court._id.toString(),
      user._id.toString(),
      {
        date: "2024-12-16",
        startTime: "09:00",
        endTime: "09:30",
      }
    );

    expect(result.success).toBe(false);
    expect(result.message).toBe("Slot length must equal 60 minutes");
    expect(result.statusCode).toBe(400);
  });

  it("should return error when time falls outside opening hours", async () => {
    const court = new CourtModel(validCourtData);
    await court.save();
    const user = new UserModel(validUserData);
    await user.save();

    const result = await reserveCourtSlot(
      court._id.toString(),
      user._id.toString(),
      {
        date: "2024-12-16",
        startTime: "08:00",
      }
    );

    expect(result.success).toBe(false);
    expect(result.message).toBe("Requested time falls outside opening hours");
    expect(result.statusCode).toBe(400);
  });

  it("should return error when slot does not match available slots", async () => {
    const court = new CourtModel({
      ...validCourtData,
      bufferMinutes: 15,
    });
    await court.save();
    const user = new UserModel(validUserData);
    await user.save();

    const result = await reserveCourtSlot(
      court._id.toString(),
      user._id.toString(),
      {
        date: "2024-12-16",
        startTime: "10:00",
      }
    );

    expect(result.success).toBe(false);
    expect(result.message).toBe(
      "Requested time does not match any available slot"
    );
    expect(result.statusCode).toBe(400);
  });

  it("should return error when slot is already reserved", async () => {
    const court = new CourtModel(validCourtData);
    await court.save();
    const user1 = new UserModel(validUserData);
    await user1.save();
    const user2 = new UserModel({
      ...validUserData,
      studentId: "2023002",
      email: "user2@example.com",
    });
    await user2.save();

    await CourtReservationModel.create({
      court: court._id,
      user: user1._id,
      date: new Date(Date.UTC(2024, 11, 16)),
      startTime: "09:00",
      endTime: "10:00",
      studentName: "John Doe",
      studentGucId: "2023001",
    });

    const result = await reserveCourtSlot(
      court._id.toString(),
      user2._id.toString(),
      {
        date: "2024-12-16",
        startTime: "09:00",
      }
    );

    expect(result.success).toBe(false);
    expect(result.message).toBe("Selected slot is already reserved");
    expect(result.statusCode).toBe(409);
  });

  it("should successfully reserve a valid slot", async () => {
    const court = new CourtModel(validCourtData);
    await court.save();
    const user = new UserModel(validUserData);
    await user.save();

    const result = await reserveCourtSlot(
      court._id.toString(),
      user._id.toString(),
      {
        date: "2024-12-16",
        startTime: "09:00",
      }
    );

    expect(result.success).toBe(true);
    expect(result.message).toBe("Court reserved successfully");
    expect(result.statusCode).toBe(201);
    expect(result.data).toBeDefined();
    expect(result.data!.reservation.courtId).toBe(court._id.toString());
    expect(result.data!.reservation.date).toBe("2024-12-16");
    expect(result.data!.reservation.startTime).toBe("09:00");
    expect(result.data!.reservation.endTime).toBe("10:00");
    expect(result.data!.reservation.studentName).toBe("John Doe");
    expect(result.data!.reservation.studentGucId).toBe("2023001");
    expect(result.data!.reservation.id).toBeDefined();
  });

  it("should create reservation in database", async () => {
    const court = new CourtModel(validCourtData);
    await court.save();
    const user = new UserModel(validUserData);
    await user.save();

    await reserveCourtSlot(court._id.toString(), user._id.toString(), {
      date: "2024-12-16",
      startTime: "09:00",
    });

    const reservations = await CourtReservationModel.find({});
    expect(reservations).toHaveLength(1);
    expect(reservations[0].startTime).toBe("09:00");
    expect(reservations[0].endTime).toBe("10:00");
    expect(reservations[0].studentGucId).toBe("2023001");
  });

  it("should add reservation to user's reservedCourts array", async () => {
    const court = new CourtModel(validCourtData);
    await court.save();
    const user = new UserModel(validUserData);
    await user.save();

    const result = await reserveCourtSlot(
      court._id.toString(),
      user._id.toString(),
      {
        date: "2024-12-16",
        startTime: "09:00",
      }
    );

    const updatedUser = await UserModel.findById(user._id);
    expect(updatedUser!.reservedCourts).toBeDefined();
    expect(updatedUser!.reservedCourts).toHaveLength(1);
    expect(updatedUser!.reservedCourts![0]).toBe(result.data!.reservation.id);
  });

  it("should use default endTime when not provided", async () => {
    const court = new CourtModel(validCourtData);
    await court.save();
    const user = new UserModel(validUserData);
    await user.save();

    const result = await reserveCourtSlot(
      court._id.toString(),
      user._id.toString(),
      {
        date: "2024-12-16",
        startTime: "09:00",
      }
    );

    expect(result.success).toBe(true);
    expect(result.data!.reservation.endTime).toBe("10:00");
  });

  it("should respect explicit endTime when provided", async () => {
    const court = new CourtModel(validCourtData);
    await court.save();
    const user = new UserModel(validUserData);
    await user.save();

    const result = await reserveCourtSlot(
      court._id.toString(),
      user._id.toString(),
      {
        date: "2024-12-16",
        startTime: "10:00",
        endTime: "11:00",
      }
    );

    expect(result.success).toBe(true);
    expect(result.data!.reservation.startTime).toBe("10:00");
    expect(result.data!.reservation.endTime).toBe("11:00");
  });

  it("should allow multiple reservations in different slots", async () => {
    const court = new CourtModel(validCourtData);
    await court.save();
    const user = new UserModel(validUserData);
    await user.save();

    const result1 = await reserveCourtSlot(
      court._id.toString(),
      user._id.toString(),
      {
        date: "2024-12-16",
        startTime: "09:00",
      }
    );

    const result2 = await reserveCourtSlot(
      court._id.toString(),
      user._id.toString(),
      {
        date: "2024-12-16",
        startTime: "10:00",
      }
    );

    expect(result1.success).toBe(true);
    expect(result2.success).toBe(true);

    const reservations = await CourtReservationModel.find({});
    expect(reservations).toHaveLength(2);
  });

  it("should handle reservations with custom booking slot minutes", async () => {
    const court = new CourtModel({
      ...validCourtData,
      bookingSlotMinutes: 90,
    });
    await court.save();
    const user = new UserModel(validUserData);
    await user.save();

    const result = await reserveCourtSlot(
      court._id.toString(),
      user._id.toString(),
      {
        date: "2024-12-16",
        startTime: "09:00",
        endTime: "10:30",
      }
    );

    expect(result.success).toBe(true);
    expect(result.data!.reservation.endTime).toBe("10:30");
  });

  it("should correctly format student name from user data", async () => {
    const court = new CourtModel(validCourtData);
    await court.save();
    const user = new UserModel({
      ...validUserData,
      firstName: "Ahmad",
      lastName: "Hassan",
    });
    await user.save();

    const result = await reserveCourtSlot(
      court._id.toString(),
      user._id.toString(),
      {
        date: "2024-12-16",
        startTime: "09:00",
      }
    );

    expect(result.success).toBe(true);
    expect(result.data!.reservation.studentName).toBe("Ahmad Hassan");
  });

  it("should handle edge case time at end of opening hours", async () => {
    const court = new CourtModel(validCourtData);
    await court.save();
    const user = new UserModel(validUserData);
    await user.save();

    const result = await reserveCourtSlot(
      court._id.toString(),
      user._id.toString(),
      {
        date: "2024-12-16",
        startTime: "16:00",
      }
    );

    expect(result.success).toBe(true);
    expect(result.data!.reservation.endTime).toBe("17:00");
  });

  it("should reject reservation past closing time", async () => {
    const court = new CourtModel(validCourtData);
    await court.save();
    const user = new UserModel(validUserData);
    await user.save();

    const result = await reserveCourtSlot(
      court._id.toString(),
      user._id.toString(),
      {
        date: "2024-12-16",
        startTime: "17:00",
      }
    );

    expect(result.success).toBe(false);
    expect(result.message).toBe("Requested time falls outside opening hours");
  });
});

describe("Edge Cases and Security", () => {
  const validCourtData = {
    type: CourtType.TENNIS,
    venue: "Main Campus",
    timezone: "Africa/Cairo",
    bookingSlotMinutes: 60,
    bufferMinutes: 0,
    openingHours: [{ weekday: 1, startTime: "09:00", endTime: "17:00" }],
  };

  const validUserData = {
    studentId: "2023001",
    firstName: "John",
    lastName: "Doe",
    email: "john@example.com",
    password: "password123",
    role: "Student",
    status: "Active",
    verified: true,
  };

  it("should handle null date input", async () => {
    const court = new CourtModel(validCourtData);
    await court.save();

    const result = await getCourtAvailability(
      court._id.toString(),
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      null as any
    );

    expect(result.success).toBe(false);
    expect(result.message).toBe("Date must be in YYYY-MM-DD format");
  });

  it("should handle undefined date input", async () => {
    const court = new CourtModel(validCourtData);
    await court.save();

    const result = await getCourtAvailability(
      court._id.toString(),
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      undefined as any
    );

    expect(result.success).toBe(false);
    expect(result.message).toBe("Date must be in YYYY-MM-DD format");
  });

  it("should handle empty string for court ID", async () => {
    const result = await getCourtAvailability("", "2024-12-16");

    expect(result.success).toBe(false);
    expect(result.message).toBe("Invalid court ID");
  });

  it("should handle malformed ObjectId", async () => {
    const result = await getCourtAvailability("abc123", "2024-12-16");

    expect(result.success).toBe(false);
    expect(result.message).toBe("Invalid court ID");
  });

  it("should handle reservation with null payload fields", async () => {
    const court = new CourtModel(validCourtData);
    await court.save();
    const user = new UserModel(validUserData);
    await user.save();

    const result = await reserveCourtSlot(
      court._id.toString(),
      user._id.toString(),
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      { date: null as any, startTime: null as any }
    );

    expect(result.success).toBe(false);
  });

  it("should handle very long time strings", async () => {
    const court = new CourtModel(validCourtData);
    await court.save();
    const user = new UserModel(validUserData);
    await user.save();

    const result = await reserveCourtSlot(
      court._id.toString(),
      user._id.toString(),
      {
        date: "2024-12-16",
        startTime: "09:00:00:00:00",
      }
    );

    expect(result.success).toBe(false);
    expect(result.message).toBe("startTime must use HH:mm");
  });

  it("should handle 24-hour boundary correctly", async () => {
    const court = new CourtModel(validCourtData);
    await court.save();
    const user = new UserModel(validUserData);
    await user.save();

    const result = await reserveCourtSlot(
      court._id.toString(),
      user._id.toString(),
      {
        date: "2024-12-16",
        startTime: "24:00",
      }
    );

    expect(result.success).toBe(false);
    expect(result.message).toBe("startTime must use HH:mm");
  });

  it("should handle invalid minute values", async () => {
    const court = new CourtModel(validCourtData);
    await court.save();
    const user = new UserModel(validUserData);
    await user.save();

    const result = await reserveCourtSlot(
      court._id.toString(),
      user._id.toString(),
      {
        date: "2024-12-16",
        startTime: "09:60",
      }
    );

    expect(result.success).toBe(false);
    expect(result.message).toBe("startTime must use HH:mm");
  });

  it("should handle overlapping exceptions correctly", async () => {
    const court = new CourtModel({
      ...validCourtData,
      exceptions: [
        {
          startDate: new Date("2024-12-20"),
          endDate: new Date("2024-12-25"),
          reason: "Winter Break",
        },
        {
          startDate: new Date("2024-12-24"),
          endDate: new Date("2024-12-26"),
          reason: "Holiday",
        },
      ],
    });
    await court.save();

    const result = await getCourtAvailability(
      court._id.toString(),
      "2024-12-24"
    );

    expect(result.success).toBe(true);
    expect(result.message).toBe("Court unavailable on this date");
    expect(result.data!.slots).toEqual([]);
  });

  it("should handle courts with no opening hours", async () => {
    const courtNoHours = new CourtModel({
      type: CourtType.TENNIS,
      venue: "Closed Court",
      timezone: "Africa/Cairo",
      openingHours: [],
    });
    await courtNoHours.save();

    const result = await getCourtAvailability(
      courtNoHours._id.toString(),
      "2024-12-16"
    );

    expect(result.success).toBe(true);
    expect(result.message).toBe("Court is closed on the selected date");
  });

  it("should handle user without reservedCourts array", async () => {
    const court = new CourtModel(validCourtData);
    await court.save();
    const user = new UserModel(validUserData);
    user.reservedCourts = undefined;
    await user.save();

    const result = await reserveCourtSlot(
      court._id.toString(),
      user._id.toString(),
      {
        date: "2024-12-16",
        startTime: "09:00",
      }
    );

    expect(result.success).toBe(true);
    const updatedUser = await UserModel.findById(user._id);
    expect(updatedUser!.reservedCourts).toBeDefined();
    expect(updatedUser!.reservedCourts).toHaveLength(1);
  });

  it("should handle date with leading zeros", async () => {
    const court = new CourtModel(validCourtData);
    await court.save();

    const result = await getCourtAvailability(
      court._id.toString(),
      "2024-01-01"
    );

    expect(result.success).toBe(true);
  });

  it("should handle leap year date", async () => {
    const court = new CourtModel(validCourtData);
    await court.save();

    const result = await getCourtAvailability(
      court._id.toString(),
      "2024-02-29"
    );

    expect(result.success).toBe(true);
  });

  it("should reject invalid leap year date", async () => {
    const court = new CourtModel(validCourtData);
    await court.save();

    const result = await getCourtAvailability(
      court._id.toString(),
      "2023-02-29"
    );

    console.log(result);

    expect(result.success).toBe(false);
  });
});

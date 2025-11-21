import { MongoMemoryServer } from "mongodb-memory-server";
import mongoose, { Types } from "mongoose";
import GymSessionModel, {
  GymSessionType,
  IGymSession,
} from "../../../server/models/GymSession";
import UserModel, { userRole, userStatus } from "../../../server/models/User";
import {
  cancelGymSession,
  createGymSession,
  editGymSession,
  getGymSessionsByMonth,
  registerForGymSession,
} from "../../../server/services/gymSessionService";
import { emailService } from "../../../server/services/emailService";

jest.mock("../../../server/services/emailService");

let mongoServer: MongoMemoryServer;

beforeAll(async () => {
  process.env.ENCRYPTION_SALT_ROUNDS = "4";
  mongoServer = await MongoMemoryServer.create();
  const mongoUri = mongoServer.getUri();
  await mongoose.connect(mongoUri);
});

beforeEach(() => {
  jest.spyOn(console, "error").mockImplementation(() => undefined);
  jest.spyOn(console, "info").mockImplementation(() => undefined);
  jest.clearAllMocks();

  (emailService.sendGymSessionCancellationEmail as jest.Mock).mockResolvedValue(
    {
      messageId: "test-message-id",
    }
  );
  (emailService.sendGymSessionUpdateEmail as jest.Mock).mockResolvedValue({
    messageId: "test-message-id",
  });
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

describe("createGymSession", () => {
  it("should create a gym session with valid data", async () => {
    const sessionData: Partial<IGymSession> = {
      date: new Date("2025-12-01"),
      time: "18:00",
      duration: 60,
      type: GymSessionType.YOGA,
      maxParticipants: 20,
      registeredUsers: [],
    };

    const result = await createGymSession(sessionData);

    expect(result.success).toBe(true);
    expect(result.message).toBe("Gym session created successfully.");
    expect(result.data).toBeDefined();
    expect(result.data?.type).toBe(GymSessionType.YOGA);
    expect(result.data?.duration).toBe(60);
    expect(result.data?.maxParticipants).toBe(20);
  });

  it("should create a cardio session", async () => {
    const sessionData: Partial<IGymSession> = {
      date: new Date("2025-12-05"),
      time: "07:00",
      duration: 45,
      type: GymSessionType.CARDIO,
      maxParticipants: 15,
    };

    const result = await createGymSession(sessionData);

    expect(result.success).toBe(true);
    expect(result.data?.type).toBe(GymSessionType.CARDIO);
  });

  it("should create a strength training session", async () => {
    const sessionData: Partial<IGymSession> = {
      date: new Date("2025-12-10"),
      time: "16:00",
      duration: 90,
      type: GymSessionType.STRENGTH,
      maxParticipants: 10,
    };

    const result = await createGymSession(sessionData);

    expect(result.success).toBe(true);
    expect(result.data?.type).toBe(GymSessionType.STRENGTH);
    expect(result.data?.duration).toBe(90);
  });

  it("should create session with minimum participants", async () => {
    const sessionData: Partial<IGymSession> = {
      date: new Date("2025-12-15"),
      time: "12:00",
      duration: 60,
      type: GymSessionType.PILATES,
      maxParticipants: 1,
    };

    const result = await createGymSession(sessionData);

    expect(result.success).toBe(true);
    expect(result.data?.maxParticipants).toBe(1);
  });

  it("should store session in database", async () => {
    const sessionData: Partial<IGymSession> = {
      date: new Date("2025-12-20"),
      time: "20:00",
      duration: 120,
      type: GymSessionType.CROSSFIT,
      maxParticipants: 25,
    };

    const result = await createGymSession(sessionData);

    const savedSession = await GymSessionModel.findById(result.data?._id);
    expect(savedSession).toBeDefined();
    expect(savedSession?.type).toBe(GymSessionType.CROSSFIT);
  });

  it("should handle creation errors gracefully", async () => {
    // Force an error by closing the connection temporarily
    await mongoose.connection.close();

    const sessionData: Partial<IGymSession> = {
      date: new Date("2025-12-25"),
      time: "10:00",
      duration: 60,
      type: GymSessionType.YOGA,
      maxParticipants: 20,
    };

    const result = await createGymSession(sessionData);

    expect(result.success).toBe(false);
    expect(result.message).toBe(
      "An error occurred while creating the gym session."
    );
    expect(console.error).toHaveBeenCalledWith(
      "Error creating gym session:",
      expect.any(Error)
    );

    // Reconnect
    await mongoose.connect(mongoServer.getUri());
  });
});

describe("getGymSessionsByMonth", () => {
  beforeEach(async () => {
    // Create sessions in different months
    await GymSessionModel.create({
      date: new Date("2025-06-05"),
      time: "18:00",
      duration: 60,
      type: GymSessionType.YOGA,
      maxParticipants: 20,
    });

    await GymSessionModel.create({
      date: new Date("2025-06-15"),
      time: "07:00",
      duration: 45,
      type: GymSessionType.CARDIO,
      maxParticipants: 15,
    });

    await GymSessionModel.create({
      date: new Date("2025-07-10"),
      time: "19:00",
      duration: 60,
      type: GymSessionType.STRENGTH,
      maxParticipants: 10,
    });
  });

  it("should retrieve sessions for a specific month", async () => {
    const result = await getGymSessionsByMonth(2025, 6);

    expect(result.success).toBe(true);
    expect(result.data).toHaveLength(2);
    expect(result.data?.[0].type).toBe(GymSessionType.YOGA);
    expect(result.data?.[1].type).toBe(GymSessionType.CARDIO);
  });

  it("should retrieve sessions for July", async () => {
    const result = await getGymSessionsByMonth(2025, 7);

    expect(result.success).toBe(true);
    expect(result.data).toHaveLength(1);
    expect(result.data?.[0].type).toBe(GymSessionType.STRENGTH);
  });

  it("should return empty array for month with no sessions", async () => {
    const result = await getGymSessionsByMonth(2025, 8);

    expect(result.success).toBe(true);
    expect(result.data).toHaveLength(0);
  });

  it("should handle January correctly", async () => {
    await GymSessionModel.create({
      date: new Date("2025-01-01"),
      time: "09:00",
      duration: 60,
      type: GymSessionType.YOGA,
      maxParticipants: 20,
    });

    const result = await getGymSessionsByMonth(2025, 1);

    expect(result.success).toBe(true);
    expect(result.data).toHaveLength(1);
  });

  it("should handle December correctly", async () => {
    await GymSessionModel.create({
      date: new Date("2025-12-31"),
      time: "23:00",
      duration: 60,
      type: GymSessionType.PILATES,
      maxParticipants: 15,
    });

    const result = await getGymSessionsByMonth(2025, 12);

    expect(result.success).toBe(true);
    expect(result.data).toHaveLength(1);
  });

  it("should not include sessions from previous month", async () => {
    await GymSessionModel.create({
      date: new Date("2025-05-31"),
      time: "23:59",
      duration: 60,
      type: GymSessionType.YOGA,
      maxParticipants: 20,
    });

    const result = await getGymSessionsByMonth(2025, 6);

    // Should only have the 2 June sessions, not the May session
    expect(result.success).toBe(true);
    expect(result.data).toHaveLength(2);
  });

  it("should not include sessions from next month", async () => {
    const result = await getGymSessionsByMonth(2025, 6);

    // Should have 2 June sessions, not the July session
    expect(result.success).toBe(true);
    expect(result.data).toHaveLength(2);
  });

  it("should handle errors gracefully", async () => {
    await mongoose.connection.close();

    const result = await getGymSessionsByMonth(2025, 6);

    expect(result.success).toBe(false);
    expect(result.message).toBe(
      "An error occurred while fetching gym sessions."
    );
    expect(console.error).toHaveBeenCalledWith(
      "Error fetching gym sessions by month:",
      expect.any(Error)
    );

    await mongoose.connect(mongoServer.getUri());
  });
});

describe("registerForGymSession", () => {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let student: any;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let session: any;

  beforeEach(async () => {
    student = new UserModel({
      firstName: "John",
      lastName: "Doe",
      email: "john@student.guc.edu.eg",
      password: "password123",
      role: userRole.STUDENT,
      studentId: "STU001",
      status: userStatus.ACTIVE,
      verified: true,
    });
    await student.save();

    session = new GymSessionModel({
      date: new Date("2025-12-01"),
      time: "18:00",
      duration: 60,
      type: GymSessionType.YOGA,
      maxParticipants: 20,
      registeredUsers: [],
    });
    await session.save();
  });

  it("should successfully register student for gym session", async () => {
    const result = await registerForGymSession(
      session._id.toString(),
      student._id.toString()
    );

    expect(result.success).toBe(true);
    expect(result.message).toBe("Successfully registered for the gym session");
    expect(result.statusCode).toBe(200);
    expect(result.data?.remainingSlots).toBe(19);
    expect(result.data?.session).toBeDefined();
  });

  it("should add user to session's registered users", async () => {
    await registerForGymSession(session._id.toString(), student._id.toString());

    const updatedSession = await GymSessionModel.findById(session._id);
    expect(updatedSession?.registeredUsers).toContain(student._id.toString());
    expect(updatedSession?.registeredUsers).toHaveLength(1);
  });

  it("should add session to user's registered gym sessions", async () => {
    await registerForGymSession(session._id.toString(), student._id.toString());

    const updatedUser = await UserModel.findById(student._id);
    expect(updatedUser?.registeredGymSessions).toContain(
      session._id.toString()
    );
  });

  it("should allow professor to register", async () => {
    const professor = new UserModel({
      firstName: "Jane",
      lastName: "Smith",
      email: "jane@professor.guc.edu.eg",
      password: "password123",
      role: userRole.PROFESSOR,
      staffId: "PROF001",
      status: userStatus.ACTIVE,
      verified: true,
    });
    await professor.save();

    const result = await registerForGymSession(
      session._id.toString(),
      professor._id.toString()
    );

    expect(result.success).toBe(true);
    expect(result.statusCode).toBe(200);
  });

  it("should allow staff to register", async () => {
    const staff = new UserModel({
      firstName: "Bob",
      lastName: "Wilson",
      email: "bob@staff.guc.edu.eg",
      password: "password123",
      role: userRole.STAFF,
      staffId: "STAFF001",
      status: userStatus.ACTIVE,
      verified: true,
    });
    await staff.save();

    const result = await registerForGymSession(
      session._id.toString(),
      staff._id.toString()
    );

    expect(result.success).toBe(true);
    expect(result.statusCode).toBe(200);
  });

  it("should allow TA to register", async () => {
    const ta = new UserModel({
      firstName: "Alice",
      lastName: "Johnson",
      email: "alice@ta.guc.edu.eg",
      password: "password123",
      role: userRole.TA,
      staffId: "TA001",
      status: userStatus.ACTIVE,
      verified: true,
    });
    await ta.save();

    const result = await registerForGymSession(
      session._id.toString(),
      ta._id.toString()
    );

    expect(result.success).toBe(true);
    expect(result.statusCode).toBe(200);
  });

  it("should fail with invalid session ID", async () => {
    const result = await registerForGymSession(
      "invalid-id",
      student._id.toString()
    );

    expect(result.success).toBe(false);
    expect(result.message).toBe("Invalid gym session ID");
    expect(result.statusCode).toBe(400);
  });

  it("should fail with invalid user ID", async () => {
    const result = await registerForGymSession(
      session._id.toString(),
      "invalid-id"
    );

    expect(result.success).toBe(false);
    expect(result.message).toBe("Invalid user ID");
    expect(result.statusCode).toBe(400);
  });

  it("should fail when user does not exist", async () => {
    const nonExistentUserId = new Types.ObjectId().toString();

    const result = await registerForGymSession(
      session._id.toString(),
      nonExistentUserId
    );

    expect(result.success).toBe(false);
    expect(result.message).toBe("User not found");
    expect(result.statusCode).toBe(404);
  });

  it("should fail when session does not exist", async () => {
    const nonExistentSessionId = new Types.ObjectId().toString();

    const result = await registerForGymSession(
      nonExistentSessionId,
      student._id.toString()
    );

    expect(result.success).toBe(false);
    expect(result.message).toBe("Gym session not found");
    expect(result.statusCode).toBe(404);
  });

  it("should fail when user is already registered", async () => {
    await registerForGymSession(session._id.toString(), student._id.toString());

    const result = await registerForGymSession(
      session._id.toString(),
      student._id.toString()
    );

    expect(result.success).toBe(false);
    expect(result.message).toBe("You are already registered for this session");
    expect(result.statusCode).toBe(409);
  });

  it("should fail when session is full", async () => {
    session.maxParticipants = 1;
    session.registeredUsers = [new Types.ObjectId().toString()];
    await session.save();

    const result = await registerForGymSession(
      session._id.toString(),
      student._id.toString()
    );

    expect(result.success).toBe(false);
    expect(result.message).toBe("This session is already full");
    expect(result.statusCode).toBe(409);
  });

  it("should fail when user is blocked", async () => {
    student.status = userStatus.BLOCKED;
    await student.save();

    const result = await registerForGymSession(
      session._id.toString(),
      student._id.toString()
    );

    expect(result.success).toBe(false);
    expect(result.message).toBe(
      "Blocked accounts cannot register for sessions"
    );
    expect(result.statusCode).toBe(403);
  });

  it("should calculate remaining slots correctly", async () => {
    session.maxParticipants = 5;
    await session.save();

    const result = await registerForGymSession(
      session._id.toString(),
      student._id.toString()
    );

    expect(result.data?.remainingSlots).toBe(4);
  });

  it("should handle last available slot", async () => {
    session.maxParticipants = 1;
    await session.save();

    const result = await registerForGymSession(
      session._id.toString(),
      student._id.toString()
    );

    expect(result.success).toBe(true);
    expect(result.data?.remainingSlots).toBe(0);
  });

  it("should handle database errors gracefully", async () => {
    await mongoose.connection.close();

    const result = await registerForGymSession(
      session._id.toString(),
      student._id.toString()
    );

    expect(result.success).toBe(false);
    expect(result.message).toBe("Failed to register for gym session");
    expect(result.statusCode).toBe(500);

    await mongoose.connect(mongoServer.getUri());
  });
});

describe("editGymSession", () => {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let session: any;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let user: any;

  beforeEach(async () => {
    user = new UserModel({
      firstName: "John",
      lastName: "Doe",
      email: "john@student.guc.edu.eg",
      password: "password123",
      role: userRole.STUDENT,
      studentId: "STU001",
      status: userStatus.ACTIVE,
      verified: true,
    });
    await user.save();

    session = new GymSessionModel({
      date: new Date("2025-12-01"),
      time: "18:00",
      duration: 60,
      type: GymSessionType.YOGA,
      maxParticipants: 20,
      registeredUsers: [user._id.toString()],
    });
    await session.save();
  });

  it("should successfully update session time", async () => {
    const updates = { time: "19:00" };

    const result = await editGymSession(session._id.toString(), updates);

    expect(result.success).toBe(true);
    expect(result.message).toBe("Gym session successfully updated.");
    expect(result.statusCode).toBe(200);
    expect(result.data?.time).toBe("19:00");
  });

  it("should successfully update session duration", async () => {
    const updates = { duration: 90 };

    const result = await editGymSession(session._id.toString(), updates);

    expect(result.success).toBe(true);
    expect(result.data?.duration).toBe(90);
  });

  it("should successfully update session type", async () => {
    const updates = { type: GymSessionType.CARDIO };

    const result = await editGymSession(session._id.toString(), updates);

    expect(result.success).toBe(true);
    expect(result.data?.type).toBe(GymSessionType.CARDIO);
  });

  it("should successfully update max participants", async () => {
    const updates = { maxParticipants: 30 };

    const result = await editGymSession(session._id.toString(), updates);

    expect(result.success).toBe(true);
    expect(result.data?.maxParticipants).toBe(30);
  });

  it("should successfully update session date", async () => {
    const newDate = new Date("2025-12-15");
    const updates = { date: newDate };

    const result = await editGymSession(session._id.toString(), updates);

    expect(result.success).toBe(true);
  });

  it("should update multiple fields at once", async () => {
    const updates = {
      time: "20:00",
      duration: 120,
      maxParticipants: 25,
    };

    const result = await editGymSession(session._id.toString(), updates);

    expect(result.success).toBe(true);
    expect(result.data?.time).toBe("20:00");
    expect(result.data?.duration).toBe(120);
    expect(result.data?.maxParticipants).toBe(25);
  });

  it("should send notification emails to registered users when session changes", async () => {
    const updates = { time: "19:00" };

    await editGymSession(session._id.toString(), updates);

    // Email should be sent asynchronously
    await new Promise((resolve) => setTimeout(resolve, 100));

    expect(emailService.sendGymSessionUpdateEmail).toHaveBeenCalled();
  });

  it("should not send emails when no meaningful changes are made", async () => {
    const updates = { registeredUsers: session.registeredUsers };

    await editGymSession(session._id.toString(), updates);

    await new Promise((resolve) => setTimeout(resolve, 100));

    // No changes in tracked fields, so no email should be sent
    expect(emailService.sendGymSessionUpdateEmail).not.toHaveBeenCalled();
  });

  it("should fail with invalid session ID", async () => {
    const result = await editGymSession("invalid-id", { time: "19:00" });

    expect(result.success).toBe(false);
    expect(result.message).toBe("Invalid session ID");
    expect(result.statusCode).toBe(400);
  });

  it("should fail with no updates provided", async () => {
    const result = await editGymSession(session._id.toString(), {});

    expect(result.success).toBe(false);
    expect(result.message).toBe("No updates provided");
    expect(result.statusCode).toBe(400);
  });

  it("should fail when session does not exist", async () => {
    const nonExistentId = new Types.ObjectId().toString();

    const result = await editGymSession(nonExistentId, { time: "19:00" });

    expect(result.success).toBe(false);
    expect(result.message).toBe("Gym session not found.");
    expect(result.statusCode).toBe(404);
  });

  it("should persist updates to database", async () => {
    const updates = { time: "21:00", duration: 75 };

    await editGymSession(session._id.toString(), updates);

    const updatedSession = await GymSessionModel.findById(session._id);
    expect(updatedSession?.time).toBe("21:00");
    expect(updatedSession?.duration).toBe(75);
  });

  it("should handle database errors gracefully", async () => {
    await mongoose.connection.close();

    const result = await editGymSession(session._id.toString(), {
      time: "19:00",
    });

    expect(result.success).toBe(false);
    expect(result.message).toBe(
      "An error occurred while editing the gym session."
    );
    expect(console.error).toHaveBeenCalledWith(
      "Error editing gym session",
      expect.any(Error)
    );

    await mongoose.connect(mongoServer.getUri());
  });

  it("should detect time change", async () => {
    const updates = { time: "20:00" };

    await editGymSession(session._id.toString(), updates);

    await new Promise((resolve) => setTimeout(resolve, 100));

    expect(emailService.sendGymSessionUpdateEmail).toHaveBeenCalledWith(
      expect.objectContaining({
        changes: expect.arrayContaining([
          expect.objectContaining({
            label: "Start time",
            previous: "18:00",
            current: "20:00",
          }),
        ]),
      })
    );
  });

  it("should detect duration change", async () => {
    const updates = { duration: 45 };

    await editGymSession(session._id.toString(), updates);

    await new Promise((resolve) => setTimeout(resolve, 100));

    expect(emailService.sendGymSessionUpdateEmail).toHaveBeenCalledWith(
      expect.objectContaining({
        changes: expect.arrayContaining([
          expect.objectContaining({
            label: "Duration",
            previous: "60 minutes",
            current: "45 minutes",
          }),
        ]),
      })
    );
  });

  it("should detect session type change", async () => {
    const updates = { type: GymSessionType.STRENGTH };

    await editGymSession(session._id.toString(), updates);

    await new Promise((resolve) => setTimeout(resolve, 100));

    expect(emailService.sendGymSessionUpdateEmail).toHaveBeenCalledWith(
      expect.objectContaining({
        changes: expect.arrayContaining([
          expect.objectContaining({
            label: "Session type",
            previous: GymSessionType.YOGA,
            current: GymSessionType.STRENGTH,
          }),
        ]),
      })
    );
  });
});

describe("cancelGymSession", () => {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let session: any;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let user1: any;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let user2: any;

  beforeEach(async () => {
    user1 = new UserModel({
      firstName: "Alice",
      lastName: "Smith",
      email: "alice@student.guc.edu.eg",
      password: "password123",
      role: userRole.STUDENT,
      studentId: "STU001",
      status: userStatus.ACTIVE,
      verified: true,
    });
    await user1.save();

    user2 = new UserModel({
      firstName: "Bob",
      lastName: "Johnson",
      email: "bob@professor.guc.edu.eg",
      password: "password123",
      role: userRole.PROFESSOR,
      staffId: "PROF001",
      status: userStatus.ACTIVE,
      verified: true,
    });
    await user2.save();

    session = new GymSessionModel({
      date: new Date("2025-12-01"),
      time: "18:00",
      duration: 60,
      type: GymSessionType.YOGA,
      maxParticipants: 20,
      registeredUsers: [user1._id.toString(), user2._id.toString()],
    });
    await session.save();
  });

  it("should successfully cancel a gym session", async () => {
    const result = await cancelGymSession(session._id.toString());

    expect(result.success).toBe(true);
    expect(result.message).toBe("Gym session successfully cancelled.");
    expect(result.data).toBeDefined();
  });

  it("should delete session from database", async () => {
    await cancelGymSession(session._id.toString());

    const deletedSession = await GymSessionModel.findById(session._id);
    expect(deletedSession).toBeNull();
  });

  it("should send cancellation emails to registered users", async () => {
    await cancelGymSession(session._id.toString());

    // Allow async email sending to complete
    await new Promise((resolve) => setTimeout(resolve, 100));

    expect(emailService.sendGymSessionCancellationEmail).toHaveBeenCalledTimes(
      2
    );
  });

  it("should send cancellation email to each registered user", async () => {
    await cancelGymSession(session._id.toString());

    await new Promise((resolve) => setTimeout(resolve, 100));

    const calls = (emailService.sendGymSessionCancellationEmail as jest.Mock)
      .mock.calls;
    const emails = calls.map((call) => call[0].user.email);

    expect(emails).toContain("alice@student.guc.edu.eg");
    expect(emails).toContain("bob@professor.guc.edu.eg");
  });

  it("should fail when session does not exist", async () => {
    const nonExistentId = new Types.ObjectId().toString();

    const result = await cancelGymSession(nonExistentId);

    expect(result.success).toBe(false);
    expect(result.message).toBe("Gym session not found.");
  });

  it("should handle session with no registered users", async () => {
    session.registeredUsers = [];
    await session.save();

    const result = await cancelGymSession(session._id.toString());

    expect(result.success).toBe(true);
    expect(emailService.sendGymSessionCancellationEmail).not.toHaveBeenCalled();
  });

  it("should handle session with invalid user IDs gracefully", async () => {
    session.registeredUsers = ["invalid-id-1", "invalid-id-2"];
    await session.save();

    const result = await cancelGymSession(session._id.toString());

    expect(result.success).toBe(true);
    // Invalid IDs should be filtered out, no emails sent
    await new Promise((resolve) => setTimeout(resolve, 100));
    expect(emailService.sendGymSessionCancellationEmail).not.toHaveBeenCalled();
  });

  it("should handle session with blocked users", async () => {
    user1.status = userStatus.BLOCKED;
    await user1.save();

    const result = await cancelGymSession(session._id.toString());

    expect(result.success).toBe(true);

    await new Promise((resolve) => setTimeout(resolve, 100));

    // Only active user should receive email
    expect(emailService.sendGymSessionCancellationEmail).toHaveBeenCalledTimes(
      1
    );
    const call = (emailService.sendGymSessionCancellationEmail as jest.Mock)
      .mock.calls[0];
    expect(call[0].user.email).toBe("bob@professor.guc.edu.eg");
  });

  it("should handle email sending failures gracefully", async () => {
    (
      emailService.sendGymSessionCancellationEmail as jest.Mock
    ).mockRejectedValue(new Error("Email service down"));

    const result = await cancelGymSession(session._id.toString());

    expect(result.success).toBe(true);
    // Session should still be deleted even if emails fail
    const deletedSession = await GymSessionModel.findById(session._id);
    expect(deletedSession).toBeNull();
  });

  it("should return cancelled session data", async () => {
    const result = await cancelGymSession(session._id.toString());

    expect(result.data?.type).toBe(GymSessionType.YOGA);
    expect(result.data?.duration).toBe(60);
    expect(result.data?.maxParticipants).toBe(20);
  });

  it("should handle database errors gracefully", async () => {
    await mongoose.connection.close();

    const result = await cancelGymSession(session._id.toString());

    expect(result.success).toBe(false);
    expect(result.message).toBe(
      "An error occurred while cancelling the gym session."
    );
    expect(console.error).toHaveBeenCalledWith(
      "Error cancelling gym session:",
      expect.any(Error)
    );

    await mongoose.connect(mongoServer.getUri());
  });
});

describe("Gym Session Service - Integration and Edge Cases", () => {
  it("should handle concurrent registrations for same session", async () => {
    const session = new GymSessionModel({
      date: new Date("2025-12-01"),
      time: "18:00",
      duration: 60,
      type: GymSessionType.YOGA,
      maxParticipants: 2,
      registeredUsers: [],
    });
    await session.save();

    const user1 = new UserModel({
      firstName: "User1",
      lastName: "Test",
      email: "user1@guc.edu.eg",
      password: "password123",
      role: userRole.STUDENT,
      studentId: "STU001",
      status: userStatus.ACTIVE,
    });
    await user1.save();

    const user2 = new UserModel({
      firstName: "User2",
      lastName: "Test",
      email: "user2@guc.edu.eg",
      password: "password123",
      role: userRole.STUDENT,
      studentId: "STU002",
      status: userStatus.ACTIVE,
    });
    await user2.save();

    const [result1, result2] = await Promise.all([
      registerForGymSession(session._id.toString(), user1._id.toString()),
      registerForGymSession(session._id.toString(), user2._id.toString()),
    ]);

    // Both should succeed since there's room for 2
    expect(result1.success).toBe(true);
    expect(result2.success).toBe(true);

    const updatedSession = await GymSessionModel.findById(session._id);
    expect(updatedSession?.registeredUsers).toHaveLength(2);
  });

  it("should handle session updates with multiple field changes", async () => {
    const user = new UserModel({
      firstName: "Test",
      lastName: "User",
      email: "test@guc.edu.eg",
      password: "password123",
      role: userRole.STUDENT,
      studentId: "STU001",
      status: userStatus.ACTIVE,
    });
    await user.save();

    const session = new GymSessionModel({
      date: new Date("2025-12-01"),
      time: "18:00",
      duration: 60,
      type: GymSessionType.YOGA,
      maxParticipants: 20,
      registeredUsers: [user._id.toString()],
    });
    await session.save();

    const updates = {
      time: "19:00",
      duration: 90,
      type: GymSessionType.PILATES,
    };

    await editGymSession(session._id.toString(), updates);

    await new Promise((resolve) => setTimeout(resolve, 100));

    expect(emailService.sendGymSessionUpdateEmail).toHaveBeenCalledWith(
      expect.objectContaining({
        changes: expect.arrayContaining([
          expect.objectContaining({ label: "Start time" }),
          expect.objectContaining({ label: "Duration" }),
          expect.objectContaining({ label: "Session type" }),
        ]),
      })
    );
  });

  it("should handle retrieving sessions across year boundaries", async () => {
    await GymSessionModel.create({
      date: new Date("2025-12-31"),
      time: "23:00",
      duration: 60,
      type: GymSessionType.YOGA,
      maxParticipants: 20,
    });

    await GymSessionModel.create({
      date: new Date("2026-01-01"),
      time: "01:00",
      duration: 60,
      type: GymSessionType.CARDIO,
      maxParticipants: 15,
    });

    const dec2025 = await getGymSessionsByMonth(2025, 12);
    const jan2026 = await getGymSessionsByMonth(2026, 1);

    expect(dec2025.data).toHaveLength(1);
    expect(dec2025.data?.[0].type).toBe(GymSessionType.YOGA);

    expect(jan2026.data).toHaveLength(1);
    expect(jan2026.data?.[0].type).toBe(GymSessionType.CARDIO);
  });

  it("should handle registering same user for multiple sessions", async () => {
    const user = new UserModel({
      firstName: "Multi",
      lastName: "Session",
      email: "multi@guc.edu.eg",
      password: "password123",
      role: userRole.STUDENT,
      studentId: "STU001",
      status: userStatus.ACTIVE,
    });
    await user.save();

    const session1 = new GymSessionModel({
      date: new Date("2025-12-01"),
      time: "18:00",
      duration: 60,
      type: GymSessionType.YOGA,
      maxParticipants: 20,
    });
    await session1.save();

    const session2 = new GymSessionModel({
      date: new Date("2025-12-02"),
      time: "19:00",
      duration: 60,
      type: GymSessionType.CARDIO,
      maxParticipants: 15,
    });
    await session2.save();

    const result1 = await registerForGymSession(
      session1._id.toString(),
      user._id.toString()
    );
    const result2 = await registerForGymSession(
      session2._id.toString(),
      user._id.toString()
    );

    expect(result1.success).toBe(true);
    expect(result2.success).toBe(true);

    const updatedUser = await UserModel.findById(user._id);
    expect(updatedUser?.registeredGymSessions).toHaveLength(2);
  });
});

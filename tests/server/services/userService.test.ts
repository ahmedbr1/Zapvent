import { MongoMemoryServer } from "mongodb-memory-server";
import mongoose, { Types } from "mongoose";
import UserModel from "../../../server/models/User";
import EventModel from "../../../server/models/Event";
import {
  findAll,
  create,
  signup,
  SignupConflictError,
  findProfessors,
  findRegisteredEvents,
  addEventToFavorites,
  getFavoriteEvents,
  getProfessorNotifications,
  markNotificationsAsSeen,
} from "../../../server/services/userService";
import { issueStudentVerification } from "../../../server/services/emailVerificationService";

jest.mock("../../../server/services/emailVerificationService");

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

describe("findAll", () => {
  it("should return empty array when no users exist", async () => {
    const result = await findAll();

    expect(result).toEqual([]);
  });

  it("should return all users", async () => {
    const user1 = new UserModel({
      firstName: "John",
      lastName: "Doe",
      email: "john@example.com",
      password: "password123",
      role: "Student",
      studentId: "STU001",
      status: "Active",
      verified: true,
    });
    const user2 = new UserModel({
      firstName: "Jane",
      lastName: "Smith",
      email: "jane@example.com",
      password: "password123",
      role: "Professor",
      staffId: "PROF001",
      status: "Active",
      verified: false,
    });
    await user1.save();
    await user2.save();

    const result = await findAll();

    expect(result).toHaveLength(2);
    expect(result[0].firstName).toBe("John");
    expect(result[1].firstName).toBe("Jane");
  });

  it("should return users with all fields", async () => {
    const user = new UserModel({
      firstName: "Test",
      lastName: "User",
      email: "test@example.com",
      password: "password123",
      role: "Student",
      studentId: "STU002",
      status: "Active",
      verified: true,
      balance: 100,
      registeredEvents: ["event1"],
      favorites: ["fav1"],
      workshops: ["workshop1"],
    });
    await user.save();

    const result = await findAll();

    expect(result).toHaveLength(1);
    expect(result[0]).toHaveProperty("firstName");
    expect(result[0]).toHaveProperty("lastName");
    expect(result[0]).toHaveProperty("email");
    expect(result[0]).toHaveProperty("role");
    expect(result[0]).toHaveProperty("status");
    expect(result[0]).toHaveProperty("verified");
    expect(result[0]).toHaveProperty("balance");
  });
});

describe("create", () => {
  it("should create a user with valid data", async () => {
    const userData = {
      firstName: "John",
      lastName: "Doe",
      email: "john@example.com",
      password: "password123",
      role: "Student",
      studentId: "STU001",
      status: "Active",
      verified: false,
    };

    const result = await create(userData);

    expect(result).toBeDefined();
    expect(result.firstName).toBe(userData.firstName);
    expect(result.lastName).toBe(userData.lastName);
    expect(result.email).toBe(userData.email);
    expect(result.role).toBe(userData.role);
    expect(result._id).toBeDefined();
  });

  it("should create a professor with staff ID", async () => {
    const userData = {
      firstName: "Professor",
      lastName: "Smith",
      email: "prof@example.com",
      password: "password123",
      role: "Professor",
      staffId: "PROF001",
      status: "Active",
      verified: false,
    };

    const result = await create(userData);

    expect(result.role).toBe("Professor");
    expect(result.staffId).toBe(userData.staffId);
  });

  it("should hash password before saving", async () => {
    const userData = {
      firstName: "Test",
      lastName: "User",
      email: "test@example.com",
      password: "password123",
      role: "Student",
      studentId: "STU002",
      status: "Active",
      verified: false,
    };

    const result = await create(userData);

    const savedUser = await UserModel.findById(result._id).select("+password");
    expect(savedUser?.password).toBeDefined();
    expect(savedUser?.password).not.toBe(userData.password);
  });
});

describe("signup", () => {
  const validStudentData = {
    firstName: "John",
    lastName: "Doe",
    email: "john.student@example.com",
    password: "Pass123!@#",
    role: "Student" as const,
    studentId: "STU001",
  };

  const validProfessorData = {
    firstName: "Jane",
    lastName: "Smith",
    email: "jane.professor@example.com",
    password: "Prof456!@#",
    role: "Professor" as const,
    staffId: "PROF001",
  };

  const validStaffData = {
    firstName: "Bob",
    lastName: "Wilson",
    email: "bob.staff@example.com",
    password: "Staff789!@#",
    role: "Staff" as const,
    staffId: "STAFF001",
  };

  const validTAData = {
    firstName: "Alice",
    lastName: "Johnson",
    email: "alice.ta@example.com",
    password: "TA012!@#",
    role: "TA" as const,
    staffId: "TA001",
  };

  it("should successfully signup a student", async () => {
    const result = await signup(validStudentData);

    expect(result.user).toBeDefined();
    expect(result.user.firstName).toBe(validStudentData.firstName);
    expect(result.user.lastName).toBe(validStudentData.lastName);
    expect(result.user.email).toBe(validStudentData.email);
    expect(result.user.role).toBe(validStudentData.role);
    expect(result.user.password).toBeUndefined();
    expect(result.message).toBe(
      "Registration submitted successfully. Please verify your email to continue."
    );
    expect(result.needsApproval).toBe(true);
    expect(issueStudentVerification).toHaveBeenCalled();
  });

  it("should successfully signup a professor", async () => {
    const result = await signup(validProfessorData);

    expect(result.user).toBeDefined();
    expect(result.user.role).toBe("Professor");
    expect(result.message).toBe(
      "Registration submitted successfully. Your account is pending admin approval."
    );
    expect(result.needsApproval).toBe(true);
    expect(issueStudentVerification).not.toHaveBeenCalled();
  });

  it("should successfully signup staff", async () => {
    const result = await signup(validStaffData);

    expect(result.user).toBeDefined();
    expect(result.user.role).toBe("Staff");
    expect(result.message).toBe(
      "Registration submitted successfully. Your account is pending admin approval."
    );
    expect(result.needsApproval).toBe(true);
  });

  it("should successfully signup TA", async () => {
    const result = await signup(validTAData);

    expect(result.user).toBeDefined();
    expect(result.user.role).toBe("TA");
    expect(result.message).toBe(
      "Registration submitted successfully. Your account is pending admin approval."
    );
    expect(result.needsApproval).toBe(true);
  });

  it("should normalize email to lowercase", async () => {
    const dataWithUppercaseEmail = {
      ...validStudentData,
      email: "UPPERCASE@EXAMPLE.COM",
    };

    const result = await signup(dataWithUppercaseEmail);

    expect(result.user.email).toBe("uppercase@example.com");
  });

  it("should throw SignupConflictError when email already exists", async () => {
    await signup(validStudentData);

    await expect(signup(validStudentData)).rejects.toThrow(SignupConflictError);
    await expect(signup(validStudentData)).rejects.toThrow(
      "An account with this email already exists."
    );
  });

  it("should throw SignupConflictError when student ID already exists", async () => {
    await signup(validStudentData);

    const duplicateStudentId = {
      ...validStudentData,
      email: "different@example.com",
    };

    await expect(signup(duplicateStudentId)).rejects.toThrow(
      SignupConflictError
    );
    await expect(signup(duplicateStudentId)).rejects.toThrow(
      "This student ID is already registered."
    );
  });

  it("should throw SignupConflictError when staff ID already exists", async () => {
    await signup(validProfessorData);

    const duplicateStaffId = {
      ...validProfessorData,
      email: "different@example.com",
    };

    await expect(signup(duplicateStaffId)).rejects.toThrow(SignupConflictError);
    await expect(signup(duplicateStaffId)).rejects.toThrow(
      "This staff ID is already registered."
    );
  });

  it("should fail with invalid email format", async () => {
    const invalidEmailData = {
      ...validStudentData,
      email: "invalid-email",
    };

    await expect(signup(invalidEmailData)).rejects.toThrow();
  });

  it("should fail when password is too short", async () => {
    const shortPasswordData = {
      ...validStudentData,
      password: "Short1!",
    };

    await expect(signup(shortPasswordData)).rejects.toThrow();
  });

  it("should fail when password is too long", async () => {
    const longPasswordData = {
      ...validStudentData,
      password: "VeryLongPassword123!@#$%^&*()VeryLong",
    };

    await expect(signup(longPasswordData)).rejects.toThrow();
  });

  it("should fail when password has no letter", async () => {
    const noLetterData = {
      ...validStudentData,
      password: "12345678!@#",
    };

    await expect(signup(noLetterData)).rejects.toThrow();
  });

  it("should fail when password has no number", async () => {
    const noNumberData = {
      ...validStudentData,
      password: "Password!@#",
    };

    await expect(signup(noNumberData)).rejects.toThrow();
  });

  it("should fail when password has no special character", async () => {
    const noSpecialData = {
      ...validStudentData,
      password: "Password123",
    };

    await expect(signup(noSpecialData)).rejects.toThrow();
  });

  it("should fail when firstName is too short", async () => {
    const shortNameData = {
      ...validStudentData,
      firstName: "J",
    };

    await expect(signup(shortNameData)).rejects.toThrow();
  });

  it("should fail when firstName is too long", async () => {
    const longNameData = {
      ...validStudentData,
      firstName: "VeryLongFirstNameThatExceedsLimit",
    };

    await expect(signup(longNameData)).rejects.toThrow();
  });

  it("should fail when lastName is too short", async () => {
    const shortLastNameData = {
      ...validStudentData,
      lastName: "D",
    };

    await expect(signup(shortLastNameData)).rejects.toThrow();
  });

  it("should fail when lastName is too long", async () => {
    const longLastNameData = {
      ...validStudentData,
      lastName: "VeryLongLastNameThatExceedsLimit",
    };

    await expect(signup(longLastNameData)).rejects.toThrow();
  });

  it("should fail when student role missing studentId", async () => {
    const missingStudentId = {
      firstName: "Test",
      lastName: "Student",
      email: "test@example.com",
      password: "Pass123!@#",
      role: "Student" as const,
    };

    await expect(signup(missingStudentId)).rejects.toThrow();
  });

  it("should fail when professor role missing staffId", async () => {
    const missingStaffId = {
      firstName: "Test",
      lastName: "Professor",
      email: "test@example.com",
      password: "Pass123!@#",
      role: "Professor" as const,
    };

    await expect(signup(missingStaffId)).rejects.toThrow();
  });

  it("should fail when staff role missing staffId", async () => {
    const missingStaffId = {
      firstName: "Test",
      lastName: "Staff",
      email: "test@example.com",
      password: "Pass123!@#",
      role: "Staff" as const,
    };

    await expect(signup(missingStaffId)).rejects.toThrow();
  });

  it("should fail when TA role missing staffId", async () => {
    const missingStaffId = {
      firstName: "Test",
      lastName: "TA",
      email: "test@example.com",
      password: "Pass123!@#",
      role: "TA" as const,
    };

    await expect(signup(missingStaffId)).rejects.toThrow();
  });

  it("should trim studentId", async () => {
    const dataWithSpacedId = {
      ...validStudentData,
      studentId: "  STU999  ",
    };

    const result = await signup(dataWithSpacedId);

    const savedUser = await UserModel.findOne({ email: result.user.email });
    expect(savedUser?.studentId).toBe("STU999");
  });

  it("should trim staffId", async () => {
    const dataWithSpacedId = {
      ...validProfessorData,
      staffId: "  PROF999  ",
      email: "unique@example.com",
    };

    const result = await signup(dataWithSpacedId);

    const savedUser = await UserModel.findOne({ email: result.user.email });
    expect(savedUser?.staffId).toBe("PROF999");
  });
});

describe("findProfessors", () => {
  it("should return empty array when no professors exist", async () => {
    const result = await findProfessors();

    expect(result).toEqual([]);
  });

  it("should return only verified professors", async () => {
    const verifiedProf = new UserModel({
      firstName: "Verified",
      lastName: "Professor",
      email: "verified@example.com",
      password: "password123",
      role: "Professor",
      staffId: "PROF001",
      status: "Active",
      verified: true,
    });
    const unverifiedProf = new UserModel({
      firstName: "Unverified",
      lastName: "Professor",
      email: "unverified@example.com",
      password: "password123",
      role: "Professor",
      staffId: "PROF002",
      status: "Active",
      verified: false,
    });
    await verifiedProf.save();
    await unverifiedProf.save();

    const result = await findProfessors();

    expect(result).toHaveLength(1);
    expect(result[0].name).toBe("Verified Professor");
    expect(result[0].email).toBe("verified@example.com");
  });

  it("should not return students or staff", async () => {
    const student = new UserModel({
      firstName: "Student",
      lastName: "User",
      email: "student@example.com",
      password: "password123",
      role: "Student",
      studentId: "STU001",
      status: "Active",
      verified: true,
    });
    const professor = new UserModel({
      firstName: "Professor",
      lastName: "User",
      email: "prof@example.com",
      password: "password123",
      role: "Professor",
      staffId: "PROF001",
      status: "Active",
      verified: true,
    });
    await student.save();
    await professor.save();

    const result = await findProfessors();

    expect(result).toHaveLength(1);
    expect(result[0].name).toBe("Professor User");
  });

  it("should return professors sorted by name", async () => {
    const prof1 = new UserModel({
      firstName: "Zoe",
      lastName: "Anderson",
      email: "zoe@example.com",
      password: "password123",
      role: "Professor",
      staffId: "PROF001",
      status: "Active",
      verified: true,
    });
    const prof2 = new UserModel({
      firstName: "Alice",
      lastName: "Brown",
      email: "alice@example.com",
      password: "password123",
      role: "Professor",
      staffId: "PROF002",
      status: "Active",
      verified: true,
    });
    await prof1.save();
    await prof2.save();

    const result = await findProfessors();

    expect(result).toHaveLength(2);
    expect(result[0].name).toBe("Alice Brown");
    expect(result[1].name).toBe("Zoe Anderson");
  });

  it("should format professor name correctly", async () => {
    const professor = new UserModel({
      firstName: "John",
      lastName: "Doe",
      email: "john.doe@example.com",
      password: "password123",
      role: "Professor",
      staffId: "PROF001",
      status: "Active",
      verified: true,
    });
    await professor.save();

    const result = await findProfessors();

    expect(result[0].name).toBe("John Doe");
    expect(result[0].email).toBe("john.doe@example.com");
    expect(result[0].id).toBeDefined();
  });
});

describe("findRegisteredEvents", () => {
  it("should return error when user not found", async () => {
    const fakeId = new Types.ObjectId().toString();
    const result = await findRegisteredEvents(fakeId);

    expect(result.success).toBe(false);
    expect(result.message).toBe("User not found.");
  });

  it("should return empty array when user has no registered events", async () => {
    const user = new UserModel({
      firstName: "John",
      lastName: "Doe",
      email: "john@example.com",
      password: "password123",
      role: "Student",
      studentId: "STU001",
      status: "Active",
      verified: true,
    });
    await user.save();

    const result = await findRegisteredEvents(user._id.toString());

    expect(result.success).toBe(true);
    expect(result.message).toBe("No registered events found.");
    expect(result.data).toEqual([]);
  });

  it("should return registered events with correct status", async () => {
    const event1 = new EventModel({
      name: "Past Event",
      eventType: "Workshop",
      description: "Past event",
      date: new Date("2020-01-01"),
      location: "GUC Cairo",
      startDate: new Date("2020-01-01"),
      endDate: new Date("2020-01-02"),
      registrationDeadline: new Date("2019-12-31"),
      fundingSource: "GUC",
    });
    const event2 = new EventModel({
      name: "Upcoming Event",
      eventType: "Seminar",
      description: "Future event",
      date: new Date("2030-01-01"),
      location: "GUC Berlin",
      startDate: new Date("2030-01-01"),
      endDate: new Date("2030-01-02"),
      registrationDeadline: new Date("2029-12-31"),
      fundingSource: "External",
    });
    await event1.save();
    await event2.save();

    const user = new UserModel({
      firstName: "John",
      lastName: "Doe",
      email: "john@example.com",
      password: "password123",
      role: "Student",
      studentId: "STU001",
      status: "Active",
      verified: true,
      registeredEvents: [event1._id.toString(), event2._id.toString()],
    });
    await user.save();

    const result = await findRegisteredEvents(user._id.toString());

    expect(result.success).toBe(true);
    expect(result.message).toBe("Registered events successfully retrieved.");
    expect(result.data).toHaveLength(2);
    const pastEvent = result.data?.find((e) => e.name === "Past Event");
    const upcomingEvent = result.data?.find((e) => e.name === "Upcoming Event");
    expect(pastEvent?.status).toBe("Past");
    expect(upcomingEvent?.status).toBe("Upcoming");
  });

  it("should return events with all required fields", async () => {
    const event = new EventModel({
      name: "Test Event",
      eventType: "Conference",
      description: "Test description",
      date: new Date("2030-01-01"),
      location: "GUC Cairo",
      startDate: new Date("2030-01-01"),
      endDate: new Date("2030-01-02"),
      registrationDeadline: new Date("2029-12-31"),
      fundingSource: "GUC",
    });
    await event.save();

    const user = new UserModel({
      firstName: "John",
      lastName: "Doe",
      email: "john@example.com",
      password: "password123",
      role: "Student",
      studentId: "STU001",
      status: "Active",
      verified: true,
      registeredEvents: [event._id.toString()],
    });
    await user.save();

    const result = await findRegisteredEvents(user._id.toString());

    expect(result.success).toBe(true);
    expect(result.data).toHaveLength(1);
    expect(result.data?.[0]).toHaveProperty("id");
    expect(result.data?.[0]).toHaveProperty("name");
    expect(result.data?.[0]).toHaveProperty("location");
    expect(result.data?.[0]).toHaveProperty("startDate");
    expect(result.data?.[0]).toHaveProperty("endDate");
    expect(result.data?.[0]).toHaveProperty("registrationDeadline");
    expect(result.data?.[0]).toHaveProperty("status");
  });
});

describe("addEventToFavorites", () => {
  it("should fail with invalid event ID", async () => {
    const user = new UserModel({
      firstName: "John",
      lastName: "Doe",
      email: "john@example.com",
      password: "password123",
      role: "Student",
      studentId: "STU001",
      status: "Active",
      verified: true,
    });
    await user.save();

    const result = await addEventToFavorites(user._id.toString(), "invalid-id");

    expect(result.success).toBe(false);
    expect(result.message).toBe("Invalid event identifier.");
    expect(result.statusCode).toBe(400);
  });

  it("should fail when user not found", async () => {
    const fakeUserId = new Types.ObjectId().toString();
    const fakeEventId = new Types.ObjectId().toString();

    const result = await addEventToFavorites(fakeUserId, fakeEventId);

    expect(result.success).toBe(false);
    expect(result.message).toBe("User not found.");
    expect(result.statusCode).toBe(404);
  });

  it("should fail when event not found", async () => {
    const user = new UserModel({
      firstName: "John",
      lastName: "Doe",
      email: "john@example.com",
      password: "password123",
      role: "Student",
      studentId: "STU001",
      status: "Active",
      verified: true,
    });
    await user.save();

    const fakeEventId = new Types.ObjectId().toString();
    const result = await addEventToFavorites(user._id.toString(), fakeEventId);

    expect(result.success).toBe(false);
    expect(result.message).toBe("Event not found.");
    expect(result.statusCode).toBe(404);
  });

  it("should successfully add event to favorites", async () => {
    const event = new EventModel({
      name: "Test Event",
      eventType: "Workshop",
      description: "Test",
      date: new Date("2030-01-01"),
      location: "GUC Cairo",
      startDate: new Date("2030-01-01"),
      endDate: new Date("2030-01-02"),
      registrationDeadline: new Date("2029-12-31"),
      fundingSource: "GUC",
    });
    await event.save();

    const user = new UserModel({
      firstName: "John",
      lastName: "Doe",
      email: "john@example.com",
      password: "password123",
      role: "Student",
      studentId: "STU001",
      status: "Active",
      verified: true,
    });
    await user.save();

    const result = await addEventToFavorites(
      user._id.toString(),
      event._id.toString()
    );

    expect(result.success).toBe(true);
    expect(result.message).toBe("Event added to favorites.");
    expect(result.data?.favorites).toContain(event._id.toString());

    const updatedUser = await UserModel.findById(user._id);
    expect(updatedUser?.favorites).toContain(event._id.toString());
  });

  it("should return success when event already in favorites", async () => {
    const event = new EventModel({
      name: "Test Event",
      eventType: "Workshop",
      description: "Test",
      date: new Date("2030-01-01"),
      location: "GUC Cairo",
      startDate: new Date("2030-01-01"),
      endDate: new Date("2030-01-02"),
      registrationDeadline: new Date("2029-12-31"),
      fundingSource: "GUC",
    });
    await event.save();

    const user = new UserModel({
      firstName: "John",
      lastName: "Doe",
      email: "john@example.com",
      password: "password123",
      role: "Student",
      studentId: "STU001",
      status: "Active",
      verified: true,
      favorites: [event._id.toString()],
    });
    await user.save();

    const result = await addEventToFavorites(
      user._id.toString(),
      event._id.toString()
    );

    expect(result.success).toBe(true);
    expect(result.message).toBe("Event already in favorites.");
    expect(result.data?.favorites).toContain(event._id.toString());
  });
});

describe("getFavoriteEvents", () => {
  it("should fail with invalid user ID", async () => {
    const result = await getFavoriteEvents("invalid-id");

    expect(result.success).toBe(false);
    expect(result.message).toBe("Invalid user identifier.");
    expect(result.statusCode).toBe(400);
  });

  it("should fail when user not found", async () => {
    const fakeId = new Types.ObjectId().toString();
    const result = await getFavoriteEvents(fakeId);

    expect(result.success).toBe(false);
    expect(result.message).toBe("User not found.");
    expect(result.statusCode).toBe(404);
  });

  it("should return empty array when user has no favorites", async () => {
    const user = new UserModel({
      firstName: "John",
      lastName: "Doe",
      email: "john@example.com",
      password: "password123",
      role: "Student",
      studentId: "STU001",
      status: "Active",
      verified: true,
    });
    await user.save();

    const result = await getFavoriteEvents(user._id.toString());

    expect(result.success).toBe(true);
    expect(result.message).toBe("Favorites retrieved successfully.");
    expect(result.data).toEqual([]);
  });

  it("should return favorite events in order", async () => {
    const event1 = new EventModel({
      name: "Event One",
      eventType: "Workshop",
      description: "First event",
      date: new Date("2030-01-01"),
      location: "GUC Cairo",
      startDate: new Date("2030-01-01"),
      endDate: new Date("2030-01-02"),
      registrationDeadline: new Date("2029-12-31"),
      fundingSource: "GUC",
      price: 100,
    });
    const event2 = new EventModel({
      name: "Event Two",
      eventType: "Seminar",
      description: "Second event",
      date: new Date("2030-02-01"),
      location: "GUC Berlin",
      startDate: new Date("2030-02-01"),
      endDate: new Date("2030-02-02"),
      registrationDeadline: new Date("2030-01-31"),
      fundingSource: "External",
    });
    await event1.save();
    await event2.save();

    const user = new UserModel({
      firstName: "John",
      lastName: "Doe",
      email: "john@example.com",
      password: "password123",
      role: "Student",
      studentId: "STU001",
      status: "Active",
      verified: true,
      favorites: [event1._id.toString(), event2._id.toString()],
    });
    await user.save();

    const result = await getFavoriteEvents(user._id.toString());

    expect(result.success).toBe(true);
    expect(result.data).toHaveLength(2);
    expect(result.data?.[0].name).toBe("Event One");
    expect(result.data?.[1].name).toBe("Event Two");
  });

  it("should return events with all required fields", async () => {
    const event = new EventModel({
      name: "Test Event",
      eventType: "Conference",
      description: "Test description",
      date: new Date("2030-01-01"),
      location: "GUC Cairo",
      startDate: new Date("2030-01-01"),
      endDate: new Date("2030-01-02"),
      registrationDeadline: new Date("2029-12-31"),
      fundingSource: "GUC",
      price: 150,
    });
    await event.save();

    const user = new UserModel({
      firstName: "John",
      lastName: "Doe",
      email: "john@example.com",
      password: "password123",
      role: "Student",
      studentId: "STU001",
      status: "Active",
      verified: true,
      favorites: [event._id.toString()],
    });
    await user.save();

    const result = await getFavoriteEvents(user._id.toString());

    expect(result.success).toBe(true);
    expect(result.data).toHaveLength(1);
    expect(result.data?.[0]).toHaveProperty("id");
    expect(result.data?.[0]).toHaveProperty("name");
    expect(result.data?.[0]).toHaveProperty("description");
    expect(result.data?.[0]).toHaveProperty("eventType");
    expect(result.data?.[0]).toHaveProperty("location");
    expect(result.data?.[0]).toHaveProperty("startDate");
    expect(result.data?.[0]).toHaveProperty("endDate");
    expect(result.data?.[0]).toHaveProperty("price");
    expect(result.data?.[0].price).toBe(150);
  });

  it("should skip deleted events from favorites", async () => {
    const event1 = new EventModel({
      name: "Existing Event",
      eventType: "Workshop",
      description: "Exists",
      date: new Date("2030-01-01"),
      location: "GUC Cairo",
      startDate: new Date("2030-01-01"),
      endDate: new Date("2030-01-02"),
      registrationDeadline: new Date("2029-12-31"),
      fundingSource: "GUC",
    });
    await event1.save();

    const deletedEventId = new Types.ObjectId().toString();

    const user = new UserModel({
      firstName: "John",
      lastName: "Doe",
      email: "john@example.com",
      password: "password123",
      role: "Student",
      studentId: "STU001",
      status: "Active",
      verified: true,
      favorites: [event1._id.toString(), deletedEventId],
    });
    await user.save();

    const result = await getFavoriteEvents(user._id.toString());

    expect(result.success).toBe(true);
    expect(result.data).toHaveLength(1);
    expect(result.data?.[0].name).toBe("Existing Event");
  });
});

describe("getProfessorNotifications", () => {
  it("should fail with invalid user ID", async () => {
    const result = await getProfessorNotifications("invalid-id");

    expect(result.success).toBe(false);
    expect(result.message).toBe("Invalid user ID.");
  });

  it("should fail when user not found", async () => {
    const fakeId = new Types.ObjectId().toString();
    const result = await getProfessorNotifications(fakeId);

    expect(result.success).toBe(false);
    expect(result.message).toBe("User not found.");
  });

  it("should return empty notifications when user has none", async () => {
    const user = new UserModel({
      firstName: "John",
      lastName: "Doe",
      email: "john@example.com",
      password: "password123",
      role: "Professor",
      staffId: "PROF001",
      status: "Active",
      verified: true,
    });
    await user.save();

    const result = await getProfessorNotifications(user._id.toString());

    expect(result.success).toBe(true);
    expect(result.message).toBe("Notifications retrieved successfully.");
    expect(result.data?.notifications).toEqual([]);
  });

  it("should return user notifications", async () => {
    const user = new UserModel({
      firstName: "John",
      lastName: "Doe",
      email: "john@example.com",
      password: "password123",
      role: "Professor",
      staffId: "PROF001",
      status: "Active",
      verified: true,
      notifications: [
        { message: "Notification 1", seen: false },
        { message: "Notification 2", seen: true },
      ],
    });
    await user.save();

    const result = await getProfessorNotifications(user._id.toString());

    expect(result.success).toBe(true);
    expect(result.data?.notifications).toHaveLength(2);
    expect(result.data?.notifications[0].message).toBe("Notification 1");
    expect(result.data?.notifications[0].seen).toBe(false);
    expect(result.data?.notifications[1].message).toBe("Notification 2");
    expect(result.data?.notifications[1].seen).toBe(true);
  });

  it("should work for all user roles", async () => {
    const student = new UserModel({
      firstName: "Student",
      lastName: "User",
      email: "student@example.com",
      password: "password123",
      role: "Student",
      studentId: "STU001",
      status: "Active",
      verified: true,
      notifications: [{ message: "Student notification", seen: false }],
    });
    await student.save();

    const result = await getProfessorNotifications(student._id.toString());

    expect(result.success).toBe(true);
    expect(result.data?.notifications).toHaveLength(1);
  });
});

describe("markNotificationsAsSeen", () => {
  it("should fail with invalid user ID", async () => {
    const result = await markNotificationsAsSeen("invalid-id");

    expect(result.success).toBe(false);
    expect(result.message).toBe("Invalid user ID.");
  });

  it("should fail when user not found", async () => {
    const fakeId = new Types.ObjectId().toString();
    const result = await markNotificationsAsSeen(fakeId);

    expect(result.success).toBe(false);
    expect(result.message).toBe("User not found.");
  });

  it("should mark all notifications as seen", async () => {
    const user = new UserModel({
      firstName: "John",
      lastName: "Doe",
      email: "john@example.com",
      password: "password123",
      role: "Professor",
      staffId: "PROF001",
      status: "Active",
      verified: true,
      notifications: [
        { message: "Notification 1", seen: false },
        { message: "Notification 2", seen: false },
        { message: "Notification 3", seen: true },
      ],
    });
    await user.save();

    const result = await markNotificationsAsSeen(user._id.toString());

    expect(result.success).toBe(true);
    expect(result.message).toBe("Notifications marked as seen.");

    const updatedUser = await UserModel.findById(user._id);
    expect(updatedUser?.notifications?.every((n) => n.seen === true)).toBe(
      true
    );
  });

  it("should handle user with no notifications", async () => {
    const user = new UserModel({
      firstName: "John",
      lastName: "Doe",
      email: "john@example.com",
      password: "password123",
      role: "Student",
      studentId: "STU001",
      status: "Active",
      verified: true,
    });
    await user.save();

    const result = await markNotificationsAsSeen(user._id.toString());

    expect(result.success).toBe(true);
    expect(result.message).toBe("Notifications marked as seen.");
  });

  it("should handle user with empty notifications array", async () => {
    const user = new UserModel({
      firstName: "John",
      lastName: "Doe",
      email: "john@example.com",
      password: "password123",
      role: "Student",
      studentId: "STU001",
      status: "Active",
      verified: true,
      notifications: [],
    });
    await user.save();

    const result = await markNotificationsAsSeen(user._id.toString());

    expect(result.success).toBe(true);
  });
});

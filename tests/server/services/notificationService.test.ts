import { MongoMemoryServer } from "mongodb-memory-server";
import mongoose, { Types } from "mongoose";
import AdminModel, { IAdmin } from "../../../server/models/Admin";
import EventModel from "../../../server/models/Event";
import UserModel, {
  IUser,
  userRole,
  userStatus,
} from "../../../server/models/User";
import {
  notifyAdminsOfPendingVendors,
  notifyUsersOfNewEvent,
  notifyUsersOfNewLoyaltyPartner,
  sendReminderNotifications,
  startReminderScheduler,
} from "../../../server/services/notificationService";

let mongoServer: MongoMemoryServer;

// Mock setInterval to prevent actual scheduling
const originalSetInterval = global.setInterval;
let mockIntervalId: NodeJS.Timeout | null = null;

beforeAll(async () => {
  process.env.ENCRYPTION_SALT_ROUNDS = "4";
  mongoServer = await MongoMemoryServer.create();
  const mongoUri = mongoServer.getUri();
  await mongoose.connect(mongoUri);

  // Mock setInterval
  global.setInterval = jest.fn((callback, delay) => {
    mockIntervalId = originalSetInterval(callback as () => void, delay);
    return mockIntervalId;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
  }) as any;
});

beforeEach(() => {
  jest.spyOn(console, "error").mockImplementation(() => undefined);
  jest.spyOn(console, "info").mockImplementation(() => undefined);
  jest.clearAllMocks();
});

afterAll(async () => {
  if (mockIntervalId) {
    clearInterval(mockIntervalId);
  }
  global.setInterval = originalSetInterval;
  await mongoose.disconnect();
  await mongoServer.stop();
});

afterEach(async () => {
  if (mockIntervalId) {
    clearInterval(mockIntervalId);
    mockIntervalId = null;
  }
  const collections = mongoose.connection.collections;
  for (const key in collections) {
    await collections[key].deleteMany({});
  }
  jest.restoreAllMocks();
});

describe("notifyUsersOfNewEvent", () => {
  let student: IUser & { _id: Types.ObjectId };
  let professor: IUser & { _id: Types.ObjectId };
  let staff: IUser & { _id: Types.ObjectId };
  let ta: IUser & { _id: Types.ObjectId };
  let eventOfficeAdmin: IAdmin & { _id: Types.ObjectId };
  let superAdmin: IAdmin & { _id: Types.ObjectId };

  beforeEach(async () => {
    const studentDoc = new UserModel({
      firstName: "John",
      lastName: "Student",
      email: "john@student.guc.edu.eg",
      password: "password123",
      role: userRole.STUDENT,
      studentId: "STU001",
      status: userStatus.ACTIVE,
      verified: true,
    });
    await studentDoc.save();
    student = studentDoc.toObject() as IUser & { _id: Types.ObjectId };
    student._id = studentDoc._id as Types.ObjectId;

    const professorDoc = new UserModel({
      firstName: "Jane",
      lastName: "Professor",
      email: "jane@professor.guc.edu.eg",
      password: "password123",
      role: userRole.PROFESSOR,
      staffId: "PROF001",
      status: userStatus.ACTIVE,
      verified: true,
    });
    await professorDoc.save();
    professor = professorDoc.toObject() as IUser & { _id: Types.ObjectId };
    professor._id = professorDoc._id as Types.ObjectId;

    const staffDoc = new UserModel({
      firstName: "Bob",
      lastName: "Staff",
      email: "bob@staff.guc.edu.eg",
      password: "password123",
      role: userRole.STAFF,
      staffId: "STAFF001",
      status: userStatus.ACTIVE,
      verified: true,
    });
    await staffDoc.save();
    staff = staffDoc.toObject() as IUser & { _id: Types.ObjectId };
    staff._id = staffDoc._id as Types.ObjectId;

    const taDoc = new UserModel({
      firstName: "Alice",
      lastName: "TA",
      email: "alice@ta.guc.edu.eg",
      password: "password123",
      role: userRole.TA,
      staffId: "TA001",
      status: userStatus.ACTIVE,
      verified: true,
    });
    await taDoc.save();
    ta = taDoc.toObject() as IUser & { _id: Types.ObjectId };
    ta._id = taDoc._id as Types.ObjectId;

    const eventOfficeAdminDoc = new AdminModel({
      firstName: "Event",
      lastName: "Office",
      email: "events@guc.edu.eg",
      password: "password123",
      adminType: "EventOffice",
      status: "Active",
    });
    await eventOfficeAdminDoc.save();
    eventOfficeAdmin = eventOfficeAdminDoc.toObject() as IAdmin & {
      _id: Types.ObjectId;
    };
    eventOfficeAdmin._id = eventOfficeAdminDoc._id as Types.ObjectId;

    const superAdminDoc = new AdminModel({
      firstName: "Super",
      lastName: "Admin",
      email: "admin@guc.edu.eg",
      password: "password123",
      adminType: "Admin",
      status: "Active",
    });
    await superAdminDoc.save();
    superAdmin = superAdminDoc.toObject() as IAdmin & { _id: Types.ObjectId };
    superAdmin._id = superAdminDoc._id as Types.ObjectId;
  });

  it("should notify all target user roles of new event", async () => {
    const event = {
      name: "Tech Conference 2025",
      eventType: "Conference",
      startDate: new Date("2025-12-01T10:00:00Z"),
    };

    await notifyUsersOfNewEvent(event);

    const updatedStudent = await UserModel.findById(student._id);
    const updatedProfessor = await UserModel.findById(professor._id);
    const updatedStaff = await UserModel.findById(staff._id);
    const updatedTA = await UserModel.findById(ta._id);

    expect(updatedStudent?.notifications).toHaveLength(1);
    expect(updatedProfessor?.notifications).toHaveLength(1);
    expect(updatedStaff?.notifications).toHaveLength(1);
    expect(updatedTA?.notifications).toHaveLength(1);

    expect(updatedStudent?.notifications?.[0].message).toContain(
      "Tech Conference 2025"
    );
    expect(updatedStudent?.notifications?.[0].message).toContain("Conference");
    expect(updatedStudent?.notifications?.[0].seen).toBe(false);
  });

  it("should notify event office admins of new event", async () => {
    const event = {
      name: "Workshop Series",
      eventType: "Workshop",
      startDate: new Date("2025-11-25T14:00:00Z"),
    };

    await notifyUsersOfNewEvent(event);

    const updatedEventOffice = await AdminModel.findById(eventOfficeAdmin._id);
    const updatedSuperAdmin = await AdminModel.findById(superAdmin._id);

    expect(updatedEventOffice?.notifications).toHaveLength(1);
    expect(updatedEventOffice?.notifications?.[0].message).toContain(
      "Workshop Series"
    );
    expect(updatedSuperAdmin?.notifications).toHaveLength(0);
  });

  it("should format event date in notification message", async () => {
    const event = {
      name: "Annual Gala",
      eventType: "Social",
      startDate: new Date("2025-12-31T20:00:00Z"),
    };

    await notifyUsersOfNewEvent(event);

    const updatedStudent = await UserModel.findById(student._id);

    expect(updatedStudent?.notifications?.[0].message).toContain("Annual Gala");
    expect(updatedStudent?.notifications?.[0].message).toContain("Social");
    expect(updatedStudent?.notifications?.[0].message).toMatch(
      /Dec \d{1,2}, 2025/
    );
  });

  it("should handle startDate as string", async () => {
    const event = {
      name: "String Date Event",
      eventType: "Seminar",
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      startDate: "2025-12-15T09:00:00Z" as any,
    };

    await notifyUsersOfNewEvent(event);

    const updatedStudent = await UserModel.findById(student._id);
    expect(updatedStudent?.notifications).toHaveLength(1);
    expect(updatedStudent?.notifications?.[0].message).toContain(
      "String Date Event"
    );
  });

  it("should not fail when no users exist", async () => {
    await UserModel.deleteMany({});
    await AdminModel.deleteMany({});

    const event = {
      name: "Empty Event",
      eventType: "Workshop",
      startDate: new Date("2025-12-01T10:00:00Z"),
    };

    await expect(notifyUsersOfNewEvent(event)).resolves.not.toThrow();
  });

  it("should handle errors gracefully", async () => {
    await mongoose.connection.close();

    const event = {
      name: "Error Event",
      eventType: "Conference",
      startDate: new Date("2025-12-01T10:00:00Z"),
    };

    await notifyUsersOfNewEvent(event);

    expect(console.error).toHaveBeenCalledWith(
      "Failed to send new event notification:",
      expect.any(Error)
    );

    await mongoose.connect(mongoServer.getUri());
  });

  it("should set notification as unseen by default", async () => {
    const event = {
      name: "Test Event",
      eventType: "Test",
      startDate: new Date("2025-12-01T10:00:00Z"),
    };

    await notifyUsersOfNewEvent(event);

    const updatedStudent = await UserModel.findById(student._id);
    expect(updatedStudent?.notifications?.[0].seen).toBe(false);
  });

  it("should set createdAt timestamp", async () => {
    const before = new Date();

    const event = {
      name: "Timestamp Test",
      eventType: "Test",
      startDate: new Date("2025-12-01T10:00:00Z"),
    };

    await notifyUsersOfNewEvent(event);

    const after = new Date();
    const updatedStudent = await UserModel.findById(student._id);
    const createdAt = updatedStudent?.notifications?.[0].createdAt;

    expect(createdAt).toBeDefined();
    expect(createdAt!.getTime()).toBeGreaterThanOrEqual(before.getTime());
    expect(createdAt!.getTime()).toBeLessThanOrEqual(after.getTime());
  });
});

describe("notifyUsersOfNewLoyaltyPartner", () => {
  let student: IUser & { _id: Types.ObjectId };
  let professor: IUser & { _id: Types.ObjectId };

  beforeEach(async () => {
    const studentDoc = new UserModel({
      firstName: "John",
      lastName: "Student",
      email: "john@student.guc.edu.eg",
      password: "password123",
      role: userRole.STUDENT,
      studentId: "STU001",
      status: userStatus.ACTIVE,
      verified: true,
    });
    await studentDoc.save();
    student = studentDoc.toObject() as IUser & { _id: Types.ObjectId };
    student._id = studentDoc._id as Types.ObjectId;

    const professorDoc = new UserModel({
      firstName: "Jane",
      lastName: "Professor",
      email: "jane@professor.guc.edu.eg",
      password: "password123",
      role: userRole.PROFESSOR,
      staffId: "PROF001",
      status: userStatus.ACTIVE,
      verified: true,
    });
    await professorDoc.save();
    professor = professorDoc.toObject() as IUser & { _id: Types.ObjectId };
    professor._id = professorDoc._id as Types.ObjectId;
  });

  it("should notify users of new loyalty partner", async () => {
    const options = {
      companyName: "Coffee Shop",
      discountRate: 15.5,
      promoCode: "COFFEE15",
    };

    await notifyUsersOfNewLoyaltyPartner(options);

    const updatedStudent = await UserModel.findById(student._id);
    const updatedProfessor = await UserModel.findById(professor._id);

    expect(updatedStudent?.notifications).toHaveLength(1);
    expect(updatedProfessor?.notifications).toHaveLength(1);

    expect(updatedStudent?.notifications?.[0].message).toContain("Coffee Shop");
    expect(updatedStudent?.notifications?.[0].message).toContain("15.50%");
    expect(updatedStudent?.notifications?.[0].message).toContain("COFFEE15");
  });

  it("should format discount rate with two decimal places", async () => {
    const options = {
      companyName: "Restaurant",
      discountRate: 20,
      promoCode: "FOOD20",
    };

    await notifyUsersOfNewLoyaltyPartner(options);

    const updatedStudent = await UserModel.findById(student._id);
    expect(updatedStudent?.notifications?.[0].message).toContain("20.00%");
  });

  it("should handle decimal discount rates", async () => {
    const options = {
      companyName: "Gym Membership",
      discountRate: 12.75,
      promoCode: "GYM12",
    };

    await notifyUsersOfNewLoyaltyPartner(options);

    const updatedStudent = await UserModel.findById(student._id);
    expect(updatedStudent?.notifications?.[0].message).toContain("12.75%");
  });

  it("should notify all target user roles", async () => {
    const staffDoc = new UserModel({
      firstName: "Bob",
      lastName: "Staff",
      email: "bob@staff.guc.edu.eg",
      password: "password123",
      role: userRole.STAFF,
      staffId: "STAFF001",
      status: userStatus.ACTIVE,
      verified: true,
    });
    await staffDoc.save();

    const taDoc = new UserModel({
      firstName: "Alice",
      lastName: "TA",
      email: "alice@ta.guc.edu.eg",
      password: "password123",
      role: userRole.TA,
      staffId: "TA001",
      status: userStatus.ACTIVE,
      verified: true,
    });
    await taDoc.save();

    const options = {
      companyName: "Book Store",
      discountRate: 25,
      promoCode: "BOOKS25",
    };

    await notifyUsersOfNewLoyaltyPartner(options);

    const updatedStaff = await UserModel.findById(staffDoc._id);
    const updatedTA = await UserModel.findById(taDoc._id);

    expect(updatedStaff?.notifications).toHaveLength(1);
    expect(updatedTA?.notifications).toHaveLength(1);
  });

  it("should not notify admins", async () => {
    const adminDoc = new AdminModel({
      firstName: "Admin",
      lastName: "User",
      email: "admin@guc.edu.eg",
      password: "password123",
      adminType: "Admin",
      status: "Active",
    });
    await adminDoc.save();

    const options = {
      companyName: "Store",
      discountRate: 10,
      promoCode: "SAVE10",
    };

    await notifyUsersOfNewLoyaltyPartner(options);

    const updatedAdmin = await AdminModel.findById(adminDoc._id);
    expect(updatedAdmin?.notifications).toHaveLength(0);
  });

  it("should handle errors gracefully", async () => {
    await mongoose.connection.close();

    const options = {
      companyName: "Error Store",
      discountRate: 10,
      promoCode: "ERROR10",
    };

    await notifyUsersOfNewLoyaltyPartner(options);

    expect(console.error).toHaveBeenCalledWith(
      "Failed to send loyalty partner notification:",
      expect.any(Error)
    );

    await mongoose.connect(mongoServer.getUri());
  });

  it("should set notification as unseen", async () => {
    const options = {
      companyName: "Test Store",
      discountRate: 5,
      promoCode: "TEST5",
    };

    await notifyUsersOfNewLoyaltyPartner(options);

    const updatedStudent = await UserModel.findById(student._id);
    expect(updatedStudent?.notifications?.[0].seen).toBe(false);
  });
});

describe("notifyAdminsOfPendingVendors", () => {
  let eventOfficeAdmin: IAdmin & { _id: Types.ObjectId };
  let superAdmin: IAdmin & { _id: Types.ObjectId };

  beforeEach(async () => {
    const eventOfficeAdminDoc = new AdminModel({
      firstName: "Event",
      lastName: "Office",
      email: "events@guc.edu.eg",
      password: "password123",
      adminType: "EventOffice",
      status: "Active",
    });
    await eventOfficeAdminDoc.save();
    eventOfficeAdmin = eventOfficeAdminDoc.toObject() as IAdmin & {
      _id: Types.ObjectId;
    };
    eventOfficeAdmin._id = eventOfficeAdminDoc._id as Types.ObjectId;

    const superAdminDoc = new AdminModel({
      firstName: "Super",
      lastName: "Admin",
      email: "admin@guc.edu.eg",
      password: "password123",
      adminType: "Admin",
      status: "Active",
    });
    await superAdminDoc.save();
    superAdmin = superAdminDoc.toObject() as IAdmin & { _id: Types.ObjectId };
    superAdmin._id = superAdminDoc._id as Types.ObjectId;
  });

  it("should notify admins of single pending vendor", async () => {
    await notifyAdminsOfPendingVendors(1);

    const updatedEventOffice = await AdminModel.findById(eventOfficeAdmin._id);
    const updatedSuperAdmin = await AdminModel.findById(superAdmin._id);

    expect(updatedEventOffice?.notifications).toHaveLength(1);
    expect(updatedSuperAdmin?.notifications).toHaveLength(1);

    expect(updatedEventOffice?.notifications?.[0].message).toBe(
      "There is 1 vendor request waiting for review."
    );
  });

  it("should notify admins of multiple pending vendors", async () => {
    await notifyAdminsOfPendingVendors(5);

    const updatedEventOffice = await AdminModel.findById(eventOfficeAdmin._id);

    expect(updatedEventOffice?.notifications).toHaveLength(1);
    expect(updatedEventOffice?.notifications?.[0].message).toBe(
      "There are 5 vendor requests waiting for review."
    );
  });

  it("should notify both EventOffice and Admin types", async () => {
    await notifyAdminsOfPendingVendors(3);

    const updatedEventOffice = await AdminModel.findById(eventOfficeAdmin._id);
    const updatedSuperAdmin = await AdminModel.findById(superAdmin._id);

    expect(updatedEventOffice?.notifications).toHaveLength(1);
    expect(updatedSuperAdmin?.notifications).toHaveLength(1);
  });

  it("should handle large numbers correctly", async () => {
    await notifyAdminsOfPendingVendors(100);

    const updatedEventOffice = await AdminModel.findById(eventOfficeAdmin._id);
    expect(updatedEventOffice?.notifications?.[0].message).toBe(
      "There are 100 vendor requests waiting for review."
    );
  });

  it("should handle zero pending vendors with singular message", async () => {
    await notifyAdminsOfPendingVendors(0);

    const updatedEventOffice = await AdminModel.findById(eventOfficeAdmin._id);
    expect(updatedEventOffice?.notifications?.[0].message).toContain(
      "There are 0"
    );
  });

  it("should not notify regular users", async () => {
    const studentDoc = new UserModel({
      firstName: "John",
      lastName: "Student",
      email: "john@student.guc.edu.eg",
      password: "password123",
      role: userRole.STUDENT,
      studentId: "STU001",
      status: userStatus.ACTIVE,
      verified: true,
    });
    await studentDoc.save();

    await notifyAdminsOfPendingVendors(2);

    const updatedStudent = await UserModel.findById(studentDoc._id);
    expect(updatedStudent?.notifications).toHaveLength(0);
  });

  it("should handle errors gracefully", async () => {
    await mongoose.connection.close();

    await notifyAdminsOfPendingVendors(5);

    expect(console.error).toHaveBeenCalledWith(
      "Failed to send pending vendor notification:",
      expect.any(Error)
    );

    await mongoose.connect(mongoServer.getUri());
  });

  it("should set notification as unseen", async () => {
    await notifyAdminsOfPendingVendors(1);

    const updatedEventOffice = await AdminModel.findById(eventOfficeAdmin._id);
    expect(updatedEventOffice?.notifications?.[0].seen).toBe(false);
  });
});

describe("sendReminderNotifications", () => {
  let student1: IUser & { _id: Types.ObjectId };
  let student2: IUser & { _id: Types.ObjectId };

  beforeEach(async () => {
    const student1Doc = new UserModel({
      firstName: "John",
      lastName: "Student",
      email: "john@student.guc.edu.eg",
      password: "password123",
      role: userRole.STUDENT,
      studentId: "STU001",
      status: userStatus.ACTIVE,
      verified: true,
    });
    await student1Doc.save();
    student1 = student1Doc.toObject() as IUser & { _id: Types.ObjectId };
    student1._id = student1Doc._id as Types.ObjectId;

    const student2Doc = new UserModel({
      firstName: "Jane",
      lastName: "Student",
      email: "jane@student.guc.edu.eg",
      password: "password123",
      role: userRole.STUDENT,
      studentId: "STU002",
      status: userStatus.ACTIVE,
      verified: true,
    });
    await student2Doc.save();
    student2 = student2Doc.toObject() as IUser & { _id: Types.ObjectId };
    student2._id = student2Doc._id as Types.ObjectId;
  });

  it("should send 1-day reminder for event starting in 24 hours", async () => {
    const now = new Date();
    const startDate = new Date(now.getTime() + 24 * 60 * 60 * 1000); // 24 hours from now

    await EventModel.create({
      name: "Upcoming Event",
      eventType: "Conference",
      description: "Test event",
      date: startDate,
      location: "GUC Cairo",
      startDate,
      endDate: new Date(startDate.getTime() + 2 * 60 * 60 * 1000),
      registrationDeadline: now,
      fundingSource: "GUC",
      registeredUsers: [student1._id.toString()],
      archived: false,
    });

    await sendReminderNotifications();

    const updatedStudent1 = await UserModel.findById(student1._id);
    expect(updatedStudent1?.notifications?.length).toBeGreaterThan(0);

    const dayReminder = updatedStudent1?.notifications?.find((n) =>
      n.message.includes("within 1 day")
    );
    expect(dayReminder).toBeDefined();
    expect(dayReminder?.message).toContain("Upcoming Event");
  });

  it("should send 1-hour reminder for event starting in 1 hour", async () => {
    const now = new Date();
    const startDate = new Date(now.getTime() + 60 * 60 * 1000); // 1 hour from now

    await EventModel.create({
      name: "Imminent Event",
      eventType: "Workshop",
      description: "Test event",
      date: startDate,
      location: "GUC Cairo",
      startDate,
      endDate: new Date(startDate.getTime() + 2 * 60 * 60 * 1000),
      registrationDeadline: now,
      fundingSource: "GUC",
      registeredUsers: [student1._id.toString()],
      archived: false,
    });

    await sendReminderNotifications();

    const updatedStudent1 = await UserModel.findById(student1._id);

    const hourReminder = updatedStudent1?.notifications?.find((n) =>
      n.message.includes("within 1 hour")
    );
    expect(hourReminder).toBeDefined();
    expect(hourReminder?.message).toContain("Imminent Event");
  });

  it("should not send reminder for events without registered users", async () => {
    const now = new Date();
    const startDate = new Date(now.getTime() + 24 * 60 * 60 * 1000);

    await EventModel.create({
      name: "Empty Event",
      eventType: "Conference",
      description: "Test event",
      date: startDate,
      location: "GUC Cairo",
      startDate,
      endDate: new Date(startDate.getTime() + 2 * 60 * 60 * 1000),
      registrationDeadline: now,
      fundingSource: "GUC",
      registeredUsers: [],
      archived: false,
    });

    await sendReminderNotifications();

    const updatedStudent1 = await UserModel.findById(student1._id);
    expect(updatedStudent1?.notifications).toHaveLength(0);
  });

  it("should not send reminder for archived events", async () => {
    const now = new Date();
    const startDate = new Date(now.getTime() + 24 * 60 * 60 * 1000);

    await EventModel.create({
      name: "Archived Event",
      eventType: "Conference",
      description: "Test event",
      date: startDate,
      location: "GUC Cairo",
      startDate,
      endDate: new Date(startDate.getTime() + 2 * 60 * 60 * 1000),
      registrationDeadline: now,
      fundingSource: "GUC",
      registeredUsers: [student1._id.toString()],
      archived: true,
    });

    await sendReminderNotifications();

    const updatedStudent1 = await UserModel.findById(student1._id);
    expect(updatedStudent1?.notifications).toHaveLength(0);
  });

  it("should not send reminder for past events", async () => {
    const now = new Date();
    const startDate = new Date(now.getTime() - 2 * 60 * 60 * 1000); // 2 hours ago

    await EventModel.create({
      name: "Past Event",
      eventType: "Conference",
      description: "Test event",
      date: startDate,
      location: "GUC Cairo",
      startDate,
      endDate: new Date(startDate.getTime() + 2 * 60 * 60 * 1000),
      registrationDeadline: new Date(now.getTime() - 48 * 60 * 60 * 1000),
      fundingSource: "GUC",
      registeredUsers: [student1._id.toString()],
      archived: false,
    });

    await sendReminderNotifications();

    const updatedStudent1 = await UserModel.findById(student1._id);
    expect(updatedStudent1?.notifications).toHaveLength(0);
  });

  it("should not send reminder for events too far in the future", async () => {
    const now = new Date();
    const startDate = new Date(now.getTime() + 48 * 60 * 60 * 1000); // 2 days from now

    await EventModel.create({
      name: "Future Event",
      eventType: "Conference",
      description: "Test event",
      date: startDate,
      location: "GUC Cairo",
      startDate,
      endDate: new Date(startDate.getTime() + 2 * 60 * 60 * 1000),
      registrationDeadline: now,
      fundingSource: "GUC",
      registeredUsers: [student1._id.toString()],
      archived: false,
    });

    await sendReminderNotifications();

    const updatedStudent1 = await UserModel.findById(student1._id);
    expect(updatedStudent1?.notifications).toHaveLength(0);
  });

  it("should notify only registered users", async () => {
    const now = new Date();
    const startDate = new Date(now.getTime() + 24 * 60 * 60 * 1000);

    await EventModel.create({
      name: "Selective Event",
      eventType: "Workshop",
      description: "Test event",
      date: startDate,
      location: "GUC Cairo",
      startDate,
      endDate: new Date(startDate.getTime() + 2 * 60 * 60 * 1000),
      registrationDeadline: now,
      fundingSource: "GUC",
      registeredUsers: [student1._id.toString()],
      archived: false,
    });

    await sendReminderNotifications();

    const updatedStudent1 = await UserModel.findById(student1._id);
    const updatedStudent2 = await UserModel.findById(student2._id);

    expect(updatedStudent1?.notifications?.length).toBeGreaterThan(0);
    expect(updatedStudent2?.notifications).toHaveLength(0);
  });

  it("should notify multiple registered users", async () => {
    const now = new Date();
    const startDate = new Date(now.getTime() + 24 * 60 * 60 * 1000);

    await EventModel.create({
      name: "Group Event",
      eventType: "Conference",
      description: "Test event",
      date: startDate,
      location: "GUC Cairo",
      startDate,
      endDate: new Date(startDate.getTime() + 2 * 60 * 60 * 1000),
      registrationDeadline: now,
      fundingSource: "GUC",
      registeredUsers: [student1._id.toString(), student2._id.toString()],
      archived: false,
    });

    await sendReminderNotifications();

    const updatedStudent1 = await UserModel.findById(student1._id);
    const updatedStudent2 = await UserModel.findById(student2._id);

    expect(updatedStudent1?.notifications?.length).toBeGreaterThan(0);
    expect(updatedStudent2?.notifications?.length).toBeGreaterThan(0);
  });

  it("should handle invalid user IDs gracefully", async () => {
    const now = new Date();
    const startDate = new Date(now.getTime() + 24 * 60 * 60 * 1000);

    await EventModel.create({
      name: "Invalid Users Event",
      eventType: "Conference",
      description: "Test event",
      date: startDate,
      location: "GUC Cairo",
      startDate,
      endDate: new Date(startDate.getTime() + 2 * 60 * 60 * 1000),
      registrationDeadline: now,
      fundingSource: "GUC",
      registeredUsers: ["invalid-id", student1._id.toString()],
      archived: false,
    });

    await sendReminderNotifications();

    // Should not throw error and should still notify valid user
    const updatedStudent1 = await UserModel.findById(student1._id);
    expect(updatedStudent1?.notifications?.length).toBeGreaterThan(0);
  });

  //   it("should handle blocked users appropriately", async () => {
  //     student1 = (await UserModel.findByIdAndUpdate(
  //       student1._id,
  //       { status: userStatus.BLOCKED },
  //       { new: true }
  //       // eslint-disable-next-line @typescript-eslint/no-explicit-any
  //     )) as any;

  //     const now = new Date();
  //     const startDate = new Date(now.getTime() + 24 * 60 * 60 * 1000);

  //     await EventModel.create({
  //       name: "Blocked User Event",
  //       eventType: "Conference",
  //       description: "Test event",
  //       date: startDate,
  //       location: "GUC Cairo",
  //       startDate,
  //       endDate: new Date(startDate.getTime() + 2 * 60 * 60 * 1000),
  //       registrationDeadline: now,
  //       fundingSource: "GUC",
  //       registeredUsers: [student1._id.toString()],
  //       archived: false,
  //     });

  //     await sendReminderNotifications();

  //     // Blocked users should not receive notifications
  //     const updatedStudent1 = await UserModel.findById(student1._id);
  //     expect(updatedStudent1?.notifications).toHaveLength(0);
  //   });

  it("should handle errors gracefully", async () => {
    await mongoose.connection.close();

    await sendReminderNotifications();

    expect(console.error).toHaveBeenCalledWith(
      "Failed to send reminder notifications:",
      expect.any(Error)
    );

    await mongoose.connect(mongoServer.getUri());
  });

  it("should handle multiple events correctly", async () => {
    const now = new Date();
    const startDate1 = new Date(now.getTime() + 24 * 60 * 60 * 1000);
    const startDate2 = new Date(now.getTime() + 60 * 60 * 1000);

    await EventModel.create({
      name: "Event 1",
      eventType: "Conference",
      description: "Test event 1",
      date: startDate1,
      location: "GUC Cairo",
      startDate: startDate1,
      endDate: new Date(startDate1.getTime() + 2 * 60 * 60 * 1000),
      registrationDeadline: now,
      fundingSource: "GUC",
      registeredUsers: [student1._id.toString()],
      archived: false,
    });

    await EventModel.create({
      name: "Event 2",
      eventType: "Workshop",
      description: "Test event 2",
      date: startDate2,
      location: "GUC Cairo",
      startDate: startDate2,
      endDate: new Date(startDate2.getTime() + 2 * 60 * 60 * 1000),
      registrationDeadline: now,
      fundingSource: "GUC",
      registeredUsers: [student1._id.toString()],
      archived: false,
    });

    await sendReminderNotifications();

    const updatedStudent1 = await UserModel.findById(student1._id);

    // Should have notifications from both events
    expect(updatedStudent1?.notifications?.length).toBeGreaterThan(0);
    const event1Notif = updatedStudent1?.notifications?.find((n) =>
      n.message.includes("Event 1")
    );
    const event2Notif = updatedStudent1?.notifications?.find((n) =>
      n.message.includes("Event 2")
    );

    expect(event1Notif).toBeDefined();
    expect(event2Notif).toBeDefined();
  });
});

describe("startReminderScheduler", () => {
  it("should start the reminder scheduler", () => {
    startReminderScheduler();

    expect(global.setInterval).toHaveBeenCalled();
    const callArgs = (global.setInterval as jest.Mock).mock.calls[0];
    expect(callArgs[1]).toBe(5 * 60 * 1000); // 5 minutes
  });

  it("should not start scheduler twice", () => {
    (global.setInterval as jest.Mock).mockClear();

    startReminderScheduler();
    const firstCallCount = (global.setInterval as jest.Mock).mock.calls.length;

    startReminderScheduler();
    const secondCallCount = (global.setInterval as jest.Mock).mock.calls.length;

    expect(secondCallCount).toBe(firstCallCount);
  });

  //   it("should execute tick function", async () => {
  //     const now = new Date();
  //     const startDate = new Date(now.getTime() + 24 * 60 * 60 * 1000);

  //     const studentDoc = new UserModel({
  //       firstName: "Test",
  //       lastName: "User",
  //       email: "test@guc.edu.eg",
  //       password: "password123",
  //       role: userRole.STUDENT,
  //       studentId: "STU001",
  //       status: userStatus.ACTIVE,
  //       verified: true,
  //     });
  //     await studentDoc.save();

  //     await EventModel.create({
  //       name: "Scheduler Test Event",
  //       eventType: "Conference",
  //       description: "Test event",
  //       date: startDate,
  //       location: "GUC Cairo",
  //       startDate,
  //       endDate: new Date(startDate.getTime() + 2 * 60 * 60 * 1000),
  //       registrationDeadline: now,
  //       fundingSource: "GUC",
  //       registeredUsers: [studentDoc._id.toString()],
  //       archived: false,
  //     });

  //     startReminderScheduler();

  //     // Wait for initial tick
  //     await new Promise((resolve) => setTimeout(resolve, 100));

  //     const updatedStudent = await UserModel.findById(studentDoc._id);
  //     expect(updatedStudent?.notifications?.length).toBeGreaterThan(0);
  //   });
});

describe("Notification Service - Edge Cases and Integration", () => {
  it("should handle multiple notifications for same user", async () => {
    const studentDoc = new UserModel({
      firstName: "Multi",
      lastName: "Notification",
      email: "multi@guc.edu.eg",
      password: "password123",
      role: userRole.STUDENT,
      studentId: "STU001",
      status: userStatus.ACTIVE,
      verified: true,
    });
    await studentDoc.save();

    // Add event notification
    await notifyUsersOfNewEvent({
      name: "Event 1",
      eventType: "Conference",
      startDate: new Date("2025-12-01"),
    });

    // Add loyalty partner notification
    await notifyUsersOfNewLoyaltyPartner({
      companyName: "Store",
      discountRate: 10,
      promoCode: "SAVE10",
    });

    const updatedStudent = await UserModel.findById(studentDoc._id);
    expect(updatedStudent?.notifications).toHaveLength(2);
  });

  it("should preserve existing notifications when adding new ones", async () => {
    const studentDoc = new UserModel({
      firstName: "Preserve",
      lastName: "Test",
      email: "preserve@guc.edu.eg",
      password: "password123",
      role: userRole.STUDENT,
      studentId: "STU001",
      status: userStatus.ACTIVE,
      verified: true,
      notifications: [
        {
          message: "Existing notification",
          seen: true,
          createdAt: new Date(),
        },
      ],
    });
    await studentDoc.save();

    await notifyUsersOfNewEvent({
      name: "New Event",
      eventType: "Workshop",
      startDate: new Date("2025-12-15"),
    });

    const updatedStudent = await UserModel.findById(studentDoc._id);
    expect(updatedStudent?.notifications).toHaveLength(2);
    expect(updatedStudent?.notifications?.[0].message).toBe(
      "Existing notification"
    );
    expect(updatedStudent?.notifications?.[0].seen).toBe(true);
  });

  it("should handle event reminders at exact boundaries", async () => {
    const now = new Date();
    // Exactly 24 hours from now
    const startDate = new Date(now.getTime() + 24 * 60 * 60 * 1000);

    const studentDoc = new UserModel({
      firstName: "Boundary",
      lastName: "Test",
      email: "boundary@guc.edu.eg",
      password: "password123",
      role: userRole.STUDENT,
      studentId: "STU001",
      status: userStatus.ACTIVE,
      verified: true,
    });
    await studentDoc.save();

    await EventModel.create({
      name: "Boundary Event",
      eventType: "Conference",
      description: "Test event",
      date: startDate,
      location: "GUC Cairo",
      startDate,
      endDate: new Date(startDate.getTime() + 2 * 60 * 60 * 1000),
      registrationDeadline: now,
      fundingSource: "GUC",
      registeredUsers: [studentDoc._id.toString()],
      archived: false,
    });

    await sendReminderNotifications();

    const updatedStudent = await UserModel.findById(studentDoc._id);
    expect(updatedStudent?.notifications?.length).toBeGreaterThan(0);
  });
});

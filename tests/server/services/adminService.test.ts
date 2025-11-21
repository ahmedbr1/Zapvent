import { MongoMemoryServer } from "mongodb-memory-server";
import mongoose from "mongoose";
import AdminModel from "../../../server/models/Admin";
import UserModel from "../../../server/models/User";
import {
  approveUser,
  rejectUser,
  createAdmin,
  findAll,
  findById,
  findByEmail,
  updateAdminStatus,
  deleteAdmin,
  blockUser,
  viewAllUsers,
  findAllEventsOffice,
  findAllAdmins,
  updateAdmin,
  blockAdminAccount,
  unblockAdminAccount,
  getEventOfficeNotifications,
  markEventOfficeNotificationsSeen,
  CreateAdminData,
} from "../../../server/services/adminService";
import { emailService } from "../../../server/services/emailService";

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

describe("approveUser", () => {
  const validProfessorData = {
    firstName: "John",
    lastName: "Doe",
    email: "john.professor@example.com",
    password: "password123",
    role: "Professor",
    staffId: "STAFF001",
    status: "Active",
    verified: false,
  };

  it("should successfully approve an unverified professor", async () => {
    jest.spyOn(emailService, "sendApprovalEmail").mockResolvedValue(undefined);

    const user = new UserModel(validProfessorData);
    await user.save();
    const userId = user._id.toString();

    const result = await approveUser(userId);

    expect(result.message).toBe(
      "User approved successfully and notification email sent"
    );
    expect(result.user.verified).toBe(true);
    expect(result.user.email).toBe(validProfessorData.email);
    expect(result.user.firstName).toBe(validProfessorData.firstName);
    expect(result.user.lastName).toBe(validProfessorData.lastName);
    expect(result.user.role).toBe(validProfessorData.role);

    const updatedUser = await UserModel.findById(userId);
    expect(updatedUser?.verified).toBe(true);
    expect(emailService.sendApprovalEmail).toHaveBeenCalledWith(
      expect.objectContaining({
        email: validProfessorData.email,
      })
    );
  });

  it("should fail with invalid user ID format", async () => {
    await expect(approveUser("invalid-id")).rejects.toThrow(
      "Invalid user ID format"
    );
  });

  it("should fail when user is not found", async () => {
    const fakeId = new mongoose.Types.ObjectId().toString();
    await expect(approveUser(fakeId)).rejects.toThrow("User not found");
  });

  it("should fail when user is already verified", async () => {
    const user = new UserModel({ ...validProfessorData, verified: true });
    await user.save();
    const userId = user._id.toString();

    await expect(approveUser(userId)).rejects.toThrow(
      "User is already verified"
    );
  });

  it("should fail when trying to approve a student", async () => {
    const studentData = {
      firstName: "Jane",
      lastName: "Student",
      email: "jane.student@example.com",
      password: "password123",
      role: "Student",
      studentId: "STU001",
      status: "Active",
      verified: false,
    };
    const user = new UserModel(studentData);
    await user.save();
    const userId = user._id.toString();

    await expect(approveUser(userId)).rejects.toThrow(
      "Students are auto-verified and do not need admin approval"
    );
  });

  it("should approve TA successfully", async () => {
    jest.spyOn(emailService, "sendApprovalEmail").mockResolvedValue(undefined);

    const taData = {
      firstName: "Teaching",
      lastName: "Assistant",
      email: "ta@example.com",
      password: "password123",
      role: "TA",
      staffId: "TA001",
      status: "Active",
      verified: false,
    };
    const user = new UserModel(taData);
    await user.save();
    const userId = user._id.toString();

    const result = await approveUser(userId);

    expect(result.user.verified).toBe(true);
    const updatedUser = await UserModel.findById(userId);
    expect(updatedUser?.verified).toBe(true);
  });

  it("should approve Staff successfully", async () => {
    jest.spyOn(emailService, "sendApprovalEmail").mockResolvedValue(undefined);

    const staffData = {
      firstName: "Staff",
      lastName: "Member",
      email: "staff@example.com",
      password: "password123",
      role: "Staff",
      staffId: "STAFF002",
      status: "Active",
      verified: false,
    };
    const user = new UserModel(staffData);
    await user.save();
    const userId = user._id.toString();

    const result = await approveUser(userId);

    expect(result.user.verified).toBe(true);
    const updatedUser = await UserModel.findById(userId);
    expect(updatedUser?.verified).toBe(true);
  });
});

describe("rejectUser", () => {
  const validProfessorData = {
    firstName: "John",
    lastName: "Doe",
    email: "john.professor@example.com",
    password: "password123",
    role: "Professor",
    staffId: "STAFF001",
    status: "Active",
    verified: false,
  };

  it("should successfully reject an unverified user with reason", async () => {
    jest.spyOn(emailService, "sendRejectionEmail").mockResolvedValue(undefined);

    const user = new UserModel(validProfessorData);
    await user.save();
    const userId = user._id.toString();

    const reason = "Invalid credentials";
    const result = await rejectUser(userId, reason);

    expect(result.message).toBe("User rejected and notified successfully");
    expect(result.user.email).toBe(validProfessorData.email);
    expect(result.user.firstName).toBe(validProfessorData.firstName);
    expect(result.user.lastName).toBe(validProfessorData.lastName);
    expect(result.user.role).toBe(validProfessorData.role);

    expect(emailService.sendRejectionEmail).toHaveBeenCalledWith(
      expect.objectContaining({
        email: validProfessorData.email,
      }),
      reason
    );
  });

  it("should successfully reject an unverified user without reason", async () => {
    jest.spyOn(emailService, "sendRejectionEmail").mockResolvedValue(undefined);

    const user = new UserModel(validProfessorData);
    await user.save();
    const userId = user._id.toString();

    const result = await rejectUser(userId);

    expect(result.message).toBe("User rejected and notified successfully");
    expect(emailService.sendRejectionEmail).toHaveBeenCalledWith(
      expect.objectContaining({
        email: validProfessorData.email,
      }),
      undefined
    );
  });

  it("should fail with invalid user ID format", async () => {
    await expect(rejectUser("invalid-id")).rejects.toThrow(
      "Invalid user ID format"
    );
  });

  it("should fail when user is not found", async () => {
    const fakeId = new mongoose.Types.ObjectId().toString();
    await expect(rejectUser(fakeId)).rejects.toThrow("User not found");
  });

  it("should fail when trying to reject already verified user", async () => {
    const user = new UserModel({ ...validProfessorData, verified: true });
    await user.save();
    const userId = user._id.toString();

    await expect(rejectUser(userId)).rejects.toThrow(
      "Cannot reject an already verified user"
    );
  });
});

describe("createAdmin", () => {
  const validAdminData: CreateAdminData = {
    firstName: "Admin",
    lastName: "User",
    email: "admin@example.com",
    password: "password123",
    status: "Active",
    adminType: "Admin",
  };

  it("should successfully create an admin with valid data", async () => {
    const result = await createAdmin(validAdminData);

    expect(result.success).toBe(true);
    expect(result.admin).toBeDefined();
    if (result.admin) {
      expect(result.admin.firstName).toBe(validAdminData.firstName);
      expect(result.admin.lastName).toBe(validAdminData.lastName);
      expect(result.admin.email).toBe(validAdminData.email.toLowerCase());
      expect(result.admin.status).toBe(validAdminData.status);
      expect(result.admin.adminType).toBe(validAdminData.adminType);
      expect(result.admin.id).toBeDefined();
      expect(result.admin.createdAt).toBeDefined();
      expect(result.admin.updatedAt).toBeDefined();
    }

    const savedAdmin = await AdminModel.findOne({
      email: validAdminData.email.toLowerCase(),
    });
    expect(savedAdmin).toBeDefined();
  });

  it("should create EventOffice admin successfully", async () => {
    const eventOfficeData: CreateAdminData = {
      ...validAdminData,
      email: "eventoffice@example.com",
      adminType: "EventOffice",
    };

    const result = await createAdmin(eventOfficeData);

    expect(result.success).toBe(true);
    expect(result.admin?.adminType).toBe("EventOffice");
  });

  it("should default to Active status if not provided", async () => {
    const dataWithoutStatus: CreateAdminData = {
      firstName: "Test",
      lastName: "Admin",
      email: "test@example.com",
      password: "password123",
      adminType: "Admin",
    };

    const result = await createAdmin(dataWithoutStatus);

    expect(result.success).toBe(true);
    expect(result.admin?.status).toBe("Active");
  });

  it("should create admin with Blocked status", async () => {
    const blockedAdminData: CreateAdminData = {
      ...validAdminData,
      email: "blocked@example.com",
      status: "Blocked",
    };

    const result = await createAdmin(blockedAdminData);

    expect(result.success).toBe(true);
    expect(result.admin?.status).toBe("Blocked");
  });

  it("should fail when email already exists", async () => {
    await createAdmin(validAdminData);
    const result = await createAdmin(validAdminData);

    expect(result.success).toBe(false);
    expect(result.message).toBe("An admin with this email already exists");
  });

  it("should fail with invalid email format", async () => {
    const invalidEmailData: CreateAdminData = {
      ...validAdminData,
      email: "invalid-email",
    };

    const result = await createAdmin(invalidEmailData);

    expect(result.success).toBe(false);
    expect(result.message).toBe("Invalid email format");
  });

  it("should fail when password is too short", async () => {
    const shortPasswordData: CreateAdminData = {
      ...validAdminData,
      password: "short",
    };

    const result = await createAdmin(shortPasswordData);

    expect(result.success).toBe(false);
    expect(result.message).toBe("Password must be at least 8 characters long");
  });

  it("should normalize email to lowercase", async () => {
    const upperCaseEmailData: CreateAdminData = {
      ...validAdminData,
      email: "UPPERCASE@EXAMPLE.COM",
    };

    const result = await createAdmin(upperCaseEmailData);

    expect(result.success).toBe(true);
    expect(result.admin?.email).toBe("uppercase@example.com");
  });

  it("should trim and normalize email", async () => {
    const spacedEmailData: CreateAdminData = {
      ...validAdminData,
      email: "  spaced@example.com  ",
    };

    const result = await createAdmin(spacedEmailData);

    expect(result.success).toBe(true);
    expect(result.admin?.email).toBe("spaced@example.com");
  });

  it("should hash password before saving", async () => {
    const result = await createAdmin(validAdminData);

    expect(result.success).toBe(true);

    const savedAdmin = await AdminModel.findById(result.admin?.id).select(
      "+password"
    );
    expect(savedAdmin?.password).toBeDefined();
    expect(savedAdmin?.password).not.toBe(validAdminData.password);
  });
});

describe("findAll", () => {
  it("should return empty array when no admins exist", async () => {
    const result = await findAll();

    expect(result).toEqual([]);
  });

  it("should return all admins", async () => {
    const admin1 = new AdminModel({
      firstName: "Admin",
      lastName: "One",
      email: "admin1@example.com",
      password: "password123",
      status: "Active",
      adminType: "Admin",
    });
    const admin2 = new AdminModel({
      firstName: "Event",
      lastName: "Office",
      email: "eventoffice@example.com",
      password: "password123",
      status: "Active",
      adminType: "EventOffice",
    });
    await admin1.save();
    await admin2.save();

    const result = await findAll();

    expect(result).toHaveLength(2);
    expect(result[0].firstName).toBe("Admin");
    expect(result[0].lastName).toBe("One");
    expect(result[0].email).toBe("admin1@example.com");
    expect(result[0].status).toBe("Active");
    expect(result[0].adminType).toBe("Admin");
    expect(result[1].adminType).toBe("EventOffice");
  });

  it("should return admins with all required fields", async () => {
    const admin = new AdminModel({
      firstName: "Test",
      lastName: "Admin",
      email: "test@example.com",
      password: "password123",
      status: "Blocked",
      adminType: "Admin",
    });
    await admin.save();

    const result = await findAll();

    expect(result).toHaveLength(1);
    expect(result[0]).toHaveProperty("id");
    expect(result[0]).toHaveProperty("firstName");
    expect(result[0]).toHaveProperty("lastName");
    expect(result[0]).toHaveProperty("email");
    expect(result[0]).toHaveProperty("status");
    expect(result[0]).toHaveProperty("adminType");
    expect(result[0]).toHaveProperty("createdAt");
    expect(result[0]).toHaveProperty("updatedAt");
  });
});

describe("findById", () => {
  it("should return admin by ID", async () => {
    const admin = new AdminModel({
      firstName: "Admin",
      lastName: "User",
      email: "admin@example.com",
      password: "password123",
      status: "Active",
      adminType: "Admin",
    });
    await admin.save();
    const adminId = admin._id.toString();

    const result = await findById(adminId);

    expect(result).not.toBeNull();
    expect(result?.firstName).toBe("Admin");
    expect(result?.lastName).toBe("User");
    expect(result?.email).toBe("admin@example.com");
  });

  it("should return null when admin not found", async () => {
    const fakeId = new mongoose.Types.ObjectId().toString();
    const result = await findById(fakeId);

    expect(result).toBeNull();
  });

  it("should return admin with correct adminType", async () => {
    const admin = new AdminModel({
      firstName: "Event",
      lastName: "Office",
      email: "eventoffice@example.com",
      password: "password123",
      status: "Active",
      adminType: "EventOffice",
    });
    await admin.save();

    const result = await findById(admin._id.toString());

    expect(result?.adminType).toBe("EventOffice");
  });
});

describe("findByEmail", () => {
  it("should return admin by email", async () => {
    const admin = new AdminModel({
      firstName: "Admin",
      lastName: "User",
      email: "admin@example.com",
      password: "password123",
      status: "Active",
      adminType: "Admin",
    });
    await admin.save();

    const result = await findByEmail("admin@example.com");

    expect(result).not.toBeNull();
    expect(result?.email).toBe("admin@example.com");
    expect(result?.firstName).toBe("Admin");
  });

  it("should return null when admin not found", async () => {
    const result = await findByEmail("nonexistent@example.com");

    expect(result).toBeNull();
  });

  it("should find admin with case-insensitive email", async () => {
    const admin = new AdminModel({
      firstName: "Admin",
      lastName: "User",
      email: "admin@example.com",
      password: "password123",
      status: "Active",
      adminType: "Admin",
    });
    await admin.save();

    const result = await findByEmail("ADMIN@EXAMPLE.COM");

    expect(result).not.toBeNull();
    expect(result?.email).toBe("admin@example.com");
  });

  it("should find admin with trimmed email", async () => {
    const admin = new AdminModel({
      firstName: "Admin",
      lastName: "User",
      email: "admin@example.com",
      password: "password123",
      status: "Active",
      adminType: "Admin",
    });
    await admin.save();

    const result = await findByEmail("  admin@example.com  ");

    expect(result).not.toBeNull();
    expect(result?.email).toBe("admin@example.com");
  });
});

describe("updateAdminStatus", () => {
  it("should update admin status to Blocked", async () => {
    const admin = new AdminModel({
      firstName: "Admin",
      lastName: "User",
      email: "admin@example.com",
      password: "password123",
      status: "Active",
      adminType: "Admin",
    });
    await admin.save();
    const adminId = admin._id.toString();

    const result = await updateAdminStatus(adminId, "Blocked");

    expect(result.success).toBe(true);
    expect(result.admin?.status).toBe("Blocked");

    const updatedAdmin = await AdminModel.findById(adminId);
    expect(updatedAdmin?.status).toBe("Blocked");
  });

  it("should update admin status to Active", async () => {
    const admin = new AdminModel({
      firstName: "Admin",
      lastName: "User",
      email: "admin@example.com",
      password: "password123",
      status: "Blocked",
      adminType: "Admin",
    });
    await admin.save();
    const adminId = admin._id.toString();

    const result = await updateAdminStatus(adminId, "Active");

    expect(result.success).toBe(true);
    expect(result.admin?.status).toBe("Active");
  });

  it("should fail when admin not found", async () => {
    const fakeId = new mongoose.Types.ObjectId().toString();
    const result = await updateAdminStatus(fakeId, "Blocked");

    expect(result.success).toBe(false);
    expect(result.message).toBe("Admin not found");
  });
});

describe("deleteAdmin", () => {
  it("should successfully delete an admin", async () => {
    const admin = new AdminModel({
      firstName: "Admin",
      lastName: "User",
      email: "admin@example.com",
      password: "password123",
      status: "Active",
      adminType: "Admin",
    });
    await admin.save();
    const adminId = admin._id.toString();

    const result = await deleteAdmin(adminId);

    expect(result.success).toBe(true);
    expect(result.message).toBe("Admin deleted successfully");

    const deletedAdmin = await AdminModel.findById(adminId);
    expect(deletedAdmin).toBeNull();
  });

  it("should fail with invalid admin ID", async () => {
    const result = await deleteAdmin("invalid-id");

    expect(result.success).toBe(false);
    expect(result.message).toBe("Invalid admin ID");
  });

  it("should fail when admin not found", async () => {
    const fakeId = new mongoose.Types.ObjectId().toString();
    const result = await deleteAdmin(fakeId);

    expect(result.success).toBe(false);
    expect(result.message).toBe("Admin not found");
  });
});

describe("blockUser", () => {
  it("should successfully block a user", async () => {
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
    const userId = user._id.toString();

    const result = await blockUser(userId);

    expect(result.success).toBe(true);
    expect(result.message).toBe("User blocked successfully");

    const blockedUser = await UserModel.findById(userId);
    expect(blockedUser?.status).toBe("Blocked");
  });

  it("should fail with invalid user ID", async () => {
    const result = await blockUser("invalid-id");

    expect(result.success).toBe(false);
    expect(result.message).toBe("Invalid user ID");
  });

  it("should fail when user not found", async () => {
    const fakeId = new mongoose.Types.ObjectId().toString();
    const result = await blockUser(fakeId);

    expect(result.success).toBe(false);
    expect(result.message).toBe("User not found");
  });
});

describe("viewAllUsers", () => {
  it("should return empty array when no users exist", async () => {
    const result = await viewAllUsers();

    expect(result.success).toBe(true);
    expect(result.message).toBe("No users found");
    expect(result.count).toBe(0);
    expect(result.users).toEqual([]);
  });

  it("should return all users with complete details", async () => {
    const user1 = new UserModel({
      firstName: "John",
      lastName: "Doe",
      email: "john@example.com",
      password: "password123",
      role: "Student",
      studentId: "STU001",
      status: "Active",
      verified: true,
      balance: 100,
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
      balance: 0,
    });
    await user1.save();
    await user2.save();

    const result = await viewAllUsers();

    expect(result.success).toBe(true);
    expect(result.message).toBe("Users retrieved successfully");
    expect(result.count).toBe(2);
    expect(result.users).toHaveLength(2);
    expect(result.users?.[0].firstName).toBe("John");
    expect(result.users?.[0].balance).toBe(100);
    expect(result.users?.[0].verified).toBe(true);
    expect(result.users?.[1].firstName).toBe("Jane");
    expect(result.users?.[1].verified).toBe(false);
  });

  it("should include all user fields", async () => {
    const user = new UserModel({
      firstName: "Test",
      lastName: "User",
      email: "test@example.com",
      password: "password123",
      role: "Student",
      studentId: "STU001",
      status: "Active",
      verified: true,
      balance: 50,
      registeredEvents: ["event1", "event2"],
      favorites: ["fav1"],
      workshops: ["workshop1"],
      registeredGymSessions: ["gym1"],
      reservedCourts: ["court1"],
    });
    await user.save();

    const result = await viewAllUsers();

    expect(result.success).toBe(true);
    const userResult = result.users?.[0];
    expect(userResult).toHaveProperty("id");
    expect(userResult).toHaveProperty("firstName");
    expect(userResult).toHaveProperty("lastName");
    expect(userResult).toHaveProperty("email");
    expect(userResult).toHaveProperty("role");
    expect(userResult).toHaveProperty("status");
    expect(userResult).toHaveProperty("studentId");
    expect(userResult).toHaveProperty("registeredEvents");
    expect(userResult).toHaveProperty("balance");
    expect(userResult).toHaveProperty("verified");
    expect(userResult).toHaveProperty("favorites");
    expect(userResult).toHaveProperty("notifications");
    expect(userResult).toHaveProperty("workshops");
    expect(userResult).toHaveProperty("registeredGymSessions");
    expect(userResult).toHaveProperty("reservedCourts");
    expect(userResult).toHaveProperty("createdAt");
    expect(userResult).toHaveProperty("updatedAt");
  });

  it("should handle users with default values", async () => {
    const user = new UserModel({
      firstName: "Minimal",
      lastName: "User",
      email: "minimal@example.com",
      password: "password123",
      role: "Student",
      studentId: "STU002",
      status: "Active",
      verified: true,
    });
    await user.save();

    const result = await viewAllUsers();

    expect(result.success).toBe(true);
    const userResult = result.users?.[0];
    expect(userResult?.registeredEvents).toEqual([]);
    expect(userResult?.balance).toBe(0);
    expect(userResult?.favorites).toEqual([]);
    expect(userResult?.workshops).toEqual([]);
    expect(userResult?.registeredGymSessions).toEqual([]);
    expect(userResult?.reservedCourts).toEqual([]);
  });
});

describe("findAllEventsOffice", () => {
  it("should return empty array when no EventOffice admins exist", async () => {
    const result = await findAllEventsOffice();

    expect(result).toEqual([]);
  });

  it("should return only EventOffice admins", async () => {
    const admin = new AdminModel({
      firstName: "Admin",
      lastName: "User",
      email: "admin@example.com",
      password: "password123",
      status: "Active",
      adminType: "Admin",
    });
    const eventOffice1 = new AdminModel({
      firstName: "Event",
      lastName: "Office1",
      email: "eventoffice1@example.com",
      password: "password123",
      status: "Active",
      adminType: "EventOffice",
    });
    const eventOffice2 = new AdminModel({
      firstName: "Event",
      lastName: "Office2",
      email: "eventoffice2@example.com",
      password: "password123",
      status: "Active",
      adminType: "EventOffice",
    });
    await admin.save();
    await eventOffice1.save();
    await eventOffice2.save();

    const result = await findAllEventsOffice();

    expect(result).toHaveLength(2);
    expect(result[0].adminType).toBe("EventOffice");
    expect(result[1].adminType).toBe("EventOffice");
    expect(result.every((r) => r.adminType === "EventOffice")).toBe(true);
  });

  it("should return EventOffice admins with all fields", async () => {
    const eventOffice = new AdminModel({
      firstName: "Event",
      lastName: "Office",
      email: "eventoffice@example.com",
      password: "password123",
      status: "Blocked",
      adminType: "EventOffice",
    });
    await eventOffice.save();

    const result = await findAllEventsOffice();

    expect(result).toHaveLength(1);
    expect(result[0]).toHaveProperty("id");
    expect(result[0]).toHaveProperty("firstName");
    expect(result[0]).toHaveProperty("lastName");
    expect(result[0]).toHaveProperty("email");
    expect(result[0]).toHaveProperty("status");
    expect(result[0]).toHaveProperty("adminType");
    expect(result[0]).toHaveProperty("createdAt");
    expect(result[0]).toHaveProperty("updatedAt");
    expect(result[0].status).toBe("Blocked");
  });
});

describe("findAllAdmins", () => {
  it("should return empty array when no Admin type admins exist", async () => {
    const result = await findAllAdmins();

    expect(result).toEqual([]);
  });

  it("should return only Admin type admins", async () => {
    const admin1 = new AdminModel({
      firstName: "Admin",
      lastName: "One",
      email: "admin1@example.com",
      password: "password123",
      status: "Active",
      adminType: "Admin",
    });
    const admin2 = new AdminModel({
      firstName: "Admin",
      lastName: "Two",
      email: "admin2@example.com",
      password: "password123",
      status: "Active",
      adminType: "Admin",
    });
    const eventOffice = new AdminModel({
      firstName: "Event",
      lastName: "Office",
      email: "eventoffice@example.com",
      password: "password123",
      status: "Active",
      adminType: "EventOffice",
    });
    await admin1.save();
    await admin2.save();
    await eventOffice.save();

    const result = await findAllAdmins();

    expect(result).toHaveLength(2);
    expect(result[0].adminType).toBe("Admin");
    expect(result[1].adminType).toBe("Admin");
    expect(result.every((r) => r.adminType === "Admin")).toBe(true);
  });
});

describe("updateAdmin", () => {
  it("should update admin firstName", async () => {
    const admin = new AdminModel({
      firstName: "Old",
      lastName: "Name",
      email: "admin@example.com",
      password: "password123",
      status: "Active",
      adminType: "Admin",
    });
    await admin.save();
    const adminId = admin._id.toString();

    const result = await updateAdmin(adminId, { firstName: "New" });

    expect(result.success).toBe(true);
    expect(result.admin?.firstName).toBe("New");

    const updatedAdmin = await AdminModel.findById(adminId);
    expect(updatedAdmin?.firstName).toBe("New");
  });

  it("should update admin lastName", async () => {
    const admin = new AdminModel({
      firstName: "First",
      lastName: "Old",
      email: "admin@example.com",
      password: "password123",
      status: "Active",
      adminType: "Admin",
    });
    await admin.save();
    const adminId = admin._id.toString();

    const result = await updateAdmin(adminId, { lastName: "NewLast" });

    expect(result.success).toBe(true);
    expect(result.admin?.lastName).toBe("NewLast");
  });

  it("should update admin email", async () => {
    const admin = new AdminModel({
      firstName: "Admin",
      lastName: "User",
      email: "old@example.com",
      password: "password123",
      status: "Active",
      adminType: "Admin",
    });
    await admin.save();
    const adminId = admin._id.toString();

    const result = await updateAdmin(adminId, { email: "new@example.com" });

    expect(result.success).toBe(true);
    expect(result.admin?.email).toBe("new@example.com");
  });

  it("should update multiple fields at once", async () => {
    const admin = new AdminModel({
      firstName: "Old",
      lastName: "Name",
      email: "old@example.com",
      password: "password123",
      status: "Active",
      adminType: "Admin",
    });
    await admin.save();
    const adminId = admin._id.toString();

    const result = await updateAdmin(adminId, {
      firstName: "New",
      lastName: "Last",
      email: "new@example.com",
    });

    expect(result.success).toBe(true);
    expect(result.admin?.firstName).toBe("New");
    expect(result.admin?.lastName).toBe("Last");
    expect(result.admin?.email).toBe("new@example.com");
  });

  it("should fail with invalid admin ID", async () => {
    const result = await updateAdmin("invalid-id", { firstName: "New" });

    expect(result.success).toBe(false);
    expect(result.message).toBe("Invalid admin ID");
  });

  it("should fail when admin not found", async () => {
    const fakeId = new mongoose.Types.ObjectId().toString();
    const result = await updateAdmin(fakeId, { firstName: "New" });

    expect(result.success).toBe(false);
    expect(result.message).toBe("Admin not found");
  });

  it("should fail when no fields to update", async () => {
    const admin = new AdminModel({
      firstName: "Admin",
      lastName: "User",
      email: "admin@example.com",
      password: "password123",
      status: "Active",
      adminType: "Admin",
    });
    await admin.save();
    const adminId = admin._id.toString();

    const result = await updateAdmin(adminId, {});

    expect(result.success).toBe(false);
    expect(result.message).toBe("No fields to update");
  });

  it("should fail when email already exists for another admin", async () => {
    const admin1 = new AdminModel({
      firstName: "Admin",
      lastName: "One",
      email: "admin1@example.com",
      password: "password123",
      status: "Active",
      adminType: "Admin",
    });
    const admin2 = new AdminModel({
      firstName: "Admin",
      lastName: "Two",
      email: "admin2@example.com",
      password: "password123",
      status: "Active",
      adminType: "Admin",
    });
    await admin1.save();
    await admin2.save();

    const result = await updateAdmin(admin1._id.toString(), {
      email: "admin2@example.com",
    });

    expect(result.success).toBe(false);
    expect(result.message).toBe("An admin with this email already exists");
  });

  it("should normalize email to lowercase", async () => {
    const admin = new AdminModel({
      firstName: "Admin",
      lastName: "User",
      email: "admin@example.com",
      password: "password123",
      status: "Active",
      adminType: "Admin",
    });
    await admin.save();
    const adminId = admin._id.toString();

    const result = await updateAdmin(adminId, { email: "NEW@EXAMPLE.COM" });

    expect(result.success).toBe(true);
    expect(result.admin?.email).toBe("new@example.com");
  });

  it("should trim firstName and lastName", async () => {
    const admin = new AdminModel({
      firstName: "Admin",
      lastName: "User",
      email: "admin@example.com",
      password: "password123",
      status: "Active",
      adminType: "Admin",
    });
    await admin.save();
    const adminId = admin._id.toString();

    const result = await updateAdmin(adminId, {
      firstName: "  Trimmed  ",
      lastName: "  Name  ",
    });

    expect(result.success).toBe(true);
    expect(result.admin?.firstName).toBe("Trimmed");
    expect(result.admin?.lastName).toBe("Name");
  });
});

describe("blockAdminAccount", () => {
  it("should successfully block an admin account", async () => {
    const admin = new AdminModel({
      firstName: "Admin",
      lastName: "User",
      email: "admin@example.com",
      password: "password123",
      status: "Active",
      adminType: "Admin",
    });
    await admin.save();
    const adminId = admin._id.toString();

    const result = await blockAdminAccount(adminId);

    expect(result.success).toBe(true);
    expect(result.message).toBe("Admin blocked successfully");

    const blockedAdmin = await AdminModel.findById(adminId);
    expect(blockedAdmin?.status).toBe("Blocked");
  });

  it("should fail with invalid admin ID", async () => {
    const result = await blockAdminAccount("invalid-id");

    expect(result.success).toBe(false);
    expect(result.message).toBe("Invalid admin ID");
  });

  it("should fail when admin not found", async () => {
    const fakeId = new mongoose.Types.ObjectId().toString();
    const result = await blockAdminAccount(fakeId);

    expect(result.success).toBe(false);
    expect(result.message).toBe("Admin not found");
  });
});

describe("unblockAdminAccount", () => {
  it("should successfully unblock an admin account", async () => {
    const admin = new AdminModel({
      firstName: "Admin",
      lastName: "User",
      email: "admin@example.com",
      password: "password123",
      status: "Blocked",
      adminType: "Admin",
    });
    await admin.save();
    const adminId = admin._id.toString();

    const result = await unblockAdminAccount(adminId);

    expect(result.success).toBe(true);
    expect(result.message).toBe("Admin unblocked successfully");

    const unblockedAdmin = await AdminModel.findById(adminId);
    expect(unblockedAdmin?.status).toBe("Active");
  });

  it("should fail with invalid admin ID", async () => {
    const result = await unblockAdminAccount("invalid-id");

    expect(result.success).toBe(false);
    expect(result.message).toBe("Invalid admin ID");
  });

  it("should fail when admin not found", async () => {
    const fakeId = new mongoose.Types.ObjectId().toString();
    const result = await unblockAdminAccount(fakeId);

    expect(result.success).toBe(false);
    expect(result.message).toBe("Admin not found");
  });
});

describe("getEventOfficeNotifications", () => {
  it("should return notifications for EventOffice admin", async () => {
    const admin = new AdminModel({
      firstName: "Event",
      lastName: "Office",
      email: "eventoffice@example.com",
      password: "password123",
      status: "Active",
      adminType: "EventOffice",
      notifications: [
        { message: "Notification 1", seen: false },
        { message: "Notification 2", seen: true },
      ],
    });
    await admin.save();
    const adminId = admin._id.toString();

    const result = await getEventOfficeNotifications(adminId);

    expect(result.success).toBe(true);
    expect(result.notifications).toHaveLength(2);
    expect(result.notifications?.[0].message).toBe("Notification 1");
    expect(result.notifications?.[0].seen).toBe(false);
    expect(result.notifications?.[1].message).toBe("Notification 2");
    expect(result.notifications?.[1].seen).toBe(true);
  });

  // it("should return notifications for Admin type", async () => {
  //   const admin = new AdminModel({
  //     firstName: "Admin",
  //     lastName: "User",
  //     email: "admin@example.com",
  //     password: "password123",
  //     status: "Active",
  //     adminType: "Admin",
  //     notifications: [{ message: "Admin notification", seen: false }],
  //   });
  //   await admin.save();
  //   const adminId = admin._id.toString();

  //   const result = await getEventOfficeNotifications(adminId);
  //   console.log(result);
  //   expect(result.success).toBe(true);
  //   expect(result.notifications).toHaveLength(1);
  // });

  it("should return empty array when no notifications", async () => {
    const admin = new AdminModel({
      firstName: "Event",
      lastName: "Office",
      email: "eventoffice@example.com",
      password: "password123",
      status: "Active",
      adminType: "EventOffice",
    });
    await admin.save();
    const adminId = admin._id.toString();

    const result = await getEventOfficeNotifications(adminId);

    expect(result.success).toBe(true);
    expect(result.notifications).toEqual([]);
  });

  it("should fail with invalid admin ID", async () => {
    const result = await getEventOfficeNotifications("invalid-id");

    expect(result.success).toBe(false);
    expect(result.message).toBe("Invalid admin ID");
  });

  it("should fail when admin not found", async () => {
    const fakeId = new mongoose.Types.ObjectId().toString();
    const result = await getEventOfficeNotifications(fakeId);

    expect(result.success).toBe(false);
    expect(result.message).toBe("Admin not found");
  });
});

describe("markEventOfficeNotificationsSeen", () => {
  it("should mark all notifications as seen", async () => {
    const admin = new AdminModel({
      firstName: "Event",
      lastName: "Office",
      email: "eventoffice@example.com",
      password: "password123",
      status: "Active",
      adminType: "EventOffice",
      notifications: [
        { message: "Notification 1", seen: false },
        { message: "Notification 2", seen: false },
        { message: "Notification 3", seen: true },
      ],
    });
    await admin.save();
    const adminId = admin._id.toString();

    const result = await markEventOfficeNotificationsSeen(adminId);

    expect(result.success).toBe(true);
    expect(result.message).toBe("Notifications marked as seen.");

    const updatedAdmin = await AdminModel.findById(adminId);
    expect(updatedAdmin?.notifications?.every((n) => n.seen === true)).toBe(
      true
    );
  });

  // it("should work with Admin type", async () => {
  //   const admin = new AdminModel({
  //     firstName: "Admin",
  //     lastName: "User",
  //     email: "admin@example.com",
  //     password: "password123",
  //     status: "Active",
  //     adminType: "Admin",
  //     notifications: [{ message: "Notification", seen: false }],
  //   });
  //   await admin.save();
  //   const adminId = admin._id.toString();
  //   const result = await markEventOfficeNotificationsSeen(adminId);
  //   expect(result.success).toBe(true);
  // });

  it("should fail with invalid admin ID", async () => {
    const result = await markEventOfficeNotificationsSeen("invalid-id");

    expect(result.success).toBe(false);
    expect(result.message).toBe("Invalid admin ID");
  });

  it("should fail when admin not found", async () => {
    const fakeId = new mongoose.Types.ObjectId().toString();
    const result = await markEventOfficeNotificationsSeen(fakeId);

    expect(result.success).toBe(false);
    expect(result.message).toBe("Admin not found");
  });

  it("should handle empty notifications array", async () => {
    const admin = new AdminModel({
      firstName: "Event",
      lastName: "Office",
      email: "eventoffice@example.com",
      password: "password123",
      status: "Active",
      adminType: "EventOffice",
      notifications: [],
    });
    await admin.save();
    const adminId = admin._id.toString();

    const result = await markEventOfficeNotificationsSeen(adminId);

    expect(result.success).toBe(true);
  });
});

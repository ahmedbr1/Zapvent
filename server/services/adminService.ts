import UserModel, { IUserNotification, userRole, userStatus } from "../models/User";
import { emailService } from "./emailService";
import AdminModel, { IAdmin, IAdminNotification } from "../models/Admin";
import { isValidObjectId } from "mongoose";

export async function approveUser(userId: string) {
  if (!isValidObjectId(userId)) {
    throw new Error("Invalid user ID format");
  }
  const user = await UserModel.findById(userId);

  if (!user) {
    throw new Error("User not found");
  }

  if (user.verified) {
    throw new Error("User is already verified");
  }

  if (user.role === userRole.STUDENT) {
    throw new Error(
      "Students are auto-verified and do not need admin approval"
    );
  }

  // Approve the user
  user.verified = true;
  await emailService.sendApprovalEmail(user);

  await user.save();

  return {
    message: "User approved successfully and notification email sent",
    user: {
      id: user._id,
      firstName: user.firstName,
      lastName: user.lastName,
      email: user.email,
      role: user.role,
      verified: user.verified,
    },
  };
}

export async function rejectUser(userId: string, reason?: string) {
  if (!isValidObjectId(userId)) {
    throw new Error("Invalid user ID format");
  }
  const user = await UserModel.findById(userId);

  if (!user) {
    throw new Error("User not found");
  }

  if (user.verified) {
    throw new Error("Cannot reject an already verified user");
  }

  // Send rejection email before deleting
  await emailService.sendRejectionEmail(user, reason);

  return {
    message: "User rejected and notified successfully",
    user: {
      id: user._id,
      firstName: user.firstName,
      lastName: user.lastName,
      email: user.email,
      role: user.role,
    },
  };
}

export interface CreateAdminData {
  firstName: string;
  lastName: string;
  email: string;
  password: string;
  status?: "Active" | "Blocked";
  adminType: "EventOffice" | "Admin";
}

function normalizeEmail(email: string): string {
  return email.trim().toLowerCase();
}

function normalizeUserNotifications(
  notifications?: unknown[]
): IUserNotification[] {
  if (!Array.isArray(notifications)) {
    return [];
  }

  return notifications.map((entry) => {
    if (entry && typeof entry === "object" && "message" in entry) {
      const candidate = entry as IUserNotification;
      return {
        message: String(candidate.message ?? ""),
        seen: typeof candidate.seen === "boolean" ? candidate.seen : false,
        createdAt: candidate.createdAt,
      };
    }

    const fallback =
      typeof entry === "string"
        ? entry
        : entry !== null && entry !== undefined
          ? String(entry)
          : "";

    return {
      message: fallback,
      seen: false,
    };
  });
}

function normalizeAdminNotifications(
  notifications?: unknown[]
): IAdminNotification[] {
  if (!Array.isArray(notifications)) {
    return [];
  }

  return notifications.map((entry) => {
    if (entry && typeof entry === "object" && "message" in entry) {
      const candidate = entry as IAdminNotification;
      return {
        message: String(candidate.message ?? ""),
        seen: typeof candidate.seen === "boolean" ? candidate.seen : false,
        createdAt: candidate.createdAt,
      };
    }

    const fallback =
      typeof entry === "string"
        ? entry
        : entry !== null && entry !== undefined
          ? String(entry)
          : "";

    return {
      message: fallback,
      seen: false,
    };
  });
}

export interface AdminResponse {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  status: "Active" | "Blocked";
  adminType: "EventOffice" | "Admin";
  createdAt: Date;
  updatedAt: Date;
}

export async function findAll(): Promise<AdminResponse[]> {
  const admins = await AdminModel.find().lean();

  return admins.map((admin) => ({
    id: admin._id as string,
    firstName: admin.firstName,
    lastName: admin.lastName,
    email: admin.email,
    status: admin.status,
    adminType: admin.adminType,
    createdAt: admin.createdAt,
    updatedAt: admin.updatedAt,
  }));
}

export async function findById(id: string): Promise<AdminResponse | null> {
  const admin = (await AdminModel.findById(id).lean()) as IAdmin | null;

  if (!admin) {
    return null;
  }

  return {
    id: admin._id as string,
    firstName: admin.firstName,
    lastName: admin.lastName,
    email: admin.email,
    status: admin.status,
    adminType: admin.adminType as "EventOffice" | "Admin",
    createdAt: admin.createdAt,
    updatedAt: admin.updatedAt,
  };
}

export async function findByEmail(email: string): Promise<IAdmin | null> {
  return AdminModel.findOne({
    email: normalizeEmail(email),
  }).lean() as Promise<IAdmin | null>;
}

export async function createAdmin(
  data: CreateAdminData
): Promise<{ success: boolean; admin?: AdminResponse; message?: string }> {
  try {
    const sanitizedEmail = normalizeEmail(data.email);
    const existingAdmin = await findByEmail(sanitizedEmail);

    if (existingAdmin) {
      console.info(
        `[adminService] createAdmin blocked duplicate for ${sanitizedEmail}`
      );
      return {
        success: false,
        message: "An admin with this email already exists",
      };
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(sanitizedEmail)) {
      return {
        success: false,
        message: "Invalid email format",
      };
    }

    if (data.password.length < 8) {
      return {
        success: false,
        message: "Password must be at least 8 characters long",
      };
    }

    const admin = new AdminModel({
      firstName: data.firstName,
      lastName: data.lastName,
      email: sanitizedEmail,
      password: data.password, // Will be hashed by pre-save hook
      status: data.status || "Active",
      adminType: data.adminType || "Admin",
    });

    const savedAdmin = await admin.save();

    return {
      success: true,
      admin: {
        id: savedAdmin._id.toString(),
        firstName: savedAdmin.firstName,
        lastName: savedAdmin.lastName,
        email: savedAdmin.email,
        status: savedAdmin.status,
        adminType: savedAdmin.adminType as "EventOffice" | "Admin",
        createdAt: savedAdmin.createdAt,
        updatedAt: savedAdmin.updatedAt,
      },
    };
  } catch (error) {
    console.error("Error creating admin:", error);
    return {
      success: false,
      message: "Failed to create admin",
    };
  }
}

export async function updateAdminStatus(
  id: string,
  status: "Active" | "Blocked"
): Promise<{ success: boolean; admin?: AdminResponse; message?: string }> {
  try {
    const admin = (await AdminModel.findByIdAndUpdate(
      id,
      { status },
      { new: true, runValidators: true }
    ).lean()) as IAdmin | null;

    if (!admin) {
      return {
        success: false,
        message: "Admin not found",
      };
    }

    return {
      success: true,
      admin: {
        id: admin._id as string,
        firstName: admin.firstName,
        lastName: admin.lastName,
        email: admin.email,
        status: admin.status,
        adminType: admin.adminType as "EventOffice" | "Admin",
        createdAt: admin.createdAt,
        updatedAt: admin.updatedAt,
      },
    };
  } catch (error) {
    console.error("Error updating admin status:", error);
    return {
      success: false,
      message: "Failed to update admin status",
    };
  }
}

export async function deleteAdmin(
  id: string
): Promise<{ success: boolean; message?: string }> {
  try {
    if (!isValidObjectId(id)) {
      return {
        success: false,
        message: "Invalid admin ID",
      };
    }
    const admin = await AdminModel.findByIdAndDelete(id);

    if (!admin) {
      return {
        success: false,
        message: "Admin not found",
      };
    }

    return {
      success: true,
      message: "Admin deleted successfully",
    };
  } catch (error) {
    console.error("Error deleting admin:", error);
    return {
      success: false,
      message: "Failed to delete admin",
    };
  }
}

export async function blockUser(
  userId: string
): Promise<{ success: boolean; message: string }> {
  try {
    if (!isValidObjectId(userId)) {
      return { success: false, message: "Invalid user ID" };
    }

    const blocked = await UserModel.findByIdAndUpdate(
      userId,
      { status: "Blocked" },
      { new: true, runValidators: true }
    );

    if (!blocked) {
      return { success: false, message: "User not found" };
    }

    return { success: true, message: "User blocked successfully" };
  } catch (error) {
    console.error("Error blocking user:", error);
    return { success: false, message: "Failed to block user" };
  }
}

type UserDetails = {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  role: userRole;
  status: userStatus;
  studentId?: string;
  staffId?: string;
  registeredEvents: string[];
  balance: number;
  verified: boolean;
  favorites: string[];
  notifications: IUserNotification[];
  workshops: string[];
  registeredGymSessions: string[];
  reservedCourts: string[];
  createdAt: Date;
  updatedAt: Date;
};

export async function viewAllUsers(): Promise<{
  success: boolean;
  message?: string;
  count?: number;
  users?: UserDetails[];
}> {
  try {
    const users = await UserModel.find().lean();

    if (!users.length) {
      return {
        success: true,
        message: "No users found",
        count: 0,
        users: [],
      };
    }

    const normalizedUsers: UserDetails[] = users.map((user) => ({
      id: user._id as string,
      firstName: user.firstName,
      lastName: user.lastName,
      email: user.email,
      role: user.role,
      status: user.status,
      studentId: user.studentId,
      staffId: user.staffId,
      registeredEvents: user.registeredEvents ?? [],
      balance: user.balance ?? 0,
      verified: user.verified,
      favorites: user.favorites ?? [],
      notifications: normalizeUserNotifications(user.notifications),
      workshops: user.workshops ?? [],
      registeredGymSessions: user.registeredGymSessions ?? [],
      reservedCourts: user.reservedCourts ?? [],
      createdAt: user.createdAt,
      updatedAt: user.updatedAt,
    }));

    return {
      success: true,
      message: "Users retrieved successfully",
      count: normalizedUsers.length,
      users: normalizedUsers,
    };
  } catch (error) {
    console.error("Error retrieving users:", error);
    return {
      success: false,
      message: "Failed to retrieve users",
    };
  }
}

// Events Office Management
export async function findAllEventsOffice(): Promise<AdminResponse[]> {
  const eventsOfficeAccounts = await AdminModel.find({
    adminType: "EventOffice",
  }).lean();

  return eventsOfficeAccounts.map((admin) => ({
    id: admin._id as string,
    firstName: admin.firstName,
    lastName: admin.lastName,
    email: admin.email,
    status: admin.status,
    adminType: admin.adminType as "EventOffice" | "Admin",
    createdAt: admin.createdAt,
    updatedAt: admin.updatedAt,
  }));
}

export async function findAllAdmins(): Promise<AdminResponse[]> {
  const admins = await AdminModel.find({
    adminType: "Admin",
  }).lean();

  return admins.map((admin) => ({
    id: admin._id as string,
    firstName: admin.firstName,
    lastName: admin.lastName,
    email: admin.email,
    status: admin.status,
    adminType: admin.adminType as "EventOffice" | "Admin",
    createdAt: admin.createdAt,
    updatedAt: admin.updatedAt,
  }));
}

export async function updateAdmin(
  id: string,
  data: { firstName?: string; lastName?: string; email?: string }
): Promise<{ success: boolean; admin?: AdminResponse; message?: string }> {
  try {
    if (!isValidObjectId(id)) {
      return {
        success: false,
        message: "Invalid admin ID",
      };
    }

    const updateData: Partial<{
      firstName: string;
      lastName: string;
      email: string;
    }> = {};
    if (data.firstName) updateData.firstName = data.firstName.trim();
    if (data.lastName) updateData.lastName = data.lastName.trim();
    if (data.email) updateData.email = normalizeEmail(data.email);

    if (Object.keys(updateData).length === 0) {
      return {
        success: false,
        message: "No fields to update",
      };
    }

    // Check if email already exists (if email is being updated)
    if (data.email) {
      const existingAdmin = await AdminModel.findOne({
        email: updateData.email,
        _id: { $ne: id },
      });
      if (existingAdmin) {
        return {
          success: false,
          message: "An admin with this email already exists",
        };
      }
    }

    const admin = (await AdminModel.findByIdAndUpdate(id, updateData, {
      new: true,
      runValidators: true,
    }).lean()) as IAdmin | null;

    if (!admin) {
      return {
        success: false,
        message: "Admin not found",
      };
    }

    return {
      success: true,
      admin: {
        id: admin._id as string,
        firstName: admin.firstName,
        lastName: admin.lastName,
        email: admin.email,
        status: admin.status,
        adminType: admin.adminType as "EventOffice" | "Admin",
        createdAt: admin.createdAt,
        updatedAt: admin.updatedAt,
      },
    };
  } catch (error) {
    console.error("Error updating admin:", error);
    return {
      success: false,
      message: "Failed to update admin",
    };
  }
}

export async function blockAdminAccount(
  adminId: string
): Promise<{ success: boolean; message: string }> {
  try {
    if (!isValidObjectId(adminId)) {
      return { success: false, message: "Invalid admin ID" };
    }

    const admin = await AdminModel.findByIdAndUpdate(
      adminId,
      { status: "Blocked" },
      { new: true }
    );

    if (!admin) {
      return { success: false, message: "Admin not found" };
    }

    return { success: true, message: "Admin blocked successfully" };
  } catch (error) {
    console.error("Error blocking admin:", error);
    return { success: false, message: "Failed to block admin" };
  }
}

export async function unblockAdminAccount(
  adminId: string
): Promise<{ success: boolean; message: string }> {
  try {
    if (!isValidObjectId(adminId)) {
      return { success: false, message: "Invalid admin ID" };
    }

    const admin = await AdminModel.findByIdAndUpdate(
      adminId,
      { status: "Active" },
      { new: true }
    );

    if (!admin) {
      return { success: false, message: "Admin not found" };
    }

    return { success: true, message: "Admin unblocked successfully" };
  } catch (error) {
    console.error("Error unblocking admin:", error);
    return { success: false, message: "Failed to unblock admin" };
  }
}

export async function getEventOfficeNotifications(
  adminId: string
): Promise<{ success: boolean; notifications?: IAdminNotification[]; message?: string }> {
  try {
    if (!isValidObjectId(adminId)) {
      return { success: false, message: "Invalid admin ID" };
    }

    const admin = (await AdminModel.findById(adminId).lean()) as IAdmin | null;

    if (!admin) {
      return { success: false, message: "Admin not found" };
    }

    if (admin.adminType !== "EventOffice" && admin.adminType !== "Admin") {
      return {
        success: false,
        message: "Only admins can access notifications",
      };
    }

    return {
      success: true,
      notifications: normalizeAdminNotifications(admin.notifications),
    };
  } catch (error) {
    console.error("Error fetching Event Office notifications:", error);
    return {
      success: false,
      message: "Failed to fetch notifications",
    };
  }
}

export async function markEventOfficeNotificationsSeen(
  adminId: string
): Promise<{ success: boolean; message: string }> {
  try {
    if (!isValidObjectId(adminId)) {
      return { success: false, message: "Invalid admin ID" };
    }

    const admin = await AdminModel.findById(adminId)
      .select(["notifications", "adminType"])
      .lean<IAdmin | null>();
    if (!admin) {
      return { success: false, message: "Admin not found" };
    }

    if (admin.adminType !== "EventOffice" && admin.adminType !== "Admin") {
      return {
        success: false,
        message: "Only admins can update notifications",
      };
    }

    const normalized = normalizeAdminNotifications(admin.notifications).map(
      (notification) => ({
        ...notification,
        seen: true,
      })
    );

    await AdminModel.updateOne(
      { _id: adminId },
      { $set: { notifications: normalized } }
    );

    return {
      success: true,
      message: "Notifications marked as seen.",
    };
  } catch (error) {
    console.error("Error marking Event Office notifications as seen:", error);
    return {
      success: false,
      message: "Failed to mark notifications as seen",
    };
  }
}

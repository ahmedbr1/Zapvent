import UserModel, { userRole } from "../models/User";
import { emailService } from "./emailService";
import AdminModel, { IAdmin } from "../models/Admin";
import CommentModel from "../models/Comment";
import { isValidObjectId } from "mongoose";


export async function approveUser(userId: string) {
   if (!isValidObjectId(userId)) {
    throw new Error('Invalid user ID format');
  }
  const user = await UserModel.findById(userId);
  
  if (!user) {
    throw new Error('User not found');
  }

  if (user.verified) {
    throw new Error('User is already verified');
  }

  if (user.role === userRole.STUDENT) {
    throw new Error('Students are auto-verified and do not need admin approval');
  }

  // Approve the user
  user.verified = true;
  await emailService.sendApprovalEmail(user);

  await user.save();


  return {
    message: 'User approved successfully and notification email sent',
    user: {
      id: user._id,
      firstName: user.firstName,
      lastName: user.lastName,
      email: user.email,
      role: user.role,
      verified: user.verified
    }
  };
}

export async function rejectUser(userId: string, reason?: string) {
   if (!isValidObjectId(userId)) {
    throw new Error('Invalid user ID format');
  }
  const user = await UserModel.findById(userId);
  
  if (!user) {
    throw new Error('User not found');
  }

  if (user.verified) {
    throw new Error('Cannot reject an already verified user');
  }

  // Send rejection email before deleting
  await emailService.sendRejectionEmail(user, reason);


  return {
    message: 'User rejected and notified successfully',
    user: {
      id: user._id,
      firstName: user.firstName,
      lastName: user.lastName,
      email: user.email,
      role: user.role
    }
  };
}

export interface CreateAdminData {
  firstName: string;
  lastName: string;
  email: string;
  password: string;
  status?: "Active" | "Blocked";
}

export interface AdminResponse {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  status: "Active" | "Blocked";
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
    createdAt: admin.createdAt,
    updatedAt: admin.updatedAt,
  };
}

export async function findByEmail(email: string): Promise<IAdmin | null> {
  return AdminModel.findOne({ email }).lean() as Promise<IAdmin | null>;
}

export async function createAdmin(
  data: CreateAdminData
): Promise<{ success: boolean; admin?: AdminResponse; message?: string }> {
  try {
    const existingAdmin = await findByEmail(data.email);

    if (existingAdmin) {
      return {
        success: false,
        message: "An admin with this email already exists",
      };
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(data.email)) {
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
      email: data.email,
      password: data.password, // Will be hashed by pre-save hook
      status: data.status || "Active",
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

export async function deleteComment(
  commentId: string
): Promise<{ success: boolean; message: string }> {
  try {
    if (!isValidObjectId(commentId)) {
      return { success: false, message: "Invalid comment ID" };
    }

    const deleted = await CommentModel.findByIdAndDelete(commentId);

    if (!deleted) {
      return { success: false, message: "Comment not found" };
    }

    return { success: true, message: "Comment deleted successfully" };
  } catch (error) {
    console.error("Error deleting comment:", error);
    return { success: false, message: "Failed to delete comment" };
  }
}

export async function blockUser(
  userId: string
): Promise<{ success: boolean; message: string }> {
  try {
    if (!isValidObjectId(userId)) {
      return { success: false, message: "Invalid user ID" };
    }

    const blocked = await UserModel.findByIdAndUpdate(userId, { status: "Blocked" }, { new: true , runValidators: true });

    if (!blocked) {
      return { success: false, message: "User not found" };
    }

    return { success: true, message: "User blocked successfully" };
  } catch (error) {
    console.error("Error blocking user:", error);
    return { success: false, message: "Failed to block user" };
  }
}

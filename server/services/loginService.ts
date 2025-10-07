import bcrypt from "bcrypt";
import jwt, { SignOptions } from "jsonwebtoken";
import AdminModel, { IAdmin } from "../models/Admin";
import UserModel, { IUser } from "../models/User";
import VendorModel, { IVendor } from "../models/Vendor";

const JWT_SECRET: string =
  process.env.JWT_SECRET || "your-secret-key-change-in-production";
const JWT_EXPIRES_IN: number =
  parseInt(process.env.JWT_EXPIRES_IN!) || 3600 * 24;

interface LoginResponse {
  success: boolean;
  token?: string;
  user?: {
    id: string;
    email: string;
    role: string;
    [key: string]: any;
  };
  message?: string;
}

async function login(
  model: typeof UserModel | typeof AdminModel | typeof VendorModel,
  email: string,
  password: string,
  modelType: "User" | "Admin" | "Vendor"
): Promise<LoginResponse> {
  try {
    // Find user by email and explicitly select password field
    const user = await model.findOne({ email }).select("+password");

    if (!user) {
      return {
        success: false,
        message: "Invalid email or password",
      };
    }

    // Check if user is blocked (for User and Admin)
    if (modelType !== "Vendor" && user.status === "Blocked") {
      return {
        success: false,
        message: "Account is blocked. Please contact support.",
      };
    }

    // Check vendor verification status
    if (modelType === "Vendor") {
      if (!user.isVerified) {
        return {
          success: false,
          message: "Vendor account is not verified yet.",
        };
      }
      if (user.status !== "approved") {
        return {
          success: false,
          message: `Vendor account is ${user.status}. Please contact support.`,
        };
      }
    }

    // Verify password
    const isPasswordValid = await bcrypt.compare(password, user.password);

    if (!isPasswordValid) {
      return {
        success: false,
        message: "Invalid email or password",
      };
    }

    // Generate JWT token
    const payload = {
      id: user._id,
      email: user.email,
      role: modelType,
      ...(modelType === "User" && { userRole: user.role }),
    };

    const signOptions: SignOptions = {
      expiresIn: JWT_EXPIRES_IN,
    };

    const token = jwt.sign(payload, JWT_SECRET, signOptions);

    // Prepare user response (exclude password)
    const userResponse: any = {
      id: user._id,
      email: user.email,
      role: modelType,
    };

    // Add model-specific fields
    if (modelType === "User") {
      const u = user as IUser;
      userResponse.firstName = u.firstName;
      userResponse.lastName = u.lastName;
      userResponse.userRole = u.role;
      userResponse.status = u.status;
      userResponse.verified = u.verified;
      userResponse.balance = u.balance;
    } else if (modelType === "Admin") {
      const a = user as IAdmin;
      userResponse.firstName = a.firstName;
      userResponse.lastName = a.lastName;
      userResponse.status = a.status;
    } else if (modelType === "Vendor") {
      const v = user as IVendor;
      userResponse.companyName = v.companyName;
      userResponse.isVerified = v.isVerified;
      userResponse.status = v.status;
      userResponse.logo = v.logo;
    }

    return {
      success: true,
      token,
      user: userResponse,
    };
  } catch (error) {
    console.error(`${modelType} login error:`, error);
    return {
      success: false,
      message: "An error occurred during login. Please try again.",
    };
  }
}

export async function loginUser(
  email: string,
  password: string
): Promise<LoginResponse> {
  return login(UserModel, email, password, "User");
}

export async function loginAdmin(
  email: string,
  password: string
): Promise<LoginResponse> {
  return login(AdminModel, email, password, "Admin");
}

export async function loginVendor(
  email: string,
  password: string
): Promise<LoginResponse> {
  return login(VendorModel, email, password, "Vendor");
}

export function verifyToken(token: string): any {
  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    return { success: true, decoded };
  } catch (error) {
    return { success: false, message: "Invalid or expired token" };
  }
}

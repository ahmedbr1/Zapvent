import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import AdminModel from "../models/Admin";
import UserModel from "../models/User";
import VendorModel from "../models/Vendor";

const JWT_SECRET: string =
  process.env.JWT_SECRET || "your-secret-key-change-in-production";
const JWT_EXPIRES_IN: number = process.env.JWT_EXPIRES_IN
  ? parseInt(process.env.JWT_EXPIRES_IN, 10)
  : 3600 * 24;

// Base login response
interface BaseLoginResponse {
  success: boolean;
  message?: string;
}

// Specific response types for each user type
interface UserLoginSuccess extends BaseLoginResponse {
  success: true;
  token: string;
  user: {
    id: string;
    email: string;
    role: "User";
    firstName: string;
    lastName: string;
    userRole: string;
    status: string;
    verified: boolean;
    balance?: number;
  };
}

interface AdminLoginSuccess extends BaseLoginResponse {
  success: true;
  token: string;
  user: {
    id: string;
    email: string;
    role: "Admin";
    firstName: string;
    lastName: string;
    status: string;
  };
}

interface VendorLoginSuccess extends BaseLoginResponse {
  success: true;
  token: string;
  user: {
    id: string;
    email: string;
    role: "Vendor";
    companyName: string;
    isVerified: boolean;
    status: string;
    logo: string;
  };
}

interface LoginFailure extends BaseLoginResponse {
  success: false;
  message: string;
}

type UserLoginResponse = UserLoginSuccess | LoginFailure;
type AdminLoginResponse = AdminLoginSuccess | LoginFailure;
type VendorLoginResponse = VendorLoginSuccess | LoginFailure;

// User login
export async function loginUser(
  email: string,
  password: string
): Promise<UserLoginResponse> {
  try {
    // Find user by email and explicitly select password field
    const user = await UserModel.findOne({ email }).select("+password");

    if (!user) {
      return {
        success: false,
        message: "Invalid email or password",
      };
    }

    if (!user.verified) {
      return {
        success: false,
        message: "Please verify your email before logging in.",
      };
    }

    // Check if user is blocked
    if (user.status === "Blocked") {
      return {
        success: false,
        message: "Account is blocked. Please contact support.",
      };
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
      role: "User" as const,
      userRole: user.role,
    };

    const token = jwt.sign(payload, JWT_SECRET, {
      algorithm: "HS256",
      expiresIn: JWT_EXPIRES_IN,
    });

    return {
      success: true,
      token,
      user: {
        id: user._id.toString(),
        email: user.email,
        role: "User",
        firstName: user.firstName,
        lastName: user.lastName,
        userRole: user.role,
        status: user.status,
        verified: user.verified,
        balance: user.balance,
      },
    };
  } catch (error) {
    console.error("User login error:", error);
    return {
      success: false,
      message: "An error occurred during login. Please try again.",
    };
  }
}

// Admin login
export async function loginAdmin(
  email: string,
  password: string
): Promise<AdminLoginResponse> {
  try {
    // Find admin by email and explicitly select password field
    const admin = await AdminModel.findOne({ email }).select("+password");

    if (!admin) {
      return {
        success: false,
        message: "Invalid email or password",
      };
    }

    // Check if admin is blocked
    if (admin.status === "Blocked") {
      return {
        success: false,
        message: "Account is blocked. Please contact support.",
      };
    }

    // Verify password
    const isPasswordValid = await bcrypt.compare(password, admin.password);

    if (!isPasswordValid) {
      return {
        success: false,
        message: "Invalid email or password",
      };
    }

    // Generate JWT token
    const payload = {
      id: admin._id,
      email: admin.email,
      role: "Admin" as const,
    };

    const token = jwt.sign(payload, JWT_SECRET, {
      algorithm: "HS256",
      expiresIn: JWT_EXPIRES_IN,
    });

    return {
      success: true,
      token,
      user: {
        id: admin._id.toString(),
        email: admin.email,
        role: "Admin",
        firstName: admin.firstName,
        lastName: admin.lastName,
        status: admin.status,
      },
    };
  } catch (error) {
    console.error("Admin login error:", error);
    return {
      success: false,
      message: "An error occurred during login. Please try again.",
    };
  }
}

// Vendor login
export async function loginVendor(
  email: string,
  password: string
): Promise<VendorLoginResponse> {
  try {
    // Find vendor by email and explicitly select password field
    const vendor = await VendorModel.findOne({ email }).select("+password");

    if (!vendor) {
      return {
        success: false,
        message: "Invalid email or password",
      };
    }

    // Check vendor verification status
    if (!vendor.isVerified) {
      return {
        success: false,
        message: "Vendor account is not verified yet.",
      };
    }

    // Verify password
    const isPasswordValid = await bcrypt.compare(password, vendor.password);

    if (!isPasswordValid) {
      return {
        success: false,
        message: "Invalid email or password",
      };
    }

    // Generate JWT token
    const payload = {
      id: vendor._id,
      email: vendor.email,
      role: "Vendor" as const,
    };

    const token = jwt.sign(payload, JWT_SECRET, {
      algorithm: "HS256",
      expiresIn: JWT_EXPIRES_IN,
    });

    return {
      success: true,
      token,
      user: {
        id: vendor._id.toString(),
        email: vendor.email,
        role: "Vendor",
        companyName: vendor.companyName,
        isVerified: vendor.isVerified,
        status: vendor.status,
        logo: vendor.logo,
      },
    };
  } catch (error) {
    console.error("Vendor login error:", error);
    return {
      success: false,
      message: "An error occurred during login. Please try again.",
    };
  }
}

export function verifyToken(token: string): string | jwt.JwtPayload | null {
  try {
    const decoded = jwt.verify(token, JWT_SECRET, {
      algorithms: ["HS256"],
    });
    return decoded;
  } catch (error) {
    console.error("An error occurred while verifying the token:", error);
    return null;
  }
}

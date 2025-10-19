import type * as express from "express";
import jwt from "jsonwebtoken";

// Extended types for Express
type Request = express.Request;
interface Response extends express.Response {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  status(code: number): any;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  json(body?: any): any;
}
type NextFunction = () => void;

// Replace the default-fallback with a fail-fast check
if (!process.env.JWT_SECRET) {
  throw new Error("JWT_SECRET is required for authentication");
}

const JWT_SECRET = process.env.JWT_SECRET;
export type UserRole =
  | "Student"
  | "Professor"
  | "Staff"
  | "TA"
  | "Admin"
  | "Vendor"
  | "EventOffice";

export interface AuthRequest extends Request {
  params: Record<string, string>;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  body: any;
  headers: Record<string, string | string[] | undefined>;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  cookies?: any;
  user?: {
    id: string;
    email: string;
    role: UserRole | "User";
    iat?: number;
    exp?: number;
    adminType?: string; // For Admin sub-roles (EventOffice, etc.)
    userRole?: string; // For User sub-roles (Student, Staff, Professor, TA)
  };
}

/**
 * Extract and verify JWT token from request
 * Checks both Authorization header and cookies
 */
function extractAndVerifyToken(req: AuthRequest): {
  success: boolean;
  user?: {
    id: string;
    email: string;
    role: UserRole | "User";
    userRole?: string; // For User sub-roles (Student, Staff, Professor, TA)
    adminType?: string; // For Admin sub-roles (EventOffice, etc.)
  };
  message?: string;
} {
  const authHeader = req.headers.authorization;
  let token =
    typeof authHeader === "string"
      ? authHeader.replace("Bearer ", "")
      : undefined;

  console.log("=== Token Extraction ===");
  console.log("Authorization Header:", req.headers.authorization);
  console.log(
    "Extracted Token:",
    token ? `${token.substring(0, 20)}...` : "None"
  );

  // If not in header, try to get from cookies
  if (!token && req.cookies && req.cookies.token) {
    token = req.cookies.token;
    console.log(
      "Token from cookies:",
      token ? `${token.substring(0, 20)}...` : "None"
    );
  }

  if (!token) {
    console.log("❌ No token found in header or cookies");
    return {
      success: false,
      message: "Authentication required. No token provided.",
    };
  }

  try {
    const decoded = jwt.verify(token, JWT_SECRET, {
      algorithms: ["HS256"], // Or ['RS256'] if using asymmetric keys
    }) as {
      id: string;
      email: string;
      role: UserRole;
      userRole?: string;
      adminType?: string;
    };
    console.log("✅ Token verified successfully");
    console.log("Decoded user:", {
      id: decoded.id,
      email: decoded.email,
      role: decoded.role,
    });
    return {
      success: true,
      user: decoded,
    };
  } catch (error) {
    console.log(
      "❌ Token verification failed:",
      error instanceof Error ? error.message : "Unknown error"
    );
    return {
      success: false,
      message: "Invalid or expired token.",
    };
  }
}

/**
 * Requires a valid JWT token (any role)
 * Attaches user info to req.user
 */
export function loginRequired(
  req: AuthRequest,
  res: Response,
  next: NextFunction
): void | Response {
  const result = extractAndVerifyToken(req);

  if (!result.success) {
    return res.status(401).json({
      success: false,
      message: result.message,
    });
  }

  // Attach user info to request
  req.user = result.user;
  next();
}

/**
 * Requires Admin role
 * Must be used after loginRequired or will check token itself
 */
export function adminRequired(
  req: AuthRequest,
  res: Response,
  next: NextFunction
): void | Response {
  // If user is not already authenticated, verify token first
  if (!req.user) {
    const result = extractAndVerifyToken(req);

    if (!result.success) {
      return res.status(401).json({
        success: false,
        message: result.message,
      });
    }

    req.user = result.user;
  }

  if (!req.user || req.user.role !== "Admin") {
    return res.status(403).json({
      success: false,
      message: "Access denied. Admin privileges required.",
    });
  }

  next();
}

/**
 * Requires one of the specified roles
 * Usage: allowedRoles(['Admin', 'Vendor'])
 */
export function allowedRoles(roles: UserRole[]) {
  return (
    req: AuthRequest,
    res: Response,
    next: NextFunction
  ): void | Response => {
    // If user is not already authenticated, verify token first
    if (!req.user) {
      const result = extractAndVerifyToken(req);

      if (!result.success) {
        return res.status(401).json({
          success: false,
          message: result.message,
        });
      }

      req.user = result.user;
    }

    if (!req.user) {
      return res.status(403).json({
        success: false,
        message: `Access denied. Required roles: ${roles.join(", ")}`,
      });
    }

    const candidateRoles = new Set<UserRole | string>();

    if (req.user.role) {
      candidateRoles.add(req.user.role);
    }

    if (req.user.role === "User" && req.user.userRole) {
      candidateRoles.add(req.user.userRole);
    }

    if (req.user.role === "Admin" && req.user.adminType) {
      candidateRoles.add(req.user.adminType);
    }

    // Backward compatibility: normalize legacy "EventsOffice" tokens
    if (candidateRoles.has("EventsOffice")) {
      candidateRoles.add("EventOffice");
    }

    const hasRequiredRole = roles.some((allowedRole) =>
      candidateRoles.has(allowedRole)
    );

    if (!hasRequiredRole) {
      return res.status(403).json({
        success: false,
        message: `Access denied. Required roles: ${roles.join(", ")}`,
      });
    }

    next();
  };
}

/**
 * Attaches user info if token is valid, but doesn't block request if not
 */
export function optionalAuth() {
  return (
    req: AuthRequest,
    res: Response,
    next: NextFunction
  ): void | Response => {
    const result = extractAndVerifyToken(req);

    if (result.success) {
      req.user = result.user;
    }

    // Continue regardless of authentication status
    next();
  };
}

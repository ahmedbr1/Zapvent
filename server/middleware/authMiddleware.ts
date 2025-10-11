import { Request, Response, NextFunction } from "express";
import jwt from "jsonwebtoken";

// Replace the default-fallback with a fail-fast check
if (!process.env.JWT_SECRET) {
  throw new Error("JWT_SECRET is required for authentication");
}

const JWT_SECRET = process.env.JWT_SECRET;
export type UserRole = "User" | "Admin" | "Vendor" | "EventOffice";

export interface AuthRequest extends Request {
  user?: {
    id: string;
    email: string;
    role: UserRole;
    iat?: number;
    exp?: number;
    adminType?: string; // For Admin sub-roles (EventOffice, etc.)
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
    role: UserRole;
    userRole?: string; // For User sub-roles (Student, Staff, Professor, TA)
  };
  message?: string;
} {
  let token = req.headers.authorization?.replace("Bearer ", "");

  // If not in header, try to get from cookies
  if (!token && req.cookies && req.cookies.token) {
    token = req.cookies.token;
  }

  if (!token) {
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
    };
    return {
      success: true,
      user: decoded,
    };
  } catch {
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

    if (!req.user || !roles.includes(req.user.role)) {
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

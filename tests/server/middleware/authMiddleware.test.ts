process.env.JWT_SECRET = "test-secret-key-for-middleware-tests";

import { NextFunction, Response } from "express";
import jwt from "jsonwebtoken";
import {
  adminRequired,
  allowedRoles,
  AuthRequest,
  loginRequired,
  optionalAuth,
  UserRole,
} from "../../../server/middleware/authMiddleware";

describe("authMiddleware", () => {
  let mockReq: Partial<AuthRequest>;
  let mockRes: Partial<Response>;
  let mockNext: NextFunction;
  let jsonMock: jest.Mock;
  let statusMock: jest.Mock;

  const originalJwtSecret = process.env.JWT_SECRET;

  beforeAll(() => {
    // JWT_SECRET already set at module level
  });

  afterAll(() => {
    process.env.JWT_SECRET = originalJwtSecret;
  });

  beforeEach(() => {
    jsonMock = jest.fn();
    statusMock = jest.fn().mockReturnValue({ json: jsonMock });

    mockReq = {
      headers: {},
      cookies: {},
    };

    mockRes = {
      status: statusMock,
      json: jsonMock,
      headersSent: false,
    };

    mockNext = jest.fn();

    jest.spyOn(console, "log").mockImplementation(() => undefined);
    jest.spyOn(console, "error").mockImplementation(() => undefined);
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe("loginRequired", () => {
    it("should allow request with valid token in Authorization header", () => {
      const token = jwt.sign(
        { id: "user123", email: "user@example.com", role: "Student" },
        process.env.JWT_SECRET!
      );
      mockReq.headers = { authorization: `Bearer ${token}` };

      loginRequired(mockReq as AuthRequest, mockRes as Response, mockNext);

      expect(mockNext).toHaveBeenCalled();
      expect(mockReq.user).toBeDefined();
      expect(mockReq.user?.id).toBe("user123");
      expect(mockReq.user?.email).toBe("user@example.com");
      expect(mockReq.user?.role).toBe("Student");
    });

    it("should allow request with valid token in cookies", () => {
      const token = jwt.sign(
        { id: "user456", email: "prof@example.com", role: "Professor" },
        process.env.JWT_SECRET!
      );
      mockReq.cookies = { token };

      loginRequired(mockReq as AuthRequest, mockRes as Response, mockNext);

      expect(mockNext).toHaveBeenCalled();
      expect(mockReq.user).toBeDefined();
      expect(mockReq.user?.id).toBe("user456");
      expect(mockReq.user?.email).toBe("prof@example.com");
      expect(mockReq.user?.role).toBe("Professor");
    });

    it("should prioritize Authorization header over cookies", () => {
      const headerToken = jwt.sign(
        { id: "header-user", email: "header@example.com", role: "Staff" },
        process.env.JWT_SECRET!
      );
      const cookieToken = jwt.sign(
        { id: "cookie-user", email: "cookie@example.com", role: "Student" },
        process.env.JWT_SECRET!
      );

      mockReq.headers = { authorization: `Bearer ${headerToken}` };
      mockReq.cookies = { token: cookieToken };

      loginRequired(mockReq as AuthRequest, mockRes as Response, mockNext);

      expect(mockNext).toHaveBeenCalled();
      expect(mockReq.user?.id).toBe("header-user");
      expect(mockReq.user?.email).toBe("header@example.com");
    });

    it("should return 401 when no token is provided", () => {
      loginRequired(mockReq as AuthRequest, mockRes as Response, mockNext);

      expect(statusMock).toHaveBeenCalledWith(401);
      expect(jsonMock).toHaveBeenCalledWith({
        success: false,
        message: "Authentication required. No token provided.",
      });
      expect(mockNext).not.toHaveBeenCalled();
    });

    it("should return 401 when token is invalid", () => {
      mockReq.headers = { authorization: "Bearer invalid-token" };

      loginRequired(mockReq as AuthRequest, mockRes as Response, mockNext);

      expect(statusMock).toHaveBeenCalledWith(401);
      expect(jsonMock).toHaveBeenCalledWith({
        success: false,
        message: "Invalid or expired token.",
      });
      expect(mockNext).not.toHaveBeenCalled();
    });

    it("should return 401 when token is expired", () => {
      const token = jwt.sign(
        { id: "user123", email: "user@example.com", role: "Student" },
        process.env.JWT_SECRET!,
        { expiresIn: "-1h" }
      );
      mockReq.headers = { authorization: `Bearer ${token}` };

      loginRequired(mockReq as AuthRequest, mockRes as Response, mockNext);

      expect(statusMock).toHaveBeenCalledWith(401);
      expect(jsonMock).toHaveBeenCalledWith({
        success: false,
        message: "Invalid or expired token.",
      });
      expect(mockNext).not.toHaveBeenCalled();
    });

    it("should handle token with userRole for User type", () => {
      const token = jwt.sign(
        {
          id: "user123",
          email: "user@example.com",
          role: "User",
          userRole: "Student",
        },
        process.env.JWT_SECRET!
      );
      mockReq.headers = { authorization: `Bearer ${token}` };

      loginRequired(mockReq as AuthRequest, mockRes as Response, mockNext);

      expect(mockNext).toHaveBeenCalled();
      expect(mockReq.user?.role).toBe("User");
      expect(mockReq.user?.userRole).toBe("Student");
    });

    it("should handle token with adminType for Admin type", () => {
      const token = jwt.sign(
        {
          id: "admin123",
          email: "admin@example.com",
          role: "Admin",
          adminType: "EventOffice",
        },
        process.env.JWT_SECRET!
      );
      mockReq.headers = { authorization: `Bearer ${token}` };

      loginRequired(mockReq as AuthRequest, mockRes as Response, mockNext);

      expect(mockNext).toHaveBeenCalled();
      expect(mockReq.user?.role).toBe("Admin");
      expect(mockReq.user?.adminType).toBe("EventOffice");
    });

    it("should handle token without Bearer prefix", () => {
      const token = jwt.sign(
        { id: "user123", email: "user@example.com", role: "Student" },
        process.env.JWT_SECRET!
      );
      mockReq.headers = { authorization: token };

      loginRequired(mockReq as AuthRequest, mockRes as Response, mockNext);

      expect(mockNext).toHaveBeenCalled();
      expect(mockReq.user).toBeDefined();
      expect(mockReq.user?.id).toBe("user123");
    });

    it("should handle empty Authorization header", () => {
      mockReq.headers = { authorization: "" };

      loginRequired(mockReq as AuthRequest, mockRes as Response, mockNext);

      expect(statusMock).toHaveBeenCalledWith(401);
      expect(jsonMock).toHaveBeenCalledWith({
        success: false,
        message: "Authentication required. No token provided.",
      });
      expect(mockNext).not.toHaveBeenCalled();
    });

    it("should handle token signed with wrong secret", () => {
      const token = jwt.sign(
        { id: "user123", email: "user@example.com", role: "Student" },
        "wrong-secret"
      );
      mockReq.headers = { authorization: `Bearer ${token}` };

      loginRequired(mockReq as AuthRequest, mockRes as Response, mockNext);

      expect(statusMock).toHaveBeenCalledWith(401);
      expect(jsonMock).toHaveBeenCalledWith({
        success: false,
        message: "Invalid or expired token.",
      });
      expect(mockNext).not.toHaveBeenCalled();
    });
  });

  describe("adminRequired", () => {
    it("should allow request with valid Admin token", () => {
      const token = jwt.sign(
        { id: "admin123", email: "admin@example.com", role: "Admin" },
        process.env.JWT_SECRET!
      );
      mockReq.headers = { authorization: `Bearer ${token}` };

      adminRequired(mockReq as AuthRequest, mockRes as Response, mockNext);

      expect(mockNext).toHaveBeenCalled();
      expect(mockReq.user?.role).toBe("Admin");
    });

    it("should allow request when user is already authenticated as Admin", () => {
      mockReq.user = {
        id: "admin123",
        email: "admin@example.com",
        role: "Admin",
      };

      adminRequired(mockReq as AuthRequest, mockRes as Response, mockNext);

      expect(mockNext).toHaveBeenCalled();
    });

    it("should return 403 when user is not Admin", () => {
      const token = jwt.sign(
        { id: "user123", email: "user@example.com", role: "Student" },
        process.env.JWT_SECRET!
      );
      mockReq.headers = { authorization: `Bearer ${token}` };

      adminRequired(mockReq as AuthRequest, mockRes as Response, mockNext);

      expect(statusMock).toHaveBeenCalledWith(403);
      expect(jsonMock).toHaveBeenCalledWith({
        success: false,
        message: "Access denied. Admin privileges required.",
      });
      expect(mockNext).not.toHaveBeenCalled();
    });

    it("should return 401 when no token is provided", () => {
      adminRequired(mockReq as AuthRequest, mockRes as Response, mockNext);

      expect(statusMock).toHaveBeenCalledWith(401);
      expect(jsonMock).toHaveBeenCalledWith({
        success: false,
        message: "Authentication required. No token provided.",
      });
      expect(mockNext).not.toHaveBeenCalled();
    });

    it("should return 401 when token is invalid", () => {
      mockReq.headers = { authorization: "Bearer invalid-token" };

      adminRequired(mockReq as AuthRequest, mockRes as Response, mockNext);

      expect(statusMock).toHaveBeenCalledWith(401);
      expect(jsonMock).toHaveBeenCalledWith({
        success: false,
        message: "Invalid or expired token.",
      });
      expect(mockNext).not.toHaveBeenCalled();
    });

    it("should return 403 when authenticated user is not Admin", () => {
      mockReq.user = {
        id: "user123",
        email: "user@example.com",
        role: "Professor",
      };

      adminRequired(mockReq as AuthRequest, mockRes as Response, mockNext);

      expect(statusMock).toHaveBeenCalledWith(403);
      expect(jsonMock).toHaveBeenCalledWith({
        success: false,
        message: "Access denied. Admin privileges required.",
      });
      expect(mockNext).not.toHaveBeenCalled();
    });

    it("should handle Admin with adminType", () => {
      const token = jwt.sign(
        {
          id: "admin123",
          email: "admin@example.com",
          role: "Admin",
          adminType: "EventOffice",
        },
        process.env.JWT_SECRET!
      );
      mockReq.headers = { authorization: `Bearer ${token}` };

      adminRequired(mockReq as AuthRequest, mockRes as Response, mockNext);

      expect(mockNext).toHaveBeenCalled();
      expect(mockReq.user?.adminType).toBe("EventOffice");
    });

    it("should return 403 for Vendor role", () => {
      const token = jwt.sign(
        { id: "vendor123", email: "vendor@example.com", role: "Vendor" },
        process.env.JWT_SECRET!
      );
      mockReq.headers = { authorization: `Bearer ${token}` };

      adminRequired(mockReq as AuthRequest, mockRes as Response, mockNext);

      expect(statusMock).toHaveBeenCalledWith(403);
      expect(mockNext).not.toHaveBeenCalled();
    });
  });

  describe("allowedRoles", () => {
    it("should allow request with matching role", () => {
      const token = jwt.sign(
        { id: "user123", email: "user@example.com", role: "Student" },
        process.env.JWT_SECRET!
      );
      mockReq.headers = { authorization: `Bearer ${token}` };

      const middleware = allowedRoles(["Student", "Professor"]);
      middleware(mockReq as AuthRequest, mockRes as Response, mockNext);

      expect(mockNext).toHaveBeenCalled();
    });

    it("should allow request with Admin role when Admin is in allowed roles", () => {
      const token = jwt.sign(
        { id: "admin123", email: "admin@example.com", role: "Admin" },
        process.env.JWT_SECRET!
      );
      mockReq.headers = { authorization: `Bearer ${token}` };

      const middleware = allowedRoles(["Admin", "Vendor"]);
      middleware(mockReq as AuthRequest, mockRes as Response, mockNext);

      expect(mockNext).toHaveBeenCalled();
    });

    it("should allow request when user is already authenticated with matching role", () => {
      mockReq.user = {
        id: "user123",
        email: "user@example.com",
        role: "Professor",
      };

      const middleware = allowedRoles(["Professor", "TA"]);
      middleware(mockReq as AuthRequest, mockRes as Response, mockNext);

      expect(mockNext).toHaveBeenCalled();
    });

    it("should return 403 when role does not match", () => {
      const token = jwt.sign(
        { id: "user123", email: "user@example.com", role: "Student" },
        process.env.JWT_SECRET!
      );
      mockReq.headers = { authorization: `Bearer ${token}` };

      const middleware = allowedRoles(["Professor", "Staff"]);
      middleware(mockReq as AuthRequest, mockRes as Response, mockNext);

      expect(statusMock).toHaveBeenCalledWith(403);
      expect(jsonMock).toHaveBeenCalledWith({
        success: false,
        message: "Access denied. Required roles: Professor, Staff",
      });
      expect(mockNext).not.toHaveBeenCalled();
    });

    it("should return 401 when no token is provided", () => {
      const middleware = allowedRoles(["Student"]);
      middleware(mockReq as AuthRequest, mockRes as Response, mockNext);

      expect(statusMock).toHaveBeenCalledWith(401);
      expect(jsonMock).toHaveBeenCalledWith({
        success: false,
        message: "Authentication required. No token provided.",
      });
      expect(mockNext).not.toHaveBeenCalled();
    });

    it("should return 401 when token is invalid", () => {
      mockReq.headers = { authorization: "Bearer invalid-token" };

      const middleware = allowedRoles(["Student"]);
      middleware(mockReq as AuthRequest, mockRes as Response, mockNext);

      expect(statusMock).toHaveBeenCalledWith(401);
      expect(mockNext).not.toHaveBeenCalled();
    });

    it("should handle User role with userRole matching allowed roles", () => {
      const token = jwt.sign(
        {
          id: "user123",
          email: "user@example.com",
          role: "User",
          userRole: "Professor",
        },
        process.env.JWT_SECRET!
      );
      mockReq.headers = { authorization: `Bearer ${token}` };

      const middleware = allowedRoles(["Professor", "TA"]);
      middleware(mockReq as AuthRequest, mockRes as Response, mockNext);

      expect(mockNext).toHaveBeenCalled();
    });

    it("should handle Admin with adminType matching allowed roles", () => {
      const token = jwt.sign(
        {
          id: "admin123",
          email: "admin@example.com",
          role: "Admin",
          adminType: "EventOffice",
        },
        process.env.JWT_SECRET!
      );
      mockReq.headers = { authorization: `Bearer ${token}` };

      const middleware = allowedRoles(["EventOffice", "Vendor"]);
      middleware(mockReq as AuthRequest, mockRes as Response, mockNext);

      expect(mockNext).toHaveBeenCalled();
    });

    it("should handle backward compatibility for EventsOffice -> EventOffice", () => {
      const token = jwt.sign(
        {
          id: "admin123",
          email: "admin@example.com",
          role: "Admin",
          adminType: "EventsOffice",
        },
        process.env.JWT_SECRET!
      );
      mockReq.headers = { authorization: `Bearer ${token}` };

      const middleware = allowedRoles(["EventOffice"]);
      middleware(mockReq as AuthRequest, mockRes as Response, mockNext);

      expect(mockNext).toHaveBeenCalled();
    });

    it("should allow multiple matching roles", () => {
      const token = jwt.sign(
        { id: "user123", email: "user@example.com", role: "TA" },
        process.env.JWT_SECRET!
      );
      mockReq.headers = { authorization: `Bearer ${token}` };

      const middleware = allowedRoles(["Student", "TA", "Professor", "Staff"]);
      middleware(mockReq as AuthRequest, mockRes as Response, mockNext);

      expect(mockNext).toHaveBeenCalled();
    });

    it("should return 403 when User role without matching userRole", () => {
      const token = jwt.sign(
        {
          id: "user123",
          email: "user@example.com",
          role: "User",
          userRole: "Student",
        },
        process.env.JWT_SECRET!
      );
      mockReq.headers = { authorization: `Bearer ${token}` };

      const middleware = allowedRoles(["Professor", "Staff"]);
      middleware(mockReq as AuthRequest, mockRes as Response, mockNext);

      expect(statusMock).toHaveBeenCalledWith(403);
      expect(mockNext).not.toHaveBeenCalled();
    });

    it("should return 403 when Admin adminType does not match", () => {
      const token = jwt.sign(
        {
          id: "admin123",
          email: "admin@example.com",
          role: "Admin",
          adminType: "SuperAdmin",
        },
        process.env.JWT_SECRET!
      );
      mockReq.headers = { authorization: `Bearer ${token}` };

      const middleware = allowedRoles(["EventOffice", "Vendor"]);
      middleware(mockReq as AuthRequest, mockRes as Response, mockNext);

      expect(statusMock).toHaveBeenCalledWith(403);
      expect(mockNext).not.toHaveBeenCalled();
    });

    it("should allow Vendor role when Vendor is in allowed roles", () => {
      const token = jwt.sign(
        { id: "vendor123", email: "vendor@example.com", role: "Vendor" },
        process.env.JWT_SECRET!
      );
      mockReq.headers = { authorization: `Bearer ${token}` };

      const middleware = allowedRoles(["Vendor", "Admin"]);
      middleware(mockReq as AuthRequest, mockRes as Response, mockNext);

      expect(mockNext).toHaveBeenCalled();
    });

    it("should handle single role in array", () => {
      const token = jwt.sign(
        { id: "user123", email: "user@example.com", role: "Staff" },
        process.env.JWT_SECRET!
      );
      mockReq.headers = { authorization: `Bearer ${token}` };

      const middleware = allowedRoles(["Staff"]);
      middleware(mockReq as AuthRequest, mockRes as Response, mockNext);

      expect(mockNext).toHaveBeenCalled();
    });

    it("should handle empty roles array (should deny all)", () => {
      const token = jwt.sign(
        { id: "user123", email: "user@example.com", role: "Student" },
        process.env.JWT_SECRET!
      );
      mockReq.headers = { authorization: `Bearer ${token}` };

      const middleware = allowedRoles([]);
      middleware(mockReq as AuthRequest, mockRes as Response, mockNext);

      expect(statusMock).toHaveBeenCalledWith(403);
      expect(mockNext).not.toHaveBeenCalled();
    });
  });

  describe("optionalAuth", () => {
    it("should attach user when valid token is provided", () => {
      const token = jwt.sign(
        { id: "user123", email: "user@example.com", role: "Student" },
        process.env.JWT_SECRET!
      );
      mockReq.headers = { authorization: `Bearer ${token}` };

      const middleware = optionalAuth();
      middleware(mockReq as AuthRequest, mockRes as Response, mockNext);

      expect(mockNext).toHaveBeenCalled();
      expect(mockReq.user).toBeDefined();
      expect(mockReq.user?.id).toBe("user123");
      expect(mockReq.user?.email).toBe("user@example.com");
      expect(mockReq.user?.role).toBe("Student");
    });

    it("should proceed without user when no token is provided", () => {
      const middleware = optionalAuth();
      middleware(mockReq as AuthRequest, mockRes as Response, mockNext);

      expect(mockNext).toHaveBeenCalled();
      expect(mockReq.user).toBeUndefined();
      expect(statusMock).not.toHaveBeenCalled();
    });

    it("should proceed without user when token is invalid", () => {
      mockReq.headers = { authorization: "Bearer invalid-token" };

      const middleware = optionalAuth();
      middleware(mockReq as AuthRequest, mockRes as Response, mockNext);

      expect(mockNext).toHaveBeenCalled();
      expect(mockReq.user).toBeUndefined();
      expect(statusMock).not.toHaveBeenCalled();
    });

    it("should proceed without user when token is expired", () => {
      const token = jwt.sign(
        { id: "user123", email: "user@example.com", role: "Student" },
        process.env.JWT_SECRET!,
        { expiresIn: "-1h" }
      );
      mockReq.headers = { authorization: `Bearer ${token}` };

      const middleware = optionalAuth();
      middleware(mockReq as AuthRequest, mockRes as Response, mockNext);

      expect(mockNext).toHaveBeenCalled();
      expect(mockReq.user).toBeUndefined();
      expect(statusMock).not.toHaveBeenCalled();
    });

    it("should attach user from cookie when provided", () => {
      const token = jwt.sign(
        { id: "user456", email: "prof@example.com", role: "Professor" },
        process.env.JWT_SECRET!
      );
      mockReq.cookies = { token };

      const middleware = optionalAuth();
      middleware(mockReq as AuthRequest, mockRes as Response, mockNext);

      expect(mockNext).toHaveBeenCalled();
      expect(mockReq.user).toBeDefined();
      expect(mockReq.user?.id).toBe("user456");
      expect(mockReq.user?.role).toBe("Professor");
    });

    it("should attach user with userRole when provided", () => {
      const token = jwt.sign(
        {
          id: "user123",
          email: "user@example.com",
          role: "User",
          userRole: "TA",
        },
        process.env.JWT_SECRET!
      );
      mockReq.headers = { authorization: `Bearer ${token}` };

      const middleware = optionalAuth();
      middleware(mockReq as AuthRequest, mockRes as Response, mockNext);

      expect(mockNext).toHaveBeenCalled();
      expect(mockReq.user?.role).toBe("User");
      expect(mockReq.user?.userRole).toBe("TA");
    });

    it("should attach user with adminType when provided", () => {
      const token = jwt.sign(
        {
          id: "admin123",
          email: "admin@example.com",
          role: "Admin",
          adminType: "EventOffice",
        },
        process.env.JWT_SECRET!
      );
      mockReq.headers = { authorization: `Bearer ${token}` };

      const middleware = optionalAuth();
      middleware(mockReq as AuthRequest, mockRes as Response, mockNext);

      expect(mockNext).toHaveBeenCalled();
      expect(mockReq.user?.role).toBe("Admin");
      expect(mockReq.user?.adminType).toBe("EventOffice");
    });

    it("should not block request for any role", () => {
      const roles: UserRole[] = [
        "Student",
        "Professor",
        "Staff",
        "TA",
        "Admin",
        "Vendor",
        "EventOffice",
      ];

      roles.forEach((role) => {
        const token = jwt.sign(
          { id: "user123", email: "user@example.com", role },
          process.env.JWT_SECRET!
        );
        mockReq.headers = { authorization: `Bearer ${token}` };
        mockReq.user = undefined;
        jest.clearAllMocks();

        const middleware = optionalAuth();
        middleware(mockReq as AuthRequest, mockRes as Response, mockNext);

        expect(mockNext).toHaveBeenCalled();
        expect(statusMock).not.toHaveBeenCalled();
      });
    });
  });
});

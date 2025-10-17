import { UserRole } from "@/lib/types";
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import { MongoMemoryServer } from "mongodb-memory-server";
import mongoose from "mongoose";
import AdminModel from "../../../server/models/Admin";
import UserModel from "../../../server/models/User";
import VendorModel from "../../../server/models/Vendor";
import {
  loginAdmin,
  loginUser,
  loginVendor,
  verifyToken,
} from "../../../server/services/loginService";

let mongoServer: MongoMemoryServer;

const JWT_SECRET =
  process.env.JWT_SECRET || "your-secret-key-change-in-production";

beforeAll(async () => {
  mongoServer = await MongoMemoryServer.create();
  const mongoUri = mongoServer.getUri();
  await mongoose.connect(mongoUri);
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
});

describe("loginUser", () => {
  const validUserData = {
    studentId: "2023001",
    firstName: "John",
    lastName: "Doe",
    email: "john.doe@example.com",
    password: "password123",
    role: "Student",
    status: "Active",
    verified: true,
  };

  it("should successfully login with valid credentials", async () => {
    const user = new UserModel(validUserData);
    await user.save();

    const result = await loginUser(validUserData.email, validUserData.password);

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.token).toBeDefined();
      expect(result.user.email).toBe(validUserData.email);
      expect(result.user.role).toBe("User");
      expect(result.user.firstName).toBe(validUserData.firstName);
      expect(result.user.lastName).toBe(validUserData.lastName);
      expect(result.user.userRole).toBe(validUserData.role);
      expect(result.user.verified).toBe(true);
      expect(result.user.id).toBeDefined();
    }
  });

  it("should return valid JWT token that can be decoded", async () => {
    const user = new UserModel(validUserData);
    await user.save();

    const result = await loginUser(validUserData.email, validUserData.password);

    expect(result.success).toBe(true);
    if (result.success) {
      const decoded = jwt.verify(result.token, JWT_SECRET) as {
        email: string;
        role: string;
        userRole: string;
        id: string;
        exp: number;
        iat: number;
      };
      expect(decoded.email).toBe(validUserData.email);
      expect(decoded.role).toBe("User");
      expect(decoded.userRole).toBe(validUserData.role);
      expect(decoded.id).toBeDefined();
      expect(decoded.exp).toBeDefined();
      expect(decoded.iat).toBeDefined();
    }
  });

  it("should fail with non-existent email", async () => {
    const result = await loginUser("nonexistent@example.com", "password123");

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.message).toBe("Invalid email or password");
    }
  });

  it("should fail with incorrect password", async () => {
    const user = new UserModel(validUserData);
    await user.save();

    const result = await loginUser(validUserData.email, "wrongpassword");

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.message).toBe("Invalid email or password");
    }
  });

  it("should fail when user is not verified", async () => {
    const unverifiedUser = new UserModel({ ...validUserData, verified: false });
    await unverifiedUser.save();

    const result = await loginUser(validUserData.email, validUserData.password);

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.message).toBe(
        "Please verify your email before logging in."
      );
    }
  });

  it("should fail when user is blocked", async () => {
    const blockedUser = new UserModel({ ...validUserData, status: "Blocked" });
    await blockedUser.save();

    const result = await loginUser(validUserData.email, validUserData.password);

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.message).toBe(
        "Account is blocked. Please contact support."
      );
    }
  });

  //   it("should handle database errors gracefully", async () => {
  //     jest
  //       .spyOn(UserModel, "findOne")
  //       .mockRejectedValueOnce(new Error("Database error"));

  //     const result = await loginUser(validUserData.email, validUserData.password);

  //     expect(result.success).toBe(false);
  //     if (!result.success) {
  //       expect(result.message).toBe(
  //         "An error occurred during login. Please try again."
  //       );
  //     }
  //   });

  it("should handle bcrypt comparison errors", async () => {
    const user = new UserModel(validUserData);
    await user.save();

    jest
      .spyOn(bcrypt, "compare")
      .mockRejectedValueOnce(new Error("Bcrypt error"));

    const result = await loginUser(validUserData.email, validUserData.password);

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.message).toBe(
        "An error occurred during login. Please try again."
      );
    }
  });

  it("should include user balance in response", async () => {
    const userWithBalance = new UserModel({ ...validUserData, balance: 100 });
    await userWithBalance.save();

    const result = await loginUser(validUserData.email, validUserData.password);

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.user.balance).toBe(100);
    }
  });

  it("should work with different user roles", async () => {
    for (const role of Object.values(UserRole)) {
      let user;
      if (role === "Staff" || role === "Professor" || role === "TA") {
        user = new UserModel({
          firstName: "Staff",
          lastName: "User",
          email: `${role}@test.com`,
          password: validUserData.password,
          role,
          status: "Active",
          staffId: `S2023${role}`,
          verified: true,
        });
      } else {
        user = new UserModel({
          ...validUserData,
          email: `${role}@test.com`,
          role,
        });
      }
      await user.save();

      const result = await loginUser(
        `${role}@test.com`,
        validUserData.password
      );
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.user.userRole).toBe(role);
      }
    }
  });
});

describe("loginAdmin", () => {
  const validAdminData = {
    adminType: "Admin" as const,
    firstName: "Admin",
    lastName: "User",
    email: "admin@example.com",
    password: "adminpass123",
    status: "Active" as const,
  };

  it("should successfully login with valid credentials", async () => {
    const admin = new AdminModel(validAdminData);
    await admin.save();

    const result = await loginAdmin(
      validAdminData.email,
      validAdminData.password
    );

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.token).toBeDefined();
      expect(result.user.email).toBe(validAdminData.email);
      expect(result.user.role).toBe("Admin");
      expect(result.user.firstName).toBe(validAdminData.firstName);
      expect(result.user.lastName).toBe(validAdminData.lastName);
      expect(result.user.status).toBe(validAdminData.status);
      expect(result.user.id).toBeDefined();
    }
  });

  it("should return valid JWT token for admin", async () => {
    const admin = new AdminModel(validAdminData);
    await admin.save();

    const result = await loginAdmin(
      validAdminData.email,
      validAdminData.password
    );

    expect(result.success).toBe(true);
    if (result.success) {
      const decoded = jwt.verify(result.token, JWT_SECRET) as {
        email: string;
        role: string;
        id: string;
      };
      expect(decoded.email).toBe(validAdminData.email);
      expect(decoded.role).toBe("Admin");
      expect(decoded.id).toBeDefined();
    }
  });

  it("should fail with non-existent admin email", async () => {
    const result = await loginAdmin("nonexistent@example.com", "password123");

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.message).toBe("Invalid email or password");
    }
  });

  it("should fail with incorrect password", async () => {
    const admin = new AdminModel(validAdminData);
    await admin.save();

    const result = await loginAdmin(validAdminData.email, "wrongpassword");

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.message).toBe("Invalid email or password");
    }
  });

  it("should fail when admin is blocked", async () => {
    const blockedAdmin = new AdminModel({
      ...validAdminData,
      status: "Blocked" as const,
    });
    await blockedAdmin.save();

    const result = await loginAdmin(
      validAdminData.email,
      validAdminData.password
    );

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.message).toBe(
        "Account is blocked. Please contact support."
      );
    }
  });

  //   it("should handle database errors gracefully", async () => {
  //     jest
  //       .spyOn(AdminModel, "findOne")
  //       .mockRejectedValueOnce(new Error("Database error"));

  //     const result = await loginAdmin(
  //       validAdminData.email,
  //       validAdminData.password
  //     );

  //     expect(result.success).toBe(false);
  //     if (!result.success) {
  //       expect(result.message).toBe(
  //         "An error occurred during login. Please try again."
  //       );
  //     }
  //   });

  it("should handle JWT signing errors", async () => {
    const admin = new AdminModel(validAdminData);
    await admin.save();

    jest.spyOn(jwt, "sign").mockImplementationOnce(() => {
      throw new Error("JWT signing error");
    });

    const result = await loginAdmin(
      validAdminData.email,
      validAdminData.password
    );

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.message).toBe(
        "An error occurred during login. Please try again."
      );
    }
  });
});

describe("loginVendor", () => {
  const validVendorData = {
    email: "vendor@example.com",
    password: "vendorpass123",
    companyName: "ABC Company",
    docuements: "https://example.com/docs.pdf",
    logo: "https://example.com/logo.png",
    taxCard: "https://example.com/tax.pdf",
    loyaltyForum: "https://example.com/forum",
    isVerified: true,
    status: "approved" as const,
  };

  it("should successfully login with valid credentials", async () => {
    const vendor = new VendorModel(validVendorData);
    await vendor.save();

    const result = await loginVendor(
      validVendorData.email,
      validVendorData.password
    );

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.token).toBeDefined();
      expect(result.user.email).toBe(validVendorData.email);
      expect(result.user.role).toBe("Vendor");
      expect(result.user.companyName).toBe(validVendorData.companyName);
      expect(result.user.logo).toBe(validVendorData.logo);
      expect(result.user.id).toBeDefined();
    }
  });

  it("should return valid JWT token for vendor", async () => {
    const vendor = new VendorModel(validVendorData);
    await vendor.save();

    const result = await loginVendor(
      validVendorData.email,
      validVendorData.password
    );

    expect(result.success).toBe(true);
    if (result.success) {
      const decoded = jwt.verify(result.token, JWT_SECRET) as {
        email: string;
        role: string;
        id: string;
      };
      expect(decoded.email).toBe(validVendorData.email);
      expect(decoded.role).toBe("Vendor");
      expect(decoded.id).toBeDefined();
    }
  });

  it("should fail with non-existent vendor email", async () => {
    const result = await loginVendor("nonexistent@example.com", "password123");

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.message).toBe("Invalid email or password");
    }
  });

  it("should fail with incorrect password", async () => {
    const vendor = new VendorModel(validVendorData);
    await vendor.save();

    const result = await loginVendor(validVendorData.email, "wrongpassword");

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.message).toBe("Invalid email or password");
    }
  });

  //   it("should handle database errors gracefully", async () => {
  //     jest
  //       .spyOn(VendorModel, "findOne")
  //       .mockRejectedValueOnce(new Error("Database error"));

  //     const result = await loginVendor(
  //       validVendorData.email,
  //       validVendorData.password
  //     );

  //     expect(result.success).toBe(false);
  //     if (!result.success) {
  //       expect(result.message).toBe(
  //         "An error occurred during login. Please try again."
  //       );
  //     }
  //   });

  it("should handle password with special characters", async () => {
    const vendorWithSpecialPassword = new VendorModel({
      ...validVendorData,
      password: "P@ssw0rd!#$%",
    });
    await vendorWithSpecialPassword.save();

    const result = await loginVendor(validVendorData.email, "P@ssw0rd!#$%");

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.token).toBeDefined();
    }
  });
});

describe("verifyToken", () => {
  it("should verify valid token", () => {
    const payload = { id: "123", email: "test@example.com", role: "User" };
    const token = jwt.sign(payload, JWT_SECRET, {
      algorithm: "HS256",
      expiresIn: 3600,
    });

    const result = verifyToken(token);

    expect(result).not.toBeNull();
    if (result && typeof result !== "string") {
      expect(result.email).toBe(payload.email);
      expect(result.role).toBe(payload.role);
    }
  });

  it("should return null for invalid token", () => {
    const result = verifyToken("invalid.token.here");

    expect(result).toBeNull();
  });

  it("should return null for expired token", () => {
    const payload = { id: "123", email: "test@example.com", role: "User" };
    const token = jwt.sign(payload, JWT_SECRET, {
      algorithm: "HS256",
      expiresIn: -1,
    });

    const result = verifyToken(token);

    expect(result).toBeNull();
  });

  it("should return null for token with wrong secret", () => {
    const payload = { id: "123", email: "test@example.com", role: "User" };
    const token = jwt.sign(payload, "wrong-secret", {
      algorithm: "HS256",
      expiresIn: 3600,
    });

    const result = verifyToken(token);

    expect(result).toBeNull();
  });

  it("should return null for malformed token", () => {
    const result = verifyToken("not-a-jwt-token");

    expect(result).toBeNull();
  });

  it("should return null for empty token", () => {
    const result = verifyToken("");

    expect(result).toBeNull();
  });

  it("should verify token with all user types", () => {
    const userTypes = ["User", "Admin", "Vendor"];

    userTypes.forEach((role) => {
      const payload = {
        id: "123",
        email: `${role.toLowerCase()}@example.com`,
        role,
      };
      const token = jwt.sign(payload, JWT_SECRET, {
        algorithm: "HS256",
        expiresIn: 3600,
      });

      const result = verifyToken(token);

      expect(result).not.toBeNull();
      if (result && typeof result !== "string") {
        expect(result.role).toBe(role);
      }
    });
  });

  it("should decode token with correct expiration", () => {
    const payload = { id: "123", email: "test@example.com", role: "User" };
    const expiresIn = 7200;
    const token = jwt.sign(payload, JWT_SECRET, {
      algorithm: "HS256",
      expiresIn,
    });

    const result = verifyToken(token);

    expect(result).not.toBeNull();
    if (result && typeof result !== "string") {
      expect(result.exp).toBeDefined();
      expect(result.iat).toBeDefined();
      if (result.exp && result.iat) {
        expect(result.exp - result.iat).toBe(expiresIn);
      }
    }
  });
});

describe("Edge Cases and Security", () => {
  it("should handle SQL injection attempts in email", async () => {
    const result = await loginUser("'; DROP TABLE users; --", "password");

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.message).toBe("Invalid email or password");
    }
  });

  it("should handle very long passwords", async () => {
    const longPassword = "a".repeat(1000);
    const validUserData = {
      studentId: "2023001",
      firstName: "Test",
      lastName: "User",
      email: "test@example.com",
      password: longPassword,
      role: "Student",
      status: "Active",
      verified: true,
    };

    const user = new UserModel(validUserData);
    await user.save();

    const result = await loginUser(validUserData.email, longPassword);

    expect(result.success).toBe(true);
  });

  it("should handle email case insensitivity", async () => {
    const validUserData = {
      studentId: "2023001",
      firstName: "Test",
      lastName: "User",
      email: "test@example.com",
      password: "password123",
      role: "Student",
      status: "Active",
      verified: true,
    };

    const user = new UserModel(validUserData);
    await user.save();

    const resultLower = await loginUser("test@example.com", "password123");
    const resultUpper = await loginUser("TEST@EXAMPLE.COM", "password123");
    const resultMixed = await loginUser("TeSt@ExAmPlE.cOm", "password123");

    expect(resultLower.success).toBe(true);
    expect(resultUpper.success).toBe(false);
    expect(resultMixed.success).toBe(false);
  });

  it("should not leak information about whether email exists", async () => {
    const validUserData = {
      studentId: "2023001",
      firstName: "Test",
      lastName: "User",
      email: "existing@example.com",
      password: "password123",
      role: "Student",
      status: "Active",
      verified: true,
    };

    const user = new UserModel(validUserData);
    await user.save();

    const nonExistentResult = await loginUser(
      "nonexistent@example.com",
      "password123"
    );
    const wrongPasswordResult = await loginUser(
      "existing@example.com",
      "wrongpassword"
    );

    expect(nonExistentResult.message).toBe(wrongPasswordResult.message);
  });

  it("should handle null and undefined inputs", async () => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const result1 = await loginUser(null as any, "password");
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const result2 = await loginUser("email@test.com", null as any);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const result3 = await loginUser(undefined as any, undefined as any);

    expect(result1.success).toBe(false);
    expect(result2.success).toBe(false);
    expect(result3.success).toBe(false);
  });

  it("should handle empty strings", async () => {
    const result1 = await loginUser("", "password");
    const result2 = await loginUser("email@test.com", "");

    expect(result1.success).toBe(false);
    expect(result2.success).toBe(false);
  });
});

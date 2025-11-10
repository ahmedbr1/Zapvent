import { Request, Response } from "express";
import { loginUser, loginAdmin, loginVendor } from "../services/loginService";
import { verifyEmailByToken } from "../services/emailVerificationService";

const TOKEN_EXPIRY = (() => {
  const raw = process.env.JWT_EXPIRES_IN;
  if (!raw) return 24 * 60 * 60 * 1000;
  const value = Number(raw);
  if (!Number.isFinite(value) || value <= 0) {
    throw new Error("JWT_EXPIRES_IN must be a positive number (seconds)");
  }
  return value * 1000;
})();

const frontendLoginUrl = `${process.env.FRONTEND_URL || "http://localhost:3000"}/login/user`;

export default class LoginController {
  async userLoginController(req: Request, res: Response) {
    try {
      const { email, password } = req.body;
      if (!email || !password) {
        return res.status(400).json({
          success: false,
          message: "Email and password are required",
        });
      }

      const result = await loginUser(email, password);

      if (!result.success) {
        return res.status(401).json(result);
      }

      res.cookie("token", result.token, {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: "strict",
        maxAge: TOKEN_EXPIRY,
      });
      return res.status(200).json(result);
    } catch (error) {
      console.error("User login controller error:", error);
      return res.status(500).json({
        success: false,
        message: "Internal server error",
      });
    }
  }

  async adminLoginController(req: Request, res: Response) {
    try {
      const { email, password } = req.body;

      if (!email || !password) {
        return res.status(400).json({
          success: false,
          message: "Email and password are required",
        });
      }

      const result = await loginAdmin(email, password);

      if (!result.success) {
        return res.status(401).json(result);
      }

      res.cookie("token", result.token, {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: "strict",
        maxAge: TOKEN_EXPIRY,
      });
      return res.status(200).json(result);
    } catch (error) {
      console.error("Admin login controller error:", error);
      return res.status(500).json({
        success: false,
        message: "Internal server error",
      });
    }
  }

  async vendorLoginController(req: Request, res: Response) {
    try {
      const { email, password } = req.body;
      if (!email || !password) {
        return res.status(400).json({
          success: false,
          message: "Email and password are required",
        });
      }

      const result = await loginVendor(email, password);

      if (!result.success) {
        return res.status(401).json(result);
      }

      res.cookie("token", result.token, {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: "strict",
        maxAge: TOKEN_EXPIRY,
      });
      return res.status(200).json(result);
    } catch (error) {
      console.error("Vendor login controller error:", error);
      return res.status(500).json({
        success: false,
        message: "Internal server error",
      });
    }
  }

  async verifyEmailLink(req: Request, res: Response) {
    try {
      const tokenParam = typeof req.query.token === "string" ? req.query.token : undefined;
      const result = await verifyEmailByToken(tokenParam);

      const redirectTarget = new URL(frontendLoginUrl);
      redirectTarget.searchParams.set(
        "verification",
        result.success ? "success" : "failed"
      );
      if (!result.success) {
        redirectTarget.searchParams.set("reason", result.reason);
      }

      return res.redirect(redirectTarget.toString());
    } catch (error) {
      console.error("Email verification error:", error);
      const fallback = new URL(frontendLoginUrl);
      fallback.searchParams.set("verification", "failed");
      fallback.searchParams.set("reason", "server-error");
      return res.redirect(fallback.toString());
    }
  }
}

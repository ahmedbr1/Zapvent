import { Request, Response } from "express";
import { loginUser, loginAdmin, loginVendor } from "../services/loginService";

const TOKEN_EXPIRY = process.env.JWT_EXPIRES_IN
  ? parseInt(process.env.JWT_EXPIRES_IN) * 1000 // Convert seconds to milliseconds
  : 24 * 60 * 60 * 1000; // Default to 24 hours in milliseconds

export async function userLoginController(req: Request, res: Response) {
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

export async function adminLoginController(req: Request, res: Response) {
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

export async function vendorLoginController(req: Request, res: Response) {
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

import { Request, Response } from "express";
import * as vendorService from "../services/vendorService";
import { z } from "zod";


export async function vendorSignup(req: Request, res: Response) {
  try {
    const vendor = await vendorService.signup(req.body);
    
    res.status(201).json({
      success: true,
      message: 'Vendor registered successfully. Please complete your profile.',
      data: vendor
    });

  } catch (error) {
    // Handle Zod validation errors
    if (error instanceof z.ZodError) {
      return res.status(400).json({
        success: false,
        message: 'Validation failed',
        errors: error.issues
      });
    }
    
    // Handle MongoDB duplicate key errors
    if (error && typeof error === 'object' && 'code' in error && error.code === 11000) {
      return res.status(400).json({
        success: false,
        message: 'Email already exists'
      });
    }
    
    // Handle other errors
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
}
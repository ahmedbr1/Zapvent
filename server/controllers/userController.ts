import { Request, Response } from "express";
import * as userService from "../services/userService";
import UserModel, { userRole } from "../models/User";
import { z } from "zod";

export async function getUsers(req: Request, res: Response) {
  const users = await userService.findAll();
  res.json(users);
}

export async function createUser(req: Request, res: Response) {
  const data = req.body;
  const user = await userService.create(data);
  res.status(201).json(user);
}

const SignupSchema = z.object({
  firstName: z
    .string()
    .min(2, { message: 'First name must be at least 2 characters long.' })
    .max(20, { message: 'First name must be at most 20 characters long.' })
    .trim(),
  lastName: z
    .string()
    .min(2, { message: 'Last name must be at least 2 characters long.' })
    .max(20, { message: 'Last name must be at most 20 characters long.' })
    .trim(),
  email: z
    .string()
    .email({ message: 'Please enter a valid email.' })
    .trim(),
  password: z
    .string()
    .min(8, { message: 'Password must be at least 8 characters long' })
    .max(20, { message: 'Password must be at most 20 characters long' })
    .regex(/[a-zA-Z]/, { message: 'Password must contain at least one letter.' })
    .regex(/[0-9]/, { message: 'Password must contain at least one number.' })
    .regex(/[^a-zA-Z0-9]/, { message: 'Password must contain at least one special character.' })
    .trim(),
  role: z.enum(["Student", "Staff", "Professor", "TA"], { message: 'Please select a valid role.' }),
  studentId: z.string().optional(),
  staffId: z.string().optional(),
})
.refine((data) => {
  // Custom validation: students must have studentId
  if (data.role === userRole.STUDENT) {
    return data.studentId && data.studentId.length > 0;
  }
  return true;
}, {
  message: 'Student ID is required for students.',
  path: ['studentId']
})
.refine((data) => {
  // Custom validation: staff/professors/TAs must have staffId
  if ([userRole.STAFF, userRole.PROFESSOR, userRole.TA].includes(data.role)) {
    return data.staffId && data.staffId.length > 0;
  }
  return true;
}, {
  message: 'Staff ID is required for staff, professors, and TAs.',
  path: ['staffId']
});

export async function signup(req: Request, res: Response) {
  try {
    // Step 1: Validate input with Zod
    const validatedData = SignupSchema.parse(req.body);
    
    // Step 2: Create user (password will be auto-hashed by your pre-save hook)
    const user = new UserModel(validatedData);
    await user.save();
    
    // Step 3: Return success (without password)
    const { password, ...userWithoutPassword } = user.toObject();
    res.status(201).json({
      success: true,
      message: 'User registered successfully',
      data: userWithoutPassword
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
    
    // Handle MongoDB duplicate key errors (email/studentId/staffId already exists)
    if (error && typeof error === 'object' && 'code' in error && error.code === 11000) {
      const field = Object.keys((error as any).keyPattern)[0];
      return res.status(400).json({
        success: false,
        message: `${field} already exists`
      });
    }
    
    // Handle other errors
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
}
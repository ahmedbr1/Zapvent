import UserModel, { IUser } from "../models/User";
import { z } from "zod";

export async function findAll() {
  return UserModel.find().lean();
}

export async function create(data: Partial<IUser>) {
  const doc = new UserModel(data);
  return doc.save();
}


// Zod schema for validation
export const SignupSchema = z.object({
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
  if (data.role === "Student") {
    return data.studentId && data.studentId.length > 0;
  }
  return true;
}, {
  message: 'Student ID is required for students.',
  path: ['studentId']
})
.refine((data) => {
  if (["Staff", "Professor", "TA"].includes(data.role)) {
    return data.staffId && data.staffId.length > 0;
  }
  return true;
}, {
  message: 'Staff ID is required for staff, professors, and TAs.',
  path: ['staffId']
});

export type SignupData = z.infer<typeof SignupSchema>;


// New signup service function
export async function signup(userData: SignupData) {
  // Validate with Zod
  const validatedData = SignupSchema.parse(userData);
  
  const user = new UserModel(validatedData);
  await user.save();
  
  // Return user without password
  const userWithoutPassword = user.toObject();
  delete (userWithoutPassword as Partial<IUser>).password;
  return userWithoutPassword;
}

import UserModel, { IUser, userRole } from "../models/User";
import { z } from "zod";
import { Types } from "mongoose";
import EventModel, { IEvent } from "../models/Event";

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
  role: z.nativeEnum(userRole, { message: 'Please select a valid role.' }),
  studentId: z.string().optional(),
  staffId: z.string().optional(),
})
.refine((data) => {
  if (data.role === userRole.STUDENT) {
    return data.studentId && data.studentId.length > 0;
  }
  return true;
}, {
  message: 'Student ID is required for students.',
  path: ['studentId']
})
.refine((data) => {
  if ([userRole.STAFF, userRole.PROFESSOR, userRole.TA].includes(data.role)) {
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

  // status message based on role
  const message = [userRole.STAFF, userRole.PROFESSOR, userRole.TA].includes(user.role)
  ? 'Registration submitted successfully. Your account is pending admin approval.'
  : 'Registration completed successfully. You can now log in.';

  return { user: userWithoutPassword, message, needsApproval: !user.verified };
}
export interface IUserRegisteredEventItem {
  id: string;
  name: string;
  location: string;
  startDate: Date;
  endDate: Date;
  registrationDeadline: Date;
}

export interface IUserRegisteredEventsResponse {
  success: boolean;
  message: string;
  data?: IUserRegisteredEventItem[];
}

export async function findRegisteredEvents(
  userId: string,
): Promise<IUserRegisteredEventsResponse> {
  try {
    const user = await UserModel.findById(userId).lean<IUser | null>();

    if (!user) {
      return {
        success: false,
        message: "User not found.",
      };
    }

    const eventIds = user.registeredEvents ?? [];
    if (eventIds.length === 0) {
      return {
        success: true,
        message: "No registered events found.",
        data: [],
      };
    }

    const events = await EventModel.find({
      _id: { $in: eventIds },
    }).lean<Array<IEvent & { _id: Types.ObjectId }>>();

    const formattedEvents: IUserRegisteredEventItem[] = events.map((event) => ({
      id: event._id.toString(),
      name: event.name,
      location: event.location,
      startDate: event.startDate,
      endDate: event.endDate,
      registrationDeadline: event.registrationDeadline,
    }));

    return {
      success: true,
      message: "Registered events successfully retrieved.",
      data: formattedEvents,
    };
  } catch (error) {
    console.error("Error fetching registered events:", error);
    return {
      success: false,
      message: "An error occurred while fetching registered events.",
    };
  }
}


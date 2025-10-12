import { Types } from "mongoose";
import UserModel, { IUser } from "../models/User";
import EventModel, { IEvent } from "../models/Event";

export async function findAll() {
  return UserModel.find().lean();
}

// TODO: Replace 'any' with a proper type/interface for user data
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export async function create(data: any) {
  const doc = new UserModel(data);
  return doc.save();
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

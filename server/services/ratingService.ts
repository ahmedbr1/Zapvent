import { Types } from "mongoose";
import { z } from "zod";
import RatingModel, { IRating } from "../models/Rating";
import EventModel, { IEvent } from "../models/Event";
import UserModel, { IUser } from "../models/User";

type ServiceResponse<T> = {
  success: boolean;
  message: string;
  statusCode?: number;
  data?: T;
};

const ratingInputSchema = z.object({
  eventId: z
    .string()
    .trim()
    .min(1, "Event id is required."),
  rating: z
    .number()
    .min(0, "Rating must be between 0 and 5.")
    .max(5, "Rating must be between 0 and 5."),
  comment: z
    .string()
    .trim()
    .max(1000, "Comments cannot exceed 1000 characters.")
    .optional(),
});

export type SubmitRatingInput = z.infer<typeof ratingInputSchema>;

async function loadUserAndEvent(userId: string, eventId: string) {
  const [user, event] = await Promise.all([
    UserModel.findById(userId)
      .select(["role", "registeredEvents"])
      .lean<IUser | null>(),
    EventModel.findById(eventId)
      .select(["name", "startDate", "endDate", "date", "registeredUsers"])
      .lean<IEvent | null>(),
  ]);

  return { user, event };
}

function userAttendedEvent(user: IUser, event: IEvent, eventId: string, userId: string) {
  const userWasRegistered =
    (user.registeredEvents ?? []).some((id) => id === eventId) ||
    (event.registeredUsers ?? []).some((id) => id === userId);

  return userWasRegistered;
}

function eventHasStarted(event: IEvent): boolean {
  const referenceDate =
    event.endDate ??
    event.startDate ??
    ("date" in event && event.date instanceof Date ? event.date : undefined);

  if (!referenceDate) {
    return true;
  }

  return new Date(referenceDate).getTime() <= Date.now();
}

type RatingDoc = (IRating & { _id: Types.ObjectId }) & {
  event: Types.ObjectId;
  user?: { _id: Types.ObjectId; firstName?: string; lastName?: string; role?: string };
};

function serializeRating(rating: RatingDoc) {
  return {
    id: rating._id.toString(),
    rating: rating.rating,
    comment: rating.comment,
    eventId: rating.event.toString(),
    user: rating.user
      ? {
          id: rating.user._id.toString(),
          firstName: rating.user.firstName ?? "",
          lastName: rating.user.lastName ?? "",
          role: rating.user.role ?? "",
        }
      : undefined,
    createdAt: rating.createdAt,
    updatedAt: rating.updatedAt,
  };
}

export async function submitRating(
  userId: string,
  payload: SubmitRatingInput
): Promise<ServiceResponse<ReturnType<typeof serializeRating>>> {
  const parsed = ratingInputSchema.safeParse(payload);
  if (!parsed.success) {
    return {
      success: false,
      message: parsed.error.issues.map((issue) => issue.message).join(", "),
      statusCode: 400,
    };
  }

  const { eventId, rating, comment } = parsed.data;

  if (!Types.ObjectId.isValid(eventId)) {
    return {
      success: false,
      message: "Invalid event identifier.",
      statusCode: 400,
    };
  }

  const { user, event } = await loadUserAndEvent(userId, eventId);

  if (!user) {
    return {
      success: false,
      message: "User not found.",
      statusCode: 404,
    };
  }

  if (!event) {
    return {
      success: false,
      message: "Event not found.",
      statusCode: 404,
    };
  }

  if (!userAttendedEvent(user, event, eventId, userId)) {
    return {
      success: false,
      message: "You can only rate events you attended.",
      statusCode: 403,
    };
  }

  if (!eventHasStarted(event)) {
    return {
      success: false,
      message: "Ratings are only available after the event starts.",
      statusCode: 400,
    };
  }

  const ratingDoc = await RatingModel.findOneAndUpdate(
    { user: userId, event: eventId },
    { $set: { rating, comment } },
    {
      upsert: true,
      new: true,
      setDefaultsOnInsert: true,
    }
  )
    .populate("user", ["firstName", "lastName", "role"])
    .lean<
      (RatingDoc & {
        user: { _id: Types.ObjectId; firstName?: string; lastName?: string; role?: string };
      }) | null
    >();

  return {
    success: true,
    message: "Rating saved successfully.",
    data: ratingDoc ? serializeRating(ratingDoc) : undefined,
  };
}

type RatingSummary = {
  event: {
    id: string;
    name: string;
    startDate?: Date;
    endDate?: Date;
  };
  averageRating: number;
  totalRatings: number;
  ratings: ReturnType<typeof serializeRating>[];
};

export async function getEventRatings(eventId: string): Promise<ServiceResponse<RatingSummary>> {
  if (!Types.ObjectId.isValid(eventId)) {
    return {
      success: false,
      message: "Invalid event identifier.",
      statusCode: 400,
    };
  }

  const event = await EventModel.findById(eventId)
    .select(["name", "startDate", "endDate"])
    .lean<IEvent | null>();

  if (!event) {
    return {
      success: false,
      message: "Event not found.",
      statusCode: 404,
    };
  }

  const ratingDocs = await RatingModel.find({ event: eventId })
    .sort({ createdAt: -1 })
    .populate("user", ["firstName", "lastName", "role"])
    .lean<
      Array<
        (RatingDoc & {
          user?: { _id: Types.ObjectId; firstName?: string; lastName?: string; role?: string };
        })
      >
    >();

  const ratings = ratingDocs.map(serializeRating);
  const total = ratings.length;
  const average =
    total === 0 ? 0 : ratings.reduce((sum, entry) => sum + entry.rating, 0) / total;

  return {
    success: true,
    message: "Ratings retrieved successfully.",
    data: {
      event: {
        id: (event as unknown as { _id: Types.ObjectId })._id.toString(),
        name: event.name,
        startDate: event.startDate,
        endDate: event.endDate,
      },
      averageRating: Number(average.toFixed(2)),
      totalRatings: total,
      ratings,
    },
  };
}

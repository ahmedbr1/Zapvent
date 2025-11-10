import { Types } from "mongoose";
import { z } from "zod";
import CommentModel, { CommentStatus, IComment } from "../models/Comment";
import EventModel, { IEvent } from "../models/Event";
import UserModel, { IUser } from "../models/User";
import { emailService } from "./emailService";

type ServiceResponse<T> = {
  success: boolean;
  message: string;
  statusCode?: number;
  data?: T;
};

const commentInputSchema = z.object({
  eventId: z
    .string()
    .trim()
    .min(1, "Event id is required."),
  content: z
    .string()
    .trim()
    .min(1, "Comment content is required.")
    .max(2000, "Comments cannot exceed 2000 characters."),
  parentCommentId: z.string().trim().min(1).optional(),
});

export type CreateCommentInput = z.infer<typeof commentInputSchema>;

type CommentView = {
  id: string;
  content: string;
  eventId: string;
  user: {
    id: string;
    firstName?: string;
    lastName?: string;
    role?: string;
  };
  status?: CommentStatus;
  parentCommentId?: string;
  createdAt: Date;
  updatedAt: Date;
};

const warningEligibleRoles = new Set(["Student", "Staff", "Professor", "TA", "EventOffice"]);

type CommentDoc = (IComment & { _id: Types.ObjectId }) & {
  event: Types.ObjectId;
  parentComment?: Types.ObjectId | null;
  user: { _id: Types.ObjectId; firstName?: string; lastName?: string; role?: string };
};

function buildCommentResponse(comment: CommentDoc): CommentView {
  return {
    id: comment._id.toString(),
    content: comment.content,
    eventId: (comment.event as Types.ObjectId).toString(),
    user: {
      id: comment.user._id.toString(),
      firstName: comment.user.firstName,
      lastName: comment.user.lastName,
      role: comment.user.role,
    },
    status: comment.status,
    parentCommentId: comment.parentComment
      ? (comment.parentComment as Types.ObjectId).toString()
      : undefined,
    createdAt: comment.createdAt,
    updatedAt: comment.updatedAt,
  };
}

async function ensureUserAndEvent(userId: string, eventId: string) {
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

function hasUserAttendedEvent(user: IUser, event: IEvent, userId: string, eventId: string) {
  const registeredOnUser =
    (user.registeredEvents ?? []).some((id) => id === eventId) ||
    (event.registeredUsers ?? []).some((id) => id === userId);

  return registeredOnUser;
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

export async function createComment(
  userId: string,
  payload: CreateCommentInput
): Promise<ServiceResponse<CommentView>> {
  const parsed = commentInputSchema.safeParse(payload);

  if (!parsed.success) {
    return {
      success: false,
      message: parsed.error.issues.map((issue) => issue.message).join(", "),
      statusCode: 400,
    };
  }

  const { eventId, content, parentCommentId } = parsed.data;

  if (!Types.ObjectId.isValid(eventId)) {
    return {
      success: false,
      message: "Invalid event identifier.",
      statusCode: 400,
    };
  }

  if (parentCommentId && !Types.ObjectId.isValid(parentCommentId)) {
    return {
      success: false,
      message: "Invalid parent comment identifier.",
      statusCode: 400,
    };
  }

  const { user, event } = await ensureUserAndEvent(userId, eventId);

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

  if (!hasUserAttendedEvent(user, event, userId, eventId)) {
    return {
      success: false,
      message: "You can only comment on events you attended.",
      statusCode: 403,
    };
  }

  if (!eventHasStarted(event)) {
    return {
      success: false,
      message: "Comments are only available after the event starts.",
      statusCode: 400,
    };
  }

  if (parentCommentId) {
    const parentComment = await CommentModel.findById(parentCommentId).lean<IComment | null>();
    if (!parentComment || parentComment.event.toString() !== eventId) {
      return {
        success: false,
        message: "Parent comment not found for this event.",
        statusCode: 404,
      };
    }
  }

  const newComment = await CommentModel.create({
    user: userId,
    event: eventId,
    content,
    parentComment: parentCommentId,
  });

  const populated = await CommentModel.findById(newComment._id)
    .populate("user", ["firstName", "lastName", "role"])
    .lean<CommentDoc | null>();

  return {
    success: true,
    message: "Comment added successfully.",
    data: populated ? buildCommentResponse(populated) : undefined,
  };
}

export async function getEventComments(eventId: string): Promise<ServiceResponse<CommentView[]>> {
  if (!Types.ObjectId.isValid(eventId)) {
    return {
      success: false,
      message: "Invalid event identifier.",
      statusCode: 400,
    };
  }

  const eventExists = await EventModel.exists({ _id: eventId });
  if (!eventExists) {
    return {
      success: false,
      message: "Event not found.",
      statusCode: 404,
    };
  }

  const comments = await CommentModel.find({
    event: eventId,
    status: { $ne: CommentStatus.HIDDEN },
  })
    .sort({ createdAt: -1 })
    .populate("user", ["firstName", "lastName", "role"])
    .lean<
      Array<
        (IComment & { _id: Types.ObjectId }) & {
          user: { _id: Types.ObjectId; firstName?: string; lastName?: string; role?: string };
        }
      >
    >();

  return {
    success: true,
    message: "Comments retrieved successfully.",
    data: comments.map(buildCommentResponse),
  };
}

type DeleteCommentResult = {
  deletedCommentId: string;
};

export async function deleteCommentAsAdmin(
  commentId: string,
  reason?: string
): Promise<ServiceResponse<DeleteCommentResult>> {
  if (!Types.ObjectId.isValid(commentId)) {
    return {
      success: false,
      message: "Invalid comment identifier.",
      statusCode: 400,
    };
  }

  const comment = await CommentModel.findById(commentId)
    .populate("user", ["email", "firstName", "lastName", "role"])
    .populate("event", ["name", "startDate", "endDate", "date"])
    .lean<
      | ((IComment & { _id: Types.ObjectId }) & {
            user:
              | ((IUser & { _id: Types.ObjectId }) & { email: string })
              | Types.ObjectId;
            event:
              | ((IEvent & { _id: Types.ObjectId }) & { name: string })
              | Types.ObjectId;
          })
      | null
    >();

  if (!comment) {
    return {
      success: false,
      message: "Comment not found.",
      statusCode: 404,
    };
  }

  await CommentModel.deleteOne({ _id: commentId });

  const user =
    comment.user && typeof comment.user === "object" && "email" in comment.user
      ? (comment.user as IUser & { _id: Types.ObjectId })
      : null;

  const event =
    comment.event && typeof comment.event === "object" && "name" in comment.event
      ? (comment.event as IEvent & { _id: Types.ObjectId })
      : null;

  if (user && warningEligibleRoles.has(user.role)) {
    try {
      await emailService.sendCommentDeletionWarning({
        user,
        eventName: event?.name ?? "an event",
        eventDate: event?.endDate ?? event?.startDate ?? event?.date,
        commentContent: comment.content,
        reason,
      });
    } catch (error) {
      console.error("Failed to send comment deletion warning email:", error);
    }
  }

  return {
    success: true,
    message: "Comment deleted successfully.",
    data: { deletedCommentId: commentId },
  };
}

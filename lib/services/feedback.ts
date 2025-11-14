import { apiFetch } from "@/lib/api-client";
import type {
  EventComment,
  EventFeedbackPayload,
  EventRatingEntry,
  EventRatingsSummary,
} from "@/lib/types";

interface RatingApiEntry {
  id: string;
  rating: number;
  comment?: string;
  eventId: string;
  user?: {
    id: string;
    firstName?: string;
    lastName?: string;
    role?: string;
  };
  createdAt?: string;
  updatedAt?: string;
}

interface CommentApiEntry {
  id: string;
  content: string;
  eventId: string;
  user?: {
    id: string;
    firstName?: string;
    lastName?: string;
    role?: string;
  };
  parentCommentId?: string;
  status?: string;
  createdAt: string;
  updatedAt: string;
}

interface FeedbackResponse {
  success: boolean;
  message?: string;
  data?: {
    ratings?: {
      event: {
        id: string;
        name: string;
        startDate?: string;
        endDate?: string;
      };
      averageRating: number;
      totalRatings: number;
      ratings: RatingApiEntry[];
    };
    comments?: CommentApiEntry[];
  };
}

interface RatingMutationResponse {
  success: boolean;
  message: string;
  data?: RatingApiEntry;
}

interface CommentMutationResponse {
  success: boolean;
  message: string;
  data?: CommentApiEntry;
}

function mapRatingEntry(entry: RatingApiEntry): EventRatingEntry {
  return {
    id: entry.id,
    rating: entry.rating,
    comment: entry.comment,
    eventId: entry.eventId,
    user: entry.user,
    createdAt: entry.createdAt,
    updatedAt: entry.updatedAt,
  };
}

function mapCommentEntry(entry: CommentApiEntry): EventComment {
  return {
    id: entry.id,
    content: entry.content,
    eventId: entry.eventId,
    user: entry.user,
    parentCommentId: entry.parentCommentId,
    status: entry.status,
    createdAt: entry.createdAt,
    updatedAt: entry.updatedAt,
  };
}

export async function fetchEventFeedback(eventId: string, token?: string): Promise<EventFeedbackPayload> {
  const response = await apiFetch<FeedbackResponse>(`/ratings/events/${eventId}/feedback`, {
    method: "GET",
    token,
  });

  if (!response.success) {
    throw new Error(response.message ?? "Failed to load event feedback");
  }

  const ratingsData = response.data?.ratings;
  const commentsData = response.data?.comments ?? [];

  return {
    ratings: ratingsData
      ? {
          event: {
            id: ratingsData.event.id,
            name: ratingsData.event.name,
            startDate: ratingsData.event.startDate,
            endDate: ratingsData.event.endDate,
          },
          averageRating: ratingsData.averageRating,
          totalRatings: ratingsData.totalRatings,
          ratings: ratingsData.ratings.map(mapRatingEntry),
        }
      : ({
          event: { id: eventId, name: "Event" },
          averageRating: 0,
          totalRatings: 0,
          ratings: [],
        } satisfies EventRatingsSummary),
    comments: commentsData.map(mapCommentEntry),
  };
}

export interface SubmitRatingPayload {
  rating: number;
  comment?: string;
}

export async function submitEventRating(
  eventId: string,
  payload: SubmitRatingPayload,
  token?: string
) {
  const response = await apiFetch<RatingMutationResponse, SubmitRatingPayload>(
    `/ratings/events/${eventId}`,
    {
      method: "POST",
      body: payload,
      token,
    }
  );

  if (!response.success) {
    throw new Error(response.message ?? "Failed to submit rating");
  }

  return {
    message: response.message,
    rating: response.data ? mapRatingEntry(response.data) : undefined,
  };
}

export interface SubmitCommentPayload {
  content: string;
  parentCommentId?: string;
}

export async function submitEventComment(
  eventId: string,
  payload: SubmitCommentPayload,
  token?: string
) {
  const response = await apiFetch<CommentMutationResponse, SubmitCommentPayload>(
    `/comments/events/${eventId}`,
    {
      method: "POST",
      body: payload,
      token,
    }
  );

  if (!response.success) {
    throw new Error(response.message ?? "Failed to submit comment");
  }

  return {
    message: response.message,
    comment: response.data ? mapCommentEntry(response.data) : undefined,
  };
}

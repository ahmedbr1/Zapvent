import { apiFetch } from "@/lib/api-client";
import type { GymSession, GymSessionType } from "@/lib/types";

interface GymScheduleResponse {
  success: boolean;
  message: string;
  data?: Array<{
    _id: string;
    date: string;
    time: string;
    duration: number;
    type: GymSessionType;
    maxParticipants: number;
    registeredCount?: number;
    registeredUsers?: string[];
  }>;
}

interface CreateGymSessionRequest {
  date: string;
  time: string;
  duration: number;
  type: GymSessionType;
  maxParticipants: number;
}

interface MutationResponse {
  success: boolean;
  message: string;
  data?: unknown;
}

export async function fetchGymSchedule(year: number, month: number, token?: string) {
  const response = await apiFetch<GymScheduleResponse>(`/gym-sessions/schedule?year=${year}&month=${month}`, {
    token,
  });

  if (!response.success) {
    throw new Error(response.message ?? "Failed to load gym schedule");
  }

  return (response.data ?? []).map<GymSession>((session) => ({
    id: session._id,
    date: session.date,
    time: session.time,
    duration: session.duration,
    type: session.type,
    maxParticipants: session.maxParticipants,
    registeredUsers: Array.isArray(session.registeredUsers) ? session.registeredUsers : [],
    registeredCount:
      typeof session.registeredCount === "number"
        ? session.registeredCount
        : Array.isArray(session.registeredUsers)
          ? session.registeredUsers.length
          : 0,
  }));
}

interface RegisterResponse {
  success: boolean;
  message: string;
  data?: {
    remainingSlots: number;
  };
}

export async function registerForGymSession(sessionId: string, token?: string) {
  const response = await apiFetch<RegisterResponse>(`/gym-sessions/${sessionId}/register`, {
    method: "POST",
    token,
  });

  if (!response.success) {
    throw new Error(response.message ?? "Failed to register for gym session");
  }

  return {
    remainingSlots: response.data?.remainingSlots,
    message: response.message,
  };
}

export async function createGymSession(payload: CreateGymSessionRequest, token?: string) {
  return apiFetch<MutationResponse, CreateGymSessionRequest>("/gym-sessions", {
    method: "POST",
    body: payload,
    token,
  });
}

export async function updateGymSession(id: string, payload: Partial<CreateGymSessionRequest>, token?: string) {
  return apiFetch<MutationResponse, Partial<CreateGymSessionRequest>>(`/gym-sessions/${id}`, {
    method: "PUT",
    body: payload,
    token,
  });
}

export async function deleteGymSession(id: string, token?: string) {
  return apiFetch<MutationResponse>(`/gym-sessions/${id}`, {
    method: "DELETE",
    token,
  });
}

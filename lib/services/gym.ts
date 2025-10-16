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
    registeredCount: session.registeredCount,
  }));
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

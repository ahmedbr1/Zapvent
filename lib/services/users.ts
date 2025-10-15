import { apiFetch } from "@/lib/api-client";
import type { UserRegisteredEvent } from "@/lib/types";

interface RegisteredEventsResponse {
  success: boolean;
  message: string;
  data?: UserRegisteredEvent[];
}

export async function fetchUserRegisteredEvents(userId: string, token?: string) {
  const response = await apiFetch<RegisteredEventsResponse>(`/users/${userId}/registered-events`, {
    token,
  });

  if (!response.success) {
    throw new Error(response.message ?? "Failed to load registered events");
  }

  return response.data ?? [];
}

import { apiFetch } from "@/lib/api-client";
import type {
  FavoriteEvent,
  ProfessorSummary,
  UserRegisteredEvent,
  WalletSummary,
} from "@/lib/types";

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

interface ProfessorsResponse {
  success: boolean;
  data?: ProfessorSummary[];
  message?: string;
}

export async function fetchProfessors(token?: string) {
  const response = await apiFetch<ProfessorsResponse>("/users/professors", {
    token,
  });

  if (!response.success) {
    throw new Error(response.message ?? "Failed to load professors");
  }

  return response.data ?? [];
}

interface FavoriteEventsResponse {
  success: boolean;
  message: string;
  data?: Array<{
    id: string;
    name: string;
    description: string;
    eventType: string;
    location: string;
    startDate: string;
    endDate: string;
    price?: number;
  }>;
}

interface FavoriteMutationResponse {
  success: boolean;
  message: string;
  data?: {
    favorites: string[];
  };
}

export async function fetchFavoriteEvents(token?: string): Promise<FavoriteEvent[]> {
  const response = await apiFetch<FavoriteEventsResponse>("/users/favorites", {
    method: "GET",
    token,
  });

  if (!response.success) {
    throw new Error(response.message ?? "Failed to load favorites");
  }

  return (response.data ?? []).map((item) => ({
    id: item.id,
    name: item.name,
    description: item.description,
    eventType: item.eventType,
    location: item.location,
    startDate: item.startDate,
    endDate: item.endDate,
    price: item.price,
  }));
}

export async function addEventToFavorites(eventId: string, token?: string) {
  const response = await apiFetch<FavoriteMutationResponse>(
    `/users/favorites/${eventId}`,
    {
      method: "POST",
      token,
    }
  );

  if (!response.success) {
    throw new Error(response.message ?? "Failed to update favorites");
  }

  return {
    favorites: response.data?.favorites ?? [],
    message: response.message ?? "Favorites updated successfully.",
  };
}

interface WalletSummaryResponse {
  success: boolean;
  message: string;
  data?: WalletSummary;
}

export async function fetchWalletSummary(token?: string): Promise<WalletSummary> {
  const response = await apiFetch<WalletSummaryResponse>("/users/wallet/refunds", {
    method: "GET",
    token,
  });

  if (!response.success) {
    throw new Error(response.message ?? "Failed to load wallet summary");
  }

  return (
    response.data ?? {
      balance: 0,
      totalRefunded: 0,
      refunds: [],
    }
  );
}

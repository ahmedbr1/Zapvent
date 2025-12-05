import { apiFetch } from "@/lib/api-client";

// ============ Types ============

export enum FriendRequestStatus {
  PENDING = "pending",
  ACCEPTED = "accepted",
  REJECTED = "rejected",
}

export interface FriendSummary {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  role: string;
}

export interface FriendRequest {
  odId: string;
  odName: string;
  status: FriendRequestStatus;
  createdAt: string;
}

export interface FriendsAttending {
  eventId: string;
  friends: Array<{ id: string; name: string }>;
}

export interface PrivacySettings {
  hideEventAttendance: boolean;
}

// Response types
export interface FriendsListResponse {
  success: boolean;
  data?: FriendSummary[];
  message?: string;
}

export interface FriendRequestsResponse {
  success: boolean;
  data?: {
    received: FriendRequest[];
    sent: FriendRequest[];
  };
  message?: string;
}

export interface FriendsAttendingResponse {
  success: boolean;
  data?: Array<{ id: string; name: string }>;
  message?: string;
}

export interface FriendsAttendingBulkResponse {
  success: boolean;
  data?: FriendsAttending[];
  message?: string;
}

export interface SearchStudentsResponse {
  success: boolean;
  data?: Array<{
    id: string;
    firstName: string;
    lastName: string;
    email: string;
    isFriend: boolean;
    hasPendingRequest: boolean;
  }>;
  message?: string;
}

export interface PrivacySettingsResponse {
  success: boolean;
  data?: PrivacySettings;
  message?: string;
}

// ============ API Functions ============

export async function getFriendsList(
  token: string
): Promise<FriendsListResponse> {
  return apiFetch<FriendsListResponse>("/friends", { token });
}

export async function searchStudents(
  query: string,
  token: string,
  limit?: number
): Promise<SearchStudentsResponse> {
  const params = new URLSearchParams({ query });
  if (limit) params.set("limit", limit.toString());
  return apiFetch<SearchStudentsResponse>(
    `/friends/search?${params.toString()}`,
    { token }
  );
}

export async function getPendingFriendRequests(
  token: string
): Promise<FriendRequestsResponse> {
  return apiFetch<FriendRequestsResponse>("/friends/requests", { token });
}

export async function sendFriendRequest(
  userId: string,
  token: string
): Promise<{ success: boolean; message?: string }> {
  return apiFetch<{ success: boolean; message?: string }>(
    `/friends/request/${userId}`,
    {
      method: "POST",
      token,
    }
  );
}

export async function acceptFriendRequest(
  userId: string,
  token: string
): Promise<{ success: boolean; message?: string }> {
  return apiFetch<{ success: boolean; message?: string }>(
    `/friends/accept/${userId}`,
    {
      method: "POST",
      token,
    }
  );
}

export async function rejectFriendRequest(
  userId: string,
  token: string
): Promise<{ success: boolean; message?: string }> {
  return apiFetch<{ success: boolean; message?: string }>(
    `/friends/reject/${userId}`,
    {
      method: "POST",
      token,
    }
  );
}

export async function cancelFriendRequest(
  userId: string,
  token: string
): Promise<{ success: boolean; message?: string }> {
  return apiFetch<{ success: boolean; message?: string }>(
    `/friends/cancel/${userId}`,
    {
      method: "DELETE",
      token,
    }
  );
}

export async function removeFriend(
  userId: string,
  token: string
): Promise<{ success: boolean; message?: string }> {
  return apiFetch<{ success: boolean; message?: string }>(
    `/friends/${userId}`,
    {
      method: "DELETE",
      token,
    }
  );
}

export async function getFriendsAttendingEvent(
  eventId: string,
  token: string
): Promise<FriendsAttendingResponse> {
  return apiFetch<FriendsAttendingResponse>(`/friends/attending/${eventId}`, {
    token,
  });
}

export async function getFriendsAttendingEvents(
  eventIds: string[],
  token: string
): Promise<FriendsAttendingBulkResponse> {
  return apiFetch<FriendsAttendingBulkResponse>("/friends/attending/bulk", {
    method: "POST",
    body: { eventIds },
    token,
  });
}

export async function updatePrivacySettings(
  settings: PrivacySettings,
  token: string
): Promise<PrivacySettingsResponse> {
  return apiFetch<PrivacySettingsResponse>("/friends/privacy", {
    method: "PUT",
    body: settings,
    token,
  });
}

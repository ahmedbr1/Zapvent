import { apiFetch } from "@/lib/api-client";
import type { NotificationEntry, NotificationList } from "@/lib/types";

interface NotificationsResponse {
  success: boolean;
  message?: string;
  data?: {
    notifications?: NotificationEntry[];
  };
  notifications?: NotificationEntry[];
}

export async function fetchUserNotifications(token?: string): Promise<NotificationList> {
  const response = await apiFetch<NotificationsResponse>("/users/professor-notifications", {
    method: "GET",
    token,
  });

  if (!response.success) {
    throw new Error(response.message ?? "Failed to load notifications");
  }

  const notifications =
    response.data?.notifications ?? response.notifications ?? [];

  return {
    notifications,
  };
}

export async function fetchEventOfficeNotifications(token?: string): Promise<NotificationList> {
  const response = await apiFetch<NotificationsResponse>("/admin/notifications", {
    method: "GET",
    token,
  });

  if (!response.success) {
    throw new Error(response.message ?? "Failed to load notifications");
  }

  const notifications =
    response.data?.notifications ?? response.notifications ?? [];

  return {
    notifications,
  };
}

interface MarkResponse {
  success: boolean;
  message?: string;
}

export async function markUserNotificationsSeen(token?: string) {
  const response = await apiFetch<MarkResponse>("/users/professor-notifications/seen", {
    method: "PATCH",
    token,
  });

  if (!response.success) {
    throw new Error(response.message ?? "Failed to update notifications");
  }

  return response;
}

export async function markEventOfficeNotificationsSeen(token?: string) {
  const response = await apiFetch<MarkResponse>("/admin/notifications/seen", {
    method: "PATCH",
    token,
  });

  if (!response.success) {
    throw new Error(response.message ?? "Failed to update notifications");
  }

  return response;
}

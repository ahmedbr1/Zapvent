import { apiFetch } from "@/lib/api-client";

interface CourtsResponse {
  success: boolean;
  message: string;
  data?: Array<{
    id: string;
    type: string;
    venue: string;
    openingHours?: unknown;
    exceptions?: unknown;
  }>;
}

export async function fetchCourts(token?: string) {
  const response = await apiFetch<CourtsResponse>("/courts", {
    token,
  });

  if (!response.success) {
    throw new Error(response.message ?? "Failed to load courts");
  }

  return response.data ?? [];
}

import { apiFetch } from "@/lib/api-client";

// ============ Types ============

export enum MediaType {
  VIDEO = "video",
  IMAGE = "image",
}

export interface ConferenceVideoSummary {
  id: string;
  eventId: string;
  eventName: string;
  uploadedById: string;
  uploadedByName: string;
  title: string;
  description?: string;
  filePath: string;
  mediaType: MediaType;
  thumbnailPath?: string;
  duration?: number;
  fileSize: number;
  createdAt: string;
}

export interface ConferenceWithVideos {
  eventId: string;
  eventName: string;
  eventDate: string;
  videos: ConferenceVideoSummary[];
}

export interface ConferenceVideosResponse {
  success: boolean;
  data?: ConferenceVideoSummary[];
  message?: string;
}

export interface ConferencesWithVideosResponse {
  success: boolean;
  data?: ConferenceWithVideos[];
  message?: string;
}

export interface ConferenceVideoResponse {
  success: boolean;
  data?: ConferenceVideoSummary;
  message?: string;
}

// ============ API Functions ============

export async function getConferencesWithVideos(
  token?: string
): Promise<ConferencesWithVideosResponse> {
  return apiFetch<ConferencesWithVideosResponse>(
    "/conference-videos/conferences",
    { token }
  );
}

export async function getConferenceVideos(
  eventId: string,
  token?: string
): Promise<ConferenceVideosResponse> {
  return apiFetch<ConferenceVideosResponse>(
    `/conference-videos/events/${eventId}`,
    { token }
  );
}

export async function getUploaderVideos(
  token: string
): Promise<ConferenceVideosResponse> {
  return apiFetch<ConferenceVideosResponse>("/conference-videos/my-videos", {
    token,
  });
}

export interface EligibleConference {
  eventId: string;
  eventName: string;
  endDate: string;
  videoCount: number;
}

export interface EligibleConferencesResponse {
  success: boolean;
  data?: EligibleConference[];
  message?: string;
}

export async function getEligibleConferences(
  token: string
): Promise<EligibleConferencesResponse> {
  return apiFetch<EligibleConferencesResponse>(
    "/conference-videos/eligible-conferences",
    { token }
  );
}

export async function uploadConferenceVideo(
  eventId: string,
  file: File,
  data: { title?: string; description?: string; duration?: number },
  token: string
): Promise<ConferenceVideoResponse> {
  const formData = new FormData();
  formData.append("file", file);
  if (data.title) formData.append("title", data.title);
  if (data.description) formData.append("description", data.description);
  if (data.duration) formData.append("duration", data.duration.toString());

  return apiFetch<ConferenceVideoResponse>(
    `/conference-videos/events/${eventId}`,
    {
      method: "POST",
      body: formData as unknown as Record<string, unknown>,
      skipJson: false,
      token,
    }
  );
}

export async function updateConferenceVideo(
  videoId: string,
  data: { title?: string; description?: string },
  token: string
): Promise<ConferenceVideoResponse> {
  return apiFetch<ConferenceVideoResponse>(`/conference-videos/${videoId}`, {
    method: "PUT",
    body: data,
    token,
  });
}

export async function deleteConferenceVideo(
  videoId: string,
  token: string
): Promise<{ success: boolean; message?: string }> {
  return apiFetch<{ success: boolean; message?: string }>(
    `/conference-videos/${videoId}`,
    {
      method: "DELETE",
      token,
    }
  );
}

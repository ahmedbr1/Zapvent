import { apiFetch } from "@/lib/api-client";
import { API_BASE_URL } from "@/lib/config";
import {
  EventType,
  FundingSource,
  Location,
  UserRole,
  type Workshop,
  type WorkshopParticipantsSnapshot,
} from "@/lib/types";

interface WorkshopApiItem {
  id?: string;
  _id?: string;
  name: string;
  eventType?: string;
  location?: string;
  startDate?: string;
  endDate?: string;
  description?: string;
  fullAgenda?: string;
  faculty?: string;
  participatingProfessorIds?: string[];
  participatingProfessors?: string[];
  requiredBudget?: number;
  price?: number;
  fundingSource?: string;
  extraRequiredResources?: string;
  capacity?: number;
  registrationDeadline?: string;
  createdBy?: string;
  createdByName?: string;
  createdByRole?: string;
  workshopStatus?: string;
  requestedEdits?: string | null;
  allowedRoles?: string[];
}

interface WorkshopListResponse {
  success: boolean;
  message?: string;
  data?: WorkshopApiItem[] | WorkshopApiItem | null;
}

interface WorkshopMutationResponse {
  success: boolean;
  message?: string;
  data?: WorkshopApiItem | null;
}

interface WorkshopDeleteResponse {
  success: boolean;
  message?: string;
  data?: { id: string };
}

interface WorkshopStatusResponse {
  success: boolean;
  message?: string;
  data?: {
    id: string;
    name: string;
    status?: string;
    reason?: string;
    requestedEdits?: string | null;
  } | null;
}

export interface WorkshopPayload {
  name: string;
  location: Location;
  startDate: string;
  endDate: string;
  description: string;
  fullAgenda: string;
  faculty: string;
  participatingProfessorIds: string[];
  requiredBudget: number;
  price: number;
  fundingSource: FundingSource;
  extraRequiredResources?: string;
  capacity: number;
  registrationDeadline: string;
}

export type UpdateWorkshopPayload = Partial<WorkshopPayload>;

export async function fetchMyWorkshops(token?: string): Promise<Workshop[]> {
  const response = await apiFetch<WorkshopListResponse>("/events/my-workshops", {
    method: "GET",
    token,
  });

  if (!response.success) {
    throw new Error(response.message ?? "Failed to load workshops.");
  }

  const items = Array.isArray(response.data)
    ? response.data
    : response.data
      ? [response.data]
      : [];

  return items.map(mapWorkshop);
}

export async function createWorkshop(payload: WorkshopPayload, token?: string): Promise<Workshop> {
  const response = await apiFetch<WorkshopMutationResponse, WorkshopPayload>("/events/workshop", {
    method: "POST",
    body: payload,
    token,
  });

  if (!response.success || !response.data) {
    throw new Error(response.message ?? "Failed to create workshop.");
  }

  return mapWorkshop(response.data);
}

export async function updateWorkshop(
  id: string,
  payload: UpdateWorkshopPayload,
  token?: string
): Promise<Workshop> {
  const response = await apiFetch<WorkshopMutationResponse, UpdateWorkshopPayload>(
    `/events/workshop/${id}`,
    {
      method: "PUT",
      body: payload,
      token,
    }
  );

  if (!response.success || !response.data) {
    throw new Error(response.message ?? "Failed to update workshop.");
  }

  return mapWorkshop(response.data);
}

export async function deleteWorkshop(id: string, token?: string): Promise<void> {
  const response = await apiFetch<WorkshopDeleteResponse>(`/events/workshop/${id}`, {
    method: "DELETE",
    token,
  });

  if (!response.success) {
    throw new Error(response.message ?? "Failed to delete workshop.");
  }
}

export async function approveWorkshopRequest(id: string, token?: string): Promise<WorkshopStatusResponse> {
  const response = await apiFetch<WorkshopStatusResponse>(`/events/workshop/${id}/approve`, {
    method: "PATCH",
    token,
  });

  if (!response.success) {
    throw new Error(response.message ?? "Failed to approve workshop.");
  }

  return response;
}

export async function rejectWorkshopRequest(
  id: string,
  payload?: { reason?: string },
  token?: string
): Promise<WorkshopStatusResponse> {
  const response = await apiFetch<WorkshopStatusResponse, { reason?: string }>(
    `/events/workshop/${id}/reject`,
    {
      method: "PATCH",
      body: payload,
      token,
    }
  );

  if (!response.success) {
    throw new Error(response.message ?? "Failed to reject workshop.");
  }

  return response;
}

export async function requestWorkshopEdits(
  id: string,
  payload: { message: string },
  token?: string
): Promise<WorkshopStatusResponse> {
  const response = await apiFetch<WorkshopStatusResponse, { message: string }>(
    `/events/workshop/${id}/request-edits`,
    {
      method: "PATCH",
      body: payload,
      token,
    }
  );

  if (!response.success) {
    throw new Error(response.message ?? "Failed to request edits.");
  }

  return response;
}

export async function setWorkshopToPending(
  id: string,
  token?: string
): Promise<WorkshopStatusResponse> {
  const endpoint = `${API_BASE_URL}/events/workshop/${id}/set-pending`;
  const headers: Record<string, string> = { "Content-Type": "application/json" };
  if (token) headers["Authorization"] = `Bearer ${token}`;

  const resp = await fetch(endpoint, {
    method: "PATCH",
    headers,
  });

  if (!resp.ok) {
    const body = await resp.json().catch(() => ({}));
    throw new Error(body.message ?? "Failed to set workshop to pending.");
  }

  const response = (await resp.json()) as WorkshopStatusResponse;
  if (!response.success) {
    throw new Error(response.message ?? "Failed to set workshop to pending.");
  }

  return response;
}

function mapWorkshop(item: WorkshopApiItem): Workshop {
  const id = item.id ?? item._id;
  if (!id) {
    throw new Error("Workshop payload missing identifier.");
  }
  const professorIds = item.participatingProfessorIds ?? [];

  return {
    id,
    eventType: coerceEnumValue(item.eventType, EventType, EventType.Workshop),
    name: item.name ?? "Untitled workshop",
    location: coerceEnumValue(item.location, Location, Location.Cairo),
    startDate: item.startDate ?? new Date().toISOString(),
    endDate: item.endDate ?? new Date().toISOString(),
    description: item.description ?? "",
    fullAgenda: item.fullAgenda ?? "",
    faculty: item.faculty ?? "",
    participatingProfessorIds: professorIds,
    participatingProfessors: item.participatingProfessors ?? [],
    requiredBudget: typeof item.requiredBudget === "number" ? item.requiredBudget : 0,
    price: typeof item.price === "number" ? item.price : 0,
    fundingSource: coerceEnumValue(item.fundingSource, FundingSource, FundingSource.GUC),
    extraRequiredResources: item.extraRequiredResources ?? "",
    capacity: typeof item.capacity === "number" ? item.capacity : 0,
    registrationDeadline: item.registrationDeadline ?? new Date().toISOString(),
    createdBy: item.createdBy,
    createdByName: item.createdByName,
    createdByRole: item.createdByRole,
    workshopStatus: item.workshopStatus,
    requestedEdits: item.requestedEdits ?? null,
    allowedRoles: sanitizeAllowedRoles(item.allowedRoles),
  };
}

function coerceEnumValue<T extends Record<string, string>>(
  value: unknown,
  enumObject: T,
  fallback: T[keyof T]
): T[keyof T] {
  const stringValue = typeof value === "string" ? value : undefined;
  if (!stringValue) return fallback;
  const values = Object.values(enumObject) as Array<T[keyof T]>;
  return values.includes(stringValue as T[keyof T]) ? (stringValue as T[keyof T]) : fallback;
}

interface WorkshopParticipantsResponse {
  success: boolean;
  message: string;
  data?: {
    workshopId: string;
    workshopName: string;
    capacity: number;
    registeredCount: number;
    remainingSpots: number;
    participants: Array<{
      id: string;
      firstName?: string;
      lastName?: string;
      email: string;
      role?: string;
      studentId?: string;
      staffId?: string;
    }>;
  };
}

interface CertificateResponse {
  success: boolean;
  message: string;
  data?: {
    sentCount: number;
    failedCount: number;
  };
}

const validRoles = new Set(Object.values(UserRole));

function sanitizeAllowedRoles(raw?: string[]): UserRole[] {
  if (!raw || raw.length === 0) {
    return [];
  }
  return raw.filter((role): role is UserRole => validRoles.has(role as UserRole));
}

export async function fetchWorkshopParticipants(
  workshopId: string,
  token?: string
): Promise<WorkshopParticipantsSnapshot> {
  const response = await apiFetch<WorkshopParticipantsResponse>(`/events/workshop/${workshopId}/participants`, {
    method: "GET",
    token,
  });

  if (!response.success || !response.data) {
    throw new Error(response.message ?? "Failed to load workshop participants.");
  }

  return {
    workshopId: response.data.workshopId,
    workshopName: response.data.workshopName,
    capacity: response.data.capacity,
    registeredCount: response.data.registeredCount,
    remainingSpots: response.data.remainingSpots,
    participants: response.data.participants,
  };
}

export async function sendWorkshopCertificates(workshopId: string, token?: string) {
  const response = await apiFetch<CertificateResponse>(`/events/workshop/${workshopId}/send-certificates`, {
    method: "POST",
    token,
  });

  if (!response.success) {
    throw new Error(response.message ?? "Failed to send workshop certificates.");
  }

  return {
    sentCount: response.data?.sentCount ?? 0,
    failedCount: response.data?.failedCount ?? 0,
    message: response.message,
  };
}

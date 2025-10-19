import { apiFetch } from "@/lib/api-client";
import {
  FundingSource,
  Location,
  type Workshop,
} from "@/lib/types";

interface WorkshopApiItem {
  id?: string;
  _id?: string;
  name: string;
  location?: string;
  startDate?: string;
  endDate?: string;
  description?: string;
  fullAgenda?: string;
  faculty?: string;
  participatingProfessorIds?: string[];
  participatingProfessors?: string[];
  requiredBudget?: number;
  fundingSource?: string;
  extraRequiredResources?: string;
  capacity?: number;
  registrationDeadline?: string;
  createdBy?: string;
  createdByName?: string;
  createdByRole?: string;
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
  const response = await apiFetch<WorkshopMutationResponse>(`/events/${id}`, {
    method: "DELETE",
    token,
  });

  if (!response.success) {
    throw new Error(response.message ?? "Failed to delete workshop.");
  }
}

function mapWorkshop(item: WorkshopApiItem): Workshop {
  const id = item.id ?? item._id;
  if (!id) {
    throw new Error("Workshop payload missing identifier.");
  }
  const professorIds = item.participatingProfessorIds ?? [];

  return {
    id,
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
    fundingSource: coerceEnumValue(item.fundingSource, FundingSource, FundingSource.GUC),
    extraRequiredResources: item.extraRequiredResources ?? "",
    capacity: typeof item.capacity === "number" ? item.capacity : 0,
    registrationDeadline: item.registrationDeadline ?? new Date().toISOString(),
    createdBy: item.createdBy,
    createdByName: item.createdByName,
    createdByRole: item.createdByRole,
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

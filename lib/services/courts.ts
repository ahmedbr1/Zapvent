import { apiFetch } from "@/lib/api-client";
import { CourtType } from "@/lib/types";

interface CourtOpeningHourDto {
  weekday: number;
  startTime: string;
  endTime: string;
}

interface CourtExceptionDto {
  startDate: string;
  endDate: string;
  reason?: string;
}

interface CourtsResponse {
  success: boolean;
  message: string;
  data?: Array<{
    id: string;
    type: string;
    venue: string;
    timezone?: string;
    openingHours?: CourtOpeningHourDto[];
    exceptions?: CourtExceptionDto[];
  }>;
}

export interface CourtOpeningHour {
  weekday: number;
  startTime: string;
  endTime: string;
}

export interface CourtException {
  startDate: string;
  endDate: string;
  reason?: string;
}

export interface CourtAvailability {
  id: string;
  type: CourtType;
  venue: string;
  timezone?: string;
  openingHours: CourtOpeningHour[];
  exceptions: CourtException[];
}

export async function fetchCourts(token?: string): Promise<CourtAvailability[]> {
  const response = await apiFetch<CourtsResponse>("/courts", {
    token,
  });

  if (!response.success) {
    throw new Error(response.message ?? "Failed to load courts");
  }

  return (response.data ?? []).map((court) => ({
    id: court.id,
    type: (court.type as CourtType) ?? CourtType.Basketball,
    venue: court.venue,
    timezone: court.timezone,
    openingHours: Array.isArray(court.openingHours)
      ? court.openingHours.map((slot) => ({
          weekday: slot.weekday,
          startTime: slot.startTime,
          endTime: slot.endTime,
        }))
      : [],
    exceptions: Array.isArray(court.exceptions)
      ? court.exceptions.map((exception) => ({
          startDate: exception.startDate,
          endDate: exception.endDate,
          reason: exception.reason,
        }))
      : [],
  }));
}

interface CourtAvailabilityResponse {
  success: boolean;
  message: string;
  data?: {
    courtId: string;
    date: string;
    slots: Array<{
      startTime: string;
      endTime: string;
      isAvailable: boolean;
    }>;
  };
}

interface CourtReservationResponse {
  success: boolean;
  message: string;
}

export async function fetchCourtAvailabilitySlots(
  courtId: string,
  date: string,
  token?: string
) {
  const response = await apiFetch<CourtAvailabilityResponse>(
    `/courts/${courtId}/availability?date=${encodeURIComponent(date)}`,
    {
      method: "GET",
      token,
    }
  );

  if (!response.success) {
    throw new Error(response.message ?? "Failed to load court availability");
  }

  return response.data?.slots ?? [];
}

export async function reserveCourtSlot(
  courtId: string,
  payload: { date: string; startTime: string; endTime?: string },
  token?: string
) {
  const response = await apiFetch<CourtReservationResponse, typeof payload>(
    `/courts/${courtId}/reservations`,
    {
      method: "POST",
      body: payload,
      token,
    }
  );

  if (!response.success) {
    throw new Error(response.message ?? "Failed to reserve court");
  }

  return response.message;
}

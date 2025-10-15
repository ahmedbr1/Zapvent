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

import { apiFetch } from "@/lib/api-client";
import type { EventType } from "@/lib/types";

export interface AttendanceReportFilters {
  name?: string;
  eventType?: EventType;
  startDate?: string;
  endDate?: string;
  date?: string;
}

export interface AttendanceReportItem {
  eventId: string;
  name: string;
  eventType: EventType;
  startDate: string;
  endDate: string;
  totalAttendees: number;
}

interface AttendanceReportResponse {
  success: boolean;
  message?: string;
  data?: {
    events: AttendanceReportItem[];
    totalAttendees: number;
  };
}

export interface AttendanceReportPayload {
  events: AttendanceReportItem[];
  totalAttendees: number;
}

function buildQueryString(filters: AttendanceReportFilters) {
  const params = new URLSearchParams();
  if (filters.name) params.set("name", filters.name);
  if (filters.eventType) params.set("eventType", filters.eventType);
  if (filters.startDate) params.set("startDate", filters.startDate);
  if (filters.endDate) params.set("endDate", filters.endDate);
  if (filters.date) params.set("date", filters.date);
  const query = params.toString();
  return query ? `?${query}` : "";
}

export async function fetchAttendanceReport(
  filters: AttendanceReportFilters,
  token?: string
): Promise<AttendanceReportPayload> {
  const query = buildQueryString(filters);
  const response = await apiFetch<AttendanceReportResponse>(
    `/events/reports/attendance${query}`,
    {
      method: "GET",
      token,
    }
  );

  if (!response.success || !response.data) {
    throw new Error(response.message ?? "Failed to load attendance report");
  }

  return response.data;
}

export interface SalesReportFilters {
  eventType?: EventType;
  startDate?: string;
  endDate?: string;
  date?: string;
  sortOrder?: "asc" | "desc";
}

export interface SalesReportItem {
  eventId: string;
  name: string;
  eventType: EventType;
  startDate: string;
  endDate: string;
  revenue: number;
}

interface SalesReportResponse {
  success: boolean;
  message?: string;
  data?: {
    events: SalesReportItem[];
    totalRevenue: number;
  };
}

export interface SalesReportPayload {
  events: SalesReportItem[];
  totalRevenue: number;
}

function buildSalesQueryString(filters: SalesReportFilters) {
  const params = new URLSearchParams();
  if (filters.eventType) params.set("eventType", filters.eventType);
  if (filters.startDate) params.set("startDate", filters.startDate);
  if (filters.endDate) params.set("endDate", filters.endDate);
  if (filters.date) params.set("date", filters.date);
  if (filters.sortOrder) params.set("sortOrder", filters.sortOrder);
  const query = params.toString();
  return query ? `?${query}` : "";
}

export async function fetchSalesReport(
  filters: SalesReportFilters,
  token?: string
): Promise<SalesReportPayload> {
  const query = buildSalesQueryString(filters);
  const response = await apiFetch<SalesReportResponse>(
    `/events/reports/sales${query}`,
    {
      method: "GET",
      token,
    }
  );

  if (!response.success || !response.data) {
    throw new Error(response.message ?? "Failed to load sales report");
  }

  return response.data;
}

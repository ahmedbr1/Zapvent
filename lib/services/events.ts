import { apiFetch } from "@/lib/api-client";
import { API_BASE_URL } from "@/lib/config";
import {
  EventType,
  FundingSource,
  Location,
  UserRole,
  type AttendanceReportData,
  type EventSummary,
  type SalesReportData,
  type VendorSummary,
} from "@/lib/types";

interface EventApiResponse {
  success: boolean;
  data?: EventApiItem[];
  message?: string;
}

interface EventApiItem {
  _id: string;
  name: string;
  eventType: EventType;
  description: string;
  location: string;
  startDate: string;
  endDate: string;
  registrationDeadline: string;
  capacity?: number;
  price?: number;
  participatingProfessorIds?: string[];
  participatingProfessors?: string[];
  vendors?: string[];
  registeredUsers?: string[];
  fundingSource?: FundingSource;
  fullAgenda?: string;
  websiteLink?: string;
  extraRequiredResources?: string;
  requiredBudget?: number;
  archived?: boolean;
  allowedRoles?: string[];
}

interface UpcomingBazaarsResponse {
  success: boolean;
  bazaars?: EventApiItem[];
  message?: string;
}

interface CreateBazaarResponse {
  success: boolean;
  message: string;
  data?: EventApiItem;
}

interface EventMutationResponse {
  success: boolean;
  message?: string;
  data?: unknown;
}

interface ArchiveEventResponse {
  success: boolean;
  message: string;
  data?: {
    id: string;
    name: string;
    archived: boolean;
  };
}

interface RegisterEventResponse {
  success: boolean;
  message: string;
  data?: {
    eventId: string;
    userId: string;
    registeredCount: number;
    capacity?: number;
  };
}

interface PayByWalletResponse {
  success: boolean;
  message: string;
  data?: {
    receiptNumber?: string;
  };
}

interface CancelRegistrationResponse {
  success: boolean;
  message: string;
}

interface StripeIntentResponse {
  success: boolean;
  message: string;
  data?: {
    clientSecret: string;
    paymentIntentId: string;
  };
}

interface StripeFinalizeResponse {
  success: boolean;
  message: string;
  data?: {
    receiptNumber: string;
    transactionReference?: string;
  };
}

interface RoleRestrictionsResponse {
  success: boolean;
  message?: string;
  data?: {
    id: string;
    name: string;
    allowedRoles?: string[];
  };
}

interface AttendanceReportResponse {
  success: boolean;
  message?: string;
  data?: AttendanceReportData;
}

interface SalesReportResponse {
  success: boolean;
  message?: string;
  data?: SalesReportData;
}

export interface BazaarPayload {
  name: string;
  description: string;
  startDate: string;
  endDate: string;
  registrationDeadline: string;
  location: Location;
}

export interface TripPayload {
  name: string;
  description: string;
  startDate: string;
  endDate: string;
  registrationDeadline: string;
  location: Location;
  capacity: number;
  price: number;
}

export interface ConferencePayload {
  name: string;
  description: string;
  startDate: string;
  endDate: string;
  fullAgenda: string;
  websiteLink: string;
  requiredBudget: number;
  fundingSource: FundingSource;
  extraRequiredResources?: string;
}

export async function registerForWorkshop(
  workshopId: string,
  token?: string,
  userId?: string
): Promise<RegisterEventResponse> {
  const response = await apiFetch<RegisterEventResponse, { userId?: string }>(
    `/events/workshop/${workshopId}/register`,
    {
      method: "POST",
      body: userId ? { userId } : undefined,
      token,
    }
  );

  if (!response.success) {
    throw new Error(response.message ?? "Failed to register for this event");
  }

  return response;
}

export async function payForEventByWallet(eventId: string, token?: string) {
  const response = await apiFetch<PayByWalletResponse, { useWalletBalance: boolean }>(
    `/events/${eventId}/pay-by-wallet`,
    {
      method: "POST",
      body: { useWalletBalance: true },
      token,
    }
  );

  if (!response.success) {
    throw new Error(response.message ?? "Failed to process wallet payment");
  }

  return response;
}

export async function cancelEventRegistration(eventId: string, token?: string) {
  const response = await apiFetch<CancelRegistrationResponse>(
    `/events/${eventId}/cancel-registration`,
    {
      method: "POST",
      token,
    }
  );

  if (!response.success) {
    throw new Error(response.message ?? "Failed to cancel registration");
  }

  return response;
}

export async function createStripePaymentIntent(eventId: string, token?: string) {
  const response = await apiFetch<StripeIntentResponse>(
    `/events/${eventId}/stripe/payment-intent`,
    {
      method: "POST",
      token,
    }
  );

  if (!response.success || !response.data) {
    throw new Error(response.message ?? "Failed to start card payment");
  }

  return response.data;
}

export async function finalizeStripePayment(
  eventId: string,
  paymentIntentId: string,
  token?: string
) {
  const response = await apiFetch<StripeFinalizeResponse, { paymentIntentId: string }>(
    `/events/${eventId}/stripe/finalize`,
    {
      method: "POST",
      token,
      body: { paymentIntentId },
    }
  );

  if (!response.success) {
    throw new Error(response.message ?? "Failed to confirm card payment");
  }

  return response;
}

export async function fetchUpcomingEvents(
  token?: string,
  currentUserId?: string
): Promise<EventSummary[]> {
  const response = await apiFetch<EventApiResponse>("/events", {
    method: "GET",
    token,
  });

  if (!response.success) {
    throw new Error(response.message ?? "Failed to fetch events");
  }

  return (response.data ?? []).map((item) => mapEvent(item, currentUserId));
}

export async function fetchEventById(
  id: string,
  token?: string,
  currentUserId?: string
): Promise<EventSummary | null> {
  const events = await fetchUpcomingEvents(token, currentUserId);
  return events.find((event) => event.id === id) ?? null;
}

export async function fetchUpcomingBazaars(
  token?: string,
  currentUserId?: string
): Promise<EventSummary[]> {
  // Use the public upcoming-bazaars endpoint for listing bazaars to vendors
  // and unauthenticated users. Admin-only `/events/bazaar` is reserved for
  // admin/event-office use and will return 403 for Vendor tokens.
  const response = await apiFetch<UpcomingBazaarsResponse>(
    "/events/upcoming-bazaars",
    {
      method: "GET",
      token,
    }
  );

  if (!response.success) {
    throw new Error(response.message ?? "Failed to load bazaars");
  }

  return (response.bazaars ?? []).map((item) => mapEvent(item, currentUserId));
}

export async function fetchTrips(
  token?: string,
  currentUserId?: string
): Promise<EventSummary[]> {
  if (token) {
    const response = await apiFetch<EventApiResponse>("/events/trip", {
      method: "GET",
      token,
    });

    if (!response.success) {
      throw new Error(response.message ?? "Failed to load trips");
    }

    return (response.data ?? []).map((item) => mapEvent(item, currentUserId));
  }

  const events = await fetchUpcomingEvents(undefined, currentUserId);
  return events.filter((event) => event.eventType === EventType.Trip);
}

export async function fetchConferences(
  token?: string,
  currentUserId?: string
): Promise<EventSummary[]> {
  const events = await fetchUpcomingEvents(token, currentUserId);
  return events.filter((event) => event.eventType === EventType.Conference);
}

export async function createBazaar(payload: BazaarPayload, token?: string) {
  const response = await apiFetch<CreateBazaarResponse, BazaarPayload>(
    "/events",
    {
      method: "POST",
      body: payload,
      token,
    }
  );

  if (!response.success) {
    throw new Error(response.message ?? "Failed to create bazaar");
  }

  return response.data ? mapEvent(response.data) : null;
}

export async function updateBazaar(
  id: string,
  payload: Partial<BazaarPayload>,
  token?: string
) {
  const response = await apiFetch<CreateBazaarResponse, Partial<BazaarPayload>>(
    `/events/bazaar/${id}`,
    {
      method: "PUT",
      body: payload,
      token,
    }
  );

  if (!response.success) {
    throw new Error(response.message ?? "Failed to update bazaar");
  }

  return response.data ? mapEvent(response.data) : null;
}

export async function createTrip(payload: TripPayload, token?: string) {
  const body = {
    ...payload,
    eventType: EventType.Trip,
    fundingSource: FundingSource.GUC,
    date: payload.startDate,
  };

  const response = await apiFetch<EventMutationResponse, typeof body>(
    "/events/trip",
    {
      method: "POST",
      body,
      token,
    }
  );

  if (!response.success) {
    throw new Error(response.message ?? "Failed to create trip");
  }

  const data = response.data as EventApiItem | undefined;
  return data ? mapEvent(data) : null;
}

export async function updateTrip(
  id: string,
  payload: Partial<TripPayload>,
  token?: string
) {
  const body: Partial<TripPayload> & { date?: string } = { ...payload };
  if (payload.startDate) {
    body.date = payload.startDate;
  }

  const response = await apiFetch<EventMutationResponse, typeof body>(
    `/events/trip/${id}`,
    {
      method: "PUT",
      body,
      token,
    }
  );

  if (!response.success) {
    throw new Error(response.message ?? "Failed to update trip");
  }

  const data = response.data as EventApiItem | undefined;
  return data ? mapEvent(data) : null;
}

export async function createConference(
  payload: ConferencePayload,
  token?: string
) {
  const response = await apiFetch<EventMutationResponse, ConferencePayload>(
    "/events/conference",
    {
      method: "POST",
      body: payload,
      token,
    }
  );

  if (!response.success) {
    throw new Error(response.message ?? "Failed to create conference");
  }

  const data = response.data as EventApiItem | undefined;
  return data ? mapEvent(data) : null;
}

export async function updateConference(
  id: string,
  payload: Partial<ConferencePayload>,
  token?: string
) {
  const response = await apiFetch<
    EventMutationResponse,
    Partial<ConferencePayload>
  >(`/events/conferences/${id}`, {
    method: "PUT",
    body: payload,
    token,
  });

  if (!response.success) {
    throw new Error(response.message ?? "Failed to update conference");
  }

  const data = response.data as EventApiItem | undefined;
  return data ? mapEvent(data) : null;
}

export async function deleteEvent(id: string, token?: string): Promise<void> {
  await apiFetch<unknown>(`/events/${id}`, {
    method: "DELETE",
    token,
  });
}

export async function archiveEventById(id: string, token?: string): Promise<ArchiveEventResponse> {
  const response = await apiFetch<ArchiveEventResponse>(`/events/${id}/archive`, {
    method: "PATCH",
    token,
  });

  if (!response.success) {
    throw new Error(response.message ?? "Failed to archive event");
  }

  return response;
}

export interface AttendanceReportFiltersInput {
  name?: string;
  eventType?: EventType;
  date?: string;
  startDate?: string;
  endDate?: string;
}

export interface SalesReportFiltersInput {
  eventType?: EventType;
  date?: string;
  startDate?: string;
  endDate?: string;
}

export type SalesReportSortOrder = "asc" | "desc";

export async function fetchAttendanceReport(
  filters: AttendanceReportFiltersInput,
  token?: string
): Promise<AttendanceReportData> {
  const params = buildReportQueryParams({
    name: filters.name,
    eventType: filters.eventType,
    date: filters.date,
    startDate: filters.startDate,
    endDate: filters.endDate,
  });

  const query = params ? `?${params}` : "";

  const response = await apiFetch<AttendanceReportResponse>(
    `/events/reports/attendance${query}`,
    {
      method: "GET",
      token,
    }
  );

  if (!response.success || !response.data) {
    throw new Error(response.message ?? "Failed to load attendance report.");
  }

  return response.data;
}

export async function fetchSalesReport(
  filters: SalesReportFiltersInput,
  sortOrder: SalesReportSortOrder = "desc",
  token?: string
): Promise<SalesReportData> {
  const params = buildReportQueryParams({
    eventType: filters.eventType,
    date: filters.date,
    startDate: filters.startDate,
    endDate: filters.endDate,
    sortOrder,
  });

  const query = params ? `?${params}` : "";

  const response = await apiFetch<SalesReportResponse>(`/events/reports/sales${query}`, {
    method: "GET",
    token,
  });

  if (!response.success || !response.data) {
    throw new Error(response.message ?? "Failed to load sales report.");
  }

  return response.data;
}

export async function updateEventRoleRestrictions(
  eventId: string,
  allowedRoles: UserRole[],
  token?: string
): Promise<{ message: string; allowedRoles: UserRole[] }> {
  const response = await apiFetch<RoleRestrictionsResponse, { allowedRoles: UserRole[] }>(
    `/events/${eventId}/role-restrictions`,
    {
      method: "PATCH",
      body: { allowedRoles },
      token,
    }
  );

  if (!response.success) {
    throw new Error(response.message ?? "Failed to update event access.");
  }

  const sanitized = sanitizeAllowedRoles(response.data?.allowedRoles);

  return {
    message: response.message ?? "Event access updated.",
    allowedRoles: sanitized,
  };
}

export async function exportEventRegistrationsFile(
  eventId: string,
  token?: string
): Promise<{ blob: Blob; filename?: string }> {
  return downloadEventAsset(`/events/${eventId}/export-registrations`, token);
}

export async function generateEventQrCodeFile(
  eventId: string,
  token?: string
): Promise<{ blob: Blob; filename?: string }> {
  return downloadEventAsset(`/events/${eventId}/generate-qr`, token);
}

function mapEvent(event: EventApiItem, currentUserId?: string): EventSummary {
  const isRegistered = currentUserId
    ? (event.registeredUsers ?? []).some((userId) => userId === currentUserId)
    : undefined;
  const registeredCount = event.registeredUsers?.length ?? 0;
  const vendors: VendorSummary[] = (event.vendors ?? []).map(
    (vendorId, index) => ({
      id: vendorId,
      companyName: `Vendor ${index + 1}`,
      status: undefined as never,
    })
  );

  return {
    id: event._id,
    name: event.name,
    eventType: event.eventType,
    description: event.description,
    location: event.location as EventSummary["location"],
    startDate: event.startDate,
    endDate: event.endDate,
    registrationDeadline: event.registrationDeadline,
    participatingProfessorIds: event.participatingProfessorIds,
    participatingProfessors: event.participatingProfessors,
    capacity: event.capacity,
    registeredCount,
    price: event.price,
    vendors,
    isRegistered,
    fundingSource: event.fundingSource,
    fullAgenda: event.fullAgenda,
    websiteLink: event.websiteLink,
    extraRequiredResources: event.extraRequiredResources,
    requiredBudget: event.requiredBudget,
    archived: Boolean(event.archived),
    allowedRoles: sanitizeAllowedRoles(event.allowedRoles),
  };
}

const validUserRoles = new Set(Object.values(UserRole));

function sanitizeAllowedRoles(roles?: string[]): UserRole[] {
  if (!roles || roles.length === 0) {
    return [];
  }
  return roles.filter((role): role is UserRole => validUserRoles.has(role as UserRole));
}

function buildReportQueryParams(params: Record<string, string | EventType | SalesReportSortOrder | undefined>) {
  const searchParams = new URLSearchParams();
  Object.entries(params).forEach(([key, value]) => {
    if (value === undefined || value === null || value === "") {
      return;
    }
    searchParams.set(key, String(value));
  });
  const serialized = searchParams.toString();
  return serialized.length ? serialized : "";
}

async function downloadEventAsset(
  path: string,
  token?: string
): Promise<{ blob: Blob; filename?: string }> {
  const url = path.startsWith("http")
    ? path
    : `${API_BASE_URL}${path.startsWith("/") ? path : `/${path}`}`;

  const headers = new Headers();
  headers.set("Accept", "application/octet-stream");
  if (token) {
    headers.set("Authorization", `Bearer ${token}`);
  }

  const response = await fetch(url, {
    method: "GET",
    headers,
    credentials: "include",
  });

  if (!response.ok) {
    let message = "Failed to download file.";
    try {
      const data = (await response.json()) as { message?: string };
      if (data?.message) {
        message = data.message;
      }
    } catch {
      message = response.statusText || message;
    }
    throw new Error(message);
  }

  const blob = await response.blob();
  const disposition = response.headers.get("Content-Disposition");
  const filename = disposition ? extractFilenameFromDisposition(disposition) : undefined;

  return { blob, filename };
}

function extractFilenameFromDisposition(headerValue: string): string | undefined {
  const utf8Match = headerValue.match(/filename\*=(?:UTF-8'')?([^;]+)/i);
  if (utf8Match && utf8Match[1]) {
    try {
      return decodeURIComponent(utf8Match[1].trim().replace(/(^\"|\"$)/g, ""));
    } catch {
      return utf8Match[1].trim().replace(/(^\"|\"$)/g, "");
    }
  }

  const asciiMatch = headerValue.match(/filename="?([^\";]+)"?/i);
  if (asciiMatch && asciiMatch[1]) {
    return asciiMatch[1].trim();
  }
  return undefined;
}

import { apiFetch } from "@/lib/api-client";
import {
  EventType,
  FundingSource,
  Location,
  type EventSummary,
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
  const events = await fetchUpcomingEvents(token, currentUserId);
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

function mapEvent(event: EventApiItem, currentUserId?: string): EventSummary {
  const isRegistered = currentUserId
    ? (event.registeredUsers ?? []).some((userId) => userId === currentUserId)
    : undefined;
  const registeredCount = event.registeredUsers?.length ?? 0;
  const vendors: VendorSummary[] = (event.vendors ?? []).map((vendorId, index) => ({
    id: vendorId,
    companyName: `Vendor ${index + 1}`,
    status: undefined as never,
  }));

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
  };
}

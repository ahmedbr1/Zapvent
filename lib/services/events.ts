import { apiFetch } from "@/lib/api-client";
import {
  EventType,
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
  participatingProfessors?: string[];
  vendors?: string[];
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

export interface BazaarPayload {
  name: string;
  description: string;
  startDate: string;
  endDate: string;
  registrationDeadline: string;
  location: Location;
}

export async function fetchUpcomingEvents(token?: string): Promise<EventSummary[]> {
  const response = await apiFetch<EventApiResponse>("/events", {
    method: "GET",
    token,
  });

  if (!response.success) {
    throw new Error(response.message ?? "Failed to fetch events");
  }

  return (response.data ?? []).map(mapEvent);
}

export async function fetchEventById(id: string, token?: string): Promise<EventSummary | null> {
  const events = await fetchUpcomingEvents(token);
  return events.find((event) => event.id === id) ?? null;
}

export async function fetchUpcomingBazaars(token?: string): Promise<EventSummary[]> {
  const response = await apiFetch<UpcomingBazaarsResponse>("/events/upcoming-bazaars", {
    method: "GET",
    token,
  });

  if (!response.success) {
    throw new Error(response.message ?? "Failed to load bazaars");
  }

  return (response.bazaars ?? []).map(mapEvent);
}

export async function createBazaar(payload: BazaarPayload, token?: string) {
  const response = await apiFetch<CreateBazaarResponse, BazaarPayload>("/events", {
    method: "POST",
    body: payload,
    token,
  });

  if (!response.success) {
    throw new Error(response.message ?? "Failed to create bazaar");
  }

  return response.data ? mapEvent(response.data) : null;
}

export async function updateBazaar(id: string, payload: Partial<BazaarPayload>, token?: string) {
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

function mapEvent(event: EventApiItem): EventSummary {
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
    participatingProfessors: event.participatingProfessors,
    capacity: event.capacity,
    price: event.price,
    vendors,
  };
}

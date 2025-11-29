import { apiFetch } from "../api-client";
import type {
  EventType,
  LoyaltyPartner,
  VendorStatus,
} from "@/lib/types";
import { BazaarBoothSize } from "@/server/models/Event";

export interface VendorProfile {
  email: string;
  companyName: string;
  loyaltyForum?: string;
  documents?: string;
  logo?: string;
  taxCard?: string;
  isVerified?: boolean;
}

export interface UpdateVendorProfileData {
  companyName?: string;
  loyaltyForum?: string;
}

export interface VendorProfileResponse {
  success: boolean;
  message: string;
  data?: VendorProfile;
}

export async function fetchVendorProfile(
  token?: string
): Promise<VendorProfileResponse> {
  return apiFetch<VendorProfileResponse>("/vendors/profile", {
    method: "GET",
    token: token ?? undefined,
  });
}

export async function updateVendorProfile(
  data: UpdateVendorProfileData | FormData,
  token?: string
): Promise<VendorProfileResponse> {
  return apiFetch<VendorProfileResponse, UpdateVendorProfileData | FormData>(
    "/vendors/profile",
    {
      method: "PATCH",
      body: data,
      token,
    }
  );
}

interface LoyaltyVendorsResponse {
  success: boolean;
  message: string;
  vendors?: Array<{
    id: string;
    companyName: string;
    email: string;
    logo?: string;
    loyaltyProgram?: {
      discountRate: number;
      promoCode: string;
      termsAndConditions: string;
      status: string;
      appliedAt?: string;
      cancelledAt?: string;
    };
  }>;
}

export async function fetchLoyaltyVendors(token?: string): Promise<LoyaltyPartner[]> {
  const response = await apiFetch<LoyaltyVendorsResponse>("/vendors/loyalty", {
    method: "GET",
    token,
  });

  if (!response.success) {
    throw new Error(response.message ?? "Failed to load loyalty partners");
  }

  return (response.vendors ?? []).map((vendor) => ({
    id: vendor.id,
    companyName: vendor.companyName,
    email: vendor.email,
    logo: vendor.logo,
    loyaltyProgram: {
      discountRate: vendor.loyaltyProgram?.discountRate ?? 0,
      promoCode: vendor.loyaltyProgram?.promoCode ?? "",
      termsAndConditions: vendor.loyaltyProgram?.termsAndConditions ?? "",
      status: vendor.loyaltyProgram?.status ?? "pending",
      appliedAt: vendor.loyaltyProgram?.appliedAt,
      cancelledAt: vendor.loyaltyProgram?.cancelledAt,
    },
  }));
}

export type VendorPaymentStatus = "pending" | "paid" | "overdue";

export interface VendorAttendee {
  name: string;
  email: string;
  idDocumentPath?: string;
}

export interface VendorQrCode {
  visitorEmail: string;
  qrCodeUrl: string;
  issuedAt?: string;
}

export interface VendorApplicationPayment {
  amount: number;
  currency: string;
  status: VendorPaymentStatus;
  dueDate?: string;
  paidAt?: string;
  receiptNumber?: string;
  transactionReference?: string;
}

export interface VendorApplication {
  eventId: string;
  eventName: string;
  eventDate?: string;
  eventLocation?: string;
  eventType?: EventType;
  applicationDate?: string;
  status: VendorStatus;
  attendees: number;
  attendeeDetails: VendorAttendee[];
  boothSize: BazaarBoothSize;
  boothLocation?: string;
  boothStartTime?: string;
  boothEndTime?: string;
  boothDurationWeeks?: number;
  payment?: VendorApplicationPayment;
  qrCodes?: VendorQrCode[];
}

export async function fetchVendorApplications(token?: string): Promise<VendorApplication[]> {
  const response = await apiFetch<{
    success: boolean;
    message?: string;
    data?: VendorApplication[];
  }>("/vendors/my-applications", {
    method: "GET",
    token,
  });

  if (!response.success) {
    throw new Error(response.message ?? "Failed to load vendor applications");
  }

  return response.data ?? [];
}

export async function cancelVendorApplication(eventId: string, token?: string): Promise<void> {
  await apiFetch(`/vendors/my-applications/${eventId}`, {
    method: "DELETE",
    token,
  });
}

export interface VendorAttendeeFormEntry extends VendorAttendee {
  file?: File | null;
}

function buildAttendeeFormData(entries: VendorAttendeeFormEntry[]): FormData {
  const formData = new FormData();
  const payload = entries.map((entry) => {
    const normalized: VendorAttendee = {
      name: entry.name,
      email: entry.email,
    };
    if (entry.idDocumentPath) {
      normalized.idDocumentPath = entry.idDocumentPath;
    }
    return normalized;
  });

  formData.append("attendees", JSON.stringify(payload));

  entries.forEach((entry) => {
    if (entry.file) {
      formData.append("attendeeIds", entry.file);
    }
  });

  return formData;
}

export async function submitVendorAttendees(options: {
  eventId: string;
  attendees: VendorAttendeeFormEntry[];
  token?: string;
}): Promise<{ message: string }> {
  const { eventId, attendees, token } = options;
  const formData = buildAttendeeFormData(attendees);

  const response = await apiFetch<{ success: boolean; message: string }>(
    `/vendors/applications/${eventId}/attendees`,
    {
      method: "POST",
      body: formData,
      token,
    }
  );

  if (!response.success) {
    throw new Error(response.message || "Failed to upload attendees");
  }

  return { message: response.message };
}

export async function payVendorApplication(options: {
  eventId: string;
  amountPaid: number;
  transactionReference?: string;
  token?: string;
}): Promise<{ message: string }> {
  const { eventId, amountPaid, transactionReference, token } = options;

  const response = await apiFetch<{ success: boolean; message: string }>(
    `/vendors/applications/${eventId}/payment`,
    {
      method: "POST",
      body: {
        amountPaid,
        transactionReference,
      },
      token,
    }
  );

  if (!response.success) {
    throw new Error(response.message || "Failed to record payment");
  }

  return { message: response.message };
}

export interface LoyaltyProgramPayload {
  discountRate: number;
  promoCode: string;
  termsAndConditions: string;
}

export interface VendorLoyaltyProgram {
  discountRate: number;
  promoCode: string;
  termsAndConditions: string;
  status: "active" | "cancelled";
  appliedAt?: string;
  cancelledAt?: string;
}

export async function fetchVendorLoyaltyProgram(
  token?: string
): Promise<VendorLoyaltyProgram | null> {
  const response = await apiFetch<{
    success: boolean;
    message: string;
    data?: { loyaltyProgram?: VendorLoyaltyProgram };
  }>("/vendors/loyalty/me", {
    method: "GET",
    token,
  });

  if (!response.success) {
    throw new Error(response.message ?? "Failed to load loyalty program");
  }

  return response.data?.loyaltyProgram ?? null;
}

export async function applyToVendorLoyaltyProgram(
  payload: LoyaltyProgramPayload,
  token?: string
): Promise<{ message: string }> {
  const response = await apiFetch<{ success: boolean; message: string }>(
    "/vendors/loyalty/apply",
    {
      method: "POST",
      body: payload,
      token,
    }
  );

  if (!response.success) {
    throw new Error(response.message ?? "Failed to submit loyalty application");
  }

  return { message: response.message };
}

export async function cancelVendorLoyaltyProgram(
  token?: string
): Promise<{ message: string }> {
  const response = await apiFetch<{ success: boolean; message: string }>(
    "/vendors/loyalty/cancel",
    {
      method: "POST",
      token,
    }
  );

  if (!response.success) {
    throw new Error(response.message ?? "Failed to cancel loyalty program");
  }

  return { message: response.message };
}

export async function createVendorStripePaymentIntent(
  eventId: string,
  token?: string
): Promise<{ clientSecret: string; paymentIntentId: string }> {
  const response = await apiFetch<{
    success: boolean;
    message: string;
    data?: { clientSecret: string; paymentIntentId: string };
  }>(`/vendors/applications/${eventId}/payment/intent`, {
    method: "POST",
    token,
  });

  if (!response.success || !response.data?.clientSecret) {
    throw new Error(response.message ?? "Failed to start card payment.");
  }

  return response.data;
}

export async function finalizeVendorStripePayment(
  eventId: string,
  paymentIntentId: string,
  token?: string
): Promise<string> {
  const response = await apiFetch<{ success: boolean; message: string }>(
    `/vendors/applications/${eventId}/payment/confirm`,
    {
      method: "POST",
      body: { paymentIntentId },
      token,
    }
  );

  if (!response.success) {
    throw new Error(response.message ?? "Failed to confirm card payment.");
  }

  return response.message;
}

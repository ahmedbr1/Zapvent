import { apiFetch } from "../api-client";
import type { LoyaltyPartner } from "@/lib/types";

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
  data: UpdateVendorProfileData,
  token?: string
): Promise<VendorProfileResponse> {
  // Pass the body as an object and use the token option so apiFetch can
  // handle serialization and Authorization header consistently.
  return apiFetch<VendorProfileResponse, UpdateVendorProfileData>(
    "/vendors/profile",
    {
      method: "PATCH",
      body: data,
      token: token ?? undefined,
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

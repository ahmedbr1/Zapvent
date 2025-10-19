import { apiFetch } from "../api-client";

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
  token: string
): Promise<VendorProfileResponse> {
  return apiFetch("/vendor/profile", {
    method: "GET",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
  });
}

export async function updateVendorProfile(
  data: UpdateVendorProfileData,
  token: string
): Promise<VendorProfileResponse> {
  return apiFetch("/vendor/profile", {
    method: "PATCH",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify(data),
  });
}

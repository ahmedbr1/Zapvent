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

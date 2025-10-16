import { apiFetch } from "@/lib/api-client";
import type { AuthRole, UserRole, UserStatus, VendorStatus } from "@/lib/types";

export interface AdminUser {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  role: UserRole;
  status: UserStatus;
  verified: boolean;
  balance: number;
  registeredEvents: string[];
  createdAt: string;
  updatedAt: string;
}

interface AdminUsersResponse {
  success: boolean;
  message: string;
  count: number;
  users: AdminUser[];
}

interface AdminActionResponse {
  success: boolean;
  message: string;
}

interface ApproveUserResponse extends AdminActionResponse {
  user?: {
    id: string;
    role: UserRole | AuthRole;
    verified: boolean;
  };
}

export interface AdminVendorApplication {
  eventId: string;
  status: VendorStatus;
  applicationDate?: string;
  attendees: number;
  boothSize: number;
  boothLocation?: string;
  boothStartTime?: string;
  boothEndTime?: string;
}

export interface AdminVendor {
  id: string;
  email: string;
  companyName: string;
  isVerified: boolean;
  loyaltyForum?: string;
  logo?: string;
  taxCard?: string;
  documents?: string;
  applications: AdminVendorApplication[];
  pendingApplications: number;
  approvedApplications: number;
  rejectedApplications: number;
  createdAt: string;
  updatedAt: string;
}

interface AdminVendorsResponse {
  success: boolean;
  message: string;
  count: number;
  vendors: AdminVendor[];
}

export async function fetchAdminUsers(token?: string): Promise<AdminUser[]> {
  const response = await apiFetch<AdminUsersResponse>("/admin/users", {
    token,
  });

  if (!response.success) {
    throw new Error(response.message ?? "Failed to load users");
  }

  return response.users ?? [];
}

export async function approveUser(userId: string, token?: string) {
  const response = await apiFetch<ApproveUserResponse>(`/admin/approve/${userId}`, {
    method: "POST",
    token,
  });

  if (!response.success) {
    throw new Error(response.message ?? "Failed to approve user");
  }

  return response;
}

export async function fetchAdminVendors(token?: string): Promise<AdminVendor[]> {
  const response = await apiFetch<AdminVendorsResponse>("/vendors/admin", {
    token,
  });

  if (!response.success) {
    throw new Error(response.message ?? "Failed to load vendors");
  }

  return response.vendors ?? [];
}

export async function verifyVendor(vendorId: string, token?: string) {
  const response = await apiFetch<AdminActionResponse>(
    `/vendors/admin/${vendorId}/verify`,
    {
      method: "PATCH",
      token,
    }
  );

  if (!response.success) {
    throw new Error(response.message ?? "Failed to verify vendor");
  }

  return response;
}

export async function rejectUser(userId: string, reason: string | undefined, token?: string) {
  const response = await apiFetch<AdminActionResponse, { reason?: string }>(
    `/admin/reject/${userId}`,
    {
      method: "POST",
      body: reason ? { reason } : undefined,
      token,
    }
  );

  if (!response.success) {
    throw new Error(response.message ?? "Failed to reject user");
  }

  return response;
}

export async function blockUser(userId: string, token?: string) {
  const response = await apiFetch<AdminActionResponse>(`/admin/users/${userId}/block`, {
    method: "PATCH",
    token,
  });

  if (!response.success) {
    throw new Error(response.message ?? "Failed to block user");
  }

  return response;
}

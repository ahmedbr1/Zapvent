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

export interface AdminVendor {
  id: string;
  email: string;
  companyName: string;
  isVerified: boolean;
  loyaltyForum?: string;
  logo?: string;
  taxCard?: string;
  documents?: string;
  applications: any[];
  pendingApplications: number;
  approvedApplications: number;
  rejectedApplications: number;
  createdAt: string;
  updatedAt: string;
}

// ---------------- Backend API Calls ----------------

export async function approveUser(userId: string, token?: string): Promise<ApproveUserResponse> {
  const response = await apiFetch<ApproveUserResponse>(`/admin/approve/${userId}`, {
    method: "POST",
    token,
  });

  if (!response.success) {
    throw new Error(response.message ?? "Failed to approve user");
  }

  return response;
}

export async function verifyVendor(vendorId: string, token?: string): Promise<AdminActionResponse> {
  const response = await apiFetch<AdminActionResponse>(`/vendors/admin/${vendorId}/verify`, {
    method: "PATCH",
    token,
  });

  if (!response.success) {
    throw new Error(response.message ?? "Failed to verify vendor");
  }

  return response;
}

export async function fetchAdminVendors(token?: string): Promise<AdminVendor[]> {
  const response = await apiFetch<{
    success: boolean;
    message: string;
    vendors: AdminVendor[];
  }>(`/vendors/admin`, {
    method: "GET",
    token,
  });
  if (!response.success) {
    throw new Error(response.message || "Failed to fetch vendors");
  }
  return response.vendors;
}

// ----------------------------------------------------
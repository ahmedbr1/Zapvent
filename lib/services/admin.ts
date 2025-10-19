import { apiFetch } from "@/lib/api-client";
import type { AuthRole, UserRole, UserStatus } from "@/lib/types";

// ---------------- Types ----------------

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

export interface AdminUsersResponse {
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

// Define a proper VendorApplication type instead of using any
export interface VendorApplication {
  id: string;
  status: "Pending" | "Approved" | "Rejected";
  submittedAt: string;
  eventId?: string;
  notes?: string;
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
  applications: VendorApplication[];
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

// ---------------- Backend API Calls ----------------

export async function fetchAdminUsers(token?: string): Promise<AdminUser[]> {
  const response = await apiFetch<AdminUsersResponse>("/admin/users", {
    method: "GET",
    token,
  });

  if (!response.success) {
    throw new Error(response.message ?? "Failed to fetch users");
  }

  return response.users;
}

export async function approveUser(userId: string, token?: string) {
  const response = await apiFetch<ApproveUserResponse>(
    `/admin/approve/${userId}`,
    {
      method: "POST",
      token,
    }
  );

  if (!response.success) {
    throw new Error(response.message ?? "Failed to approve user");
  }

  return response;
}

export async function fetchAdminVendors(
  token?: string
): Promise<AdminVendor[]> {
  const response = await apiFetch<AdminVendorsResponse>("/vendors/admin", {
    token,
  });

  if (!response.success) {
    throw new Error(response.message ?? "Failed to verify vendor");
  }

  return response.vendors ?? [];
}

export async function rejectUser(
  userId: string,
  reason: string | undefined,
  token?: string
) {
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
  const response = await apiFetch<AdminActionResponse>(
    `/admin/users/${userId}/block`,
    {
      method: "PATCH",
      token,
    }
  );

  if (!response.success) {
    throw new Error(response.message ?? "Failed to block user");
  }

  return response;
}

// ---------------- Events Office Management ----------------

export interface EventsOfficeAccount {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  status: "Active" | "Blocked";
  adminType: "EventOffice" | "Admin";
  createdAt: string;
  updatedAt: string;
}

interface EventsOfficeAccountsResponse {
  success: boolean;
  message: string;
  count: number;
  accounts: EventsOfficeAccount[];
}

export interface CreateEventsOfficeAccountData {
  firstName: string;
  lastName: string;
  email: string;
  password: string;
}

export interface UpdateEventsOfficeAccountData {
  firstName?: string;
  lastName?: string;
  email?: string;
}

export async function fetchEventsOfficeAccounts(
  token?: string
): Promise<EventsOfficeAccount[]> {
  const response = await apiFetch<EventsOfficeAccountsResponse>(
    "/admin/events-office",
    {
      token,
    }
  );

  if (!response.success) {
    throw new Error(
      response.message ?? "Failed to load events office accounts"
    );
  }

  return response.accounts ?? [];
}

export async function createEventsOfficeAccount(
  data: CreateEventsOfficeAccountData,
  token?: string
) {
  const response = await apiFetch<
    AdminActionResponse,
    CreateEventsOfficeAccountData
  >("/admin/events-office", {
    method: "POST",
    body: data,
    token,
  });

  if (!response.success) {
    throw new Error(
      response.message ?? "Failed to create events office account"
    );
  }

  return response;
}

export async function updateEventsOfficeAccount(
  accountId: string,
  data: UpdateEventsOfficeAccountData,
  token?: string
) {
  const response = await apiFetch<
    AdminActionResponse,
    UpdateEventsOfficeAccountData
  >(`/admin/events-office/${accountId}`, {
    method: "PATCH",
    body: data,
    token,
  });

  if (!response.success) {
    throw new Error(
      response.message ?? "Failed to update events office account"
    );
  }

  return response;
}

export async function deleteEventsOfficeAccount(
  accountId: string,
  token?: string
) {
  const response = await apiFetch<AdminActionResponse>(
    `/admin/events-office/${accountId}`,
    {
      method: "DELETE",
      token,
    }
  );

  if (!response.success) {
    throw new Error(
      response.message ?? "Failed to delete events office account"
    );
  }

  return response;
}

// ---------------- Admin Management ----------------

export interface AdminAccount {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  status: "Active" | "Blocked";
  adminType: "Admin" | "EventOffice";
  createdAt: string;
  updatedAt: string;
}

interface FetchAdminsResponse {
  success: boolean;
  count: number;
  admins: AdminAccount[];
  message?: string;
}

export async function fetchAllAdmins(token?: string): Promise<AdminAccount[]> {
  const response = await apiFetch<FetchAdminsResponse>("/admin", {
    token,
  });

  if (!response.success) {
    throw new Error(response.message ?? "Failed to load admins");
  }

  return response.admins ?? [];
}

export async function fetchAdmins(token?: string): Promise<AdminAccount[]> {
  const response = await apiFetch<FetchAdminsResponse>("/admin/admins-only", {
    token,
  });

  if (!response.success) {
    throw new Error(response.message ?? "Failed to load admins");
  }

  return response.admins ?? [];
}

export interface CreateAdminData {
  firstName: string;
  lastName: string;
  email: string;
  password: string;
  adminType: "Admin" | "EventOffice";
}

export interface UpdateAdminData {
  firstName?: string;
  lastName?: string;
  email?: string;
}

export async function createAdmin(data: CreateAdminData, token?: string) {
  const response = await apiFetch<AdminActionResponse, CreateAdminData>(
    "/admin",
    {
      method: "POST",
      body: data,
      token,
    }
  );

  if (!response.success) {
    throw new Error(response.message ?? "Failed to create admin");
  }

  return response;
}

export async function updateAdmin(
  adminId: string,
  data: UpdateAdminData,
  token?: string
) {
  const response = await apiFetch<AdminActionResponse, UpdateAdminData>(
    `/admin/${adminId}`,
    {
      method: "PATCH",
      body: data,
      token,
    }
  );

  if (!response.success) {
    throw new Error(response.message ?? "Failed to update admin");
  }

  return response;
}

export async function deleteAdmin(adminId: string, token?: string) {
  const response = await apiFetch<AdminActionResponse>(`/admin/${adminId}`, {
    method: "DELETE",
    token,
  });

  if (!response.success) {
    throw new Error(response.message ?? "Failed to delete admin");
  }

  return response;
}

export async function blockAdmin(adminId: string, token?: string) {
  const response = await apiFetch<AdminActionResponse>(
    `/admin/admins/${adminId}/block`,
    {
      method: "PATCH",
      token,
    }
  );

  if (!response.success) {
    throw new Error(response.message ?? "Failed to block admin");
  }

  return response;
}

export async function unblockAdmin(adminId: string, token?: string) {
  const response = await apiFetch<AdminActionResponse>(
    `/admin/admins/${adminId}/unblock`,
    {
      method: "PATCH",
      token,
    }
  );

  if (!response.success) {
    throw new Error(response.message ?? "Failed to unblock admin");
  }

  return response;
}

import { apiFetch } from "@/lib/api-client";
import type { AuthRole, UserRole, UserStatus, VendorStatus } from "@/lib/types";
import { BazaarBoothSize } from "@/server/models/Event";

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
  eventName?: string;
  status: VendorStatus;
  applicationDate?: string | null;
  attendees: number;
  boothSize: BazaarBoothSize;
  boothLocation?: string;
  boothStartTime?: string | null;
  boothEndTime?: string | null;
}

export interface AdminVendor {
  id: string;
  email: string;
  companyName: string;
  verified: boolean;
  isVerified?: boolean;
  verificationStatus: VendorStatus;
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

// ---------------- Backend API Calls ----------------

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
  const response = await apiFetch<{
    success: boolean;
    message: string;
    vendors?: AdminVendor[];
  }>("/vendors/admin", { token });

  if (!response.success) {
    throw new Error(response.message ?? "Failed to fetch vendors");
  }
  const vendors = response.vendors ?? [];

  return vendors.map((vendor) => ({
    ...vendor,
    isVerified: vendor.isVerified ?? vendor.verified ?? false,
    applications: (vendor.applications ?? []).map((application) => ({
      ...application,
      applicationDate: application.applicationDate
        ? new Date(application.applicationDate).toISOString()
        : null,
      boothStartTime: application.boothStartTime
        ? new Date(application.boothStartTime).toISOString()
        : null,
      boothEndTime: application.boothEndTime
        ? new Date(application.boothEndTime).toISOString()
        : null,
    })),
  }));
}

export async function approveVendorAccount(vendorId: string, token?: string) {
  const response = await apiFetch<AdminActionResponse>(
    `/vendors/admin/${vendorId}/approve`,
    {
      method: "PATCH",
      token,
    }
  );

  if (!response.success) {
    throw new Error(response.message ?? "Failed to approve vendor account");
  }

  return response;
}

export async function rejectVendorAccount(vendorId: string, token?: string) {
  const response = await apiFetch<AdminActionResponse>(
    `/vendors/admin/${vendorId}/reject`,
    {
      method: "PATCH",
      token,
    }
  );

  if (!response.success) {
    throw new Error(response.message ?? "Failed to reject vendor account");
  }

  return response;
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

export async function updateVendorApplicationStatus(
  vendorId: string,
  eventId: string,
  status: "approved" | "rejected",
  token?: string
) {
  try {
    if (!token) {
      throw new Error("Authentication token is required");
    }

    const response = await apiFetch<AdminActionResponse>(
      `/vendors/bazaar-application/status`,
      {
        method: "PATCH",
        body: { vendorId, eventId, status },
        token,
      }
    );

    if (!response.success) {
      throw new Error(
        response.message ?? "Failed to update application status"
      );
    }

    return response;
  } catch (error) {
    // Handle ApiError objects thrown by apiFetch
    if (error && typeof error === "object" && "message" in error) {
      const apiError = error as { message: string; status?: number };
      const errorMessage =
        apiError.message ?? "Failed to update application status";
      console.error("API Error:", {
        message: errorMessage,
        httpStatus: apiError.status,
        vendorId,
        eventId,
        status,
      });
      throw new Error(errorMessage);
    }
  }
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

export async function fetchAdminUsers(token?: string): Promise<AdminUser[]> {
  const response = await apiFetch<{
    success: boolean;
    message?: string;
    users?: AdminUser[];
  }>("/admin/users", {
    token,
  });

  if (!response.success) {
    throw new Error(response.message ?? "Failed to fetch users");
  }

  return response.users ?? [];
}

// Events Office Management
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

// Admin Management (adminType: "Admin")
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

interface FetchAdminResponse {
  success: boolean;
  admin?: AdminAccount;
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

export async function fetchAdminAccount(
  adminId: string,
  token?: string
): Promise<AdminAccount> {
  const response = await apiFetch<FetchAdminResponse>(`/admin/${adminId}`, {
    token,
  });

  if (!response.success || !response.admin) {
    throw new Error(response.message ?? "Failed to load admin profile");
  }

  return response.admin;
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

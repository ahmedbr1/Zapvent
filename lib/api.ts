import type {
  LoginCredentials,
  UserRegisterData,
  VendorRegisterData,
  AuthResponse,
  ApiResponse,
  Event,
  User,
  Admin,
  Vendor,
  GymSession,
  Court,
} from "./types";

const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000/api";

// Helper function to get auth token from cookie
function getAuthToken(): string | null {
  if (typeof window === "undefined") return null;
  const cookies = document.cookie.split(";");
  const tokenCookie = cookies.find((c) => c.trim().startsWith("token="));
  return tokenCookie ? tokenCookie.split("=")[1] : null;
}

// Generic API call function
async function apiCall<T>(
  endpoint: string,
  options: RequestInit = {}
): Promise<ApiResponse<T>> {
  const token = getAuthToken();

  const headers: Record<string, string> = {
    "Content-Type": "application/json",
  };

  if (token) {
    headers["Authorization"] = `Bearer ${token}`;
  }

  if (options.headers) {
    Object.assign(headers, options.headers);
  }

  try {
    const response = await fetch(`${API_BASE_URL}${endpoint}`, {
      ...options,
      headers,
      credentials: "include", // Important for cookies
    });

    const data = await response.json();

    if (!response.ok) {
      return {
        success: false,
        message: data.message || "An error occurred",
      };
    }

    return data;
  } catch (error) {
    console.error("API call error:", error);
    return {
      success: false,
      message: "Network error. Please try again.",
    };
  }
}

// Authentication APIs
export const authApi = {
  loginUser: (credentials: LoginCredentials) =>
    apiCall<AuthResponse>("/auth/login/user", {
      method: "POST",
      body: JSON.stringify(credentials),
    }),

  loginAdmin: (credentials: LoginCredentials) =>
    apiCall<AuthResponse>("/auth/login/admin", {
      method: "POST",
      body: JSON.stringify(credentials),
    }),

  loginVendor: (credentials: LoginCredentials) =>
    apiCall<AuthResponse>("/auth/login/vendor", {
      method: "POST",
      body: JSON.stringify(credentials),
    }),

  registerUser: (data: UserRegisterData) =>
    apiCall<AuthResponse>("/auth/register/user", {
      method: "POST",
      body: JSON.stringify(data),
    }),

  registerVendor: async (data: VendorRegisterData) => {
    const formData = new FormData();
    formData.append("email", data.email);
    formData.append("password", data.password);
    formData.append("businessName", data.businessName);
    formData.append("phoneNumber", data.phoneNumber);
    formData.append("businessDescription", data.businessDescription);
    formData.append(
      "commercialRegistrationNumber",
      data.commercialRegistrationNumber
    );
    formData.append("taxCardNumber", data.taxCardNumber);
    if (data.commercialRegistrationDocument)
      formData.append(
        "commercialRegistrationDocument",
        data.commercialRegistrationDocument
      );
    if (data.taxCardDocument)
      formData.append("taxCardDocument", data.taxCardDocument);

    const token = getAuthToken();
    const headers: HeadersInit = {};
    if (token) headers["Authorization"] = `Bearer ${token}`;

    const response = await fetch(`${API_BASE_URL}/auth/register/vendor`, {
      method: "POST",
      body: formData,
      headers,
      credentials: "include",
    });

    return response.json();
  },

  logout: () =>
    apiCall("/auth/logout", {
      method: "POST",
    }),
};

// Events APIs
export const eventsApi = {
  getAll: (sortOrder?: number) =>
    apiCall<Event[]>(`/events${sortOrder ? `?sortOrder=${sortOrder}` : ""}`),

  getById: (id: string) => apiCall<Event>(`/events/${id}`),

  getUpcomingBazaars: () => apiCall<Event[]>("/events/upcoming-bazaars"),

  createBazaar: (data: Partial<Event>) =>
    apiCall<Event>("/events/bazaar", {
      method: "POST",
      body: JSON.stringify(data),
    }),

  createTrip: (data: Partial<Event>) =>
    apiCall<Event>("/events/trip", {
      method: "POST",
      body: JSON.stringify(data),
    }),

  updateEvent: (id: string, data: Partial<Event>) =>
    apiCall<Event>(`/events/${id}`, {
      method: "PUT",
      body: JSON.stringify(data),
    }),

  updateTrip: (id: string, data: Partial<Event>) =>
    apiCall<Event>(`/events/trip/${id}`, {
      method: "PUT",
      body: JSON.stringify(data),
    }),

  deleteEvent: (id: string) =>
    apiCall(`/events/${id}`, {
      method: "DELETE",
    }),
};

// Users APIs
export const usersApi = {
  getAll: () => apiCall<User[]>("/users"),

  getById: (id: string) => apiCall<User>(`/users/${id}`),

  getRegisteredEvents: (userId: string) =>
    apiCall<Event[]>(`/users/${userId}/registered-events`),

  updateStatus: (id: string, status: string) =>
    apiCall<User>(`/users/${id}/status`, {
      method: "PUT",
      body: JSON.stringify({ status }),
    }),

  blockUser: (id: string) =>
    apiCall<User>(`/users/${id}/block`, {
      method: "PUT",
    }),

  unblockUser: (id: string) =>
    apiCall<User>(`/users/${id}/unblock`, {
      method: "PUT",
    }),

  delete: (id: string) =>
    apiCall(`/users/${id}`, {
      method: "DELETE",
    }),

  verifyUser: (id: string) =>
    apiCall<User>(`/users/${id}/verify`, {
      method: "POST",
    }),
};

// Admin APIs
export const adminApi = {
  getAll: () => apiCall<Admin[]>("/admin"),

  create: (data: Partial<Admin>) =>
    apiCall<Admin>("/admin", {
      method: "POST",
      body: JSON.stringify(data),
    }),

  delete: (id: string) =>
    apiCall(`/admin/${id}`, {
      method: "DELETE",
    }),
};

// Vendor APIs
export const vendorsApi = {
  getAll: () => apiCall<Vendor[]>("/vendors"),

  approve: (id: string) =>
    apiCall<Vendor>(`/vendors/${id}/approve`, {
      method: "PUT",
    }),

  reject: (id: string) =>
    apiCall<Vendor>(`/vendors/${id}/reject`, {
      method: "PUT",
    }),

  applyToBazaar: (bazaarId: string, data: any) =>
    apiCall(`/vendors/apply-bazaar`, {
      method: "POST",
      body: JSON.stringify({ bazaarId, ...data }),
    }),

  getMyApplications: () => apiCall("/vendors/my-applications"),
};

// Gym Sessions APIs
export const gymSessionsApi = {
  getAll: () => apiCall<GymSession[]>("/gym-sessions"),

  getSchedule: (year: number, month: number) =>
    apiCall<GymSession[]>(`/gym-sessions/schedule?year=${year}&month=${month}`),

  register: (sessionId: string) =>
    apiCall(`/gym-sessions/${sessionId}/register`, {
      method: "POST",
    }),

  unregister: (sessionId: string) =>
    apiCall(`/gym-sessions/${sessionId}/unregister`, {
      method: "POST",
    }),

  create: (data: Partial<GymSession>) =>
    apiCall<GymSession>("/gym-sessions", {
      method: "POST",
      body: JSON.stringify(data),
    }),

  update: (id: string, data: Partial<GymSession>) =>
    apiCall<GymSession>(`/gym-sessions/${id}`, {
      method: "PUT",
      body: JSON.stringify(data),
    }),

  delete: (id: string) =>
    apiCall(`/gym-sessions/${id}`, {
      method: "DELETE",
    }),
};

// Courts APIs
export const courtsApi = {
  getAll: () => apiCall<Court[]>("/courts"),

  getById: (id: string) => apiCall<Court>(`/courts/${id}`),
};

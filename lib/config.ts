export const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://localhost:4000/api";

// Server base URL for serving static files (uploads, etc.)
export const SERVER_BASE_URL =
  process.env.NEXT_PUBLIC_SERVER_BASE_URL ?? "http://localhost:4000";

export const JWT_COOKIE_NAME = "token";

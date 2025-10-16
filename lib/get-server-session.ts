import "server-only";
import { cookies } from "next/headers";
import { JWT_COOKIE_NAME } from "./config";
import { decodeToken } from "./auth-jwt";
import type { SessionState } from "./types";

export async function getServerSession(): Promise<SessionState | null> {
  const cookieStore = await cookies();
  const token = cookieStore.get(JWT_COOKIE_NAME)?.value;
  if (!token) {
    return null;
  }

  return decodeToken(token);
}

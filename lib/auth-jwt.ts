import type { SessionState, SessionUser } from "./types";

interface TokenPayload {
  id: string;
  email: string;
  role: SessionUser["role"];
  userRole?: SessionUser["userRole"];
  firstName?: string;
  lastName?: string;
  companyName?: string;
  isVerified?: boolean;
  status?: string;
  logo?: string;
  exp?: number;
  iat?: number;
}

function base64UrlDecode(input: string) {
  const normalized = input.replace(/-/g, "+").replace(/_/g, "/");
  const pad = normalized.length % 4;
  const padded =
    pad === 2
      ? `${normalized}==`
      : pad === 3
        ? `${normalized}=`
        : pad === 1
          ? `${normalized}===`
          : normalized;

  if (typeof window === "undefined") {
    return Buffer.from(padded, "base64").toString("utf8");
  }

  const binary = window.atob(padded);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i += 1) {
    bytes[i] = binary.charCodeAt(i);
  }
  const decoder = new TextDecoder("utf-8");
  return decoder.decode(bytes);
}

export function decodeToken(token: string): SessionState | null {
  try {
    const [, payloadPart] = token.split(".");
    if (!payloadPart) {
      return null;
    }

    const payload = JSON.parse(base64UrlDecode(payloadPart)) as TokenPayload;

    const user: SessionUser = {
      id: payload.id,
      email: payload.email,
      role: payload.role,
      userRole: payload.userRole,
      name:
        payload.firstName || payload.lastName
          ? [payload.firstName, payload.lastName].filter(Boolean).join(" ")
          : undefined,
      companyName: payload.companyName,
      isVerified: payload.isVerified,
      status: payload.status,
      logo: payload.logo,
    };

    return {
      token,
      user,
    };
  } catch {
    return null;
  }
}

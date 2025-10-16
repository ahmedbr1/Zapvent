import { API_BASE_URL } from "./config";
import type { ApiError } from "./types";

type Method =
  | "GET"
  | "POST"
  | "PUT"
  | "PATCH"
  | "DELETE"
  | "OPTIONS"
  | "HEAD";

export interface ApiRequestOptions<TBody = unknown>
  extends Omit<RequestInit, "body" | "method"> {
  method?: Method;
  body?: TBody;
  token?: string;
  skipJson?: boolean;
}

async function parseJson<T>(response: Response): Promise<T> {
  const text = await response.text();
  if (!text) {
    return {} as T;
  }

  try {
    return JSON.parse(text) as T;
  } catch {
    throw {
      status: response.status,
      message: "Invalid JSON response from server",
    } satisfies ApiError;
  }
}

export async function apiFetch<TResponse, TBody = unknown>(
  path: string,
  options: ApiRequestOptions<TBody> = {}
): Promise<TResponse> {
  const {
    method = "GET",
    body,
    headers,
    token,
    skipJson,
    ...rest
  } = options;

  const url = path.startsWith("http")
    ? path
    : `${API_BASE_URL}${path.startsWith("/") ? path : `/${path}`}`;

  const finalHeaders = new Headers(headers ?? {});
  finalHeaders.set("Accept", "application/json");

  const shouldSerializeJson =
    Boolean(body) &&
    !skipJson &&
    !(body instanceof FormData) &&
    !(body instanceof Blob) &&
    !(body instanceof ArrayBuffer);

  if (shouldSerializeJson) {
    finalHeaders.set("Content-Type", "application/json");
  }

  if (token) {
    finalHeaders.set("Authorization", `Bearer ${token}`);
  }

  const response = await fetch(url, {
    method,
    credentials: "include",
    headers: finalHeaders,
    body: body
      ? shouldSerializeJson
        ? JSON.stringify(body)
        : (body as BodyInit)
      : undefined,
    ...rest,
  });

  if (!response.ok) {
    const errorBody = await parseError(response);
    throw errorBody;
  }

  if (response.status === 204 || response.headers.get("Content-Length") === "0") {
    return {} as TResponse;
  }

  if (skipJson) {
    return (await response.blob()) as unknown as TResponse;
  }

  return parseJson<TResponse>(response);
}

async function parseError(response: Response): Promise<ApiError> {
  try {
    const data = await parseJson<Partial<ApiError>>(response);
    return {
      status: response.status,
      message: data.message ?? response.statusText,
      issues: data.issues,
    };
  } catch {
    return {
      status: response.status,
      message: response.statusText || "Unknown error",
    };
  }
}

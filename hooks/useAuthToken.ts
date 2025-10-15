"use client";

import { useAuth } from "@/components/providers/AuthProvider";

export function useAuthToken() {
  const { session } = useAuth();
  return session?.token ?? null;
}

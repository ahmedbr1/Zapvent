"use client";

import { useAuth } from "@/components/providers/AuthProvider";

export function useSessionUser() {
  const { session } = useAuth();
  return session?.user ?? null;
}

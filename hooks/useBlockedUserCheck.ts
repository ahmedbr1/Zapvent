"use client";

import { useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { useQueryClient } from "@tanstack/react-query";
import { useAuthToken } from "./useAuthToken";
import { useSessionUser } from "./useSessionUser";
import { API_BASE_URL } from "@/lib/config";
import { AuthRole } from "@/lib/types";

/**
 * Hook to periodically check if the current user has been blocked
 * Redirects to login if user status changes to blocked
 */
export function useBlockedUserCheck() {
  const token = useAuthToken();
  const sessionUser = useSessionUser();
  const router = useRouter();
  const queryClient = useQueryClient();
  const checkingRef = useRef(false);

  useEffect(() => {
    // Only check for regular users, not admins or events office
    if (
      !token ||
      !sessionUser ||
      sessionUser.role === AuthRole.Admin ||
      sessionUser.role === AuthRole.EventOffice
    ) {
      return;
    }

    const checkUserStatus = async () => {
      if (checkingRef.current) return;
      checkingRef.current = true;

      try {
        // Try to fetch a protected resource to verify token is still valid
        const response = await fetch(
          `${API_BASE_URL}/users/registered-events`,
          {
            headers: {
              Authorization: `Bearer ${token}`,
            },
          }
        );

        // If unauthorized (401/403), user might be blocked
        if (response.status === 401 || response.status === 403) {
          // Clear all queries and redirect
          queryClient.clear();
          localStorage.removeItem("token");
          router.push("/login/user?blocked=true");
        }
      } catch (error) {
        // Network errors, ignore
        console.error("Error checking user status:", error);
      } finally {
        checkingRef.current = false;
      }
    };

    // Check immediately
    checkUserStatus();

    // Then check every 30 seconds
    const interval = setInterval(checkUserStatus, 30000);

    return () => clearInterval(interval);
  }, [token, sessionUser, router, queryClient]);
}

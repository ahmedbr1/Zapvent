"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/app/contexts/AuthContext";
import { Box, CircularProgress } from "@mui/material";
import { UserRole } from "@/lib/types";

interface ProtectedRouteProps {
  children: React.ReactNode;
  allowedRoles?: ("user" | "admin" | "vendor")[];
  allowedUserRoles?: UserRole[];
}

export default function ProtectedRoute({
  children,
  allowedRoles,
  allowedUserRoles,
}: ProtectedRouteProps) {
  const router = useRouter();
  const { user, userType, isLoading, userRole } = useAuth();

  useEffect(() => {
    if (!isLoading) {
      // If not authenticated, redirect to home
      if (!user) {
        router.push("/");
        return;
      }

      // Check if user type is allowed
      if (allowedRoles && userType && !allowedRoles.includes(userType)) {
        router.push("/");
        return;
      }

      // Check if user role is allowed (for User type)
      if (
        allowedUserRoles &&
        userType === "user" &&
        userRole &&
        !allowedUserRoles.includes(userRole)
      ) {
        router.push("/");
        return;
      }
    }
  }, [
    user,
    userType,
    userRole,
    isLoading,
    router,
    allowedRoles,
    allowedUserRoles,
  ]);

  if (isLoading) {
    return (
      <Box
        display="flex"
        justifyContent="center"
        alignItems="center"
        minHeight="100vh"
      >
        <CircularProgress />
      </Box>
    );
  }

  if (!user) {
    return null;
  }

  return <>{children}</>;
}

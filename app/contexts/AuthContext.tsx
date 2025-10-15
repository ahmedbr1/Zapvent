"use client";

import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  ReactNode,
} from "react";
import { useRouter } from "next/navigation";
import { authApi } from "@/lib/api";
import { User, Admin, Vendor, UserRole } from "@/lib/types";

type AuthUser = User | Admin | Vendor | null;

interface AuthContextType {
  user: AuthUser;
  userType: "user" | "admin" | "vendor" | null;
  isLoading: boolean;
  login: (
    credentials: { email: string; password: string },
    type: "user" | "admin" | "vendor"
  ) => Promise<void>;
  logout: () => Promise<void>;
  isAuthenticated: boolean;
  isAdmin: boolean;
  isVendor: boolean;
  isUser: boolean;
  userRole?: UserRole; // For User type: student, staff, ta, professor
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
};

interface AuthProviderProps {
  children: ReactNode;
}

export const AuthProvider: React.FC<AuthProviderProps> = ({ children }) => {
  const [user, setUser] = useState<AuthUser>(null);
  const [userType, setUserType] = useState<"user" | "admin" | "vendor" | null>(
    null
  );
  const [isLoading, setIsLoading] = useState(true);
  const router = useRouter();

  // Check authentication status on mount
  useEffect(() => {
    const checkAuth = async () => {
      try {
        // Try to get user profile from backend using stored cookie
        const token = localStorage.getItem("userType");
        if (!token) {
          setIsLoading(false);
          return;
        }

        // You can add a /api/auth/me endpoint to verify token and get user data
        // For now, we'll just check localStorage
        setUserType(token as "user" | "admin" | "vendor");
      } catch (error) {
        console.error("Auth check failed:", error);
        localStorage.removeItem("userType");
      } finally {
        setIsLoading(false);
      }
    };

    checkAuth();
  }, []);

  const login = async (
    credentials: { email: string; password: string },
    type: "user" | "admin" | "vendor"
  ) => {
    setIsLoading(true);
    try {
      let response;

      switch (type) {
        case "user":
          response = await authApi.loginUser(credentials);
          break;
        case "admin":
          response = await authApi.loginAdmin(credentials);
          break;
        case "vendor":
          response = await authApi.loginVendor(credentials);
          break;
      }

      if (response.success && response.data) {
        setUser(response.data.user || null);
        setUserType(type);
        localStorage.setItem("userType", type);

        // Redirect based on user type
        switch (type) {
          case "user":
            const userObj = response.data.user as User;
            if (userObj.role === UserRole.STUDENT) {
              router.push("/student/dashboard");
            } else {
              router.push("/staff/dashboard");
            }
            break;
          case "admin":
            router.push("/admin/dashboard");
            break;
          case "vendor":
            router.push("/vendor/dashboard");
            break;
        }
      } else {
        throw new Error(response.message || "Login failed");
      }
    } catch (error) {
      console.error("Login error:", error);
      throw error;
    } finally {
      setIsLoading(false);
    }
  };

  const logout = async () => {
    try {
      await authApi.logout();
      setUser(null);
      setUserType(null);
      localStorage.removeItem("userType");
      router.push("/");
    } catch (error) {
      console.error("Logout error:", error);
      // Still clear local state even if API call fails
      setUser(null);
      setUserType(null);
      localStorage.removeItem("userType");
      router.push("/");
    }
  };

  const isAuthenticated = !!user;
  const isAdmin = userType === "admin";
  const isVendor = userType === "vendor";
  const isUser = userType === "user";
  const userRole = isUser && user ? (user as User).role : undefined;

  const value: AuthContextType = {
    user,
    userType,
    isLoading,
    login,
    logout,
    isAuthenticated,
    isAdmin,
    isVendor,
    isUser,
    userRole,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

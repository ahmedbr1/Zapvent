"use client";

import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
} from "react";
import type { ReactNode } from "react";
import { decodeToken } from "@/lib/auth-jwt";
import type { SessionState } from "@/lib/types";

interface AuthContextValue {
  session: SessionState | null;
  initializing: boolean;
  setSession: (session: SessionState | null) => void;
  setSessionFromToken: (token: string, overrides?: Partial<SessionState["user"]>) => void;
  clearSession: () => void;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

interface AuthProviderProps {
  initialSession: SessionState | null;
  children: ReactNode;
}

export function AuthProvider({ initialSession, children }: AuthProviderProps) {
  const [session, setSessionState] = useState<SessionState | null>(
    initialSession
  );
  const [initializing, setInitializing] = useState(false);

  const setSession = useCallback((value: SessionState | null) => {
    setSessionState(value);
  }, []);

  const clearSession = useCallback(() => {
    setSessionState(null);
  }, []);

  const setSessionFromToken = useCallback(
    (token: string, overrides?: Partial<SessionState["user"]>) => {
      setInitializing(true);
      try {
        const decoded = decodeToken(token);
        if (!decoded) {
          setSessionState(null);
          return;
        }

        setSessionState({
          token,
          user: {
            ...decoded.user,
            ...overrides,
          },
        });
      } finally {
        setInitializing(false);
      }
    },
    []
  );

  const value = useMemo<AuthContextValue>(
    () => ({
      session,
      initializing,
      setSession,
      setSessionFromToken,
      clearSession,
    }),
    [session, initializing, setSession, setSessionFromToken, clearSession]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}

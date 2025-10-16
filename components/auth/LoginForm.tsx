"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import TextField from "@mui/material/TextField";
import Alert from "@mui/material/Alert";
import Stack from "@mui/material/Stack";
import InputAdornment from "@mui/material/InputAdornment";
import EmailIcon from "@mui/icons-material/AlternateEmailRounded";
import LockIcon from "@mui/icons-material/LockRounded";
import LoadingButton from "@mui/lab/LoadingButton";
import { apiFetch } from "@/lib/api-client";
import { useAuth } from "@/components/providers/AuthProvider";
import { useSnackbar } from "notistack";
import { decodeToken } from "@/lib/auth-jwt";
import { getDefaultDashboardRoute } from "@/lib/routing";
import { AuthRole, type SessionState } from "@/lib/types";

type LoginVariant = "user" | "admin" | "vendor" | "events-office";

const schema = z.object({
  email: z.string().email("Enter a valid email"),
  password: z.string().min(8, "Password must be at least 8 characters"),
});

type LoginFields = z.infer<typeof schema>;

interface LoginFormProps {
  variant: LoginVariant;
}

interface LoginResponse {
  success: boolean;
  token: string;
  user?: {
    id: string;
    email: string;
    role: string;
    firstName?: string;
    lastName?: string;
    status?: string;
    companyName?: string;
    isVerified?: boolean;
    logo?: string;
    userRole?: string;
  };
  message?: string;
}

const endpointMap: Record<LoginVariant, string> = {
  user: "/auth/login/user",
  admin: "/auth/login/admin",
  vendor: "/auth/login/vendor",
  "events-office": "/auth/login/admin",
};

export function LoginForm({ variant }: LoginFormProps) {
  const { handleSubmit, register, formState, setError } = useForm<LoginFields>({
    resolver: zodResolver(schema),
  });
  const { enqueueSnackbar } = useSnackbar();
  const router = useRouter();
  const { setSessionFromToken } = useAuth();
  const [formError, setFormError] = useState<string | null>(null);

  const onSubmit = handleSubmit(async (data) => {
    setFormError(null);
    try {
      const result = await apiFetch<LoginResponse, LoginFields>(
        endpointMap[variant],
        {
          method: "POST",
          body: data,
        }
      );

      if (!result.success) {
        setFormError(result.message ?? "Unable to sign in.");
        return;
      }

      const overrides: Partial<SessionState["user"]> = {
        name:
          result.user?.firstName || result.user?.lastName
            ? [result.user?.firstName, result.user?.lastName]
                .filter(Boolean)
                .join(" ")
            : undefined,
        status: result.user?.status,
        companyName: result.user?.companyName,
        logo: result.user?.logo,
        userRole: result.user?.userRole as SessionState["user"]["userRole"],
      };

      if (variant === "events-office") {
        overrides.role = AuthRole.EventsOffice;
      }

      setSessionFromToken(result.token, overrides);

      const decoded = decodeToken(result.token);
      const roleFromToken =
        decoded?.user.role ??
        (result.user?.role ? (result.user.role as AuthRole) : undefined);

      const effectiveRole =
        variant === "events-office"
          ? AuthRole.EventsOffice
          : roleFromToken;

      if (variant === "events-office") {
        enqueueSnackbar(
          "Events Office login successful. Redirecting to your workspace.",
          { variant: "success" }
        );
        router.replace(getDefaultDashboardRoute(AuthRole.EventsOffice));
        return;
      }

      if (!effectiveRole) {
        enqueueSnackbar("Logged in, but unable to determine your role.", {
          variant: "warning",
        });
        router.replace("/");
        return;
      }

      enqueueSnackbar("Welcome back!", { variant: "success" });
      router.replace(getDefaultDashboardRoute(effectiveRole));
    } catch (error) {
      const message =
        error instanceof Error
          ? error.message
          : (error as { message?: string }).message;
      setFormError(message ?? "Something went wrong. Please try again.");
      setError("password", { message: " " });
    }
  });

  return (
    <form onSubmit={onSubmit} noValidate>
      <Stack spacing={2.5}>
        {formError && (
          <Alert severity="error" variant="outlined">
            {formError}
          </Alert>
        )}
        <TextField
          label="Email"
          type="email"
          fullWidth
          autoComplete="email"
          InputProps={{
            startAdornment: (
              <InputAdornment position="start">
                <EmailIcon fontSize="small" />
              </InputAdornment>
            ),
          }}
          {...register("email")}
          error={Boolean(formState.errors.email)}
          helperText={formState.errors.email?.message}
        />
        <TextField
          label="Password"
          type="password"
          fullWidth
          autoComplete={
            variant === "user" || variant === "vendor"
              ? "current-password"
              : "new-password"
          }
          InputProps={{
            startAdornment: (
              <InputAdornment position="start">
                <LockIcon fontSize="small" />
              </InputAdornment>
            ),
          }}
          {...register("password")}
          error={Boolean(formState.errors.password)}
          helperText={formState.errors.password?.message}
        />
        <LoadingButton
          type="submit"
          loading={formState.isSubmitting}
          variant="contained"
          size="large"
        >
          Sign in
        </LoadingButton>
      </Stack>
    </form>
  );
}

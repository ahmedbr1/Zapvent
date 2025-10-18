"use client";

import { useSearchParams } from "next/navigation";
import Link from "next/link";
import Button from "@mui/material/Button";
import Typography from "@mui/material/Typography";
import Alert from "@mui/material/Alert";
import { AuthScaffold } from "@/components/layout/AuthScaffold";
import { LoginForm } from "@/components/auth/LoginForm";

export default function UserLoginPage() {
  const searchParams = useSearchParams();
  const isBlocked = searchParams.get("blocked") === "true";

  return (
    <AuthScaffold
      title="Sign in as Student or Faculty"
      subtitle="Access your dashboards, manage registrations, and stay ahead of upcoming experiences."
      accent="user"
      backLink={{
        href: "/",
        label: "Back to Home",
      }}
      footer={
        <>
          <Typography variant="body2" color="text.secondary">
            New here?
          </Typography>
          <Button
            component={Link}
            href="/register/user"
            variant="text"
            color="secondary"
          >
            Create a student account
          </Button>
          <Button component={Link} href="/forgot-password" variant="text">
            Forgot password?
          </Button>
        </>
      }
    >
      {isBlocked && (
        <Alert severity="error" sx={{ mb: 3 }}>
          Your account has been blocked by an administrator. Please contact
          support for assistance.
        </Alert>
      )}
      <LoginForm variant="user" />
    </AuthScaffold>
  );
}

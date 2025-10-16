"use client";

import Link from "next/link";
import Button from "@mui/material/Button";
import Typography from "@mui/material/Typography";
import { AuthScaffold } from "@/components/layout/AuthScaffold";
import { LoginForm } from "@/components/auth/LoginForm";

export default function UserLoginPage() {
  return (
    <AuthScaffold
      title="Sign in as Student or Faculty"
      subtitle="Access your dashboards, manage registrations, and stay ahead of upcoming experiences."
      accent="user"
      footer={
        <>
          <Typography variant="body2" color="text.secondary">
            New here?
          </Typography>
          <Button component={Link} href="/register/user" variant="text" color="secondary">
            Create a student account
          </Button>
          <Button component={Link} href="/forgot-password" variant="text">
            Forgot password?
          </Button>
        </>
      }
    >
      <LoginForm variant="user" />
    </AuthScaffold>
  );
}

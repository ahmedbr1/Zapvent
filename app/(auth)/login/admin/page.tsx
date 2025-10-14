"use client";

import Link from "next/link";
import Button from "@mui/material/Button";
import Typography from "@mui/material/Typography";
import { AuthScaffold } from "@/components/layout/AuthScaffold";
import { LoginForm } from "@/components/auth/LoginForm";

export default function AdminLoginPage() {
  return (
    <AuthScaffold
      title="Administrator Sign In"
      subtitle="Securely manage approvals, user governance, and vendor onboarding."
      accent="admin"
      footer={
        <>
          <Typography variant="body2" color="text.secondary">
            Events Office team?
          </Typography>
          <Button component={Link} href="/login/events-office" variant="text" color="secondary">
            Switch to Events Office
          </Button>
        </>
      }
    >
      <LoginForm variant="admin" />
    </AuthScaffold>
  );
}

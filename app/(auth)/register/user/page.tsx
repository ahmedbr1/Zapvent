"use client";

import Link from "next/link";
import Typography from "@mui/material/Typography";
import Button from "@mui/material/Button";
import { AuthScaffold } from "@/components/layout/AuthScaffold";
import { UserRegisterForm } from "@/components/auth/UserRegisterForm";

export default function UserRegisterPage() {
  return (
    <AuthScaffold
      title="Create your student account"
      subtitle="Register to explore university events, track registrations, and stay informed."
      accent="user"
      backLink={{ href: "/login/user", label: "Back to login" }}
      footer={
        <>
          <Typography variant="body2" color="text.secondary">
            Already verified?
          </Typography>
          <Button component={Link} href="/login/user" variant="text" color="secondary">
            Sign in
          </Button>
        </>
      }
    >
      <UserRegisterForm />
    </AuthScaffold>
  );
}

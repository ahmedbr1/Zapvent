"use client";

import Link from "next/link";
import Button from "@mui/material/Button";
import Typography from "@mui/material/Typography";
import { AuthScaffold } from "@/components/layout/AuthScaffold";
import { LoginForm } from "@/components/auth/LoginForm";

export default function EventsOfficeLoginPage() {
  return (
    <AuthScaffold
      title="Events Office Login"
      subtitle="Coordinate bazaars, workshops, conferences, and gym sessions across campuses."
      accent="events"
      backLink={{
        href: "/",
        label: "Back to Home",
      }}
      footer={
        <>
          <Typography variant="body2" color="text.secondary">
            Need admin support?
          </Typography>
          <Button
            component={Link}
            href="/login/admin"
            variant="text"
            color="secondary"
          >
            Contact platform admins
          </Button>
        </>
      }
    >
      <LoginForm variant="events-office" />
    </AuthScaffold>
  );
}

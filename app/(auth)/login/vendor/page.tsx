"use client";

import Link from "next/link";
import Button from "@mui/material/Button";
import Typography from "@mui/material/Typography";
import { AuthScaffold } from "@/components/layout/AuthScaffold";
import { LoginForm } from "@/components/auth/LoginForm";

export default function VendorLoginPage() {
  return (
    <AuthScaffold
      title="Vendor Portal Access"
      subtitle="Track your bazaar applications, booth assignments, and event schedules."
      accent="vendor"
      backLink={{
        href: "/",
        label: "Back to Home",
      }}
      footer={
        <>
          <Typography variant="body2" color="text.secondary">
            New partner?
          </Typography>
          <Button
            component={Link}
            href="/register/vendor"
            variant="text"
            color="secondary"
          >
            Apply as a vendor
          </Button>
          <Button component={Link} href="/forgot-password" variant="text">
            Reset password
          </Button>
        </>
      }
    >
      <LoginForm variant="vendor" />
    </AuthScaffold>
  );
}

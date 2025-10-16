"use client";

import Link from "next/link";
import Typography from "@mui/material/Typography";
import Button from "@mui/material/Button";
import { AuthScaffold } from "@/components/layout/AuthScaffold";
import { VendorRegisterForm } from "@/components/auth/VendorRegisterForm";

export default function VendorRegisterPage() {
  return (
    <AuthScaffold
      title="Vendor onboarding"
      subtitle="Partner with the Events Office to deliver unforgettable campus experiences."
      accent="vendor"
      backLink={{ href: "/login/vendor", label: "Back to vendor login" }}
      footer={
        <>
          <Typography variant="body2" color="text.secondary">
            Already have an account?
          </Typography>
          <Button component={Link} href="/login/vendor" variant="text" color="secondary">
            Sign in
          </Button>
        </>
      }
    >
      <VendorRegisterForm />
    </AuthScaffold>
  );
}

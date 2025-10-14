"use client";

import { useState } from "react";
import TextField from "@mui/material/TextField";
import Typography from "@mui/material/Typography";
import Alert from "@mui/material/Alert";
import Stack from "@mui/material/Stack";
import Link from "next/link";
import Button from "@mui/material/Button";
import LoadingButton from "@mui/lab/LoadingButton";
import { AuthScaffold } from "@/components/layout/AuthScaffold";

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [submitted, setSubmitted] = useState(false);

  const handleSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setSubmitted(true);
  };

  return (
    <AuthScaffold
      title="Forgot your password?"
      subtitle="Enter your email and we’ll send you instructions to reset it once the feature is live."
      accent="user"
      backLink={{ href: "/login/user", label: "Back to login" }}
      footer={
        <>
          <Typography variant="body2" color="text.secondary">
            Need help?
          </Typography>
          <Button component={Link} href="/support" variant="text">
            Contact support
          </Button>
        </>
      }
    >
      <form onSubmit={handleSubmit} noValidate>
        <Stack spacing={2.5}>
          {submitted && (
            <Alert severity="info">
              We&apos;ll notify the support team to help you reset your password shortly.
            </Alert>
          )}
          <TextField
            label="University email"
            type="email"
            fullWidth
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            helperText="We’ll never share your email."
          />
          <LoadingButton type="submit" variant="contained" size="large">
            Send reset instructions
          </LoadingButton>
        </Stack>
      </form>
    </AuthScaffold>
  );
}

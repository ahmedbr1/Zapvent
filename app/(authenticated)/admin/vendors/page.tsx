"use client";

import Stack from "@mui/material/Stack";
import Typography from "@mui/material/Typography";
import Button from "@mui/material/Button";
import StorefrontIcon from "@mui/icons-material/StorefrontRounded";

export default function VendorApplicationsPage() {
  return (
    <Stack spacing={3}>
      <Stack spacing={1}>
        <Typography variant="h4" fontWeight={700}>
          Vendor applications
        </Typography>
        <Typography variant="body1" color="text.secondary">
          Review vendor onboarding requests and track statuses. We&apos;re still
          preparing the experience.
        </Typography>
      </Stack>

      <Stack
        spacing={2}
        alignItems="center"
        justifyContent="center"
        sx={{
          borderRadius: 2,
          border: "1px dashed rgba(148,163,184,0.4)",
          py: 6,
          px: 3,
          textAlign: "center",
          backgroundColor: "rgba(15, 23, 42, 0.02)",
        }}
      >
        <Typography variant="subtitle1" fontWeight={600}>
          Vendor review queue coming soon
        </Typography>
        <Typography variant="body2" color="text.secondary">
          Approvals, rejections, and application filters will live here in a
          future release.
        </Typography>
        <Button
          startIcon={<StorefrontIcon />}
          variant="outlined"
          onClick={() => window.location.assign("/admin/users")}
        >
          Return to user management
        </Button>
      </Stack>
    </Stack>
  );
}

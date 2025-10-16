"use client";

import Stack from "@mui/material/Stack";
import Typography from "@mui/material/Typography";
import Button from "@mui/material/Button";
import RefreshIcon from "@mui/icons-material/RefreshRounded";

export default function AdminManagementPage() {
  return (
    <Stack spacing={3}>
      <Stack spacing={1}>
        <Typography variant="h4" fontWeight={700}>
          Admin management
        </Typography>
        <Typography variant="body1" color="text.secondary">
          Manage administrative accounts. This section is under construction.
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
          Admin account tools coming soon
        </Typography>
        <Typography variant="body2" color="text.secondary">
          We&apos;re working on bulk creation, status controls, and audit logs
          for admin users. Check back shortly.
        </Typography>
        <Button startIcon={<RefreshIcon />} onClick={() => window.location.reload()}>
          Refresh
        </Button>
      </Stack>
    </Stack>
  );
}

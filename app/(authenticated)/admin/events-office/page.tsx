"use client";

import Stack from "@mui/material/Stack";
import Typography from "@mui/material/Typography";
import Button from "@mui/material/Button";
import HelpIcon from "@mui/icons-material/HelpOutlineRounded";

export default function EventsOfficeAccountsPage() {
  return (
    <Stack spacing={3}>
      <Stack spacing={1}>
        <Typography variant="h4" fontWeight={700}>
          Events office accounts
        </Typography>
        <Typography variant="body1" color="text.secondary">
          Invite, track, and manage Events Office teammates. This module is
          still being wired up.
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
          Nothing to see just yet
        </Typography>
        <Typography variant="body2" color="text.secondary">
          Once available you&apos;ll be able to provision Event Office admins,
          review activity, and control permissions from here.
        </Typography>
        <Button
          startIcon={<HelpIcon />}
          variant="outlined"
          onClick={() => window.open("mailto:support@zapvent.local", "_blank")}
        >
          Contact support
        </Button>
      </Stack>
    </Stack>
  );
}

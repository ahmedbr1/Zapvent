"use client";

import Dialog from "@mui/material/Dialog";
import DialogTitle from "@mui/material/DialogTitle";
import DialogContent from "@mui/material/DialogContent";
import DialogActions from "@mui/material/DialogActions";
import Button from "@mui/material/Button";
import Stack from "@mui/material/Stack";
import Typography from "@mui/material/Typography";
import Alert from "@mui/material/Alert";
import WarningIcon from "@mui/icons-material/WarningRounded";
import EventIcon from "@mui/icons-material/EventRounded";
import RefundIcon from "@mui/icons-material/ReplayRounded";
import type { EventSummary } from "@/lib/types";
import { formatDateTime } from "@/lib/date";

interface EventCancellationDialogProps {
  open: boolean;
  event?: Pick<EventSummary, "name" | "startDate"> | null;
  loading?: boolean;
  onConfirm: () => void;
  onClose: () => void;
}

export function EventCancellationDialog({
  open,
  event,
  loading = false,
  onConfirm,
  onClose,
}: EventCancellationDialogProps) {
  const startDateLabel = event?.startDate ? formatDateTime(event.startDate) : undefined;

  return (
    <Dialog
      open={open}
      fullWidth
      maxWidth="sm"
      onClose={loading ? undefined : onClose}
    >
      <DialogTitle>Cancel registration?</DialogTitle>
      <DialogContent dividers>
        <Stack spacing={2.5}>
          <Alert severity="warning" icon={<WarningIcon fontSize="small" />}> 
            Refunds are automatically credited back to your wallet when you cancel at least 14 days before the event start date.
          </Alert>
          <Stack spacing={1.5}>
            <Stack direction="row" spacing={1} alignItems="center">
              <EventIcon color="primary" />
              <div>
                <Typography variant="subtitle2" color="text.secondary">
                  Event
                </Typography>
                <Typography variant="h6" fontWeight={700} sx={{ lineHeight: 1.3 }}>
                  {event?.name ?? "Selected event"}
                </Typography>
              </div>
            </Stack>
            {startDateLabel ? (
              <Stack direction="row" spacing={1} alignItems="center">
                <RefundIcon color="action" />
                <div>
                  <Typography variant="subtitle2" color="text.secondary">
                    Starts on
                  </Typography>
                  <Typography variant="body1" fontWeight={600}>
                    {startDateLabel}
                  </Typography>
                </div>
              </Stack>
            ) : null}
            <Typography variant="body2" color="text.secondary">
              Your seat will be released to the waiting list. This action cannot be undone.
            </Typography>
          </Stack>
        </Stack>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose} disabled={loading}>
          Keep registration
        </Button>
        <Button
          onClick={onConfirm}
          color="error"
          variant="contained"
          disabled={loading}
        >
          {loading ? "Cancelling..." : "Cancel & refund"}
        </Button>
      </DialogActions>
    </Dialog>
  );
}

export default EventCancellationDialog;

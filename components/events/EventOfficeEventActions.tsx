"use client";

import { useEffect, useMemo, useState } from "react";
import Stack from "@mui/material/Stack";
import Typography from "@mui/material/Typography";
import Dialog from "@mui/material/Dialog";
import DialogTitle from "@mui/material/DialogTitle";
import DialogContent from "@mui/material/DialogContent";
import DialogActions from "@mui/material/DialogActions";
import FormGroup from "@mui/material/FormGroup";
import FormControlLabel from "@mui/material/FormControlLabel";
import Checkbox from "@mui/material/Checkbox";
import Button from "@mui/material/Button";
import Tooltip from "@mui/material/Tooltip";
import Alert from "@mui/material/Alert";
import LoadingButton from "@mui/lab/LoadingButton";
import DownloadIcon from "@mui/icons-material/CloudDownloadRounded";
import QrCodeIcon from "@mui/icons-material/QrCode2Rounded";
import LockIcon from "@mui/icons-material/LockRounded";
import { useSnackbar } from "notistack";
import { EventType, UserRole } from "@/lib/types";
import {
  exportEventRegistrationsFile,
  generateEventQrCodeFile,
  updateEventRoleRestrictions,
} from "@/lib/services/events";

const USER_ROLE_OPTIONS: UserRole[] = [
  UserRole.Student,
  UserRole.Staff,
  UserRole.Professor,
  UserRole.TA,
];

interface EventOfficeEventActionsProps {
  eventId: string;
  eventName: string;
  eventType: EventType;
  token?: string | null;
  allowedRoles?: UserRole[];
  onRestrictionsUpdated?: (roles: UserRole[]) => void;
}

export function EventOfficeEventActions({
  eventId,
  eventName,
  eventType,
  token,
  allowedRoles = [],
  onRestrictionsUpdated,
}: EventOfficeEventActionsProps) {
  const { enqueueSnackbar } = useSnackbar();
  const [exporting, setExporting] = useState(false);
  const [generatingQr, setGeneratingQr] = useState(false);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [currentRoles, setCurrentRoles] = useState<UserRole[]>(allowedRoles);
  const [selectedRoles, setSelectedRoles] = useState<UserRole[]>(allowedRoles);
  const [savingRestrictions, setSavingRestrictions] = useState(false);

  useEffect(() => {
    setCurrentRoles(allowedRoles);
    setSelectedRoles(allowedRoles);
  }, [allowedRoles]);

  const restrictionLabel = currentRoles.length
    ? `Restricted to ${currentRoles.join(", ")}`
    : "Open to all verified users.";

  const qrSupported =
    eventType === EventType.Bazaar || eventType === EventType.Seminar;

  const exportDisabledReason =
    eventType === EventType.Conference
      ? "Conferences do not support attendee exports."
      : undefined;

  const needsAuth = !token;

  const disableDownloads = exporting || generatingQr;

  const restrictionsChanged = useMemo(() => {
    if (selectedRoles.length !== currentRoles.length) {
      return true;
    }
    return selectedRoles.some((role) => !currentRoles.includes(role));
  }, [currentRoles, selectedRoles]);

  const handleExport = async () => {
    if (!token) return;
    setExporting(true);
    try {
      const { blob, filename } = await exportEventRegistrationsFile(
        eventId,
        token
      );
      triggerBrowserDownload(
        blob,
        filename ?? `${eventName.replace(/\s+/g, "_")}_registrations.xlsx`
      );
      enqueueSnackbar("Registration export generated.", {
        variant: "success",
      });
    } catch (error) {
      enqueueSnackbar(
        getErrorMessage(error, "Unable to export registrations."),
        {
          variant: "error",
        }
      );
    } finally {
      setExporting(false);
    }
  };

  const handleGenerateQr = async () => {
    if (!token) return;
    setGeneratingQr(true);
    try {
      const { blob, filename } = await generateEventQrCodeFile(eventId, token);
      triggerBrowserDownload(
        blob,
        filename ?? `${eventName.replace(/\s+/g, "_")}_qr.png`
      );
      enqueueSnackbar("QR code downloaded.", { variant: "success" });
    } catch (error) {
      enqueueSnackbar(
        getErrorMessage(error, "Unable to generate QR code right now."),
        {
          variant: "error",
        }
      );
    } finally {
      setGeneratingQr(false);
    }
  };

  const handleSaveRestrictions = async () => {
    if (!token) return;
    setSavingRestrictions(true);
    try {
      const response = await updateEventRoleRestrictions(
        eventId,
        selectedRoles,
        token
      );
      enqueueSnackbar(response.message, { variant: "success" });
      setCurrentRoles(response.allowedRoles);
      onRestrictionsUpdated?.(response.allowedRoles);
      setDialogOpen(false);
    } catch (error) {
      enqueueSnackbar(
        getErrorMessage(error, "Unable to update event access."),
        {
          variant: "error",
        }
      );
    } finally {
      setSavingRestrictions(false);
    }
  };

  const handleToggleRole = (role: UserRole) => {
    setSelectedRoles((current) => {
      if (current.includes(role)) {
        return current.filter((value) => value !== role);
      }
      return [...current, role];
    });
  };

  return (
    <>
      <Stack spacing={1}>
        <Stack
          direction={{ xs: "column", sm: "row" }}
          spacing={1}
          alignItems={{ xs: "stretch", sm: "center" }}
        >
          <Tooltip title={exportDisabledReason ?? ""} disableHoverListener={!exportDisabledReason}>
            <span>
              <LoadingButton
                startIcon={<DownloadIcon />}
                variant="outlined"
                onClick={handleExport}
                loading={exporting}
                disabled={Boolean(exportDisabledReason || needsAuth)}
              >
                Export attendees
              </LoadingButton>
            </span>
          </Tooltip>
          {qrSupported ? (
            <Tooltip
              title={
                needsAuth
                  ? "Sign in with your Events Office account to download."
                  : ""
              }
              disableHoverListener={!needsAuth}
            >
              <span>
                <LoadingButton
                  startIcon={<QrCodeIcon />}
                  variant="outlined"
                  onClick={handleGenerateQr}
                  loading={generatingQr}
                  disabled={needsAuth || disableDownloads}
                >
                  Visitor QR code
                </LoadingButton>
              </span>
            </Tooltip>
          ) : null}
          <Button
            startIcon={<LockIcon />}
            variant="contained"
            onClick={() => setDialogOpen(true)}
            disabled={needsAuth}
          >
            Restrict access
          </Button>
        </Stack>
        <Typography variant="caption" color="text.secondary">
          {restrictionLabel}
        </Typography>
      </Stack>

      <Dialog open={dialogOpen} onClose={() => setDialogOpen(false)} maxWidth="xs" fullWidth>
        <DialogTitle>Allowed roles</DialogTitle>
        <DialogContent dividers>
          <Stack spacing={2}>
            <Alert severity="info">
              Select who can register for this event. Leave all unchecked to
              reopen access to every user role.
            </Alert>
            <FormGroup>
              {USER_ROLE_OPTIONS.map((role) => (
                <FormControlLabel
                  key={role}
                  control={
                    <Checkbox
                      checked={selectedRoles.includes(role)}
                      onChange={() => handleToggleRole(role)}
                    />
                  }
                  label={role}
                />
              ))}
            </FormGroup>
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDialogOpen(false)}>Cancel</Button>
          <LoadingButton
            onClick={handleSaveRestrictions}
            loading={savingRestrictions}
            disabled={!restrictionsChanged}
          >
            Save access rules
          </LoadingButton>
        </DialogActions>
      </Dialog>
    </>
  );
}

function triggerBrowserDownload(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}

function getErrorMessage(error: unknown, fallback: string): string {
  if (error instanceof Error && error.message) {
    return error.message;
  }
  if (
    error &&
    typeof error === "object" &&
    "message" in error &&
    typeof (error as { message?: unknown }).message === "string"
  ) {
    return (error as { message: string }).message;
  }
  return fallback;
}

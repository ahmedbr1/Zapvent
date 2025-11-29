"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import Stack from "@mui/material/Stack";
import Box from "@mui/material/Box";
import Typography from "@mui/material/Typography";
import Card from "@mui/material/Card";
import CardContent from "@mui/material/CardContent";
import CardActions from "@mui/material/CardActions";
import Button from "@mui/material/Button";
import Chip from "@mui/material/Chip";
import Grid from "@mui/material/Grid";
import Skeleton from "@mui/material/Skeleton";
import Alert from "@mui/material/Alert";
import Dialog from "@mui/material/Dialog";
import DialogTitle from "@mui/material/DialogTitle";
import DialogContent from "@mui/material/DialogContent";
import DialogActions from "@mui/material/DialogActions";
import TextField from "@mui/material/TextField";
import Paper from "@mui/material/Paper";
import IconButton from "@mui/material/IconButton";
import LoadingButton from "@mui/lab/LoadingButton";
import AddIcon from "@mui/icons-material/AddRounded";
import DeleteIcon from "@mui/icons-material/DeleteOutlineRounded";
import UploadFileIcon from "@mui/icons-material/UploadFileRounded";
import StorefrontIcon from "@mui/icons-material/StorefrontRounded";
import CalendarTodayIcon from "@mui/icons-material/CalendarTodayRounded";
import LocationOnIcon from "@mui/icons-material/LocationOnRounded";
import { useSnackbar } from "notistack";
import { useAuthToken } from "@/hooks/useAuthToken";
import { useSessionUser } from "@/hooks/useSessionUser";
import { fetchUpcomingBazaars } from "@/lib/services/events";
import { fetchVendorProfile } from "@/lib/services/vendor";
import { formatDateTime } from "@/lib/date";
import { apiFetch } from "@/lib/api-client";
import { EventType, type EventSummary } from "@/lib/types";

const VENDOR_CACHE_SETTINGS = {
  staleTime: 5 * 60 * 1000,
  gcTime: 15 * 60 * 1000,
  refetchOnWindowFocus: false,
} as const;

const MAX_ATTENDEES = 5;
const PLATFORM_SLOTS = [
  { id: "northwest", label: "Northwest corner", top: "6%", left: "6%" },
  { id: "north", label: "North edge", top: "6%", left: "50%" },
  { id: "northeast", label: "Northeast corner", top: "6%", left: "94%" },
  { id: "east", label: "East edge", top: "50%", left: "94%" },
  { id: "southeast", label: "Southeast corner", top: "94%", left: "94%" },
  { id: "south", label: "South edge", top: "94%", left: "50%" },
  { id: "southwest", label: "Southwest corner", top: "94%", left: "6%" },
  { id: "west", label: "West edge", top: "50%", left: "6%" },
];

interface AttendeeFormEntry {
  id: string;
  name: string;
  email: string;
  file: File | null;
}

function generateLocalId() {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID();
  }
  return `${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

function createEmptyAttendee(): AttendeeFormEntry {
  return {
    id: generateLocalId(),
    name: "",
    email: "",
    file: null,
  };
}

function PlatformBoothMap({
  value,
  onChange,
}: {
  value: string;
  onChange: (location: string) => void;
}) {
  return (
    <Box
      sx={{
        position: "relative",
        width: "100%",
        maxWidth: 360,
        aspectRatio: "1 / 1",
        borderRadius: 3,
        border: "2px dashed",
        borderColor: "divider",
        background:
          "radial-gradient(circle at 50% 50%, rgba(59,130,246,0.08), transparent 55%)",
        mx: "auto",
      }}
    >
      {PLATFORM_SLOTS.map((slot) => {
        const isSelected = value === slot.label;
        return (
          <Button
            key={slot.id}
            variant={isSelected ? "contained" : "outlined"}
            size="small"
            onClick={() => onChange(slot.label)}
            sx={{
              position: "absolute",
              top: slot.top,
              left: slot.left,
              transform: "translate(-50%, -50%)",
              borderRadius: "999px",
              minWidth: 0,
              px: 2,
              py: 1,
              fontSize: 12,
              backgroundColor: isSelected ? "primary.main" : "background.paper",
              color: isSelected ? "primary.contrastText" : "text.primary",
              boxShadow: isSelected ? 3 : 0,
            }}
          >
            {slot.label}
          </Button>
        );
      })}
    </Box>
  );
}

interface ApplyDialogProps {
  open: boolean;
  bazaar: EventSummary | null;
  onClose: () => void;
  onSuccess: () => void;
  vendorEmail: string;
  companyName: string;
}

function ApplyDialog({
  open,
  bazaar,
  onClose,
  onSuccess,
  vendorEmail,
  companyName,
}: ApplyDialogProps) {
  const [boothSize, setBoothSize] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [attendees, setAttendees] = useState<AttendeeFormEntry[]>([
    createEmptyAttendee(),
  ]);
  const [attendeeError, setAttendeeError] = useState<string | null>(null);
  const [boothLocation, setBoothLocation] = useState("");
  const [boothStart, setBoothStart] = useState("");
  const [boothDurationWeeks, setBoothDurationWeeks] = useState("");
  const [boothInfoError, setBoothInfoError] = useState<string | null>(null);
  const { enqueueSnackbar } = useSnackbar();
  const token = useAuthToken();
  const isPlatformBooth = bazaar?.eventType === EventType.BoothInPlatform;
  const computedBoothEnd = useMemo(() => {
    if (!boothStart || !boothDurationWeeks) {
      return null;
    }
    const startDate = new Date(boothStart);
    const duration = Number(boothDurationWeeks);
    if (
      Number.isNaN(startDate.getTime()) ||
      !Number.isInteger(duration) ||
      duration < 1 ||
      duration > 4
    ) {
      return null;
    }
    const endDate = new Date(startDate);
    endDate.setDate(startDate.getDate() + duration * 7);
    return Number.isNaN(endDate.getTime()) ? null : endDate;
  }, [boothDurationWeeks, boothStart]);

  useEffect(() => {
    if (!open) {
      setBoothSize("");
      setAttendees([createEmptyAttendee()]);
      setAttendeeError(null);
      setBoothLocation("");
      setBoothStart("");
      setBoothDurationWeeks("");
      setBoothInfoError(null);
    }
  }, [open]);

  const handleAttendeeChange = (
    index: number,
    field: "name" | "email",
    value: string
  ) => {
    setAttendees((prev) => {
      const next = [...prev];
      next[index] = { ...next[index], [field]: value };
      return next;
    });
  };

  const handleAttendeeFileChange = (
    index: number,
    file: File | null | undefined
  ) => {
    setAttendees((prev) => {
      const next = [...prev];
      next[index] = { ...next[index], file: file ?? null };
      return next;
    });
  };

  const handleRemoveAttendee = (index: number) => {
    setAttendees((prev) => {
      if (prev.length === 1) return prev;
      const next = [...prev];
      next.splice(index, 1);
      return next;
    });
  };

  const handleAddAttendee = () => {
    setAttendees((prev) => {
      if (prev.length >= MAX_ATTENDEES) {
        return prev;
      }
      return [...prev, createEmptyAttendee()];
    });
  };

  const validateAttendees = () => {
    if (!attendees.length) {
      return "At least one attendee is required.";
    }

    for (const attendee of attendees) {
      if (!attendee.name.trim() || !attendee.email.trim()) {
        return "Each attendee must include a name and email address.";
      }
      if (!attendee.file) {
        return "Please upload ID documents for every attendee.";
      }
    }
    return null;
  };

  const validateBoothDetails = () => {
    if (!isPlatformBooth) {
      return null;
    }
    if (!boothStart || !boothDurationWeeks) {
      return "Select a booth start date and duration (1-4 weeks).";
    }
    const start = new Date(boothStart);
    const duration = Number(boothDurationWeeks);
    if (
      !Number.isFinite(duration) ||
      !Number.isInteger(duration) ||
      duration < 1 ||
      duration > 4
    ) {
      return "Duration must be between 1 and 4 weeks.";
    }
    const end = computedBoothEnd;
    if (Number.isNaN(start.getTime()) || !end || end <= start) {
      return "Enter a valid duration where the end is after the start.";
    }
    if (bazaar?.startDate && start < new Date(bazaar.startDate)) {
      return "Booth setup cannot start before the event window opens.";
    }
    if (bazaar?.endDate && end > new Date(bazaar.endDate)) {
      return "Booth setup must finish before the event window ends.";
    }
    if (!boothLocation.trim()) {
      return "Pick a booth location on the platform map.";
    }
    return null;
  };

  const handleSubmit = async () => {
    if (!boothSize || !bazaar) {
      enqueueSnackbar("Please fill in all required fields", {
        variant: "error",
      });
      return;
    }

    if (!companyName) {
      enqueueSnackbar(
        "Company name is required. Please update your profile first.",
        {
          variant: "error",
        }
      );
      return;
    }

    const attendeeValidation = validateAttendees();
    if (attendeeValidation) {
      setAttendeeError(attendeeValidation);
      enqueueSnackbar(attendeeValidation, { variant: "error" });
      return;
    }
    setAttendeeError(null);
    const boothValidation = validateBoothDetails();
    if (boothValidation) {
      setBoothInfoError(boothValidation);
      enqueueSnackbar(boothValidation, { variant: "error" });
      return;
    }
    setBoothInfoError(null);

    setIsSubmitting(true);
    try {
      const formData = new FormData();
      formData.append("eventId", bazaar.id);
      formData.append("boothSize", boothSize);
      if (boothLocation) {
        formData.append("boothLocation", boothLocation);
      }
      if (boothStart) {
        formData.append("boothStartTime", new Date(boothStart).toISOString());
      }
      if (boothDurationWeeks) {
        formData.append("boothDurationWeeks", boothDurationWeeks);
        if (computedBoothEnd) {
          formData.append("boothEndTime", computedBoothEnd.toISOString());
        }
      }
      formData.append(
        "attendees",
        JSON.stringify(
          attendees.map((attendee) => ({
            name: attendee.name.trim(),
            email: attendee.email.trim(),
          }))
        )
      );
      attendees.forEach((attendee) => {
        if (attendee.file) {
          formData.append("attendeeIds", attendee.file);
        }
      });

      if (process.env.NODE_ENV !== "production") {
        console.log("=== Submitting Application ===");
        console.log("Token:", token ? "Present" : "Missing");
      }

      const response = (await apiFetch("/vendors/apply-bazaar", {
        method: "POST",
        body: formData,
        token: token ?? undefined,
      })) as { success: boolean; message?: string };
      if (process.env.NODE_ENV !== "production") {
        console.log("Response:", response);
      }

      if (response.success) {
        enqueueSnackbar("Application submitted successfully!", {
          variant: "success",
        });
        onSuccess();
        onClose();
        // Reset form
        setBoothSize("");
        setAttendees([createEmptyAttendee()]);
        setBoothLocation("");
        setBoothStart("");
        setBoothDurationWeeks("");
      } else {
        enqueueSnackbar(response.message || "Failed to submit application", {
          variant: "error",
        });
      }
    } catch (error) {
      console.error("Application submission error:", error);
      // apiFetch throws plain ApiError objects (not instances of Error).
      // Try to extract a useful message from common shapes.
      let errorMessage = "An error occurred while submitting application";
      if (error instanceof Error) {
        errorMessage = error.message;
      } else if (error && typeof error === "object") {
        const anyErr = error as Record<string, unknown>;
        if (typeof anyErr.message === "string" && anyErr.message.trim()) {
          errorMessage = anyErr.message as string;
        } else if (typeof anyErr.status === "number") {
          errorMessage = `Request failed (${anyErr.status})`;
        } else {
          try {
            errorMessage = JSON.stringify(anyErr);
          } catch {
            /* ignore */
          }
        }
      }

      enqueueSnackbar(errorMessage, {
        variant: "error",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="md" fullWidth>
      <DialogTitle>Apply to {bazaar?.name}</DialogTitle>
      <DialogContent>
        <Stack spacing={3} sx={{ mt: 2 }}>
          <TextField
            label="Company Name"
            value={companyName}
            fullWidth
            disabled
            helperText="Your registered company name"
          />
          <TextField
            label="Vendor Email"
            value={vendorEmail}
            fullWidth
            disabled
            helperText="Your registered email address"
          />
          <TextField
            label="Booth Size"
            select
            value={boothSize}
            onChange={(e) => setBoothSize(e.target.value)}
            fullWidth
            required
            SelectProps={{
              native: true,
            }}
            helperText="Select your preferred booth size"
          >
            <option value=""></option>
            <option value="2x2">2x2 meters</option>
            <option value="4x4">4x4 meters</option>
          </TextField>
          {isPlatformBooth ? (
            <Stack spacing={2}>
              <Alert severity="info">
                Platform booths run for 1–4 weeks. Choose a spot on the campus
                map, your start date, and how many weeks you need.
              </Alert>
              <Stack spacing={1.5} alignItems="center">
                <PlatformBoothMap
                  value={boothLocation}
                  onChange={(location) => setBoothLocation(location)}
                />
                <Typography variant="body2" color="text.secondary" textAlign="center">
                  Selected: {boothLocation || "Choose a booth slot"}
                </Typography>
              </Stack>
              <Stack direction={{ xs: "column", sm: "row" }} spacing={2}>
                <TextField
                  label="Booth start date"
                  type="date"
                  value={boothStart}
                  onChange={(event) => setBoothStart(event.target.value)}
                  fullWidth
                  InputLabelProps={{ shrink: true }}
                />
                <TextField
                  label="Duration (weeks)"
                  type="number"
                  value={boothDurationWeeks}
                  onChange={(event) => setBoothDurationWeeks(event.target.value)}
                  fullWidth
                  inputProps={{ min: 1, max: 4, step: 1 }}
                />
              </Stack>
              {computedBoothEnd ? (
                <Typography variant="body2" color="text.secondary">
                  Planned end date: {formatDateTime(computedBoothEnd)}
                </Typography>
              ) : null}
              {boothInfoError ? <Alert severity="error">{boothInfoError}</Alert> : null}
            </Stack>
          ) : null}
          <Stack spacing={2}>
            <Typography variant="subtitle1" fontWeight={600}>
              Attendee IDs
            </Typography>
            <Alert severity="info">
              Upload the ID (image or PDF) for each attendee. Up to five
              attendees can be registered per booth.
            </Alert>
            {attendees.map((attendee, index) => (
              <Paper
                key={attendee.id}
                variant="outlined"
                sx={{ p: 2, borderRadius: 2 }}
              >
                <Stack spacing={2}>
                  <Stack direction="row" justifyContent="space-between">
                    <Typography variant="subtitle2">
                      Attendee {index + 1}
                    </Typography>
                    {attendees.length > 1 && (
                      <IconButton
                        aria-label="Remove attendee"
                        size="small"
                        onClick={() => handleRemoveAttendee(index)}
                      >
                        <DeleteIcon fontSize="small" />
                      </IconButton>
                    )}
                  </Stack>
                  <TextField
                    label="Full Name"
                    value={attendee.name}
                    onChange={(e) =>
                      handleAttendeeChange(index, "name", e.target.value)
                    }
                    fullWidth
                    required
                  />
                  <TextField
                    label="Email"
                    type="email"
                    value={attendee.email}
                    onChange={(e) =>
                      handleAttendeeChange(index, "email", e.target.value)
                    }
                    fullWidth
                    required
                  />
                  <Stack direction="row" alignItems="center" spacing={2}>
                    <Button
                      component="label"
                      variant="outlined"
                      startIcon={<UploadFileIcon />}
                    >
                      {attendee.file ? "Replace ID Document" : "Upload ID"}
                      <input
                        type="file"
                        hidden
                        accept="image/*,application/pdf"
                        onChange={(event) =>
                          handleAttendeeFileChange(
                            index,
                            event.target.files?.[0]
                          )
                        }
                      />
                    </Button>
                    <Typography variant="body2" color="text.secondary">
                      {attendee.file
                        ? attendee.file.name
                        : "No file selected"}
                    </Typography>
                  </Stack>
                </Stack>
              </Paper>
            ))}
            {attendees.length < MAX_ATTENDEES && (
              <Button
                startIcon={<AddIcon />}
                variant="text"
                onClick={handleAddAttendee}
              >
                Add Another Attendee
              </Button>
            )}
            {attendeeError && (
              <Alert severity="error">{attendeeError}</Alert>
            )}
          </Stack>
        </Stack>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose} disabled={isSubmitting}>
          Cancel
        </Button>
        <LoadingButton
          loading={isSubmitting}
          onClick={handleSubmit}
          variant="contained"
        >
          Submit Application
        </LoadingButton>
      </DialogActions>
    </Dialog>
  );
}

export default function VendorBazaarsPage() {
  const token = useAuthToken();
  const user = useSessionUser();
  const [selectedBazaar, setSelectedBazaar] = useState<EventSummary | null>(
    null
  );
  const [applyDialogOpen, setApplyDialogOpen] = useState(false);

  const bazaarsQuery = useQuery({
    queryKey: ["bazaars", token],
    queryFn: () =>
      fetchUpcomingBazaars(token ?? undefined, user?.id, [
        EventType.Bazaar,
        EventType.BoothInPlatform,
      ]),
    enabled: Boolean(token),
    ...VENDOR_CACHE_SETTINGS,
  });

  // Fetch vendor profile to get company name
  const profileQuery = useQuery({
    queryKey: ["vendorProfile", token],
    queryFn: () => fetchVendorProfile(token || ""),
    enabled: Boolean(token),
    ...VENDOR_CACHE_SETTINGS,
  });

  // Fetch vendor applications to check which bazaars already applied to
  const applicationsQuery = useQuery({
    queryKey: ["vendor-applications", token],
    queryFn: async () => {
      const response = (await apiFetch("/vendors/my-applications", {
        method: "GET",
        token: token ?? undefined,
      })) as {
        success: boolean;
        data: Array<{ eventId: string; status: string }>;
      };
      return response.success ? response.data : [];
    },
    enabled: Boolean(token),
    ...VENDOR_CACHE_SETTINGS,
  });

  const appliedEventIds = useMemo(() => {
    const entries = applicationsQuery.data ?? [];
    return new Set(entries.map((app) => app.eventId));
  }, [applicationsQuery.data]);

  // Check if already applied to a bazaar
  const hasApplied = useCallback(
    (bazaarId: string) => appliedEventIds.has(bazaarId),
    [appliedEventIds]
  );

  // Helper function to check if bazaar is outdated
  const isBazaarOutdated = (bazaar: EventSummary) => {
    if (bazaar.eventType === EventType.BoothInPlatform) return false;
    return new Date(bazaar.endDate) < new Date();
  };

  // Helper function to check if bazaar is full
  const isBazaarFull = (bazaar: EventSummary) => {
    if (!bazaar.capacity) return false;
    const currentRegistrations = bazaar.vendors?.length || 0;
    return currentRegistrations >= bazaar.capacity;
  };

  // Helper function to determine if can apply
  const canApplyToBazaar = (bazaar: EventSummary) => {
    return !isBazaarOutdated(bazaar) && !isBazaarFull(bazaar);
  };

  const handleApply = (bazaar: EventSummary) => {
    setSelectedBazaar(bazaar);
    setApplyDialogOpen(true);
  };

  const handleCloseDialog = () => {
    setApplyDialogOpen(false);
    setSelectedBazaar(null);
  };

  const handleApplicationSuccess = () => {
    bazaarsQuery.refetch();
    applicationsQuery.refetch();
  };

  return (
    <Stack spacing={4}>
      {/* Header */}
      <Stack spacing={1}>
        <Typography variant="h4" fontWeight={700}>
          Bazaars & platform booths
        </Typography>
        <Typography variant="body1" color="text.secondary">
          Find and apply to upcoming bazaar events or multi-week platform booths
          to showcase your products.
        </Typography>
      </Stack>

      {/* Bazaars Grid */}
      {bazaarsQuery.isLoading ? (
        <Grid container spacing={3}>
          {[1, 2, 3].map((i) => (
            <Grid key={i} size={{ xs: 12, md: 6, lg: 4 }}>
              <Skeleton
                variant="rectangular"
                height={280}
                sx={{ borderRadius: 2 }}
              />
            </Grid>
          ))}
        </Grid>
      ) : bazaarsQuery.isError ? (
        <Alert severity="error">
          Failed to load vendor events. Please try again later.
        </Alert>
      ) : bazaarsQuery.data?.length === 0 ? (
        <Alert severity="info">
          No upcoming vendor events available at the moment. Check back later!
        </Alert>
      ) : (
        <Grid container spacing={3}>
          {bazaarsQuery.data?.map((bazaar: EventSummary) => (
            <Grid key={bazaar.id} size={{ xs: 12, md: 6, lg: 4 }}>
              <Card
                sx={{
                  height: "100%",
                  display: "flex",
                  flexDirection: "column",
                }}
              >
                <CardContent sx={{ flexGrow: 1 }}>
                  <Stack spacing={2}>
                    <Stack direction="row" alignItems="center" spacing={1}>
                      <StorefrontIcon color="primary" />
                      <Typography variant="h6" fontWeight={600}>
                        {bazaar.name}
                      </Typography>
                    </Stack>

                    {bazaar.description && (
                      <Typography variant="body2" color="text.secondary">
                        {bazaar.description}
                      </Typography>
                    )}

                    <Stack spacing={1}>
                      {bazaar.eventType === EventType.BoothInPlatform ? (
                        <Stack direction="row" alignItems="center" spacing={1}>
                          <CalendarTodayIcon fontSize="small" color="action" />
                          <Typography variant="body2" color="text.secondary">
                            Platform booths stay active. Pick your own dates when applying.
                          </Typography>
                        </Stack>
                      ) : (
                        <Stack direction="row" alignItems="center" spacing={1}>
                          <CalendarTodayIcon fontSize="small" color="action" />
                          <Typography variant="body2">
                            {formatDateTime(bazaar.startDate)} -{" "}
                            {formatDateTime(bazaar.endDate)}
                          </Typography>
                        </Stack>
                      )}

                      {bazaar.location && (
                        <Stack direction="row" alignItems="center" spacing={1}>
                          <LocationOnIcon fontSize="small" color="action" />
                          <Typography variant="body2">
                            {bazaar.location}
                          </Typography>
                        </Stack>
                      )}
                    </Stack>

                    <Stack direction="row" spacing={1} flexWrap="wrap">
                      <Chip
                        label={bazaar.eventType || "Bazaar"}
                        size="small"
                        color={
                          bazaar.eventType === EventType.BoothInPlatform
                            ? "secondary"
                            : "primary"
                        }
                      />
                      {bazaar.capacity && (
                        <Chip
                          label={`${bazaar.vendors?.length || 0}/${bazaar.capacity}`}
                          size="small"
                          variant="outlined"
                          color={isBazaarFull(bazaar) ? "error" : "default"}
                        />
                      )}
                      {isBazaarOutdated(bazaar) && (
                        <Chip label="Finished" size="small" color="default" />
                      )}
                      {isBazaarFull(bazaar) &&
                        !isBazaarOutdated(bazaar) && (
                          <Chip label="Full" size="small" color="error" />
                        )}
                      {hasApplied(bazaar.id) && (
                        <Chip
                          label="Already Applied"
                          size="small"
                          color="success"
                        />
                      )}
                    </Stack>
                  </Stack>
                </CardContent>
                <CardActions sx={{ p: 2, pt: 0 }}>
                  <Button
                    variant="contained"
                    fullWidth
                    onClick={() => handleApply(bazaar)}
                    startIcon={<StorefrontIcon />}
                    disabled={
                      !canApplyToBazaar(bazaar) || hasApplied(bazaar.id)
                    }
                  >
                    {hasApplied(bazaar.id)
                      ? "Already Applied"
                      : isBazaarOutdated(bazaar)
                        ? "Finished"
                        : isBazaarFull(bazaar)
                          ? "Full"
                          : "Apply Now"}
                  </Button>
                </CardActions>
              </Card>
            </Grid>
          ))}
        </Grid>
      )}

      {/* Apply Dialog */}
      {selectedBazaar && (
        <ApplyDialog
          open={applyDialogOpen}
          bazaar={selectedBazaar}
          onClose={handleCloseDialog}
          onSuccess={handleApplicationSuccess}
          vendorEmail={user?.email || ""}
          companyName={
            profileQuery.data?.data?.companyName || user?.name || "Vendor"
          }
        />
      )}
    </Stack>
  );
}

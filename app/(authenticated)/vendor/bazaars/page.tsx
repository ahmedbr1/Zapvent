"use client";

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import Stack from "@mui/material/Stack";
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
import LoadingButton from "@mui/lab/LoadingButton";
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
import type { EventSummary } from "@/lib/types";

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
  const [attendees, setAttendees] = useState("");
  const [boothSize, setBoothSize] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { enqueueSnackbar } = useSnackbar();
  const token = useAuthToken();

  const handleSubmit = async () => {
    if (!attendees || !boothSize || !bazaar) {
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

    const attendeesNum = parseInt(attendees);
    if (attendeesNum > 5) {
      enqueueSnackbar("Maximum 5 attendees allowed per booth", {
        variant: "error",
      });
      return;
    }

    setIsSubmitting(true);
    try {
      const requestBody = {
        eventId: bazaar.id,
        attendees: attendeesNum,
        boothSize: boothSize,
        vendorEmail,
        companyName,
      };

      console.log("=== Submitting Application ===");
      console.log("Request Body:", requestBody);
      console.log("Token:", token ? "Present" : "Missing");

      const response = (await apiFetch("/vendors/apply-bazaar", {
        method: "POST",
        body: requestBody,
        token: token ?? undefined,
      })) as { success: boolean; message?: string };
      console.log("Response:", response);

      if (response.success) {
        enqueueSnackbar("Application submitted successfully!", {
          variant: "success",
        });
        onSuccess();
        onClose();
        // Reset form
        setAttendees("");
        setBoothSize("");
      } else {
        enqueueSnackbar(response.message || "Failed to submit application", {
          variant: "error",
        });
      }
    } catch (error) {
      console.error("Application submission error:", error);
      const errorMessage =
        error instanceof Error
          ? error.message
          : "An error occurred while submitting application";
      enqueueSnackbar(errorMessage, {
        variant: "error",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
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
            label="Number of Attendees"
            type="number"
            value={attendees}
            onChange={(e) => setAttendees(e.target.value)}
            fullWidth
            required
            inputProps={{ min: 1, max: 5 }}
            error={parseInt(attendees) > 5}
            helperText={
              parseInt(attendees) > 5
                ? "Maximum 5 attendees allowed"
                : "Expected number of people at your booth (max 5)"
            }
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
    queryFn: () => fetchUpcomingBazaars(token ?? undefined),
    enabled: Boolean(token),
  });

  // Fetch vendor profile to get company name
  const profileQuery = useQuery({
    queryKey: ["vendorProfile"],
    queryFn: () => fetchVendorProfile(token || ""),
    enabled: Boolean(token),
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
  });

  // Check if already applied to a bazaar
  const hasApplied = (bazaarId: string) => {
    return applicationsQuery.data?.some((app) => app.eventId === bazaarId);
  };

  // Helper function to check if bazaar is outdated
  const isBazaarOutdated = (endDate: string) => {
    return new Date(endDate) < new Date();
  };

  // Helper function to check if bazaar is full
  const isBazaarFull = (bazaar: EventSummary) => {
    if (!bazaar.capacity) return false;
    const currentRegistrations = bazaar.vendors?.length || 0;
    return currentRegistrations >= bazaar.capacity;
  };

  // Helper function to determine if can apply
  const canApplyToBazaar = (bazaar: EventSummary) => {
    return !isBazaarOutdated(bazaar.endDate) && !isBazaarFull(bazaar);
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
          Browse Available Bazaars
        </Typography>
        <Typography variant="body1" color="text.secondary">
          Find and apply to upcoming bazaar events where you can showcase your
          products.
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
          Failed to load bazaars. Please try again later.
        </Alert>
      ) : bazaarsQuery.data?.length === 0 ? (
        <Alert severity="info">
          No upcoming bazaars available at the moment. Check back later!
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
                      <Stack direction="row" alignItems="center" spacing={1}>
                        <CalendarTodayIcon fontSize="small" color="action" />
                        <Typography variant="body2">
                          {formatDateTime(bazaar.startDate)} -{" "}
                          {formatDateTime(bazaar.endDate)}
                        </Typography>
                      </Stack>

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
                        color="primary"
                      />
                      {bazaar.capacity && (
                        <Chip
                          label={`${bazaar.vendors?.length || 0}/${bazaar.capacity}`}
                          size="small"
                          variant="outlined"
                          color={isBazaarFull(bazaar) ? "error" : "default"}
                        />
                      )}
                      {isBazaarOutdated(bazaar.endDate) && (
                        <Chip label="Finished" size="small" color="default" />
                      )}
                      {isBazaarFull(bazaar) &&
                        !isBazaarOutdated(bazaar.endDate) && (
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
                      : isBazaarOutdated(bazaar.endDate)
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

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
import TextField from "@mui/material/TextField";
import Dialog from "@mui/material/Dialog";
import DialogTitle from "@mui/material/DialogTitle";
import DialogContent from "@mui/material/DialogContent";
import DialogActions from "@mui/material/DialogActions";
import LoadingButton from "@mui/lab/LoadingButton";
import WorkIcon from "@mui/icons-material/WorkRounded";
import LocationOnIcon from "@mui/icons-material/LocationOnRounded";
import CalendarTodayIcon from "@mui/icons-material/CalendarTodayRounded";
import EditIcon from "@mui/icons-material/EditRounded";
import { useSnackbar } from "notistack";
import { useAuthToken } from "@/hooks/useAuthToken";
import { useSessionUser } from "@/hooks/useSessionUser";
import { formatDateTime } from "@/lib/date";

interface BoothSetup {
  id: string;
  eventName: string;
  eventDate: string;
  boothLocation: string;
  boothSize: number;
  attendees: number;
  setupNotes?: string;
  status: "pending" | "confirmed" | "completed";
}

interface SetupDialogProps {
  open: boolean;
  booth: BoothSetup | null;
  onClose: () => void;
  onSuccess: () => void;
}

function SetupDialog({ open, booth, onClose, onSuccess }: SetupDialogProps) {
  const [setupNotes, setSetupNotes] = useState(booth?.setupNotes || "");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { enqueueSnackbar } = useSnackbar();

  const handleSubmit = async () => {
    setIsSubmitting(true);
    try {
      // TODO: Implement API call to save booth setup notes
      await new Promise((resolve) => setTimeout(resolve, 1000)); // Simulated delay
      enqueueSnackbar("Booth setup notes saved successfully!", {
        variant: "success",
      });
      onSuccess();
      onClose();
    } catch {
      enqueueSnackbar("Failed to save booth setup notes", { variant: "error" });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="md" fullWidth>
      <DialogTitle>Edit Booth Setup - {booth?.eventName}</DialogTitle>
      <DialogContent>
        <Stack spacing={3} sx={{ mt: 2 }}>
          <TextField
            label="Booth Location"
            value={booth?.boothLocation || ""}
            fullWidth
            disabled
            helperText="Location is assigned by the event organizer"
          />
          <TextField
            label="Booth Size"
            value={`${booth?.boothSize || 0} sq meters`}
            fullWidth
            disabled
          />
          <TextField
            label="Setup Notes"
            value={setupNotes}
            onChange={(e) => setSetupNotes(e.target.value)}
            multiline
            rows={4}
            fullWidth
            placeholder="Add any special requirements or notes for your booth setup..."
            helperText="Optional: Describe your booth layout, equipment needs, or any special requests"
          />
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
          Save Setup Notes
        </LoadingButton>
      </DialogActions>
    </Dialog>
  );
}

export default function VendorBoothSetupPage() {
  const token = useAuthToken();
  const user = useSessionUser();
  const [selectedBooth, setSelectedBooth] = useState<BoothSetup | null>(null);
  const [setupDialogOpen, setSetupDialogOpen] = useState(false);

  const boothsQuery = useQuery({
    queryKey: ["vendor-booths", user?.id, token],
    queryFn: async (): Promise<BoothSetup[]> => {
      // TODO: Replace with actual API call when backend is ready
      return [];
    },
    enabled: Boolean(token && user?.id),
  });

  const handleEditSetup = (booth: BoothSetup) => {
    setSelectedBooth(booth);
    setSetupDialogOpen(true);
  };

  const handleCloseDialog = () => {
    setSetupDialogOpen(false);
    setSelectedBooth(null);
  };

  const handleSetupSuccess = () => {
    boothsQuery.refetch();
  };

  const getStatusColor = (
    status: string
  ): "warning" | "info" | "success" | "default" => {
    switch (status) {
      case "confirmed":
        return "info";
      case "completed":
        return "success";
      case "pending":
        return "warning";
      default:
        return "default";
    }
  };

  return (
    <Stack spacing={4}>
      {/* Header */}
      <Stack spacing={1}>
        <Stack direction="row" alignItems="center" spacing={2}>
          <WorkIcon sx={{ fontSize: 40 }} color="primary" />
          <div>
            <Typography variant="h4" fontWeight={700}>
              Booth Setup
            </Typography>
            <Typography variant="body1" color="text.secondary">
              Manage your booth configurations for approved bazaar applications
            </Typography>
          </div>
        </Stack>
      </Stack>

      {/* Booths Grid */}
      {boothsQuery.isLoading ? (
        <Grid container spacing={3}>
          {[1, 2, 3].map((i) => (
            <Grid key={i} size={{ xs: 12, md: 6, lg: 4 }}>
              <Skeleton
                variant="rectangular"
                height={250}
                sx={{ borderRadius: 2 }}
              />
            </Grid>
          ))}
        </Grid>
      ) : boothsQuery.isError ? (
        <Alert severity="error">
          Failed to load booth setups. Please try again later.
        </Alert>
      ) : boothsQuery.data?.length === 0 ? (
        <Alert severity="info">
          No booth setups available yet. Your approved applications will appear
          here.
        </Alert>
      ) : (
        <Grid container spacing={3}>
          {boothsQuery.data?.map((booth) => (
            <Grid key={booth.id} size={{ xs: 12, md: 6, lg: 4 }}>
              <Card
                sx={{
                  height: "100%",
                  display: "flex",
                  flexDirection: "column",
                }}
              >
                <CardContent sx={{ flexGrow: 1 }}>
                  <Stack spacing={2}>
                    <Stack
                      direction="row"
                      justifyContent="space-between"
                      alignItems="start"
                    >
                      <Typography variant="h6" fontWeight={600}>
                        {booth.eventName}
                      </Typography>
                      <Chip
                        label={booth.status.toUpperCase()}
                        size="small"
                        color={getStatusColor(booth.status)}
                      />
                    </Stack>

                    <Stack spacing={1.5}>
                      <Stack direction="row" alignItems="center" spacing={1}>
                        <CalendarTodayIcon fontSize="small" color="action" />
                        <Typography variant="body2">
                          {formatDateTime(booth.eventDate)}
                        </Typography>
                      </Stack>

                      <Stack direction="row" alignItems="center" spacing={1}>
                        <LocationOnIcon fontSize="small" color="action" />
                        <Typography variant="body2">
                          {booth.boothLocation}
                        </Typography>
                      </Stack>

                      <Stack direction="row" alignItems="center" spacing={1}>
                        <WorkIcon fontSize="small" color="action" />
                        <Typography variant="body2">
                          {booth.boothSize} sq m • {booth.attendees} attendees
                        </Typography>
                      </Stack>
                    </Stack>

                    {booth.setupNotes && (
                      <Card
                        variant="outlined"
                        sx={{ bgcolor: "background.default" }}
                      >
                        <CardContent>
                          <Typography
                            variant="caption"
                            color="text.secondary"
                            fontWeight={600}
                          >
                            Setup Notes:
                          </Typography>
                          <Typography variant="body2" sx={{ mt: 0.5 }}>
                            {booth.setupNotes}
                          </Typography>
                        </CardContent>
                      </Card>
                    )}
                  </Stack>
                </CardContent>
                <CardActions sx={{ p: 2, pt: 0 }}>
                  <Button
                    variant="outlined"
                    fullWidth
                    onClick={() => handleEditSetup(booth)}
                    startIcon={<EditIcon />}
                  >
                    {booth.setupNotes ? "Edit" : "Add"} Setup Notes
                  </Button>
                </CardActions>
              </Card>
            </Grid>
          ))}
        </Grid>
      )}

      {/* Setup Dialog */}
      {selectedBooth && (
        <SetupDialog
          open={setupDialogOpen}
          booth={selectedBooth}
          onClose={handleCloseDialog}
          onSuccess={handleSetupSuccess}
        />
      )}
    </Stack>
  );
}

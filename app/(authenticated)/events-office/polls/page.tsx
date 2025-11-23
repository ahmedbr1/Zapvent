"use client";

import { useMemo, useState } from "react";
import Stack from "@mui/material/Stack";
import Typography from "@mui/material/Typography";
import Card from "@mui/material/Card";
import CardContent from "@mui/material/CardContent";
import Alert from "@mui/material/Alert";
import TextField from "@mui/material/TextField";
import Button from "@mui/material/Button";
import IconButton from "@mui/material/IconButton";
import Divider from "@mui/material/Divider";
import Chip from "@mui/material/Chip";
import Grid from "@mui/material/Grid";
import Autocomplete from "@mui/material/Autocomplete";
import CircularProgress from "@mui/material/CircularProgress";
import InputAdornment from "@mui/material/InputAdornment";
import AddIcon from "@mui/icons-material/AddRounded";
import DeleteIcon from "@mui/icons-material/DeleteRounded";
import EventIcon from "@mui/icons-material/EventAvailableRounded";
import StorefrontIcon from "@mui/icons-material/StorefrontRounded";
import LoadingButton from "@mui/lab/LoadingButton";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useSnackbar } from "notistack";
import { useAuthToken } from "@/hooks/useAuthToken";
import { fetchAdminVendors, type AdminVendor } from "@/lib/services/admin";
import {
  createVendorPoll,
  type CreateVendorPollInput,
} from "@/lib/services/polls";
import { VendorStatus } from "@/lib/types";

interface DurationRow {
  start: string;
  end: string;
}

interface VendorOption {
  label: string;
  value: string;
  email: string;
}

export default function EventOfficePollsPage() {
  const token = useAuthToken();
  const { enqueueSnackbar } = useSnackbar();
  const [boothName, setBoothName] = useState("");
  const [selectedVendorIds, setSelectedVendorIds] = useState<string[]>([]);
  const [durations, setDurations] = useState<DurationRow[]>([
    { start: "", end: "" },
  ]);

  const vendorsQuery = useQuery({
    queryKey: ["admin", "vendors", token],
    queryFn: () => fetchAdminVendors(token ?? undefined),
    enabled: Boolean(token),
  });

  const approvedVendors = useMemo(() => {
    if (!vendorsQuery.data) return [] as AdminVendor[];
    return vendorsQuery.data.filter(
      (vendor) => vendor.verificationStatus === VendorStatus.Approved
    );
  }, [vendorsQuery.data]);

  const vendorOptions = useMemo<VendorOption[]>(
    () =>
      approvedVendors.map((vendor) => ({
        label: vendor.companyName,
        value: vendor.id,
        email: vendor.email,
      })),
    [approvedVendors]
  );

  const selectedVendorOptions = useMemo(
    () =>
      vendorOptions.filter((option) =>
        selectedVendorIds.includes(option.value)
      ),
    [selectedVendorIds, vendorOptions]
  );

  const { mutate: createPoll, isPending } = useMutation({
    mutationFn: (input: CreateVendorPollInput) =>
      createVendorPoll(input, token ?? undefined),
    onSuccess: () => {
      enqueueSnackbar("Poll created successfully", { variant: "success" });
      setBoothName("");
      setDurations([{ start: "", end: "" }]);
      setSelectedVendorIds([]);
    },
    onError: (error: unknown) => {
      enqueueSnackbar(
        error instanceof Error ? error.message : "Failed to create poll",
        {
          variant: "error",
        }
      );
    },
  });

  const durationErrors = durations.map((duration) => {
    if (!duration.start || !duration.end) return "Both fields are required";
    const startDate = new Date(duration.start);
    const endDate = new Date(duration.end);
    if (Number.isNaN(startDate.getTime()) || Number.isNaN(endDate.getTime())) {
      return "Enter valid dates";
    }
    if (startDate >= endDate) {
      return "Start must be before end";
    }
    return null;
  });

  const canSubmit =
    boothName.trim().length > 0 &&
    selectedVendorIds.length >= 2 &&
    durationErrors.every((error) => error === null);

  const handleDurationChange = (
    index: number,
    field: keyof DurationRow,
    value: string
  ) => {
    setDurations((prev) => {
      const next = [...prev];
      next[index] = { ...next[index], [field]: value };
      return next;
    });
  };

  const addDurationRow = () =>
    setDurations((prev) => [...prev, { start: "", end: "" }]);

  const removeDurationRow = (index: number) => {
    if (durations.length === 1) return;
    setDurations((prev) => prev.filter((_, rowIndex) => rowIndex !== index));
  };

  const handleSubmit = () => {
    if (!canSubmit) return;
    const payload: CreateVendorPollInput = {
      boothName: boothName.trim(),
      vendorIds: selectedVendorIds,
      durations: durations.map((duration) => ({
        start: new Date(duration.start).toISOString(),
        end: new Date(duration.end).toISOString(),
      })),
    };

    createPoll(payload);
  };

  return (
    <Stack spacing={4}>
      <Stack spacing={1}>
        <Typography variant="h4" fontWeight={700}>
          Vendor booth polls
        </Typography>
        <Typography variant="body1" color="text.secondary">
          Launch quick polls to compare approved vendors for upcoming bazaar booths so
          faculty and students can vote on their favorites.
        </Typography>
      </Stack>

      <Card>
        <CardContent>
          <Stack spacing={3}>
            <Stack spacing={1}>
              <Typography variant="h6" fontWeight={600}>
                Poll details
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Provide a booth name and at least one time range. Polls require a minimum
                of two approved vendors to compare.
              </Typography>
            </Stack>

            <TextField
              label="Booth name"
              placeholder="Main courtyard pop-up"
              value={boothName}
              onChange={(event) => setBoothName(event.target.value)}
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start">
                    <EventIcon fontSize="small" color="primary" />
                  </InputAdornment>
                ),
              }}
            />

            <Stack spacing={2}>
              <Stack direction="row" justifyContent="space-between" alignItems="center">
                <Typography variant="subtitle1" fontWeight={600}>
                  Availability windows
                </Typography>
                <Button
                  variant="text"
                  startIcon={<AddIcon />}
                  onClick={addDurationRow}
                >
                  Add window
                </Button>
              </Stack>

              <Grid container spacing={2}>
                {durations.map((duration, index) => (
                  <Grid
                    container
                    spacing={2}
                    alignItems="center"
                    key={`duration-${index}`}
                  >
                    <Grid size={{ xs: 12, md: 5 }}>
                      <TextField
                        type="datetime-local"
                        label="Start"
                        fullWidth
                        value={duration.start}
                        onChange={(event) =>
                          handleDurationChange(index, "start", event.target.value)
                        }
                        InputLabelProps={{ shrink: true }}
                        error={Boolean(durationErrors[index])}
                      />
                    </Grid>
                    <Grid size={{ xs: 12, md: 5 }}>
                      <TextField
                        type="datetime-local"
                        label="End"
                        fullWidth
                        value={duration.end}
                        onChange={(event) =>
                          handleDurationChange(index, "end", event.target.value)
                        }
                        InputLabelProps={{ shrink: true }}
                        error={Boolean(durationErrors[index])}
                        helperText={durationErrors[index] ?? ""}
                      />
                    </Grid>
                    <Grid size={{ xs: 12, md: 2 }} sx={{ display: "flex", alignItems: "center" }}>
                      <IconButton
                        aria-label="Remove window"
                        onClick={() => removeDurationRow(index)}
                        disabled={durations.length === 1}
                      >
                        <DeleteIcon />
                      </IconButton>
                    </Grid>
                  </Grid>
                ))}
              </Grid>
            </Stack>

            <Divider />

            <Stack spacing={1}>
              <Typography variant="subtitle1" fontWeight={600}>
                Approved vendors
              </Typography>
              {vendorsQuery.isLoading ? (
                <CircularProgress size={28} />
              ) : vendorsQuery.isError ? (
                <Alert severity="error">
                  Unable to load vendors. Please refresh and try again.
                </Alert>
              ) : vendorOptions.length === 0 ? (
                <Alert severity="info">
                  Select at least two vendors once accounts are approved.
                </Alert>
              ) : (
                <Autocomplete
                  multiple
                  options={vendorOptions}
                  value={selectedVendorOptions}
                  onChange={(_event, value) =>
                    setSelectedVendorIds(value.map((option) => option.value))
                  }
                  renderInput={(params) => (
                    <TextField
                      {...params}
                      label="Choose vendors"
                      placeholder="Search vendor"
                      InputProps={{
                        ...params.InputProps,
                        startAdornment: (
                          <>
                            <StorefrontIcon sx={{ color: "text.disabled", mr: 1 }} />
                            {params.InputProps.startAdornment}
                          </>
                        ),
                      }}
                    />
                  )}
                  renderTags={(value, getTagProps) =>
                    value.map((option, index) => (
                      <Chip
                        {...getTagProps({ index })}
                        label={option.label}
                        key={option.value}
                      />
                    ))
                  }
                />
              )}
              <Typography variant="caption" color="text.secondary">
                Need at least two vendors per poll. Only approved accounts appear here.
              </Typography>
            </Stack>

            <Divider />

            <Stack direction="row" justifyContent="flex-end" spacing={2}>
              <Button
                variant="text"
                onClick={() => {
                  setBoothName("");
                  setSelectedVendorIds([]);
                  setDurations([{ start: "", end: "" }]);
                }}
                disabled={isPending}
              >
                Reset
              </Button>
              <LoadingButton
                variant="contained"
                onClick={handleSubmit}
                loading={isPending}
                disabled={!canSubmit || vendorOptions.length < 2}
              >
                Launch poll
              </LoadingButton>
            </Stack>
          </Stack>
        </CardContent>
      </Card>
    </Stack>
  );
}

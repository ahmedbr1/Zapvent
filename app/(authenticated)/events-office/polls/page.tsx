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
import { formatDateTime } from "@/lib/date";
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

interface ConflictGroupOption {
  key: string;
  eventId: string;
  eventName: string;
  boothLocation: string;
  windowStart: string;
  windowEnd: string;
  vendorOptions: VendorOption[];
}

export default function EventOfficePollsPage() {
  const token = useAuthToken();
  const { enqueueSnackbar } = useSnackbar();
  const [boothName, setBoothName] = useState("");
  const [selectedGroupKey, setSelectedGroupKey] = useState<string>("");
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

  const conflictGroups = useMemo<ConflictGroupOption[]>(() => {
    type BoothEntry = {
      vendorId: string;
      vendorName: string;
      email: string;
      eventId: string;
      eventName: string;
      boothLocation: string;
      start: Date;
      end: Date;
    };

    const locationMap = new Map<
      string,
      { eventId: string; eventName: string; boothLocation: string; entries: BoothEntry[] }
    >();

    const resolveWindow = (application: AdminVendor["applications"][number]) => {
      if (!application.boothStartTime) {
        return { start: null as Date | null, end: null as Date | null };
      }
      const start = new Date(application.boothStartTime);
      if (Number.isNaN(start.getTime())) {
        return { start: null, end: null };
      }
      let end: Date | null = application.boothEndTime
        ? new Date(application.boothEndTime)
        : null;
      const durationWeeks = Number(application.boothDurationWeeks);
      if (
        (!end || Number.isNaN(end.getTime())) &&
        Number.isFinite(durationWeeks) &&
        durationWeeks > 0
      ) {
        const derived = new Date(start);
        derived.setDate(start.getDate() + durationWeeks * 7);
        end = derived;
      }
      if (!end || Number.isNaN(end.getTime())) {
        return { start: null, end: null };
      }
      return { start, end };
    };

    approvedVendors.forEach((vendor) => {
      (vendor.applications ?? []).forEach((application) => {
        if (
          !application.eventId ||
          !application.boothLocation ||
          application.status === VendorStatus.Rejected
        ) {
          return;
        }
        const { start, end } = resolveWindow(application);
        if (!start || !end) {
          return;
        }
        const key = `${application.eventId}__${application.boothLocation.toLowerCase()}`;
        const entry: BoothEntry = {
          vendorId: vendor.id,
          vendorName: vendor.companyName,
          email: vendor.email,
          eventId: application.eventId,
          eventName: application.eventName ?? "Vendor event",
          boothLocation: application.boothLocation,
          start,
          end,
        };
        const existing = locationMap.get(key);
        if (existing) {
          existing.entries.push(entry);
        } else {
          locationMap.set(key, {
            eventId: application.eventId,
            eventName: application.eventName ?? "Vendor event",
            boothLocation: application.boothLocation,
            entries: [entry],
          });
        }
      });
    });

    const rangesOverlap = (a: BoothEntry, b: BoothEntry) =>
      a.start.getTime() <= b.end.getTime() && b.start.getTime() <= a.end.getTime();

    const groups: ConflictGroupOption[] = [];

    locationMap.forEach((group, key) => {
      const { entries } = group;
      const visited = new Set<number>();

      for (let i = 0; i < entries.length; i++) {
        if (visited.has(i)) continue;
        const stack = [i];
        const component: number[] = [];

        while (stack.length) {
          const idx = stack.pop() as number;
          if (visited.has(idx)) continue;
          visited.add(idx);
          component.push(idx);

          entries.forEach((entry, entryIndex) => {
            if (!visited.has(entryIndex) && rangesOverlap(entries[idx], entry)) {
              stack.push(entryIndex);
            }
          });
        }

        if (component.length >= 2) {
          const vendors = component.map((index) => entries[index]);
          const windowStart = new Date(
            Math.min(...vendors.map((item) => item.start.getTime()))
          );
          const windowEnd = new Date(
            Math.max(...vendors.map((item) => item.end.getTime()))
          );

          groups.push({
            key: `${key}__${windowStart.toISOString()}__${windowEnd.toISOString()}`,
            eventId: group.eventId,
            eventName: group.eventName,
            boothLocation: group.boothLocation,
            windowStart: windowStart.toISOString(),
            windowEnd: windowEnd.toISOString(),
            vendorOptions: vendors.map((vendor) => ({
              label: vendor.vendorName,
              value: vendor.vendorId,
              email: vendor.email,
            })),
          });
        }
      }
    });

    return groups;
  }, [approvedVendors]);

  const selectedGroup =
    conflictGroups.find((group) => group.key === selectedGroupKey) ?? null;

  const filteredVendorOptions = useMemo(() => {
    if (!selectedGroup) return [];
    return selectedGroup.vendorOptions;
  }, [selectedGroup]);

  const selectedVendorOptions = useMemo(
    () =>
      filteredVendorOptions.filter((option) =>
        selectedVendorIds.includes(option.value)
      ),
    [selectedVendorIds, filteredVendorOptions]
  );

  const { mutate: createPoll, isPending } = useMutation({
    mutationFn: (input: CreateVendorPollInput) =>
      createVendorPoll(input, token ?? undefined),
    onSuccess: () => {
      enqueueSnackbar("Poll created successfully", { variant: "success" });
      setBoothName("");
      setDurations([{ start: "", end: "" }]);
      setSelectedVendorIds([]);
      setSelectedGroupKey("");
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
    const diffDays =
      (endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24);
    if (diffDays < 7) {
      return "Duration must be at least 1 week";
    }
    if (diffDays > 28) {
      return "Duration cannot exceed 4 weeks";
    }
    return null;
  });

  const canSubmit =
    boothName.trim().length > 0 &&
    selectedVendorIds.length >= 2 &&
    durationErrors.every((error) => error === null) &&
    Boolean(selectedGroup);

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
    if (!selectedGroup) {
      enqueueSnackbar("Choose a conflicting event/location before submitting.", {
        variant: "error",
      });
      return;
    }
    const payload: CreateVendorPollInput = {
      boothName: boothName.trim(),
      vendorIds: selectedVendorIds,
      eventId: selectedGroup.eventId,
      boothLocation: selectedGroup.boothLocation,
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
          Launch quick polls to compare approved vendors for upcoming bazaar and
          platform booths so faculty and students can vote on their favorites.
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
                Conflicting vendor applications
              </Typography>
              <Stack spacing={2}>
                {vendorsQuery.isLoading ? (
                  <CircularProgress size={28} />
                ) : vendorsQuery.isError ? (
                  <Alert severity="error">
                    Unable to load vendors. Please refresh and try again.
                  </Alert>
                ) : conflictGroups.length === 0 ? (
                  <Alert severity="info">
                    No overlapping applications found. Polls are only available when two
                    or more approved vendors requested the same booth location for the
                    same event.
                  </Alert>
                ) : (
                  <>
                    <Autocomplete
                      options={conflictGroups}
                      getOptionLabel={(option) =>
                        `${option.eventName} • ${option.boothLocation} (${formatDateTime(option.windowStart)} – ${formatDateTime(option.windowEnd)})`
                      }
                      value={selectedGroup}
                      isOptionEqualToValue={(option, value) => option.key === value.key}
                      onChange={(_event, option) => {
                        setSelectedGroupKey(option?.key ?? "");
                        setSelectedVendorIds(option ? option.vendorOptions.map((v) => v.value) : []);
                        if (option) {
                          setBoothName(`${option.eventName} - ${option.boothLocation}`);
                        }
                      }}
                      renderInput={(params) => (
                        <TextField
                          {...params}
                          label="Select conflicting booth location"
                          placeholder="Pick event + booth spot"
                        />
                      )}
                    />

                    <Autocomplete
                      multiple
                      options={filteredVendorOptions}
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
                      disabled={!selectedGroup}
                    />
                  </>
                )}
                <Typography variant="caption" color="text.secondary">
                  Polls are restricted to vendors competing for the same booth spot within
                  the same event.
                </Typography>
              </Stack>
            </Stack>

            <Divider />

            <Stack direction="row" justifyContent="flex-end" spacing={2}>
              <Button
                variant="text"
                onClick={() => {
                  setBoothName("");
                  setSelectedGroupKey("");
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
                disabled={!canSubmit || !selectedGroup}
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

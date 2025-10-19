"use client";

import { useMemo, useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Controller, useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import dayjs from "dayjs";
import Stack from "@mui/material/Stack";
import Grid from "@mui/material/GridLegacy";
import Typography from "@mui/material/Typography";
import Card from "@mui/material/Card";
import CardContent from "@mui/material/CardContent";
import CardActions from "@mui/material/CardActions";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import TextField from "@mui/material/TextField";
import MenuItem from "@mui/material/MenuItem";
import Divider from "@mui/material/Divider";
import Chip from "@mui/material/Chip";
import Dialog from "@mui/material/Dialog";
import DialogTitle from "@mui/material/DialogTitle";
import DialogContent from "@mui/material/DialogContent";
import DialogActions from "@mui/material/DialogActions";
import Alert from "@mui/material/Alert";
import Skeleton from "@mui/material/Skeleton";
import Fab from "@mui/material/Fab";
import AddIcon from "@mui/icons-material/AddRounded";
import EditIcon from "@mui/icons-material/EditRounded";
import RefreshIcon from "@mui/icons-material/RefreshRounded";
import DeleteIcon from "@mui/icons-material/DeleteRounded";
import { DateTimePicker } from "@mui/x-date-pickers/DateTimePicker";
import { useSnackbar } from "notistack";
import { useAuthToken } from "@/hooks/useAuthToken";
import { useSessionUser } from "@/hooks/useSessionUser";
import {
  fetchTrips,
  createTrip,
  updateTrip,
  deleteEvent,
  type TripPayload,
} from "@/lib/services/events";
import { formatDateTime } from "@/lib/date";
import { AuthRole, Location } from "@/lib/types";

const tripSchema = z
  .object({
    name: z.string().min(3, "Name must be at least 3 characters"),
    description: z.string().min(10, "Add a meaningful description"),
    location: z.nativeEnum(Location, { message: "Choose a location" }),
    startDate: z.date({ message: "Start date is required" }),
    endDate: z.date({ message: "End date is required" }),
    registrationDeadline: z.date({ message: "Deadline is required" }),
    capacity: z
      .number()
      .refine((value) => Number.isFinite(value), {
        message: "Enter the maximum number of participants",
      })
      .int("Capacity must be a whole number")
      .min(1, "Capacity must be at least 1"),
    price: z
      .number()
      .refine((value) => Number.isFinite(value), {
        message: "Enter a ticket price",
      })
      .min(0, "Price cannot be negative"),
  })
  .refine((values) => values.startDate < values.endDate, {
    message: "Start date must be before end date",
    path: ["startDate"],
  })
  .refine((values) => values.registrationDeadline < values.startDate, {
    message: "Deadline must be before the start date",
    path: ["registrationDeadline"],
  });

type TripFormValues = z.infer<typeof tripSchema>;

export default function TripManagementPage() {
  const token = useAuthToken();
  const user = useSessionUser();
  const { enqueueSnackbar } = useSnackbar();
  const queryClient = useQueryClient();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingTripId, setEditingTripId] = useState<string | null>(null);
  const [pendingDeleteId, setPendingDeleteId] = useState<string | null>(null);
  const isEventsOfficeUser = user?.role === AuthRole.EventOffice;

  const {
    data,
    isLoading,
    isError,
    error,
    refetch,
  } = useQuery({
    queryKey: ["events", "trips", token ?? "public"],
    queryFn: () => fetchTrips(token ?? undefined),
  });

  const {
    control,
    handleSubmit,
    reset,
    formState,
    register,
  } = useForm<TripFormValues>({
    resolver: zodResolver(tripSchema),
    defaultValues: defaultTripValues(),
  });

  const trips = useMemo(() => {
    if (!data) return [];
    return [...data].sort((a, b) =>
      dayjs(a.startDate).valueOf() - dayjs(b.startDate).valueOf()
    );
  }, [data]);

  const disableEdit = user?.role !== AuthRole.EventOffice;

  const createMutation = useMutation({
    mutationFn: (payload: TripPayload) => createTrip(payload, token ?? undefined),
    onSuccess: () => {
      enqueueSnackbar("Trip created successfully", { variant: "success" });
      queryClient.invalidateQueries({ queryKey: ["events", "trips"] });
      closeDialog();
    },
    onError: (mutationError: unknown) => {
      enqueueSnackbar(resolveErrorMessage(mutationError), { variant: "error" });
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, payload }: { id: string; payload: Partial<TripPayload> }) =>
      updateTrip(id, payload, token ?? undefined),
    onSuccess: () => {
      enqueueSnackbar("Trip updated", { variant: "success" });
      queryClient.invalidateQueries({ queryKey: ["events", "trips"] });
      closeDialog();
    },
    onError: (mutationError: unknown) => {
      enqueueSnackbar(resolveErrorMessage(mutationError), { variant: "error" });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => deleteEvent(id, token ?? undefined),
    onMutate: (id: string) => {
      setPendingDeleteId(id);
    },
    onSuccess: () => {
      enqueueSnackbar("Trip deleted", { variant: "success" });
      queryClient.invalidateQueries({ queryKey: ["events", "trips"] });
    },
    onError: (mutationError: unknown) => {
      enqueueSnackbar(resolveErrorMessage(mutationError), { variant: "error" });
    },
    onSettled: () => {
      setPendingDeleteId(null);
    },
  });

  const handleCreateClick = () => {
    setEditingTripId(null);
    reset(defaultTripValues());
    setDialogOpen(true);
  };

  const handleEditClick = (tripId: string) => {
    const trip = (data ?? []).find((item) => item.id === tripId);
    if (!trip) return;

    if (isEventsOfficeUser && !dayjs(trip.startDate).isAfter(dayjs())) {
      enqueueSnackbar("Trips that have started can only be edited by administrators.", {
        variant: "warning",
      });
      return;
    }

    setEditingTripId(tripId);
    reset({
      name: trip.name,
      description: trip.description,
      location: trip.location as Location,
      startDate: dayjs(trip.startDate).toDate(),
      endDate: dayjs(trip.endDate).toDate(),
      registrationDeadline: dayjs(trip.registrationDeadline).toDate(),
      capacity: trip.capacity ?? 1,
      price: trip.price ?? 0,
    });
    setDialogOpen(true);
  };

  const handleDeleteClick = (tripId: string, tripName: string) => {
    const confirmed = window.confirm(
      `Delete "${tripName}"? This action cannot be undone.`
    );
    if (!confirmed) {
      return;
    }
    if (editingTripId === tripId) {
      setDialogOpen(false);
      setEditingTripId(null);
    }
    deleteMutation.mutate(tripId);
  };

  const closeDialog = () => {
    setDialogOpen(false);
  };

  const onSubmit = handleSubmit((values) => {
    const payload = mapFormToPayload(values);
    if (editingTripId) {
      updateMutation.mutate({ id: editingTripId, payload });
    } else {
      createMutation.mutate(payload);
    }
  });

  const actionLabel = editingTripId ? "Save changes" : "Create trip";

  return (
    <Stack spacing={3}>
      <Stack spacing={1}>
        <Typography variant="h4" fontWeight={700}>
          Trip management
        </Typography>
        <Typography variant="body1" color="text.secondary">
          Plan and publish university trips with capacity, pricing, and timelines
          synced across student portals.
        </Typography>
        <Typography variant="body2" color="text.secondary">
          Signed in as{" "}
          <strong>{user?.name ?? user?.email ?? "your account"}</strong>. Only
          Events Office admins can publish new trips.
        </Typography>
      </Stack>

      {isError ? (
        <Alert
          severity="error"
          action={
            <Button onClick={() => refetch()} size="small" startIcon={<RefreshIcon />}>
              Retry
            </Button>
          }
        >
          {resolveErrorMessage(error)}
        </Alert>
      ) : null}

      <Grid container spacing={3}>
        {isLoading
          ? Array.from({ length: 3 }).map((_, index) => (
              <Grid item xs={12} md={6} lg={4} key={`trip-skeleton-${index}`}>
                <Card sx={{ height: "100%" }}>
                  <CardContent>
                    <Skeleton variant="text" width="70%" height={32} />
                    <Skeleton variant="text" width="50%" />
                    <Skeleton variant="rectangular" height={120} sx={{ mt: 2 }} />
                  </CardContent>
                </Card>
              </Grid>
            ))
          : null}

        {!isLoading && trips.length === 0 ? (
          <Grid item xs={12}>
            <Alert severity="info">
              No upcoming trips yet. Create the first one to get students excited.
            </Alert>
          </Grid>
        ) : null}

        {trips.map((trip) => {
<<<<<<< HEAD
          const disableActions =
            disableEdit ||
            (deleteMutation.isPending && pendingDeleteId === trip.id);

=======
          const tripHasStarted = !dayjs(trip.startDate).isAfter(dayjs());
          const disableEdit = isEventsOfficeUser && tripHasStarted;
>>>>>>> eab97295def789158a0243214c7a0b527cee100a
          return (
            <Grid item xs={12} md={6} lg={4} key={trip.id}>
              <Card sx={{ height: "100%", display: "flex", flexDirection: "column" }}>
                <CardContent sx={{ flexGrow: 1 }}>
                  <Stack spacing={1.5}>
                    <Stack direction="row" spacing={1} alignItems="center">
                      <Typography variant="h6" fontWeight={700}>
                        {trip.name}
                      </Typography>
                      <Chip label={trip.location} size="small" color="primary" />
                    </Stack>
                    <Typography variant="body2" color="text.secondary">
                      {trip.description}
                    </Typography>
                    <Divider />
                    <Stack spacing={1}>
                      <Detail label="Start" value={formatDateTime(trip.startDate)} />
                      <Detail label="End" value={formatDateTime(trip.endDate)} />
                      <Detail
                        label="Registration deadline"
                        value={formatDateTime(trip.registrationDeadline)}
                      />
                      <Detail
                        label="Capacity"
                        value={`${trip.capacity ?? 0} participants`}
                      />
                      <Detail label="Price" value={formatPrice(trip.price ?? 0)} />
                    </Stack>
                  </Stack>
                </CardContent>
                <CardActions sx={{ justifyContent: "flex-end", px: 2, pb: 2 }}>
                  <Stack direction="row" spacing={1}>
                    <Button
                      startIcon={<EditIcon />}
                      onClick={() => handleEditClick(trip.id)}
                      variant="outlined"
                      disabled={disableActions}
                    >
                      Edit
                    </Button>
                    <Button
                      color="error"
                      startIcon={<DeleteIcon />}
                      onClick={() => handleDeleteClick(trip.id, trip.name)}
                      disabled={disableActions}
                    >
                      Delete
                    </Button>
                  </Stack>
                </CardActions>
              </Card>
            </Grid>
          );
        })}
      </Grid>

      {user?.role === AuthRole.EventOffice ? (
        <Fab
          color="primary"
          sx={{ position: "fixed", bottom: 32, right: 32 }}
          onClick={handleCreateClick}
          aria-label="Create trip"
        >
          <AddIcon />
        </Fab>
      ) : null}

      <Dialog
        open={dialogOpen}
        onClose={closeDialog}
        fullWidth
        maxWidth="sm"
        keepMounted={false}
      >
        <DialogTitle>
          {editingTripId ? "Edit trip details" : "Publish a new trip"}
        </DialogTitle>
        <DialogContent dividers>
          <Stack spacing={2} component="form" id="trip-form" onSubmit={onSubmit}>
            <TextField
              label="Trip name"
              fullWidth
              {...register("name")}
              error={Boolean(formState.errors.name)}
              helperText={formState.errors.name?.message}
            />
            <TextField
              label="Short description"
              fullWidth
              multiline
              minRows={3}
              {...register("description")}
              error={Boolean(formState.errors.description)}
              helperText={formState.errors.description?.message}
            />
            <TextField
              select
              label="Location"
              fullWidth
              {...register("location")}
              error={Boolean(formState.errors.location)}
              helperText={formState.errors.location?.message}
            >
              {Object.values(Location).map((loc) => (
                <MenuItem key={loc} value={loc}>
                  {loc}
                </MenuItem>
              ))}
            </TextField>
            <Controller
              control={control}
              name="startDate"
              render={({ field }) => (
                <DateTimePicker
                  label="Start"
                  value={field.value ? dayjs(field.value) : null}
                  onChange={(date) => field.onChange(date?.toDate() ?? field.value)}
                  slotProps={{
                    textField: {
                      fullWidth: true,
                      error: Boolean(formState.errors.startDate),
                      helperText: formState.errors.startDate?.message,
                    },
                  }}
                />
              )}
            />
            <Controller
              control={control}
              name="endDate"
              render={({ field }) => (
                <DateTimePicker
                  label="End"
                  value={field.value ? dayjs(field.value) : null}
                  onChange={(date) => field.onChange(date?.toDate() ?? field.value)}
                  slotProps={{
                    textField: {
                      fullWidth: true,
                      error: Boolean(formState.errors.endDate),
                      helperText: formState.errors.endDate?.message,
                    },
                  }}
                />
              )}
            />
            <Controller
              control={control}
              name="registrationDeadline"
              render={({ field }) => (
                <DateTimePicker
                  label="Registration deadline"
                  value={field.value ? dayjs(field.value) : null}
                  onChange={(date) => field.onChange(date?.toDate() ?? field.value)}
                  slotProps={{
                    textField: {
                      fullWidth: true,
                      error: Boolean(formState.errors.registrationDeadline),
                      helperText: formState.errors.registrationDeadline?.message,
                    },
                  }}
                />
              )}
            />
            <TextField
              label="Capacity"
              type="number"
              fullWidth
              inputProps={{ min: 1 }}
              {...register("capacity", { valueAsNumber: true })}
              error={Boolean(formState.errors.capacity)}
              helperText={formState.errors.capacity?.message}
            />
            <TextField
              label="Price"
              type="number"
              fullWidth
              inputProps={{ min: 0, step: 0.01 }}
              {...register("price", { valueAsNumber: true })}
              error={Boolean(formState.errors.price)}
              helperText={formState.errors.price?.message ?? "Set to 0 for free trips"}
            />
          </Stack>
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2 }}>
          <Button onClick={closeDialog} color="inherit">
            Cancel
          </Button>
          <Button
            type="submit"
            form="trip-form"
            variant="contained"
            disabled={
              createMutation.isPending ||
              updateMutation.isPending ||
              deleteMutation.isPending
            }
          >
            {actionLabel}
          </Button>
        </DialogActions>
      </Dialog>
    </Stack>
  );
}

function defaultTripValues(): TripFormValues {
  const now = dayjs();
  return {
    name: "",
    description: "",
    location: Location.Cairo,
    startDate: now.add(14, "day").hour(8).minute(30).toDate(),
    endDate: now.add(14, "day").hour(20).minute(0).toDate(),
    registrationDeadline: now.add(12, "day").hour(17).minute(0).toDate(),
    capacity: 30,
    price: 0,
  };
}

function mapFormToPayload(values: TripFormValues): TripPayload {
  return {
    name: values.name.trim(),
    description: values.description.trim(),
    location: values.location,
    startDate: values.startDate.toISOString(),
    endDate: values.endDate.toISOString(),
    registrationDeadline: values.registrationDeadline.toISOString(),
    capacity: values.capacity,
    price: values.price,
  };
}

function Detail({ label, value }: { label: string; value: string }) {
  return (
    <Stack spacing={0.25}>
      <Typography variant="subtitle2" fontWeight={600}>
        {label}
      </Typography>
      <Typography variant="body2" color="text.secondary">
        {value}
      </Typography>
    </Stack>
  );
}

function resolveErrorMessage(error: unknown) {
  if (error instanceof Error) return error.message;
  if (error && typeof error === "object" && "message" in error) {
    const value = (error as { message?: string }).message;
    if (typeof value === "string") return value;
  }
  return "Something went wrong. Please try again.";
}

function formatPrice(value: number) {
  const formatter = new Intl.NumberFormat(undefined, {
    style: "currency",
    currency: "EGP",
    minimumFractionDigits: value % 1 === 0 ? 0 : 2,
  });
  return formatter.format(value);
}

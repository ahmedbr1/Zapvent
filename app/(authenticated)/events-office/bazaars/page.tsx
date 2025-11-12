"use client";

import { useMemo, useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useForm, Controller } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import Grid from "@mui/material/Grid";
import Stack from "@mui/material/Stack";
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
import Alert from "@mui/material/Alert";
import Skeleton from "@mui/material/Skeleton";
import Dialog from "@mui/material/Dialog";
import DialogTitle from "@mui/material/DialogTitle";
import DialogContent from "@mui/material/DialogContent";
import DialogActions from "@mui/material/DialogActions";
import Fab from "@mui/material/Fab";
import AddIcon from "@mui/icons-material/AddRounded";
import EditIcon from "@mui/icons-material/EditRounded";
import DeleteIcon from "@mui/icons-material/DeleteRounded";
import dayjs from "dayjs";
import { DateTimePicker } from "@mui/x-date-pickers/DateTimePicker";
import { useSnackbar } from "notistack";
import { useAuthToken } from "@/hooks/useAuthToken";
import { useSessionUser } from "@/hooks/useSessionUser";
import {
  EventFiltersBar,
  type EventFilters,
} from "@/components/events/EventFiltersBar";
import { filterAndSortEvents } from "@/lib/events/filters";
import {
  fetchUpcomingBazaars,
  createBazaar,
  updateBazaar,
  deleteEvent,
  type BazaarPayload,
} from "@/lib/services/events";
import { formatDateTime } from "@/lib/date";
import { AuthRole, Location } from "@/lib/types";

const bazaarSchema = z
  .object({
    name: z.string().min(3, "Name must be at least 3 characters"),
    description: z.string().min(10, "Add a meaningful description"),
    location: z.nativeEnum(Location, { message: "Choose a location" }),
    startDate: z.date({ message: "Start date is required" }),
    endDate: z.date({ message: "End date is required" }),
    registrationDeadline: z.date({ message: "Deadline is required" }),
  })
  .refine((values) => values.startDate < values.endDate, {
    message: "Start date must be before end date",
    path: ["startDate"],
  })
  .refine((values) => values.registrationDeadline < values.startDate, {
    message: "Deadline must be before the start date",
    path: ["registrationDeadline"],
  });

type BazaarFormValues = z.infer<typeof bazaarSchema>;

export default function BazaarManagementPage() {
  const token = useAuthToken();
  const user = useSessionUser();
  const { enqueueSnackbar } = useSnackbar();
  const queryClient = useQueryClient();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingBazaarId, setEditingBazaarId] = useState<string | null>(null);
  const [pendingDeleteId, setPendingDeleteId] = useState<string | null>(null);
  const [filters, setFilters] = useState<EventFilters>({
    search: "",
    eventType: "All",
    location: "All",
    professor: "",
    startDate: null,
    endDate: null,
    sortOrder: "asc",
  });
  const isEventsOfficeUser = user?.role === AuthRole.EventOffice;

  const { data, isLoading, isError, error, refetch } = useQuery({
    queryKey: ["events", "bazaars", token],
    queryFn: () => fetchUpcomingBazaars(token ?? undefined),
    enabled: Boolean(token),
  });

  const { control, handleSubmit, reset, formState, register } =
    useForm<BazaarFormValues>({
      resolver: zodResolver(bazaarSchema),
      defaultValues: defaultBazaarValues(),
    });

  const createMutation = useMutation({
    mutationFn: (payload: BazaarPayload) =>
      createBazaar(payload, token ?? undefined),
    onSuccess: () => {
      enqueueSnackbar("Bazaar created successfully", { variant: "success" });
      queryClient.invalidateQueries({ queryKey: ["events", "bazaars"] });
      closeDialog();
    },
    onError: (mutationError: unknown) => {
      enqueueSnackbar(resolveErrorMessage(mutationError), { variant: "error" });
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({
      id,
      payload,
    }: {
      id: string;
      payload: Partial<BazaarPayload>;
    }) => updateBazaar(id, payload, token ?? undefined),
    onSuccess: () => {
      enqueueSnackbar("Bazaar updated", { variant: "success" });
      queryClient.invalidateQueries({ queryKey: ["events", "bazaars"] });
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
      enqueueSnackbar("Bazaar deleted", { variant: "success" });
      queryClient.invalidateQueries({ queryKey: ["events", "bazaars"] });
    },
    onError: (mutationError: unknown) => {
      enqueueSnackbar(resolveErrorMessage(mutationError), { variant: "error" });
    },
    onSettled: () => {
      setPendingDeleteId(null);
    },
  });

  const bazaars = useMemo(
    () =>
      filterAndSortEvents(data, filters, {
        getSearchValues: (bazaar) => [bazaar.name, bazaar.description],
        getStartDate: (bazaar) => bazaar.startDate,
        getLocation: (bazaar) => bazaar.location,
      }),
    [data, filters]
  );

  const handleCreateClick = () => {
    setEditingBazaarId(null);
    reset(defaultBazaarValues());
    setDialogOpen(true);
  };

  const handleEditClick = (bazaarId: string) => {
    const bazaar = (data ?? []).find((item) => item.id === bazaarId);
    if (!bazaar) return;

    if (isEventsOfficeUser && !dayjs(bazaar.startDate).isAfter(dayjs())) {
      enqueueSnackbar(
        "Bazaars that have started can only be edited by administrators.",
        { variant: "warning" }
      );
      return;
    }

    setEditingBazaarId(bazaarId);
    reset({
      name: bazaar.name,
      description: bazaar.description,
      location: bazaar.location as Location,
      startDate: dayjs(bazaar.startDate).toDate(),
      endDate: dayjs(bazaar.endDate).toDate(),
      registrationDeadline: dayjs(bazaar.registrationDeadline).toDate(),
    });
    setDialogOpen(true);
  };

  const handleDeleteClick = (bazaarId: string, bazaarName: string) => {
    const confirmed = window.confirm(
      `Delete "${bazaarName}"? This action cannot be undone.`
    );
    if (!confirmed) return;

    if (editingBazaarId === bazaarId) {
      closeDialog();
    }

    deleteMutation.mutate(bazaarId);
  };

  const closeDialog = () => {
    setDialogOpen(false);
    setEditingBazaarId(null);
  };

  const onSubmit = handleSubmit((values) => {
    const payload: BazaarPayload = {
      name: values.name,
      description: values.description,
      location: values.location,
      startDate: values.startDate.toISOString(),
      endDate: values.endDate.toISOString(),
      registrationDeadline: values.registrationDeadline.toISOString(),
    };

    if (editingBazaarId) {
      updateMutation.mutate({ id: editingBazaarId, payload });
    } else {
      createMutation.mutate(payload);
    }
  });

  const actionLabel = editingBazaarId ? "Save changes" : "Create bazaar";

  return (
    <Stack spacing={4}>
      <Stack spacing={1}>
        <Typography variant="h4" fontWeight={700}>
          Bazaar management
        </Typography>
        <Typography variant="body1" color="text.secondary">
          Craft immersive marketplace experiences across GUC campuses.
        </Typography>
      </Stack>

      <EventFiltersBar
        value={filters}
        onChange={setFilters}
        showEventTypeFilter={false}
        showProfessorFilter={false}
        searchPlaceholder="Search bazaars"
      />

      {isEventsOfficeUser ? (
        <Typography variant="body2" color="text.secondary">
          Signed in as Events Office. All published bazaars sync automatically
          with vendor portals.
        </Typography>
      ) : null}

      {isLoading ? (
        <Grid container spacing={3}>
          {Array.from({ length: 3 }).map((_, index) => (
            <Grid
              key={`bazaar-skeleton-${index}`}
              size={{ xs: 12, md: 6, lg: 4 }}
            >
              <Skeleton
                variant="rectangular"
                height={280}
                sx={{ borderRadius: 3 }}
              />
            </Grid>
          ))}
        </Grid>
      ) : isError ? (
        <Alert
          severity="error"
          action={<Button onClick={() => refetch()}>Retry</Button>}
        >
          {resolveErrorMessage(error)}
        </Alert>
      ) : bazaars.length === 0 ? (
        <Alert severity="info">
          No bazaars scheduled yet. Tap &quot;New bazaar&quot; to launch your
          next campus experience.
        </Alert>
      ) : (
        <Grid container spacing={3}>
          {bazaars.map((bazaar) => {
            const hasStarted = !dayjs(bazaar.startDate).isAfter(dayjs());
            const isDeleting =
              deleteMutation.isPending && pendingDeleteId === bazaar.id;
            const disableActions = hasStarted || isDeleting;

            return (
              <Grid key={bazaar.id} size={{ xs: 12, md: 6, lg: 4 }}>
                <Card
                  sx={{
                    borderRadius: 3,
                    height: "100%",
                    display: "flex",
                    flexDirection: "column",
                  }}
                >
                  <CardContent sx={{ flexGrow: 1 }}>
                    <Stack spacing={1.5}>
                      <Stack direction="row" spacing={1} alignItems="center">
                        <Chip label="Bazaar" size="small" color="secondary" />
                        <Chip
                          label={bazaar.location}
                          size="small"
                          variant="outlined"
                        />
                      </Stack>
                      <Typography variant="h6" fontWeight={700}>
                        {bazaar.name}
                      </Typography>
                      <Typography variant="body2" color="text.secondary">
                        {bazaar.description}
                      </Typography>
                      <Divider sx={{ my: 1 }} />
                      <Detail
                        label="Starts"
                        value={formatDateTime(bazaar.startDate)}
                      />
                      <Detail
                        label="Ends"
                        value={formatDateTime(bazaar.endDate)}
                      />
                      <Detail
                        label="Registration deadline"
                        value={formatDateTime(bazaar.registrationDeadline)}
                      />
                      <Typography variant="caption" color="text.secondary">
                        Vendors assigned: {bazaar.vendors?.length ?? 0}
                      </Typography>
                    </Stack>
                  </CardContent>
                  <CardActions sx={{ px: 3, pb: 3, alignItems: "center" }}>
                    {hasStarted ? (
                      <Typography
                        variant="caption"
                        color="error"
                        sx={{ flexGrow: 1, pr: 1 }}
                      >
                        Bazaar already started; contact an administrator for
                        changes.
                      </Typography>
                    ) : (
                      <Box sx={{ flexGrow: 1 }} />
                    )}
                    <Stack direction="row" spacing={1}>
                      <Button
                        startIcon={<EditIcon />}
                        onClick={() => handleEditClick(bazaar.id)}
                        disabled={disableActions}
                      >
                        Edit bazaar
                      </Button>
                      <Button
                        color="error"
                        startIcon={<DeleteIcon />}
                        onClick={() =>
                          handleDeleteClick(bazaar.id, bazaar.name)
                        }
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
      )}

      <Fab
        color="primary"
        onClick={handleCreateClick}
        sx={{ position: "fixed", right: 32, bottom: 32 }}
        aria-label="Create new bazaar"
      >
        <AddIcon />
      </Fab>

      <Dialog open={dialogOpen} onClose={closeDialog} maxWidth="sm" fullWidth>
        <DialogTitle>
          {editingBazaarId ? "Edit bazaar" : "New bazaar"}
        </DialogTitle>
        <DialogContent>
          <Stack
            component="form"
            id="bazaar-form"
            spacing={2.5}
            sx={{ mt: 1 }}
            onSubmit={onSubmit}
          >
            <TextField
              label="Name"
              fullWidth
              {...register("name")}
              error={Boolean(formState.errors.name)}
              helperText={formState.errors.name?.message}
            />
            <TextField
              label="Description"
              fullWidth
              multiline
              minRows={3}
              {...register("description")}
              error={Boolean(formState.errors.description)}
              helperText={formState.errors.description?.message}
            />
            <Controller
              control={control}
              name="location"
              render={({ field }) => (
                <TextField
                  select
                  label="Location"
                  fullWidth
                  value={field.value ?? ""}
                  onChange={(event) =>
                    field.onChange(event.target.value as Location)
                  }
                  onBlur={field.onBlur}
                  inputRef={field.ref}
                  error={Boolean(formState.errors.location)}
                  helperText={formState.errors.location?.message}
                >
                  {Object.values(Location).map((loc) => (
                    <MenuItem key={loc} value={loc}>
                      {loc}
                    </MenuItem>
                  ))}
                </TextField>
              )}
            />
            <Controller
              control={control}
              name="startDate"
              render={({ field }) => (
                <DateTimePicker
                  label="Start"
                  value={field.value ? dayjs(field.value) : null}
                  onChange={(date) =>
                    field.onChange(date?.toDate() ?? field.value)
                  }
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
                  onChange={(date) =>
                    field.onChange(date?.toDate() ?? field.value)
                  }
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
                  onChange={(date) =>
                    field.onChange(date?.toDate() ?? field.value)
                  }
                  slotProps={{
                    textField: {
                      fullWidth: true,
                      error: Boolean(formState.errors.registrationDeadline),
                      helperText:
                        formState.errors.registrationDeadline?.message,
                    },
                  }}
                />
              )}
            />
          </Stack>
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2 }}>
          <Button onClick={closeDialog} color="inherit">
            Cancel
          </Button>
          <Button
            type="submit"
            form="bazaar-form"
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

function defaultBazaarValues(): BazaarFormValues {
  const now = dayjs();
  return {
    name: "",
    description: "",
    location: Location.Cairo,
    startDate: now.add(7, "day").hour(10).minute(0).toDate(),
    endDate: now.add(7, "day").hour(18).minute(0).toDate(),
    registrationDeadline: now.add(5, "day").hour(17).minute(0).toDate(),
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

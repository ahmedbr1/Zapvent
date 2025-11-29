"use client";

import { useEffect, useMemo, useState } from "react";
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
import Tooltip from "@mui/material/Tooltip";
import Fab from "@mui/material/Fab";
import AddIcon from "@mui/icons-material/AddRounded";
import EditIcon from "@mui/icons-material/EditRounded";
import DeleteIcon from "@mui/icons-material/DeleteRounded";
import ArchiveIcon from "@mui/icons-material/ArchiveRounded";
import LoadingButton from "@mui/lab/LoadingButton";
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
  archiveEventById,
  type BazaarPayload,
} from "@/lib/services/events";
import { formatDateTime } from "@/lib/date";
import { AuthRole, EventType, Location } from "@/lib/types";
import { EventOfficeEventActions } from "@/components/events/EventOfficeEventActions";

const vendorEventTypes = [EventType.Bazaar, EventType.BoothInPlatform] as const;

const isVendorEventType = (
  eventType: EventType
): eventType is (typeof vendorEventTypes)[number] =>
  vendorEventTypes.includes(eventType as (typeof vendorEventTypes)[number]);

const bazaarSchema = z
  .object({
    name: z.string().min(3, "Name must be at least 3 characters"),
    description: z.string().min(10, "Add a meaningful description"),
    eventType: z.enum(vendorEventTypes, { message: "Choose an event type" }),
    location: z.nativeEnum(Location, { message: "Choose a location" }),
    startDate: z.date().optional(),
    endDate: z.date().optional(),
    registrationDeadline: z.date().optional(),
  })
  .superRefine((values, ctx) => {
    if (values.eventType === EventType.BoothInPlatform) {
      return;
    }
    if (!values.startDate) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["startDate"],
        message: "Start date is required",
      });
    }
    if (!values.endDate) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["endDate"],
        message: "End date is required",
      });
    }
    if (!values.registrationDeadline) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["registrationDeadline"],
        message: "Deadline is required",
      });
    }
    if (values.startDate && values.endDate && values.startDate >= values.endDate) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["startDate"],
        message: "Start date must be before end date",
      });
    }
    if (
      values.registrationDeadline &&
      values.startDate &&
      values.registrationDeadline >= values.startDate
    ) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["registrationDeadline"],
        message: "Deadline must be before the start date",
      });
    }
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
    sessionType: "All",
    startDate: null,
    endDate: null,
    sortOrder: "asc",
  });
  const isEventsOfficeUser = user?.role === AuthRole.EventOffice;
  const [archivedBazaarIds, setArchivedBazaarIds] = useState<Set<string>>(
    () => new Set()
  );

  const { data, isLoading, isError, error, refetch } = useQuery({
    queryKey: ["events", "bazaars", token],
    queryFn: () =>
      fetchUpcomingBazaars(token ?? undefined, user?.id, [
        EventType.Bazaar,
        EventType.BoothInPlatform,
      ]),
    enabled: Boolean(token),
  });

  const { control, handleSubmit, reset, formState, register, watch, setValue } =
    useForm<BazaarFormValues>({
      resolver: zodResolver(bazaarSchema),
      defaultValues: defaultBazaarValues(),
    });
  const watchEventType = watch("eventType");
  const isPlatformBoothType = watchEventType === EventType.BoothInPlatform;

  useEffect(() => {
    if (isPlatformBoothType) {
      setValue("startDate", undefined);
      setValue("endDate", undefined);
      setValue("registrationDeadline", undefined);
    } else {
      const defaults = defaultBazaarValues();
      if (!watch("startDate")) setValue("startDate", defaults.startDate);
      if (!watch("endDate")) setValue("endDate", defaults.endDate);
      if (!watch("registrationDeadline"))
        setValue("registrationDeadline", defaults.registrationDeadline);
    }
  }, [isPlatformBoothType, setValue, watch]);

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

  const archiveMutation = useMutation({
    mutationFn: (id: string) => archiveEventById(id, token ?? undefined),
    onSuccess: (response, id) => {
      enqueueSnackbar(response.message ?? "Bazaar archived.", {
        variant: "info",
      });
      queryClient.invalidateQueries({ queryKey: ["events", "bazaars"] });
      setArchivedBazaarIds((prev) => {
        const next = new Set(prev);
        next.add(id);
        return next;
      });
    },
    onError: (mutationError: unknown) => {
      enqueueSnackbar(resolveErrorMessage(mutationError), { variant: "error" });
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

    if (!isVendorEventType(bazaar.eventType)) {
      enqueueSnackbar("Only vendor events can be edited here.", {
        variant: "warning",
      });
      return;
    }

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
      eventType: bazaar.eventType,
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

  const handleArchiveClick = (bazaarId: string, bazaarName: string) => {
    const confirmed = window.confirm(
      `Archive "${bazaarName}"? Students will no longer see it in listings.`
    );
    if (!confirmed) return;
    archiveMutation.mutate(bazaarId);
  };

  const closeDialog = () => {
    setDialogOpen(false);
    setEditingBazaarId(null);
  };

  const onSubmit = handleSubmit((values) => {
    const fallbackDate = new Date();
    const normalizedDates =
      values.eventType === EventType.BoothInPlatform
        ? {
            startDate: null,
            endDate: null,
            registrationDeadline: null,
          }
        : {
            startDate: (values.startDate ?? fallbackDate).toISOString(),
            endDate: (values.endDate ?? fallbackDate).toISOString(),
            registrationDeadline: (values.registrationDeadline ?? fallbackDate).toISOString(),
          };
    const payload: BazaarPayload = {
      name: values.name,
      description: values.description,
      eventType: values.eventType,
      location: values.location,
      ...normalizedDates,
    };

    if (editingBazaarId) {
      updateMutation.mutate({ id: editingBazaarId, payload });
    } else {
      createMutation.mutate(payload);
    }
  });

  const actionLabel = editingBazaarId ? "Save changes" : "Create vendor event";

  return (
    <Stack spacing={4}>
      <Stack spacing={1}>
        <Typography variant="h4" fontWeight={700}>
          Vendor events
        </Typography>
        <Typography variant="body1" color="text.secondary">
          Publish bazaars and platform booths for vendors across GUC campuses.
        </Typography>
      </Stack>

      <EventFiltersBar
        value={filters}
        onChange={setFilters}
        showEventTypeFilter={false}
        showProfessorFilter={false}
        searchPlaceholder="Search vendor events"
      />

      {isEventsOfficeUser ? (
        <Typography variant="body2" color="text.secondary">
          Signed in as Events Office. All published vendor events sync
          automatically with vendor portals.
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
          No vendor events scheduled yet. Tap &quot;New vendor event&quot; to
          launch your next experience.
        </Alert>
      ) : (
        <Grid container spacing={3}>
          {bazaars.map((bazaar) => {
            const hasStarted = !dayjs(bazaar.startDate).isAfter(dayjs());
            const eventHasEnded = dayjs(bazaar.endDate).isBefore(dayjs());
            const eventLabel = bazaar.eventType ?? EventType.Bazaar;
            const isPlatformBooth =
              bazaar.eventType === EventType.BoothInPlatform;
            const isDeleting =
              deleteMutation.isPending && pendingDeleteId === bazaar.id;
            const disableActions = hasStarted || isDeleting;
            const archivingThis =
              archiveMutation.isPending && archiveMutation.variables === bazaar.id;
            const serverArchived = Boolean(bazaar.archived);
            const isArchived =
              serverArchived || archivedBazaarIds.has(bazaar.id);
            const archiveEligible = isEventsOfficeUser && eventHasEnded;
            const archiveDisabled =
              isArchived || !archiveEligible || archivingThis;
            const archiveTooltip = isArchived
              ? `${eventLabel} already archived.`
              : archiveEligible
                ? `Archive this ${eventLabel.toLowerCase()} to hide it from future listings.`
                : "Archiving unlocks after the event ends.";
            const archiveLabel = isArchived ? "Archived" : "Archive";

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
                        <Chip
                          label={eventLabel}
                          size="small"
                          color={isPlatformBooth ? "primary" : "secondary"}
                        />
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
                      {isPlatformBooth ? (
                        <Alert severity="info" sx={{ py: 0.5 }}>
                          Platform booths stay active indefinitely. Vendors pick their own booth windows.
                        </Alert>
                      ) : (
                        <>
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
                        </>
                      )}
                      <Typography variant="caption" color="text.secondary">
                        Vendors assigned: {bazaar.vendors?.length ?? 0}
                      </Typography>
                      {isEventsOfficeUser ? (
                        <Box mt={1}>
                          <EventOfficeEventActions
                            eventId={bazaar.id}
                            eventName={bazaar.name}
                            eventType={bazaar.eventType}
                            allowedRoles={bazaar.allowedRoles}
                            token={token}
                            onRestrictionsUpdated={() => {
                              void refetch();
                            }}
                          />
                        </Box>
                      ) : null}
                    </Stack>
                  </CardContent>
                  <CardActions sx={{ px: 3, pb: 3, alignItems: "center" }}>
                    {hasStarted ? (
                      <Typography
                        variant="caption"
                        color="error"
                        sx={{ flexGrow: 1, pr: 1 }}
                      >
                        {eventLabel} already started; contact an administrator
                        for changes.
                      </Typography>
                    ) : (
                      <Box sx={{ flexGrow: 1 }} />
                    )}
                    <Stack
                      direction="row"
                      spacing={1}
                      flexWrap="wrap"
                      justifyContent="flex-end"
                    >
                      {isEventsOfficeUser ? (
                        <Tooltip title={archiveTooltip}>
                          <span>
                            <LoadingButton
                              startIcon={<ArchiveIcon />}
                              color="inherit"
                              onClick={() =>
                                handleArchiveClick(bazaar.id, bazaar.name)
                              }
                              loading={archivingThis}
                              disabled={archiveDisabled}
                            >
                              {archiveLabel}
                            </LoadingButton>
                          </span>
                        </Tooltip>
                      ) : null}
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
        aria-label="Create new vendor event"
      >
        <AddIcon />
      </Fab>

      <Dialog open={dialogOpen} onClose={closeDialog} maxWidth="sm" fullWidth>
        <DialogTitle>
          {editingBazaarId ? "Edit vendor event" : "New vendor event"}
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
            <TextField
              select
              label="Event type"
              fullWidth
              {...register("eventType")}
              error={Boolean(formState.errors.eventType)}
              helperText={formState.errors.eventType?.message}
            >
              <MenuItem value={EventType.Bazaar}>Bazaar</MenuItem>
              <MenuItem value={EventType.BoothInPlatform}>Booth in platform</MenuItem>
            </TextField>
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
            {isPlatformBoothType ? (
              <Alert severity="info">
                Booth in platform events stay open indefinitely. Vendors will choose their own
                booth window when applying, so no dates are required here.
              </Alert>
            ) : (
              <>
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
              </>
            )}
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
    eventType: EventType.Bazaar,
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

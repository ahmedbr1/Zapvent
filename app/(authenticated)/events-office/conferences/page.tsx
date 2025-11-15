"use client";

import { useMemo, useState, type ReactNode } from "react";
import { useForm, Controller } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { DateTimePicker } from "@mui/x-date-pickers/DateTimePicker";
import dayjs from "dayjs";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import Stack from "@mui/material/Stack";
import Typography from "@mui/material/Typography";
import Grid from "@mui/material/GridLegacy";
import Card from "@mui/material/Card";
import CardContent from "@mui/material/CardContent";
import CardActions from "@mui/material/CardActions";
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
import Tooltip from "@mui/material/Tooltip";
import Fab from "@mui/material/Fab";
import AddIcon from "@mui/icons-material/AddRounded";
import EditIcon from "@mui/icons-material/EditRounded";
import RefreshIcon from "@mui/icons-material/RefreshRounded";
import LinkIcon from "@mui/icons-material/LinkRounded";
import DeleteIcon from "@mui/icons-material/DeleteRounded";
import ArchiveIcon from "@mui/icons-material/ArchiveRounded";
import LoadingButton from "@mui/lab/LoadingButton";
import { useSnackbar } from "notistack";
import { useAuthToken } from "@/hooks/useAuthToken";
import { useSessionUser } from "@/hooks/useSessionUser";
import {
  EventFiltersBar,
  type EventFilters,
} from "@/components/events/EventFiltersBar";
import { filterAndSortEvents } from "@/lib/events/filters";
import {
  fetchConferences,
  createConference,
  updateConference,
  deleteEvent,
  archiveEventById,
  type ConferencePayload,
} from "@/lib/services/events";
import { AuthRole, FundingSource } from "@/lib/types";
import { formatDateTime } from "@/lib/date";

const conferenceSchema = z
  .object({
    name: z.string().min(3, "Name must be at least 3 characters"),
    description: z.string().min(10, "Add a meaningful description"),
    startDate: z.date({ message: "Start date is required" }),
    endDate: z.date({ message: "End date is required" }),
    fullAgenda: z.string().min(10, "Provide a short agenda summary or URL"),
    websiteLink: z.string().url("Enter a valid URL"),
    requiredBudget: z
      .number()
      .refine((value) => Number.isFinite(value), {
        message: "Enter the allocated budget",
      })
      .min(0, "Budget cannot be negative"),
    fundingSource: z.nativeEnum(FundingSource, {
      message: "Select a funding source",
    }),
    extraRequiredResources: z
      .string()
      .max(500, "Keep it under 500 characters")
      .optional()
      .or(z.literal("")),
  })
  .refine((values) => values.startDate < values.endDate, {
    message: "Start date must be before end date",
    path: ["startDate"],
  });

type ConferenceFormValues = z.infer<typeof conferenceSchema>;

export default function ConferenceManagementPage() {
  const token = useAuthToken();
  const user = useSessionUser();
  const { enqueueSnackbar } = useSnackbar();
  const queryClient = useQueryClient();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingConferenceId, setEditingConferenceId] = useState<string | null>(
    null
  );
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
  const [archivedConferenceIds, setArchivedConferenceIds] = useState<
    Set<string>
  >(() => new Set());

  const { data, isLoading, isError, error, refetch } = useQuery({
    queryKey: ["events", "conferences", token ?? "public"],
    queryFn: () => fetchConferences(token ?? undefined),
  });

  const { control, handleSubmit, reset, formState, register } =
    useForm<ConferenceFormValues>({
      resolver: zodResolver(conferenceSchema),
      defaultValues: defaultConferenceValues(),
    });

  const conferences = useMemo(
    () =>
      filterAndSortEvents(data, filters, {
        getSearchValues: (conference) => [
          conference.name,
          conference.description,
          conference.fullAgenda,
          ...(conference.participatingProfessors ?? []),
        ],
        getStartDate: (conference) => conference.startDate,
        getLocation: (conference) => conference.location,
        getProfessorNames: (conference) => conference.participatingProfessors,
      }),
    [data, filters]
  );

  const professorOptions = useMemo(
    () =>
      Array.from(
        new Set(
          (data ?? [])
            .flatMap((conference) => conference.participatingProfessors ?? [])
            .filter((name): name is string => Boolean(name))
        )
      ),
    [data]
  );

  const createMutation = useMutation({
    mutationFn: (payload: ConferencePayload) =>
      createConference(payload, token ?? undefined),
    onSuccess: () => {
      enqueueSnackbar("Conference created successfully", {
        variant: "success",
      });
      queryClient.invalidateQueries({ queryKey: ["events", "conferences"] });
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
      payload: Partial<ConferencePayload>;
    }) => updateConference(id, payload, token ?? undefined),
    onSuccess: () => {
      enqueueSnackbar("Conference updated", { variant: "success" });
      queryClient.invalidateQueries({ queryKey: ["events", "conferences"] });
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
      enqueueSnackbar("Conference deleted", { variant: "success" });
      queryClient.invalidateQueries({ queryKey: ["events", "conferences"] });
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
      enqueueSnackbar(response.message ?? "Conference archived.", {
        variant: "info",
      });
      queryClient.invalidateQueries({ queryKey: ["events", "conferences"] });
      setArchivedConferenceIds((prev) => {
        const next = new Set(prev);
        next.add(id);
        return next;
      });
    },
    onError: (mutationError: unknown) => {
      enqueueSnackbar(resolveErrorMessage(mutationError), { variant: "error" });
    },
  });

  const handleCreateClick = () => {
    setEditingConferenceId(null);
    reset(defaultConferenceValues());
    setDialogOpen(true);
  };

  const handleEditClick = (conferenceId: string) => {
    const conference = (data ?? []).find((item) => item.id === conferenceId);
    if (!conference) return;
    setEditingConferenceId(conferenceId);
    reset({
      name: conference.name,
      description: conference.description,
      startDate: dayjs(conference.startDate).toDate(),
      endDate: dayjs(conference.endDate).toDate(),
      fullAgenda: conference.fullAgenda ?? "",
      websiteLink: conference.websiteLink ?? "",
      requiredBudget: conference.requiredBudget ?? 0,
      fundingSource: conference.fundingSource ?? FundingSource.GUC,
      extraRequiredResources: conference.extraRequiredResources ?? "",
    });
    setDialogOpen(true);
  };

  const handleDeleteClick = (conferenceId: string, conferenceName: string) => {
    const confirmed = window.confirm(
      `Delete "${conferenceName}"? This action cannot be undone.`
    );
    if (!confirmed) {
      return;
    }
    if (editingConferenceId === conferenceId) {
      closeDialog();
    }
    deleteMutation.mutate(conferenceId);
  };

  const handleArchiveConference = (
    conferenceId: string,
    conferenceName: string
  ) => {
    const confirmed = window.confirm(
      `Archive "${conferenceName}"? It will move out of upcoming events.`
    );
    if (!confirmed) {
      return;
    }
    archiveMutation.mutate(conferenceId);
  };

  const closeDialog = () => {
    setDialogOpen(false);
    setEditingConferenceId(null);
  };

  const onSubmit = handleSubmit((values) => {
    const payload = mapFormToPayload(values);
    if (editingConferenceId) {
      updateMutation.mutate({ id: editingConferenceId, payload });
    } else {
      createMutation.mutate(payload);
    }
  });

  const actionLabel = editingConferenceId
    ? "Save changes"
    : "Create conference";

  return (
    <Stack spacing={3}>
      <Stack spacing={1}>
        <Typography variant="h4" fontWeight={700}>
          Conference management
        </Typography>
        <Typography variant="body1" color="text.secondary">
          Publish and maintain major conferences with agenda, funding, and
          outreach details.
        </Typography>
        <Typography variant="body2" color="text.secondary">
          Signed in as{" "}
          <strong>{user?.name ?? user?.email ?? "your account"}</strong>. Only
          Events Office admins can manage conference listings.
        </Typography>
      </Stack>

      <EventFiltersBar
        value={filters}
        onChange={setFilters}
        showEventTypeFilter={false}
        searchPlaceholder="Search conferences"
        professors={professorOptions}
        showProfessorFilter={professorOptions.length > 0}
      />

      {isError ? (
        <Alert
          severity="error"
          action={
            <Button
              onClick={() => refetch()}
              size="small"
              startIcon={<RefreshIcon />}
            >
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
              <Grid
                item
                xs={12}
                md={6}
                lg={4}
                key={`conference-skeleton-${index}`}
              >
                <Card sx={{ height: "100%" }}>
                  <CardContent>
                    <Skeleton variant="text" width="70%" height={32} />
                    <Skeleton variant="text" width="40%" />
                    <Skeleton
                      variant="rectangular"
                      height={120}
                      sx={{ mt: 2 }}
                    />
                  </CardContent>
                </Card>
              </Grid>
            ))
          : null}

        {!isLoading && conferences.length === 0 ? (
          <Grid item xs={12}>
            <Alert severity="info">
              No upcoming conferences yet. Create one to showcase GUC&apos;s
              research and industry collaborations.
            </Alert>
          </Grid>
        ) : null}

        {conferences.map((conference) => {
          const eventHasEnded = dayjs(conference.endDate).isBefore(dayjs());
          const archivingThis =
            archiveMutation.isPending &&
            archiveMutation.variables === conference.id;
          const serverArchived = Boolean(conference.archived);
          const isArchived =
            serverArchived || archivedConferenceIds.has(conference.id);
          const archiveEligible = isEventsOfficeUser && eventHasEnded;
          const archiveDisabled =
            isArchived || !archiveEligible || archivingThis;
          const archiveTooltip = isArchived
            ? "Conference already archived."
            : archiveEligible
              ? "Archive this conference to retire it from listings."
              : "Archiving unlocks after the conference ends.";
          const archiveLabel = isArchived ? "Archived" : "Archive";

          return (
            <Grid item xs={12} md={6} lg={4} key={conference.id}>
              <Card
                sx={{ height: "100%", display: "flex", flexDirection: "column" }}
              >
                <CardContent sx={{ flexGrow: 1 }}>
                  <Stack spacing={1.5}>
                    <Stack direction="row" spacing={1} alignItems="center">
                      <Typography variant="h6" fontWeight={700}>
                        {conference.name}
                      </Typography>
                      <Chip
                        label={conference.location}
                        size="small"
                        color="primary"
                      />
                      {conference.fundingSource ? (
                        <Chip
                          label={conference.fundingSource}
                          size="small"
                          color="secondary"
                        />
                      ) : null}
                    </Stack>
                    <Typography variant="body2" color="text.secondary">
                      {conference.description}
                    </Typography>
                    <Divider />
                    <Stack spacing={1}>
                      <Detail
                        label="Start"
                        value={formatDateTime(conference.startDate)}
                      />
                      <Detail
                        label="End"
                        value={formatDateTime(conference.endDate)}
                      />
                      <Detail
                        label="Registration deadline"
                        value={formatDateTime(conference.registrationDeadline)}
                      />
                      {conference.requiredBudget !== undefined ? (
                        <Detail
                          label="Budget allocation"
                          value={formatCurrency(conference.requiredBudget)}
                        />
                      ) : null}
                      {conference.websiteLink ? (
                        <Detail
                          label="Website"
                          value={conference.websiteLink}
                          icon={<LinkIcon fontSize="small" color="action" />}
                        />
                      ) : null}
                      {conference.fullAgenda ? (
                        <Detail label="Agenda" value={conference.fullAgenda} />
                      ) : null}
                      {conference.extraRequiredResources ? (
                        <Detail
                          label="Resources"
                          value={conference.extraRequiredResources}
                        />
                      ) : null}
                    </Stack>
                  </Stack>
                </CardContent>
                <CardActions sx={{ justifyContent: "flex-end", px: 2, pb: 2 }}>
                  <Stack direction="row" spacing={1} flexWrap="wrap">
                    {isEventsOfficeUser ? (
                      <Tooltip title={archiveTooltip}>
                        <span>
                          <LoadingButton
                            startIcon={<ArchiveIcon />}
                            color="inherit"
                            onClick={() =>
                              handleArchiveConference(conference.id, conference.name)
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
                      onClick={() => handleEditClick(conference.id)}
                      variant="outlined"
                      disabled={
                        deleteMutation.isPending &&
                        pendingDeleteId === conference.id
                      }
                    >
                      Edit
                    </Button>
                    <Button
                      color="error"
                      startIcon={<DeleteIcon />}
                      onClick={() =>
                        handleDeleteClick(conference.id, conference.name)
                      }
                      disabled={
                        deleteMutation.isPending &&
                        pendingDeleteId === conference.id
                      }
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
          aria-label="Create conference"
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
          {editingConferenceId
            ? "Edit conference details"
            : "Publish a new conference"}
        </DialogTitle>
        <DialogContent dividers>
          <Stack
            spacing={2}
            component="form"
            id="conference-form"
            onSubmit={onSubmit}
          >
            <TextField
              label="Conference name"
              fullWidth
              {...register("name")}
              error={Boolean(formState.errors.name)}
              helperText={formState.errors.name?.message}
            />
            <TextField
              label="Overview"
              fullWidth
              multiline
              minRows={3}
              {...register("description")}
              error={Boolean(formState.errors.description)}
              helperText={formState.errors.description?.message}
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
            <TextField
              label="Conference agenda or link"
              fullWidth
              multiline
              minRows={2}
              {...register("fullAgenda")}
              error={Boolean(formState.errors.fullAgenda)}
              helperText={formState.errors.fullAgenda?.message}
            />
            <TextField
              label="Public website"
              fullWidth
              {...register("websiteLink")}
              error={Boolean(formState.errors.websiteLink)}
              helperText={formState.errors.websiteLink?.message}
            />
            <Controller
              control={control}
              name="requiredBudget"
              render={({ field }) => (
                <TextField
                  label="Required budget (EGP)"
                  type="number"
                  fullWidth
                  inputProps={{ min: 0, step: 1000 }}
                  value={Number.isFinite(field.value) ? field.value : 0}
                  onChange={(event) => {
                    const { value } = event.target;
                    field.onChange(value === "" ? 0 : Number(value));
                  }}
                  error={Boolean(formState.errors.requiredBudget)}
                  helperText={formState.errors.requiredBudget?.message}
                />
              )}
            />
            <TextField
              select
              label="Funding source"
              fullWidth
              {...register("fundingSource")}
              error={Boolean(formState.errors.fundingSource)}
              helperText={formState.errors.fundingSource?.message}
            >
              {Object.values(FundingSource).map((source) => (
                <MenuItem key={source} value={source}>
                  {source}
                </MenuItem>
              ))}
            </TextField>
            <TextField
              label="Extra resources (optional)"
              fullWidth
              multiline
              minRows={2}
              {...register("extraRequiredResources")}
              error={Boolean(formState.errors.extraRequiredResources)}
              helperText={formState.errors.extraRequiredResources?.message}
            />
          </Stack>
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2 }}>
          <Button onClick={closeDialog} color="inherit">
            Cancel
          </Button>
          <Button
            type="submit"
            form="conference-form"
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

function defaultConferenceValues(): ConferenceFormValues {
  const now = dayjs();
  return {
    name: "",
    description: "",
    startDate: now.add(30, "day").hour(9).minute(0).toDate(),
    endDate: now.add(31, "day").hour(18).minute(0).toDate(),
    fullAgenda: "",
    websiteLink: "",
    requiredBudget: 50000,
    fundingSource: FundingSource.GUC,
    extraRequiredResources: "",
  };
}

function mapFormToPayload(values: ConferenceFormValues): ConferencePayload {
  const extraResources = values.extraRequiredResources?.trim();

  return {
    name: values.name.trim(),
    description: values.description.trim(),
    startDate: values.startDate.toISOString(),
    endDate: values.endDate.toISOString(),
    fullAgenda: values.fullAgenda.trim(),
    websiteLink: values.websiteLink.trim(),
    requiredBudget: values.requiredBudget,
    fundingSource: values.fundingSource,
    extraRequiredResources: extraResources ? extraResources : undefined,
  };
}

function Detail({
  label,
  value,
  icon,
}: {
  label: string;
  value: string;
  icon?: ReactNode;
}) {
  return (
    <Stack spacing={0.25}>
      <Stack direction="row" spacing={0.75} alignItems="center">
        <Typography variant="subtitle2" fontWeight={600}>
          {label}
        </Typography>
        {icon ?? null}
      </Stack>
      <Typography
        variant="body2"
        color="text.secondary"
        sx={{ wordBreak: "break-word" }}
      >
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

function formatCurrency(value: number) {
  const formatter = new Intl.NumberFormat(undefined, {
    style: "currency",
    currency: "EGP",
    minimumFractionDigits: value % 1 === 0 ? 0 : 2,
  });
  return formatter.format(value);
}

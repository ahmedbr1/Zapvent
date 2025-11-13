"use client";

import { useMemo, useState } from "react";
import { Controller, useForm } from "react-hook-form";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import dayjs from "dayjs";
import Grid from "@mui/material/Grid";
import Stack from "@mui/material/Stack";
import Typography from "@mui/material/Typography";
import Card from "@mui/material/Card";
import CardContent from "@mui/material/CardContent";
import CardActions from "@mui/material/CardActions";
import Button from "@mui/material/Button";
import TextField from "@mui/material/TextField";
import MenuItem from "@mui/material/MenuItem";
import Chip from "@mui/material/Chip";
import Autocomplete from "@mui/material/Autocomplete";
import Alert from "@mui/material/Alert";
import Skeleton from "@mui/material/Skeleton";
import Fab from "@mui/material/Fab";
import AddIcon from "@mui/icons-material/AddRounded";
import EditIcon from "@mui/icons-material/EditRounded";
import Dialog from "@mui/material/Dialog";
import DialogTitle from "@mui/material/DialogTitle";
import DialogContent from "@mui/material/DialogContent";
import DialogActions from "@mui/material/DialogActions";
import { DateTimePicker } from "@mui/x-date-pickers/DateTimePicker";
import { useSnackbar } from "notistack";
import { useAuthToken } from "@/hooks/useAuthToken";
import { useSessionUser } from "@/hooks/useSessionUser";
import {
  createWorkshop,
  fetchMyWorkshops,
  updateWorkshop,
  deleteWorkshop,
  type WorkshopPayload,
} from "@/lib/services/workshops";
import {
  AuthRole,
  Faculty,
  FundingSource,
  Location,
  UserRole,
  type ProfessorSummary,
} from "@/lib/types";
import { formatDateTime } from "@/lib/date";
import { fetchProfessors } from "@/lib/services/users";
import type { Resolver } from "react-hook-form";
import {
  EventFiltersBar,
  type EventFilters,
} from "@/components/events/EventFiltersBar";
import { filterAndSortEvents } from "@/lib/events/filters";

const WORKSHOP_QUERY_SETTINGS = {
  staleTime: 5 * 60 * 1000,
  gcTime: 15 * 60 * 1000,
  refetchOnWindowFocus: false,
} as const;

const workshopSchema = z
  .object({
    name: z.string().min(3, "Name must be at least 3 characters"),
    description: z
      .string()
      .min(20, "Provide a short description (20+ characters)"),
    location: z.nativeEnum(Location, { message: "Select a location" }),
    startDate: z.date({ message: "Start date is required" }),
    endDate: z.date({ message: "End date is required" }),
    registrationDeadline: z.date({
      message: "Registration deadline is required",
    }),
    fullAgenda: z.string().min(20, "Share the full agenda (20+ characters)"),
    faculty: z.nativeEnum(Faculty, {
      message: "Choose the responsible faculty",
    }),
    participatingProfessorIds: z
      .array(z.string().min(1, "Professor selection is required"))
      .min(1, "Select at least one participating professor."),
    requiredBudget: z.coerce.number().min(0, "Budget must be a positive value"),
    fundingSource: z.nativeEnum(FundingSource, {
      message: "Select a funding source",
    }),
    extraRequiredResources: z.string().optional(),
    capacity: z.coerce
      .number()
      .int()
      .positive("Capacity must be greater than zero"),
  })
  .refine((values) => values.startDate < values.endDate, {
    message: "Start date must be before end date.",
    path: ["startDate"],
  })
  .refine((values) => values.registrationDeadline < values.startDate, {
    message: "Deadline must be before the workshop start.",
    path: ["registrationDeadline"],
  });

type WorkshopFormValues = z.infer<typeof workshopSchema>;

export type WorkshopManagerVariant = "professor" | "events-office";

export interface WorkshopManagerProps {
  variant: WorkshopManagerVariant;
}

export default function WorkshopManager({ variant }: WorkshopManagerProps) {
  const token = useAuthToken();
  const user = useSessionUser();
  const userId = user?.id ?? null;
  const isProfessor = user?.userRole === UserRole.Professor;
  const isEventsOffice = user?.role === AuthRole.EventOffice;
  const isAdmin = user?.role === AuthRole.Admin;
  const isEventsOfficeVariant = variant === "events-office";
  const canManage = isEventsOfficeVariant
    ? Boolean(isEventsOffice || isAdmin)
    : Boolean(isProfessor);
  const managerName = user?.name ?? user?.email ?? "your account";
  const copy = isEventsOfficeVariant
    ? {
        title: "Workshop management",
        subtitle: "Coordinate faculty-led sessions across GUC campuses.",
        role: `Signed in as ${managerName}. Events Office admins can publish workshops on behalf of professors.`,
        restriction:
          "Workshop management tools are reserved for Events Office admins. Contact the platform team if you need access.",
        empty:
          "No workshops yet. Launch your first session to collaborate with faculty.",
        createCta: "New workshop",
      }
    : {
        title: "Workshop studio",
        subtitle:
          "Design, publish, and refine your GUC workshops from a single place.",
        role: `Signed in as ${managerName}. Professors can orchestrate workshops and sync details with student portals.`,
        restriction:
          "Workshop management tools are only available to professors. Contact the events office if you need access.",
        empty:
          "You haven't published any workshops yet. Start by outlining the first session.",
        createCta: "New workshop",
      };
  const rosterErrorMessage = isEventsOfficeVariant
    ? "Unable to load the professor roster right now. Assign a faculty contact once the list is available."
    : "Unable to load the professor roster right now. You won't be able to assign instructors until the list is available.";
  const { enqueueSnackbar } = useSnackbar();
  const queryClient = useQueryClient();
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
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);

  const canCreate = isEventsOfficeVariant
    ? Boolean(isAdmin)
    : Boolean(isProfessor);
  const queryKey = ["workshops", variant, token];

  const { data, isLoading, isError, error, refetch } = useQuery({
    queryKey,
    queryFn: () => fetchMyWorkshops(token ?? undefined),
    enabled: Boolean(token && canManage),
    ...WORKSHOP_QUERY_SETTINGS,
  });

  const professorsQuery = useQuery({
    queryKey: ["professors", token],
    queryFn: () => fetchProfessors(token ?? undefined),
    enabled: Boolean(token && canManage),
    ...WORKSHOP_QUERY_SETTINGS,
  });

  const {
    control,
    handleSubmit,
    reset,
    register,
    formState: { errors },
  } = useForm<WorkshopFormValues>({
    resolver: zodResolver(workshopSchema) as Resolver<WorkshopFormValues>,
    defaultValues: defaultWorkshopValues(),
  });

  const createMutation = useMutation({
    mutationFn: (payload: WorkshopPayload) =>
      createWorkshop(payload, token ?? undefined),
    onSuccess: () => {
      if (variant === "professor") {
        enqueueSnackbar("Workshop created successfully.", {
          variant: "success",
        });
        queryClient.invalidateQueries({ queryKey });
        closeDialog();
      }
    },
    onError: (mutationError: unknown) => {
      enqueueSnackbar(resolveErrorMessage(mutationError), { variant: "error" });
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, payload }: { id: string; payload: WorkshopPayload }) =>
      updateWorkshop(id, payload, token ?? undefined),
    onSuccess: () => {
      enqueueSnackbar("Workshop updated successfully.", { variant: "success" });
      queryClient.invalidateQueries({ queryKey });
      closeDialog();
    },
    onError: (mutationError: unknown) => {
      enqueueSnackbar(resolveErrorMessage(mutationError), { variant: "error" });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (workshopId: string) =>
      deleteWorkshop(workshopId, token ?? undefined),
    onSuccess: () => {
      enqueueSnackbar("Workshop deleted.", { variant: "success" });
      queryClient.invalidateQueries({ queryKey });
    },
    onError: (mutationError: unknown) => {
      enqueueSnackbar(resolveErrorMessage(mutationError), { variant: "error" });
    },
  });

  const workshops = useMemo(() => data ?? [], [data]);
  const professorOptions = useMemo<ProfessorSummary[]>(
    () => professorsQuery.data ?? [],
    [professorsQuery.data]
  );
  const professorNames = useMemo(
    () =>
      professorOptions
        .map((professor) => professor.name)
        .filter((name): name is string => Boolean(name)),
    [professorOptions]
  );
  const filteredWorkshops = useMemo(
    () =>
      filterAndSortEvents(workshops, filters, {
        getLocation: (workshop) => workshop.location,
        getStartDate: (workshop) => workshop.startDate,
        getProfessorNames: (workshop) => workshop.participatingProfessors,
        getSearchValues: (workshop) => [
          workshop.name,
          workshop.description,
          ...(workshop.participatingProfessors ?? []),
        ],
      }),
    [workshops, filters]
  );
  const submitting = createMutation.isPending || updateMutation.isPending;
  const actionLabel = editingId ? "Save changes" : "Create workshop";

  const handleCreateClick = () => {
    setEditingId(null);
    reset(defaultWorkshopValues());
    setDialogOpen(true);
  };

  const handleEditClick = (workshopId: string) => {
    const workshop = workshops.find((item) => item.id === workshopId);
    if (!workshop) return;

    setEditingId(workshopId);
    reset({
      name: workshop.name,
      description: workshop.description,
      location: workshop.location,
      startDate: dayjs(workshop.startDate).toDate(),
      endDate: dayjs(workshop.endDate).toDate(),
      registrationDeadline: dayjs(workshop.registrationDeadline).toDate(),
      fullAgenda: workshop.fullAgenda,
      faculty: (Object.values(Faculty).includes(workshop.faculty as Faculty)
        ? (workshop.faculty as Faculty)
        : Faculty.MET) as Faculty,
      participatingProfessorIds: workshop.participatingProfessorIds,
      requiredBudget: workshop.requiredBudget,
      fundingSource: workshop.fundingSource,
      extraRequiredResources: workshop.extraRequiredResources ?? "",
      capacity: workshop.capacity,
    });
    setDialogOpen(true);
  };

  const onSubmit = handleSubmit((values) => {
    const payload: WorkshopPayload = {
      name: values.name,
      description: values.description,
      location: values.location,
      startDate: values.startDate.toISOString(),
      endDate: values.endDate.toISOString(),
      registrationDeadline: values.registrationDeadline.toISOString(),
      fullAgenda: values.fullAgenda,
      faculty: values.faculty,
      participatingProfessorIds: values.participatingProfessorIds,
      requiredBudget: values.requiredBudget,
      fundingSource: values.fundingSource,
      extraRequiredResources:
        values.extraRequiredResources?.trim() || undefined,
      capacity: values.capacity,
    };

    if (editingId) {
      updateMutation.mutate({ id: editingId, payload });
    } else {
      if (!canCreate) {
        enqueueSnackbar(
          "Workshop creation is limited to professor or admin accounts.",
          {
            variant: "info",
          }
        );
        return;
      }
      createMutation.mutate(payload);
    }
  });

  const closeDialog = () => {
    setDialogOpen(false);
    setEditingId(null);
    reset(defaultWorkshopValues());
  };

  const handleDeleteClick = (workshopId: string, workshopName: string) => {
    const confirmed =
      typeof window !== "undefined"
        ? window.confirm(
            `Delete "${workshopName}"? This action cannot be undone.`
          )
        : false;
    if (!confirmed) return;
    deleteMutation.mutate(workshopId);
  };

  return (
    <Stack spacing={4}>
      <Stack spacing={1}>
        <Typography variant="h4" fontWeight={700}>
          {copy.title}
        </Typography>
        <Typography variant="body1" color="text.secondary">
          {copy.subtitle}
        </Typography>
        <Typography variant="body2" color="text.secondary">
          {copy.role}
        </Typography>
      </Stack>

      {canManage ? (
        <EventFiltersBar
          value={filters}
          onChange={setFilters}
          showEventTypeFilter={false}
          searchPlaceholder="Search workshops"
          professors={professorNames}
          showProfessorFilter={professorNames.length > 0}
        />
      ) : null}

      {canManage && professorsQuery.isError ? (
        <Alert
          severity="error"
          action={
            <Button onClick={() => professorsQuery.refetch()}>Retry</Button>
          }
        >
          {rosterErrorMessage}
        </Alert>
      ) : null}

      {!canManage ? (
        <Alert severity="info">{copy.restriction}</Alert>
      ) : isLoading ? (
        <Grid container spacing={3}>
          {Array.from({ length: 3 }).map((_, index) => (
            <Grid key={index} size={{ xs: 12, md: 6, lg: 4 }}>
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
      ) : workshops.length === 0 ? (
        <Alert
          severity="info"
          action={
            canCreate ? (
              <Button variant="outlined" onClick={handleCreateClick}>
                {copy.createCta}
              </Button>
            ) : undefined
          }
        >
          {copy.empty}
        </Alert>
      ) : filteredWorkshops.length === 0 ? (
        <Alert severity="info">No workshops match the current filters.</Alert>
      ) : (
        <Grid container spacing={3}>
          {filteredWorkshops.map((workshop) => {
            const createdByYou = Boolean(
              workshop.createdBy && userId && workshop.createdBy === userId
            );
            const creatorChipLabel = createdByYou
              ? "Created by you"
              : workshop.createdByName
                ? `Created by ${workshop.createdByName}`
                : "Created by faculty";
            const canEditWorkshopCard = isProfessor || isEventsOfficeVariant;
            const canDeleteWorkshopCard = isProfessor || isEventsOfficeVariant;

            return (
              <Grid key={workshop.id} size={{ xs: 12, md: 6, lg: 4 }}>
                <Card
                  sx={{
                    borderRadius: 3,
                    height: "100%",
                    display: "flex",
                    flexDirection: "column",
                    boxShadow: "0 20px 40px rgba(15,23,42,0.08)",
                  }}
                >
                  <CardContent sx={{ flexGrow: 1 }}>
                    <Stack spacing={1.5}>
                      <Stack
                        direction="row"
                        spacing={1}
                        flexWrap="wrap"
                        rowGap={1}
                        sx={{ "& .MuiChip-root": { fontSize: "0.75rem" } }}
                      >
                        <Chip
                          label={workshop.location}
                          size="small"
                          color="primary"
                        />
                        <Chip
                          label={workshop.fundingSource}
                          size="small"
                          variant="outlined"
                          color="primary"
                        />
                        <Chip
                          label={`Capacity ${workshop.capacity}`}
                          size="small"
                          variant="outlined"
                          sx={{ borderColor: "rgba(148,163,184,0.4)" }}
                        />
                        {isEventsOfficeVariant ? (
                          <Chip
                            label={creatorChipLabel}
                            size="small"
                            variant="outlined"
                            color={createdByYou ? "success" : "default"}
                            sx={{
                              borderStyle: createdByYou ? "solid" : "dashed",
                            }}
                          />
                        ) : null}
                      </Stack>
                      <Typography variant="h6" fontWeight={700}>
                        {workshop.name}
                      </Typography>
                      <Typography variant="body2" color="text.secondary">
                        {workshop.description}
                      </Typography>
                      <Stack spacing={0.5}>
                        <Typography variant="subtitle2" color="text.secondary">
                          Faculty
                        </Typography>
                        <Typography variant="body2">
                          {workshop.faculty}
                        </Typography>
                      </Stack>
                      <Stack spacing={0.5}>
                        <Typography variant="subtitle2" color="text.secondary">
                          Participating professors
                        </Typography>
                        <Stack
                          direction="row"
                          spacing={0.5}
                          flexWrap="wrap"
                          rowGap={0.5}
                        >
                          {workshop.participatingProfessors.map((professor) => (
                            <Chip
                              key={professor}
                              label={professor}
                              size="small"
                              variant="outlined"
                            />
                          ))}
                        </Stack>
                      </Stack>
                      <Stack spacing={0.5}>
                        <Typography variant="subtitle2" color="text.secondary">
                          Schedule
                        </Typography>
                        <Typography variant="body2">
                          {formatDateTime(workshop.startDate)} &mdash;{" "}
                          {formatDateTime(workshop.endDate)}
                        </Typography>
                        <Typography variant="caption" color="text.secondary">
                          Registration closes{" "}
                          {formatDateTime(workshop.registrationDeadline)}
                        </Typography>
                      </Stack>
                      <Stack spacing={0.5}>
                        <Typography variant="subtitle2" color="text.secondary">
                          Budget &amp; requirements
                        </Typography>
                        <Typography variant="body2">
                          Required budget: EGP{" "}
                          {workshop.requiredBudget.toLocaleString()}
                        </Typography>
                        {workshop.extraRequiredResources ? (
                          <Typography variant="body2" color="text.secondary">
                            Extras: {workshop.extraRequiredResources}
                          </Typography>
                        ) : null}
                      </Stack>
                    </Stack>
                  </CardContent>
                  <CardActions
                    sx={{ justifyContent: "flex-end", px: 3, pb: 3 }}
                  >
                    <Stack direction="row" spacing={1}>
                      <Button
                        startIcon={<EditIcon />}
                        onClick={() => handleEditClick(workshop.id)}
                        disabled={!canEditWorkshopCard}
                        title={
                          !canEditWorkshopCard
                            ? "Editing is restricted to authorized roles."
                            : undefined
                        }
                      >
                        Edit
                      </Button>
                      <Button
                        color="error"
                        variant="outlined"
                        onClick={() =>
                          handleDeleteClick(workshop.id, workshop.name)
                        }
                        disabled={
                          !canDeleteWorkshopCard || deleteMutation.isPending
                        }
                        title={
                          !canDeleteWorkshopCard
                            ? "Deleting is restricted to authorized roles."
                            : undefined
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
      )}

      {canCreate && canManage ? (
        <Fab
          color="primary"
          aria-label="Create workshop"
          onClick={handleCreateClick}
          sx={{ position: "fixed", bottom: 32, right: 32 }}
          disabled={professorsQuery.isLoading || professorOptions.length === 0}
        >
          <AddIcon />
        </Fab>
      ) : null}

      <Dialog open={dialogOpen} onClose={closeDialog} fullWidth maxWidth="md">
        <form onSubmit={onSubmit}>
          <DialogTitle>
            {editingId ? "Edit workshop" : "New workshop"}
          </DialogTitle>
          <DialogContent dividers>
            <Stack spacing={3} mt={1}>
              <Grid container spacing={2}>
                <Grid size={{ xs: 12, md: 6 }}>
                  <TextField
                    label="Workshop name"
                    fullWidth
                    {...register("name")}
                    error={Boolean(errors.name)}
                    helperText={
                      errors.name?.message ??
                      "Give your workshop a memorable title."
                    }
                  />
                </Grid>
                <Grid size={{ xs: 12, md: 6 }}>
                  <TextField
                    select
                    label="Location"
                    fullWidth
                    defaultValue={Location.Cairo}
                    {...register("location")}
                    error={Boolean(errors.location)}
                    helperText={
                      errors.location?.message ??
                      "Choose the campus hosting the workshop."
                    }
                  >
                    {Object.values(Location).map((location) => (
                      <MenuItem key={location} value={location}>
                        {location}
                      </MenuItem>
                    ))}
                  </TextField>
                </Grid>
                <Grid size={{ xs: 12, md: 6 }}>
                  <Controller
                    name="startDate"
                    control={control}
                    render={({ field }) => (
                      <DateTimePicker
                        label="Start date and time"
                        value={field.value ? dayjs(field.value) : null}
                        onChange={(value) =>
                          field.onChange(value ? value.toDate() : null)
                        }
                        slotProps={{
                          textField: {
                            fullWidth: true,
                            error: Boolean(errors.startDate),
                            helperText:
                              errors.startDate?.message ??
                              "When participants should arrive.",
                          },
                        }}
                      />
                    )}
                  />
                </Grid>
                <Grid size={{ xs: 12, md: 6 }}>
                  <Controller
                    name="endDate"
                    control={control}
                    render={({ field }) => (
                      <DateTimePicker
                        label="End date and time"
                        value={field.value ? dayjs(field.value) : null}
                        onChange={(value) =>
                          field.onChange(value ? value.toDate() : null)
                        }
                        slotProps={{
                          textField: {
                            fullWidth: true,
                            error: Boolean(errors.endDate),
                            helperText:
                              errors.endDate?.message ??
                              "Wrap-up time for the workshop.",
                          },
                        }}
                      />
                    )}
                  />
                </Grid>
                <Grid size={{ xs: 12, md: 6 }}>
                  <Controller
                    name="registrationDeadline"
                    control={control}
                    render={({ field }) => (
                      <DateTimePicker
                        label="Registration deadline"
                        value={field.value ? dayjs(field.value) : null}
                        onChange={(value) =>
                          field.onChange(value ? value.toDate() : null)
                        }
                        slotProps={{
                          textField: {
                            fullWidth: true,
                            error: Boolean(errors.registrationDeadline),
                            helperText:
                              errors.registrationDeadline?.message ??
                              "Last day students can register online.",
                          },
                        }}
                      />
                    )}
                  />
                </Grid>
                <Grid size={{ xs: 12, md: 6 }}>
                  <TextField
                    select
                    label="Responsible faculty"
                    fullWidth
                    defaultValue={Faculty.MET}
                    {...register("faculty")}
                    error={Boolean(errors.faculty)}
                    helperText={
                      errors.faculty?.message ??
                      "Faculty overseeing the workshop."
                    }
                  >
                    {Object.values(Faculty).map((faculty) => (
                      <MenuItem key={faculty} value={faculty}>
                        {faculty}
                      </MenuItem>
                    ))}
                  </TextField>
                </Grid>
                <Grid size={{ xs: 12 }}>
                  <Controller
                    name="participatingProfessorIds"
                    control={control}
                    render={({ field }) => {
                      const selected = professorOptions.filter((option) =>
                        (field.value ?? []).includes(option.id)
                      );
                      return (
                        <Autocomplete
                          multiple
                          options={professorOptions}
                          getOptionLabel={(option) => option.name}
                          value={selected}
                          onChange={(_event, value) =>
                            field.onChange(value.map((option) => option.id))
                          }
                          disableCloseOnSelect
                          loading={professorsQuery.isLoading}
                          isOptionEqualToValue={(option, value) =>
                            option.id === value.id
                          }
                          noOptionsText={
                            professorsQuery.isLoading
                              ? "Loading professors..."
                              : "No professors available."
                          }
                          disabled={
                            professorsQuery.isLoading ||
                            professorOptions.length === 0
                          }
                          renderTags={(value, getTagProps) =>
                            value.map((option, index) => (
                              <Chip
                                {...getTagProps({ index })}
                                key={option.id}
                                label={option.name}
                                size="small"
                              />
                            ))
                          }
                          renderInput={(params) => (
                            <TextField
                              {...params}
                              label="Participating professor(s)"
                              error={Boolean(errors.participatingProfessorIds)}
                              helperText={
                                errors.participatingProfessorIds?.message ??
                                (professorOptions.length === 0
                                  ? "No professors available. Contact the events office."
                                  : "Select one or more professors leading the workshop.")
                              }
                            />
                          )}
                        />
                      );
                    }}
                  />
                </Grid>
                <Grid size={{ xs: 12 }}>
                  <TextField
                    label="Short description"
                    fullWidth
                    multiline
                    minRows={2}
                    {...register("description")}
                    error={Boolean(errors.description)}
                    helperText={
                      errors.description?.message ??
                      "Share what participants will learn."
                    }
                  />
                </Grid>
                <Grid size={{ xs: 12 }}>
                  <TextField
                    label="Full agenda"
                    fullWidth
                    multiline
                    minRows={4}
                    {...register("fullAgenda")}
                    error={Boolean(errors.fullAgenda)}
                    helperText={
                      errors.fullAgenda?.message ??
                      "Outline the session timetable, speakers, and activities."
                    }
                  />
                </Grid>
                <Grid size={{ xs: 12, md: 4 }}>
                  <TextField
                    type="number"
                    label="Capacity"
                    fullWidth
                    inputProps={{ min: 1 }}
                    {...register("capacity", { valueAsNumber: true })}
                    error={Boolean(errors.capacity)}
                    helperText={
                      errors.capacity?.message ??
                      "Maximum number of participants."
                    }
                  />
                </Grid>
                <Grid size={{ xs: 12, md: 4 }}>
                  <TextField
                    type="number"
                    label="Required budget (EGP)"
                    fullWidth
                    inputProps={{ min: 0, step: 100 }}
                    {...register("requiredBudget", { valueAsNumber: true })}
                    error={Boolean(errors.requiredBudget)}
                    helperText={
                      errors.requiredBudget?.message ??
                      "Estimate total cost needed to run the workshop."
                    }
                  />
                </Grid>
                <Grid size={{ xs: 12, md: 4 }}>
                  <TextField
                    select
                    label="Funding source"
                    fullWidth
                    defaultValue={FundingSource.GUC}
                    {...register("fundingSource")}
                    error={Boolean(errors.fundingSource)}
                    helperText={
                      errors.fundingSource?.message ??
                      "Who provides the funding?"
                    }
                  >
                    {Object.values(FundingSource).map((source) => (
                      <MenuItem key={source} value={source}>
                        {source}
                      </MenuItem>
                    ))}
                  </TextField>
                </Grid>
                <Grid size={{ xs: 12 }}>
                  <TextField
                    label="Extra required resources (optional)"
                    fullWidth
                    multiline
                    minRows={2}
                    {...register("extraRequiredResources")}
                    helperText="List any special equipment or spaces needed."
                  />
                </Grid>
              </Grid>
            </Stack>
          </DialogContent>
          <DialogActions>
            <Button onClick={closeDialog} disabled={submitting}>
              Cancel
            </Button>
            <Button type="submit" variant="contained" disabled={submitting}>
              {actionLabel}
            </Button>
          </DialogActions>
        </form>
      </Dialog>
    </Stack>
  );
}

function defaultWorkshopValues(): WorkshopFormValues {
  const start = dayjs().add(7, "day").startOf("hour");
  return {
    name: "",
    description: "",
    location: Location.Cairo,
    startDate: start.toDate(),
    endDate: start.add(2, "hour").toDate(),
    registrationDeadline: start.subtract(2, "day").toDate(),
    fullAgenda: "",
    faculty: Faculty.MET,
    participatingProfessorIds: [],
    requiredBudget: 0,
    fundingSource: FundingSource.GUC,
    extraRequiredResources: "",
    capacity: 20,
  };
}

function resolveErrorMessage(error: unknown): string {
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
  return "Something went wrong. Please try again.";
}

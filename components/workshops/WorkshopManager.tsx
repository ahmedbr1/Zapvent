"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
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
import Table from "@mui/material/Table";
import TableBody from "@mui/material/TableBody";
import TableCell from "@mui/material/TableCell";
import TableHead from "@mui/material/TableHead";
import TableRow from "@mui/material/TableRow";
import Divider from "@mui/material/Divider";
import Tooltip from "@mui/material/Tooltip";
import PeopleIcon from "@mui/icons-material/PeopleAltRounded";
import WorkspacePremiumIcon from "@mui/icons-material/WorkspacePremiumRounded";
import CircularProgress from "@mui/material/CircularProgress";
import LoadingButton from "@mui/lab/LoadingButton";
import CheckCircleIcon from "@mui/icons-material/CheckCircleRounded";
import BlockIcon from "@mui/icons-material/BlockRounded";
import RateReviewIcon from "@mui/icons-material/RateReviewRounded";
import ArchiveIcon from "@mui/icons-material/ArchiveRounded";
import ArrowBackIcon from "@mui/icons-material/ArrowBackRounded";
import { DateTimePicker } from "@mui/x-date-pickers/DateTimePicker";
import { useSnackbar } from "notistack";
import { useAuthToken } from "@/hooks/useAuthToken";
import { useSessionUser } from "@/hooks/useSessionUser";
import {
  createWorkshop,
  fetchMyWorkshops,
  updateWorkshop,
  deleteWorkshop,
  fetchWorkshopParticipants,
  sendWorkshopCertificates,
  approveWorkshopRequest,
  rejectWorkshopRequest,
  requestWorkshopEdits,
  type WorkshopPayload,
} from "@/lib/services/workshops";
import { archiveEventById } from "@/lib/services/events";
import {
  AuthRole,
  Faculty,
  FundingSource,
  Location,
  UserRole,
  type ProfessorSummary,
  type Workshop,
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
    price: z.coerce.number().min(0, "Price must be a non-negative value"),
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
  viewMode?: "grid" | "detail";
  focusWorkshopId?: string;
}

export default function WorkshopManager({
  variant,
  viewMode = "grid",
  focusWorkshopId,
}: WorkshopManagerProps) {
  const token = useAuthToken();
  const user = useSessionUser();
  const userId = user?.id ?? null;
  const isProfessor = user?.userRole === UserRole.Professor;
  const isEventsOffice = user?.role === AuthRole.EventOffice;
  const isAdmin = user?.role === AuthRole.Admin;
  const isEventsOfficeVariant = variant === "events-office";
  const isDetailView = viewMode === "detail";
  const detailBasePath = isEventsOfficeVariant
    ? "/events-office/workshops"
    : "/user/workshops";
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
  const [participantsDialog, setParticipantsDialog] = useState<{
    workshopId: string;
    workshopName: string;
  } | null>(null);
  const [moderationDialog, setModerationDialog] = useState<{
    type: "reject" | "request-edits";
    workshopId: string;
    workshopName: string;
  } | null>(null);
  const [moderationMessage, setModerationMessage] = useState("");
  const [deleteDialog, setDeleteDialog] = useState<{
    workshopId: string;
    workshopName: string;
  } | null>(null);
  const [recentlyApproved, setRecentlyApproved] = useState<Set<string>>(
    new Set()
  );
  const [recentlyRejected, setRecentlyRejected] = useState<Set<string>>(
    new Set()
  );

  const canCreate = isEventsOfficeVariant
    ? Boolean(isAdmin)
    : Boolean(isProfessor);
  const canModerateWorkshops =
    isEventsOfficeVariant && (isEventsOffice || isAdmin);
  const canEditWorkshops = isProfessor || isEventsOfficeVariant;
  const canDeleteWorkshops = isProfessor || isEventsOfficeVariant;
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
      setDeleteDialog(null);
    },
    onError: (mutationError: unknown) => {
      enqueueSnackbar(resolveErrorMessage(mutationError), { variant: "error" });
    },
  });

  const certificateMutation = useMutation({
    mutationFn: (workshopId: string) =>
      sendWorkshopCertificates(workshopId, token ?? undefined),
    onSuccess: (result) => {
      enqueueSnackbar(result.message ?? "Certificates sent successfully.", {
        variant: "success",
      });
    },
    onError: (mutationError: unknown) => {
      enqueueSnackbar(resolveErrorMessage(mutationError), { variant: "error" });
    },
  });

  const participantsQuery = useQuery({
    queryKey: ["workshop-participants", participantsDialog?.workshopId, token],
    queryFn: () =>
      fetchWorkshopParticipants(participantsDialog!.workshopId, token ?? undefined),
    enabled: Boolean(participantsDialog?.workshopId && token),
  });

  const approveMutation = useMutation({
    mutationFn: (workshopId: string) =>
      approveWorkshopRequest(workshopId, token ?? undefined),
    onSuccess: (response, workshopId) => {
      enqueueSnackbar(
        response.message ?? "Workshop approved and published.",
        {
          variant: "success",
        }
      );
      setRecentlyApproved((prev) => new Set(prev).add(workshopId));
      queryClient.invalidateQueries({ queryKey });
    },
    onError: (mutationError: unknown) => {
      enqueueSnackbar(resolveErrorMessage(mutationError), { variant: "error" });
    },
  });

  const rejectMutation = useMutation({
    mutationFn: ({ id, reason }: { id: string; reason?: string }) =>
      rejectWorkshopRequest(
        id,
        reason ? { reason } : undefined,
        token ?? undefined
      ),
    onSuccess: (response, variables) => {
      enqueueSnackbar(response.message ?? "Workshop rejected.", {
        variant: "success",
      });
      setRecentlyRejected((prev) => new Set(prev).add(variables.id));
      queryClient.invalidateQueries({ queryKey });
      closeModerationDialog();
    },
    onError: (mutationError: unknown) => {
      enqueueSnackbar(resolveErrorMessage(mutationError), { variant: "error" });
    },
  });

  const requestEditsMutation = useMutation({
    mutationFn: ({ id, message }: { id: string; message: string }) =>
      requestWorkshopEdits(id, { message }, token ?? undefined),
    onSuccess: (response) => {
      enqueueSnackbar(response.message ?? "Edit request sent.", {
        variant: "success",
      });
      queryClient.invalidateQueries({ queryKey });
      closeModerationDialog();
    },
    onError: (mutationError: unknown) => {
      enqueueSnackbar(resolveErrorMessage(mutationError), { variant: "error" });
    },
  });

  const archiveMutation = useMutation({
    mutationFn: (workshopId: string) =>
      archiveEventById(workshopId, token ?? undefined),
    onSuccess: (response) => {
      enqueueSnackbar(response.message ?? "Workshop archived.", {
        variant: "info",
      });
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
  const focusedWorkshop = useMemo(() => {
    if (!focusWorkshopId) {
      return null;
    }
    return workshops.find((workshop) => workshop.id === focusWorkshopId) ?? null;
  }, [focusWorkshopId, workshops]);
  const submitting = createMutation.isPending || updateMutation.isPending;

  // Clear tracking sets once data is updated
  useEffect(() => {
    if (data && recentlyApproved.size > 0) {
      const updated = data.filter(
        (w) => recentlyApproved.has(w.id) && w.workshopStatus === "Approved"
      );
      if (updated.length > 0) {
        setRecentlyApproved(new Set());
      }
    }
  }, [data, recentlyApproved]);

  useEffect(() => {
    if (data && recentlyRejected.size > 0) {
      const updated = data.filter(
        (w) => recentlyRejected.has(w.id) && w.workshopStatus === "Rejected"
      );
      if (updated.length > 0) {
        setRecentlyRejected(new Set());
      }
    }
  }, [data, recentlyRejected]);
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
      price: workshop.price ?? 0,
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
      price: values.price,
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

  const closeModerationDialog = () => {
    setModerationDialog(null);
    setModerationMessage("");
  };

  const handleOpenRejectDialog = (workshop: Workshop) => {
    setModerationDialog({
      type: "reject",
      workshopId: workshop.id,
      workshopName: workshop.name,
    });
    setModerationMessage("");
  };

  const handleOpenRequestEditsDialog = (workshop: Workshop) => {
    setModerationDialog({
      type: "request-edits",
      workshopId: workshop.id,
      workshopName: workshop.name,
    });
    setModerationMessage(workshop.requestedEdits ?? "");
  };

  const handleModerationSubmit = () => {
    if (!moderationDialog) return;
    if (moderationDialog.type === "reject") {
      rejectMutation.mutate({
        id: moderationDialog.workshopId,
        reason: moderationMessage.trim() || undefined,
      });
      return;
    }
    const trimmed = moderationMessage.trim();
    if (!trimmed) {
      enqueueSnackbar("Please describe the edits you need.", {
        variant: "info",
      });
      return;
    }
    requestEditsMutation.mutate({
      id: moderationDialog.workshopId,
      message: trimmed,
    });
  };

  const handleArchiveWorkshop = (workshop: Workshop) => {
    const confirmed =
      typeof window !== "undefined"
        ? window.confirm(
            `Archive "${workshop.name}"? Attendees will no longer see it in listings.`
          )
        : false;
    if (!confirmed) return;
    archiveMutation.mutate(workshop.id);
  };

  const handleDeleteClick = (workshopId: string, workshopName: string) => {
    setDeleteDialog({ workshopId, workshopName });
  };

  const closeDeleteDialog = () => {
    if (deleteMutation.isPending) return;
    setDeleteDialog(null);
  };

  const confirmDelete = () => {
    if (!deleteDialog) return;
    deleteMutation.mutate(deleteDialog.workshopId);
  };

  const handleViewParticipants = (workshop: Workshop) => {
    setParticipantsDialog({
      workshopId: workshop.id,
      workshopName: workshop.name,
    });
  };

  const handleParticipantsDialogClose = () => {
    setParticipantsDialog(null);
  };

  const handleSendCertificates = (workshop: Workshop) => {
    certificateMutation.mutate(workshop.id);
  };

  const renderDetailSection = () => {
    if (isLoading) {
      return (
        <Card sx={{ borderRadius: 3 }}>
          <CardContent>
            <Stack spacing={2}>
              <Skeleton variant="text" height={36} width="60%" />
              <Skeleton variant="rectangular" height={180} sx={{ borderRadius: 2 }} />
              <Skeleton variant="rectangular" height={220} sx={{ borderRadius: 2 }} />
            </Stack>
          </CardContent>
        </Card>
      );
    }

    if (isError) {
      return (
        <Alert
          severity="error"
          action={<Button onClick={() => refetch()}>Retry</Button>}
        >
          {resolveErrorMessage(error)}
        </Alert>
      );
    }

    if (workshops.length === 0) {
      return (
        <Alert severity="info">
          No workshops available yet. Return to the main list to create or approve a submission.
        </Alert>
      );
    }

    if (!focusWorkshopId) {
      return (
        <Alert severity="info">
          Select a workshop from the list to view its complete details.
        </Alert>
      );
    }

    if (!focusedWorkshop) {
      return (
        <Alert
          severity="warning"
          action={
            <Button component={Link} href={detailBasePath} variant="outlined">
              Back to workshops
            </Button>
          }
        >
          We couldn&apos;t find the requested workshop. It may have been deleted or archived.
        </Alert>
      );
    }

    const createdByYou = Boolean(
      focusedWorkshop.createdBy && userId && focusedWorkshop.createdBy === userId
    );
    const creatorChipLabel = createdByYou
      ? "Created by you"
      : focusedWorkshop.createdByName
        ? `Created by ${focusedWorkshop.createdByName}`
        : "Created by faculty";
    const statusLabel = focusedWorkshop.workshopStatus ?? "Pending";
    const statusColor =
      statusLabel === "Approved"
        ? "success"
        : statusLabel === "Rejected"
          ? "error"
          : "warning";
    const eventHasEnded = dayjs(focusedWorkshop.endDate).isBefore(dayjs());
    const canSendCertificates = createdByYou && eventHasEnded;
    const canViewParticipants = createdByYou || isEventsOfficeVariant;
    const approvingThis =
      approveMutation.isPending &&
      approveMutation.variables === focusedWorkshop.id;
    const rejectingThis =
      rejectMutation.isPending &&
      rejectMutation.variables?.id === focusedWorkshop.id;
    const requestingEditsThis =
      requestEditsMutation.isPending &&
      requestEditsMutation.variables?.id === focusedWorkshop.id;
    const archivingThis =
      archiveMutation.isPending &&
      archiveMutation.variables === focusedWorkshop.id;
    const sendingCertificatesThis =
      certificateMutation.isPending &&
      certificateMutation.variables === focusedWorkshop.id;
    const showModerationButtons =
      canModerateWorkshops && statusLabel === "Pending";
    const showRequestEditsButton =
      canModerateWorkshops &&
      (statusLabel === "Pending" || statusLabel === "Approved");
    const showArchiveButton =
      canModerateWorkshops && statusLabel === "Approved" && eventHasEnded;
    const detailBackLabel = isEventsOfficeVariant
      ? "Back to workshops"
      : "Back to my workshops";
    const detailActionTitle = isEventsOfficeVariant
      ? "Action center"
      : "Workshop tools";
    const detailActionSubtitle = isEventsOfficeVariant
      ? "Moderate submissions and manage lifecycle tasks."
      : "Review the latest status and handle workshop operations.";
    const statusAlertSeverity =
      statusLabel === "Approved"
        ? "success"
        : statusLabel === "Rejected"
          ? "error"
          : "warning";

    return (
      <Stack spacing={3}>
        <Button
          component={Link}
          href={detailBasePath}
          startIcon={<ArrowBackIcon />}
          sx={{ alignSelf: { xs: "stretch", sm: "flex-start" } }}
        >
          {detailBackLabel}
        </Button>

        <Grid container spacing={3}>
          <Grid size={{ xs: 12, md: 8 }}>
            <Card sx={{ borderRadius: 3, height: "100%" }}>
              <CardContent>
                <Stack spacing={3}>
                  <Stack spacing={1}>
                    <Typography
                      variant="overline"
                      color="text.secondary"
                      textTransform="uppercase"
                    >
                      Workshop overview
                    </Typography>
                    <Typography variant="h4" fontWeight={700}>
                      {focusedWorkshop.name}
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      Submitted by {focusedWorkshop.createdByName ?? "faculty"} ·{" "}
                      {formatDateTime(focusedWorkshop.startDate)}
                    </Typography>
                  </Stack>
                  <Stack
                    direction="row"
                    spacing={1}
                    flexWrap="wrap"
                    rowGap={1}
                    sx={{ "& .MuiChip-root": { fontSize: "0.75rem" } }}
                  >
                    <Chip label={focusedWorkshop.location} color="primary" size="small" />
                    <Chip
                      label={focusedWorkshop.fundingSource}
                      variant="outlined"
                      color="primary"
                      size="small"
                    />
                    <Chip
                      label={`Capacity ${focusedWorkshop.capacity}`}
                      variant="outlined"
                      size="small"
                      sx={{ borderColor: "rgba(148,163,184,0.4)" }}
                    />
                    <Chip
                      label={creatorChipLabel}
                      variant="outlined"
                      size="small"
                      color={createdByYou ? "success" : "default"}
                      sx={{ borderStyle: createdByYou ? "solid" : "dashed" }}
                    />
                    <Chip
                      label={`${statusLabel} status`}
                      size="small"
                      color={statusColor as "default" | "success" | "warning" | "error"}
                    />
                  </Stack>
                  {focusedWorkshop.requestedEdits ? (
                    <Alert severity="warning" variant="outlined">
                      Requested edits: {focusedWorkshop.requestedEdits}
                    </Alert>
                  ) : null}
                  <Divider />
                  <Stack spacing={1}>
                    <Typography variant="subtitle2" color="text.secondary">
                      Schedule & deadlines
                    </Typography>
                    <Typography variant="body1">
                      {formatDateTime(focusedWorkshop.startDate)} &mdash;{" "}
                      {formatDateTime(focusedWorkshop.endDate)}
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      Registration closes {formatDateTime(focusedWorkshop.registrationDeadline)}
                    </Typography>
                  </Stack>
                  <Divider />
                  <Stack spacing={1}>
                    <Typography variant="subtitle2" color="text.secondary">
                      Faculty & speakers
                    </Typography>
                    <Typography variant="body2">
                      Faculty: {focusedWorkshop.faculty}
                    </Typography>
                    {focusedWorkshop.participatingProfessors.length > 0 ? (
                      <Stack
                        direction="row"
                        spacing={0.5}
                        flexWrap="wrap"
                        rowGap={0.5}
                      >
                        {focusedWorkshop.participatingProfessors.map((professor) => (
                          <Chip key={professor} label={professor} size="small" variant="outlined" />
                        ))}
                      </Stack>
                    ) : (
                      <Typography variant="body2" color="text.secondary">
                        Participating professors will be confirmed soon.
                      </Typography>
                    )}
                  </Stack>
                  <Divider />
                  <Stack spacing={1}>
                    <Typography variant="subtitle2" color="text.secondary">
                      Description
                    </Typography>
                    <Typography variant="body2">
                      {focusedWorkshop.description || "No description provided."}
                    </Typography>
                  </Stack>
                  <Divider />
                  <Stack spacing={1}>
                    <Typography variant="subtitle2" color="text.secondary">
                      Agenda
                    </Typography>
                    <Typography variant="body2">
                      {focusedWorkshop.fullAgenda || "Agenda details will be shared later."}
                    </Typography>
                  </Stack>
                  <Divider />
                  <Stack spacing={1}>
                    <Typography variant="subtitle2" color="text.secondary">
                      Budget & resources
                    </Typography>
                    <Typography variant="body2">
                      Required budget: EGP{" "}
                      {focusedWorkshop.requiredBudget.toLocaleString()}
                    </Typography>
                    <Typography variant="body2">
                      Ticket price: EGP {focusedWorkshop.price?.toLocaleString() ?? "0"}
                    </Typography>
                    {focusedWorkshop.extraRequiredResources ? (
                      <Typography variant="body2" color="text.secondary">
                        Extras: {focusedWorkshop.extraRequiredResources}
                      </Typography>
                    ) : null}
                  </Stack>
                </Stack>
              </CardContent>
            </Card>
          </Grid>
          <Grid size={{ xs: 12, md: 4 }}>
            <Card
              sx={{
                borderRadius: 3,
                height: "100%",
                display: "flex",
                flexDirection: "column",
              }}
            >
              <CardContent sx={{ flexGrow: 1 }}>
                <Stack spacing={2}>
                  <Stack spacing={0.5}>
                    <Typography variant="h6">{detailActionTitle}</Typography>
                    <Typography variant="body2" color="text.secondary">
                      {detailActionSubtitle}
                    </Typography>
                  </Stack>
                  <Divider />
                  {isEventsOfficeVariant ? (
                    <>
                      {showModerationButtons ? (
                        <Stack spacing={1}>
                          <LoadingButton
                            variant="contained"
                            color="success"
                            startIcon={<CheckCircleIcon />}
                            onClick={() => approveMutation.mutate(focusedWorkshop.id)}
                            loading={approvingThis}
                            disabled={
                              approvingThis ||
                              rejectingThis ||
                              recentlyApproved.has(focusedWorkshop.id) ||
                              recentlyRejected.has(focusedWorkshop.id)
                            }
                          >
                            Accept
                          </LoadingButton>
                          <LoadingButton
                            variant="outlined"
                            color="error"
                            startIcon={<BlockIcon />}
                            onClick={() => handleOpenRejectDialog(focusedWorkshop)}
                            loading={rejectingThis}
                            disabled={
                              rejectingThis ||
                              approvingThis ||
                              recentlyRejected.has(focusedWorkshop.id) ||
                              recentlyApproved.has(focusedWorkshop.id)
                            }
                          >
                            Reject
                          </LoadingButton>
                        </Stack>
                      ) : (
                        <Alert
                          severity={
                            statusLabel === "Approved"
                              ? "success"
                              : statusLabel === "Rejected"
                                ? "error"
                                : "info"
                          }
                        >
                          Status: {statusLabel}
                        </Alert>
                      )}
                      {showRequestEditsButton ? (
                        <LoadingButton
                          variant="outlined"
                          color="secondary"
                          startIcon={<RateReviewIcon />}
                          onClick={() => handleOpenRequestEditsDialog(focusedWorkshop)}
                          loading={requestingEditsThis}
                          disabled={requestingEditsThis}
                        >
                          Request edits
                        </LoadingButton>
                      ) : null}
                      {showArchiveButton ? (
                        <LoadingButton
                          variant="text"
                          color="inherit"
                          startIcon={<ArchiveIcon />}
                          onClick={() => handleArchiveWorkshop(focusedWorkshop)}
                          loading={archivingThis}
                          disabled={archivingThis}
                        >
                          Archive workshop
                        </LoadingButton>
                      ) : null}
                      <Divider />
                      <Stack spacing={1}>
                        <Typography variant="subtitle2" color="text.secondary">
                          Workshop tools
                        </Typography>
                        {canViewParticipants ? (
                          <Button
                            startIcon={<PeopleIcon />}
                            onClick={() => handleViewParticipants(focusedWorkshop)}
                          >
                            View participants
                          </Button>
                        ) : null}
                        {createdByYou ? (
                          <Tooltip
                            title={
                              canSendCertificates
                                ? "Send certificates to attendees."
                                : "Certificates can be sent after the workshop ends."
                            }
                          >
                            <span>
                              <LoadingButton
                                startIcon={<WorkspacePremiumIcon />}
                                loading={sendingCertificatesThis}
                                disabled={!canSendCertificates || sendingCertificatesThis}
                                onClick={() => handleSendCertificates(focusedWorkshop)}
                              >
                                Send certificates
                              </LoadingButton>
                            </span>
                          </Tooltip>
                        ) : null}
                        {canEditWorkshops ? (
                          <Button
                            startIcon={<EditIcon />}
                            onClick={() => handleEditClick(focusedWorkshop.id)}
                          >
                            Edit workshop
                          </Button>
                        ) : null}
                        {canDeleteWorkshops ? (
                          <Button
                            color="error"
                            variant="outlined"
                            onClick={() =>
                              handleDeleteClick(focusedWorkshop.id, focusedWorkshop.name)
                            }
                            disabled={deleteMutation.isPending}
                          >
                            Delete workshop
                          </Button>
                        ) : null}
                      </Stack>
                    </>
                  ) : (
                    <Stack spacing={1}>
                      <Alert severity={statusAlertSeverity}>Status: {statusLabel}</Alert>
                      {focusedWorkshop.requestedEdits ? (
                        <Alert severity="warning" variant="outlined">
                          Requested edits: {focusedWorkshop.requestedEdits}
                        </Alert>
                      ) : null}
                      {canViewParticipants ? (
                        <Button
                          startIcon={<PeopleIcon />}
                          onClick={() => handleViewParticipants(focusedWorkshop)}
                        >
                          View participants
                        </Button>
                      ) : null}
                      {createdByYou ? (
                        <Tooltip
                          title={
                            canSendCertificates
                              ? "Send certificates to attendees."
                              : "Certificates can be sent after the workshop ends."
                          }
                        >
                          <span>
                            <LoadingButton
                              startIcon={<WorkspacePremiumIcon />}
                              loading={sendingCertificatesThis}
                              disabled={!canSendCertificates || sendingCertificatesThis}
                              onClick={() => handleSendCertificates(focusedWorkshop)}
                            >
                              Send certificates
                            </LoadingButton>
                          </span>
                        </Tooltip>
                      ) : null}
                      {canEditWorkshops ? (
                        <Button
                          startIcon={<EditIcon />}
                          onClick={() => handleEditClick(focusedWorkshop.id)}
                        >
                          Edit workshop
                        </Button>
                      ) : null}
                      {canDeleteWorkshops ? (
                        <Button
                          color="error"
                          variant="outlined"
                          onClick={() =>
                            handleDeleteClick(focusedWorkshop.id, focusedWorkshop.name)
                          }
                          disabled={deleteMutation.isPending}
                        >
                          Delete workshop
                        </Button>
                      ) : null}
                    </Stack>
                  )}
                </Stack>
              </CardContent>
            </Card>
          </Grid>
        </Grid>
      </Stack>
    );
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

      {canManage && !isDetailView ? (
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
      ) : isDetailView ? (
        renderDetailSection()
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
            const canDeleteWorkshopCard = canDeleteWorkshops;
            const showFullCardDetails = false;
            const statusLabel = workshop.workshopStatus ?? "Pending";
            const statusColor =
              statusLabel === "Approved"
                ? "success"
                : statusLabel === "Rejected"
                  ? "error"
                  : "warning";

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
                        <Chip
                          label={`${statusLabel} status`}
                          size="small"
                          color={statusColor as "default" | "success" | "warning" | "error"}
                        />
                      </Stack>
                      <Typography variant="h6" fontWeight={700}>
                        {workshop.name}
                      </Typography>
                      {showFullCardDetails ? (
                        <Typography variant="body2" color="text.secondary">
                          {workshop.description}
                        </Typography>
                      ) : null}
                      {workshop.requestedEdits ? (
                        <Alert severity="warning" variant="outlined">
                          Requested edits: {workshop.requestedEdits}
                        </Alert>
                      ) : null}
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
                      {showFullCardDetails ? (
                        <Stack spacing={0.5}>
                          <Typography variant="subtitle2" color="text.secondary">
                            Budget &amp; requirements
                          </Typography>
                          <Typography variant="body2">
                            Required budget: EGP{" "}
                            {workshop.requiredBudget.toLocaleString()}
                          </Typography>
                          <Typography variant="body2">
                            Ticket price: EGP {workshop.price?.toLocaleString() ?? "0"}
                          </Typography>
                          {workshop.extraRequiredResources ? (
                            <Typography variant="body2" color="text.secondary">
                              Extras: {workshop.extraRequiredResources}
                            </Typography>
                          ) : null}
                        </Stack>
                      ) : null}
                    </Stack>
                  </CardContent>
                  <CardActions sx={{ px: 3, pb: 3 }}>
                    <Stack spacing={1} width="100%">
                      <Stack
                        direction={{ xs: "column", sm: "row" }}
                        spacing={1}
                        width="100%"
                      >
                        <Button
                          color="error"
                          variant="outlined"
                          fullWidth
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
                        <Button
                          component={Link}
                          href={`${detailBasePath}/${workshop.id}`}
                          variant="contained"
                          fullWidth
                        >
                          Details
                        </Button>
                      </Stack>
                    </Stack>
                  </CardActions>
                </Card>
              </Grid>
            );
          })}
        </Grid>
      )}

      {canCreate && canManage && !isDetailView ? (
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
                    type="number"
                    label="Ticket price (EGP)"
                    fullWidth
                    inputProps={{ min: 0, step: 10 }}
                    {...register("price", { valueAsNumber: true })}
                    error={Boolean(errors.price)}
                    helperText={
                      errors.price?.message ??
                      "Set to 0 if attendance is free."
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

      <Dialog
        open={Boolean(participantsDialog)}
        onClose={handleParticipantsDialogClose}
        fullWidth
        maxWidth="sm"
      >
        <DialogTitle>
          Participants{" "}
          {participantsDialog ? `— ${participantsDialog.workshopName}` : ""}
        </DialogTitle>
        <DialogContent dividers>
          {participantsQuery.isLoading ? (
            <Stack alignItems="center" py={3}>
              <CircularProgress />
            </Stack>
          ) : participantsQuery.isError ? (
            <Alert severity="error">
              Unable to load participant details right now.
            </Alert>
          ) : participantsQuery.data ? (
            <Stack spacing={2}>
              <Stack
                direction={{ xs: "column", sm: "row" }}
                spacing={1}
                justifyContent="space-between"
              >
                <Typography variant="body2" color="text.secondary">
                  Capacity: {participantsQuery.data.capacity}
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  Registered: {participantsQuery.data.registeredCount} · Remaining:{" "}
                  {participantsQuery.data.remainingSpots}
                </Typography>
              </Stack>
              <Divider />
              {participantsQuery.data.participants.length === 0 ? (
                <Alert severity="info">
                  No participants have registered for this workshop yet.
                </Alert>
              ) : (
                <Table size="small">
                  <TableHead>
                    <TableRow>
                      <TableCell>Name</TableCell>
                      <TableCell>Email</TableCell>
                      <TableCell>Role</TableCell>
                      <TableCell>ID</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {participantsQuery.data.participants.map((participant) => {
                      const fullName = `${participant.firstName ?? ""} ${participant.lastName ?? ""}`.trim() ||
                        "Participant";
                      const gucId = participant.studentId ?? participant.staffId ?? "—";
                      return (
                        <TableRow key={participant.id}>
                          <TableCell>{fullName}</TableCell>
                          <TableCell>{participant.email}</TableCell>
                          <TableCell>{participant.role ?? "—"}</TableCell>
                          <TableCell>{gucId}</TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              )}
            </Stack>
          ) : null}
        </DialogContent>
        <DialogActions>
          <Button onClick={handleParticipantsDialogClose}>Close</Button>
        </DialogActions>
      </Dialog>

      <Dialog
        open={Boolean(moderationDialog)}
        onClose={closeModerationDialog}
        fullWidth
        maxWidth="sm"
      >
        <DialogTitle>
          {moderationDialog?.type === "reject"
            ? `Reject "${moderationDialog?.workshopName ?? ""}"`
            : `Request edits — ${moderationDialog?.workshopName ?? ""}`}
        </DialogTitle>
        <DialogContent dividers>
          <Stack spacing={2} mt={1}>
            <Alert severity="info">
              {moderationDialog?.type === "reject"
                ? "Let the professor know why this workshop is not moving forward."
                : "Share concrete details that will help the professor update their submission."}
            </Alert>
            <TextField
              label={
                moderationDialog?.type === "reject"
                  ? "Reason (optional)"
                  : "What needs to change?"
              }
              multiline
              minRows={4}
              value={moderationMessage}
              onChange={(event) => setModerationMessage(event.target.value)}
              placeholder={
                moderationDialog?.type === "reject"
                  ? "Example: Conflicts with another workshop on the same day."
                  : "Example: Please attach the updated agenda and confirm resource needs."
              }
              helperText={
                moderationDialog?.type === "reject"
                  ? "This note is shared with the requesting professor."
                  : "Your note appears in the professor dashboard instantly."
              }
            />
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button
            onClick={closeModerationDialog}
            disabled={rejectMutation.isPending || requestEditsMutation.isPending}
          >
            Cancel
          </Button>
          <LoadingButton
            variant="contained"
            onClick={handleModerationSubmit}
            loading={
              moderationDialog?.type === "reject"
                ? rejectMutation.isPending
                : requestEditsMutation.isPending
            }
          >
            {moderationDialog?.type === "reject"
              ? "Reject workshop"
              : "Send request"}
          </LoadingButton>
        </DialogActions>
      </Dialog>

      <Dialog
        open={Boolean(deleteDialog)}
        onClose={closeDeleteDialog}
        fullWidth
        maxWidth="xs"
      >
        <DialogTitle>Delete workshop</DialogTitle>
        <DialogContent dividers>
          <Stack spacing={2}>
            <Alert severity="warning">
              This will permanently remove{" "}
              <strong>{deleteDialog?.workshopName}</strong> from all portals.
              Registered attendees will lose access to this workshop.
            </Alert>
            <Typography variant="body2" color="text.secondary">
              This action cannot be undone.
            </Typography>
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={closeDeleteDialog} disabled={deleteMutation.isPending}>
            Cancel
          </Button>
          <LoadingButton
            color="error"
            variant="contained"
            onClick={confirmDelete}
            loading={deleteMutation.isPending}
          >
            Delete workshop
          </LoadingButton>
        </DialogActions>
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
    price: 0,
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

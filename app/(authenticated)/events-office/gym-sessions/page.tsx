"use client";

import { useMemo, useState } from "react";
import { Controller, useForm } from "react-hook-form";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import dayjs from "dayjs";
import Box from "@mui/material/Box";
import Stack from "@mui/material/Stack";
import Grid from "@mui/material/Grid";
import Typography from "@mui/material/Typography";
import Button from "@mui/material/Button";
import IconButton from "@mui/material/IconButton";
import Select from "@mui/material/Select";
import MenuItem from "@mui/material/MenuItem";
import TextField from "@mui/material/TextField";
import Chip from "@mui/material/Chip";
import Card from "@mui/material/Card";
import CardContent from "@mui/material/CardContent";
import Alert from "@mui/material/Alert";
import Skeleton from "@mui/material/Skeleton";
import Fab from "@mui/material/Fab";
import Dialog from "@mui/material/Dialog";
import DialogTitle from "@mui/material/DialogTitle";
import DialogContent from "@mui/material/DialogContent";
import DialogActions from "@mui/material/DialogActions";
import ArrowBackIcon from "@mui/icons-material/ArrowBackIosNewRounded";
import ArrowForwardIcon from "@mui/icons-material/ArrowForwardIosRounded";
import FitnessCenterIcon from "@mui/icons-material/FitnessCenterRounded";
import AccessTimeIcon from "@mui/icons-material/AccessTimeRounded";
import PeopleIcon from "@mui/icons-material/PeopleAltRounded";
import EventIcon from "@mui/icons-material/EventRounded";
import AddIcon from "@mui/icons-material/AddRounded";
import EditIcon from "@mui/icons-material/EditRounded";
import DeleteIcon from "@mui/icons-material/DeleteRounded";
import { DatePicker } from "@mui/x-date-pickers/DatePicker";
import { TimePicker } from "@mui/x-date-pickers/TimePicker";
import { useSnackbar } from "notistack";
import { useAuthToken } from "@/hooks/useAuthToken";
import { useSessionUser } from "@/hooks/useSessionUser";
import {
  fetchGymSchedule,
  createGymSession,
  updateGymSession,
  deleteGymSession,
} from "@/lib/services/gym";
import { type GymSession, GymSessionType, AuthRole } from "@/lib/types";
import type { Resolver } from "react-hook-form";

const MONTHS = [
  "January",
  "February",
  "March",
  "April",
  "May",
  "June",
  "July",
  "August",
  "September",
  "October",
  "November",
  "December",
];
const TODAY = dayjs();

const SESSION_COLOR_MAP: Record<GymSessionType, "primary" | "secondary" | "success" | "info" | "warning"> = {
  [GymSessionType.Yoga]: "primary",
  [GymSessionType.Cardio]: "secondary",
  [GymSessionType.Strength]: "success",
  [GymSessionType.Pilates]: "info",
  [GymSessionType.CrossFit]: "warning",
};

const gymSessionSchema = z.object({
  date: z.date({ message: "Date is required" }),
  time: z.string().min(1, "Time is required"),
  duration: z.coerce.number().int().positive("Duration must be greater than zero"),
  type: z.nativeEnum(GymSessionType, { message: "Select a session type" }),
  maxParticipants: z.coerce.number().int().positive("Max participants must be greater than zero"),
});

type GymSessionFormValues = z.infer<typeof gymSessionSchema>;

function formatSessionDate(date: string) {
  return dayjs(date).format("MMM D, dddd");
}

function formatSessionTime(date: string, time: string) {
  const combined = dayjs(`${dayjs(date).format("YYYY-MM-DD")}T${time}`);
  return combined.isValid() ? combined.format("h:mm A") : time;
}

export default function EventsOfficeGymSessionsPage() {
  const token = useAuthToken();
  const user = useSessionUser();
  const isEventsOffice = user?.role === AuthRole.EventsOffice;
  const isAdmin = user?.role === AuthRole.Admin;
  const canManage = Boolean(isEventsOffice || isAdmin);
  const { enqueueSnackbar } = useSnackbar();
  const queryClient = useQueryClient();

  const [selectedMonth, setSelectedMonth] = useState(TODAY.month());
  const [selectedYear, setSelectedYear] = useState(TODAY.year());
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingSession, setEditingSession] = useState<GymSession | null>(null);

  const {
    control,
    handleSubmit,
    reset,
    register,
    formState: { errors },
  } = useForm<GymSessionFormValues>({
    resolver: zodResolver(gymSessionSchema) as Resolver<GymSessionFormValues>,
    defaultValues: {
      date: undefined,
      time: "",
      duration: 60,
      type: GymSessionType.Yoga,
      maxParticipants: 20,
    },
  });

  const scheduleQuery = useQuery({
    queryKey: ["gym-schedule", selectedYear, selectedMonth, token],
    queryFn: () => fetchGymSchedule(selectedYear, selectedMonth + 1, token ?? undefined),
    enabled: Boolean(token && canManage),
  });

  const createMutation = useMutation({
    mutationFn: (payload: {
      date: string;
      time: string;
      duration: number;
      type: GymSessionType;
      maxParticipants: number;
    }) => createGymSession(payload, token ?? undefined),
    onSuccess: () => {
      enqueueSnackbar("Gym session created successfully!", { variant: "success" });
      queryClient.invalidateQueries({ queryKey: ["gym-schedule"] });
      handleCloseDialog();
    },
    onError: (error: Error) => {
      enqueueSnackbar(error.message || "Failed to create gym session", { variant: "error" });
    },
  });

  const updateMutation = useMutation({
    mutationFn: (payload: {
      id: string;
      data: Partial<{
        date: string;
        time: string;
        duration: number;
        type: GymSessionType;
        maxParticipants: number;
      }>;
    }) => updateGymSession(payload.id, payload.data, token ?? undefined),
    onSuccess: () => {
      enqueueSnackbar("Gym session updated successfully!", { variant: "success" });
      queryClient.invalidateQueries({ queryKey: ["gym-schedule"] });
      handleCloseDialog();
    },
    onError: (error: Error) => {
      enqueueSnackbar(error.message || "Failed to update gym session", { variant: "error" });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => deleteGymSession(id, token ?? undefined),
    onSuccess: () => {
      enqueueSnackbar("Gym session deleted successfully!", { variant: "success" });
      queryClient.invalidateQueries({ queryKey: ["gym-schedule"] });
    },
    onError: (error: Error) => {
      enqueueSnackbar(error.message || "Failed to delete gym session", { variant: "error" });
    },
  });

  const groupedSessions = useMemo(() => {
    const sessions = scheduleQuery.data ?? [];
    const map = new Map<string, GymSession[]>();

    sessions.forEach((session) => {
      const key = dayjs(session.date).format("YYYY-MM-DD");
      if (!map.has(key)) {
        map.set(key, []);
      }
      map.get(key)!.push(session);
    });

    return Array.from(map.entries())
      .sort((a, b) => (a[0] > b[0] ? 1 : -1))
      .map(([date, list]) => ({
        date,
        sessions: list.sort((a, b) => (a.time > b.time ? 1 : -1)),
      }));
  }, [scheduleQuery.data]);

  const sessionStats = useMemo(() => {
    const sessions = scheduleQuery.data ?? [];
    const totals = new Map<GymSessionType, number>();

    sessions.forEach((session) => {
      totals.set(session.type, (totals.get(session.type) ?? 0) + 1);
    });

    return {
      total: sessions.length,
      totals,
    };
  }, [scheduleQuery.data]);

  const handleMonthShift = (delta: number) => {
    const next = dayjs()
      .set("year", selectedYear)
      .set("month", selectedMonth)
      .add(delta, "month");
    setSelectedYear(next.year());
    setSelectedMonth(next.month());
  };

  const handleOpenDialog = (session?: GymSession) => {
    if (session) {
      setEditingSession(session);
      const sessionDate = dayjs(session.date);
      const sessionTime = dayjs(session.time, "HH:mm");
      reset({
        date: sessionDate.toDate(),
        time: sessionTime.format("HH:mm"),
        duration: session.duration,
        type: session.type,
        maxParticipants: session.maxParticipants,
      });
    } else {
      setEditingSession(null);
      reset({
        date: undefined,
        time: "",
        duration: 60,
        type: GymSessionType.Yoga,
        maxParticipants: 20,
      });
    }
    setDialogOpen(true);
  };

  const handleCloseDialog = () => {
    setDialogOpen(false);
    setEditingSession(null);
    reset();
  };

  const onSubmit = (data: GymSessionFormValues) => {
    const payload = {
      date: dayjs(data.date).format("YYYY-MM-DD"),
      time: data.time,
      duration: data.duration,
      type: data.type,
      maxParticipants: data.maxParticipants,
    };

    if (editingSession) {
      updateMutation.mutate({ id: editingSession.id, data: payload });
    } else {
      createMutation.mutate(payload);
    }
  };

  const handleDelete = (id: string) => {
    if (window.confirm("Are you sure you want to delete this gym session?")) {
      deleteMutation.mutate(id);
    }
  };

  if (!canManage) {
    return (
      <Alert severity="error">
        Gym session management is only available to Events Office admins. Contact the platform team if you need access.
      </Alert>
    );
  }

  return (
    <Stack spacing={4}>
      <Stack
        direction={{ xs: "column", md: "row" }}
        spacing={2}
        justifyContent="space-between"
        alignItems={{ xs: "flex-start", md: "center" }}
      >
        <Box>
          <Typography variant="h4" fontWeight={700}>
            Gym Session Management
          </Typography>
          <Typography variant="body1" color="text.secondary">
            Create and manage gym sessions for yoga, cardio, strength training, pilates, and CrossFit.
          </Typography>
        </Box>
        <Stack direction="row" spacing={1}>
          <IconButton aria-label="Previous month" onClick={() => handleMonthShift(-1)}>
            <ArrowBackIcon />
          </IconButton>
          <Select
            size="small"
            value={selectedMonth}
            onChange={(event) => setSelectedMonth(Number(event.target.value))}
          >
            {MONTHS.map((label, index) => (
              <MenuItem key={label} value={index}>
                {label}
              </MenuItem>
            ))}
          </Select>
          <TextField
            size="small"
            type="number"
            value={selectedYear}
            onChange={(event) => setSelectedYear(Number(event.target.value) || TODAY.year())}
            inputProps={{ min: 2000, max: 2100 }}
            sx={{ width: 96 }}
          />
          <IconButton aria-label="Next month" onClick={() => handleMonthShift(1)}>
            <ArrowForwardIcon />
          </IconButton>
        </Stack>
      </Stack>

      <Card sx={{ borderRadius: 3, boxShadow: "0 14px 40px rgba(15,23,42,0.08)" }}>
        <CardContent>
          <Stack
            direction={{ xs: "column", md: "row" }}
            spacing={2}
            alignItems="center"
            justifyContent="space-between"
          >
            <Stack direction="row" spacing={1} alignItems="center">
              <FitnessCenterIcon color="primary" />
              <Typography variant="subtitle1" fontWeight={700}>
                {sessionStats.total} session{sessionStats.total === 1 ? "" : "s"} scheduled
              </Typography>
            </Stack>
            <Stack direction="row" spacing={1} flexWrap="wrap">
              {Object.values(GymSessionType).map((type) => (
                <Chip
                  key={type}
                  label={`${type} (${sessionStats.totals.get(type) ?? 0})`}
                  color={SESSION_COLOR_MAP[type]}
                  variant="outlined"
                />
              ))}
            </Stack>
          </Stack>
        </CardContent>
      </Card>

      {scheduleQuery.isLoading ? (
        <Skeleton variant="rectangular" height={360} sx={{ borderRadius: 3 }} />
      ) : scheduleQuery.isError ? (
        <Alert severity="error" action={<Button onClick={() => scheduleQuery.refetch()}>Retry</Button>}>
          Unable to load gym sessions right now.
        </Alert>
      ) : groupedSessions.length === 0 ? (
        <Alert severity="info">
          No gym sessions scheduled for {MONTHS[selectedMonth]} {selectedYear}. Click the + button to create one.
        </Alert>
      ) : (
        <Grid container spacing={3}>
          {groupedSessions.map(({ date, sessions }) => (
            <Grid key={date} size={{ xs: 12, md: 6 }}>
              <Card
                sx={{
                  borderRadius: 3,
                  height: "100%",
                  display: "flex",
                  flexDirection: "column",
                  boxShadow: "0 12px 32px rgba(15,23,42,0.06)",
                }}
              >
                <CardContent sx={{ flexGrow: 1 }}>
                  <Stack direction="row" spacing={1} alignItems="center" mb={2}>
                    <EventIcon color="primary" />
                    <Typography variant="h6" fontWeight={700}>
                      {formatSessionDate(date)}
                    </Typography>
                  </Stack>
                  <Stack spacing={2}>
                    {sessions.map((session) => {
                      const registered = session.registeredCount ?? 0;
                      const capacity = session.maxParticipants;
                      return (
                        <Box
                          key={session.id}
                          sx={{
                            p: 2,
                            borderRadius: 2,
                            border: "1px solid rgba(15,23,42,0.08)",
                            backgroundColor: "rgba(15,23,42,0.02)",
                          }}
                        >
                          <Stack spacing={1}>
                            <Stack
                              direction={{ xs: "column", sm: "row" }}
                              justifyContent="space-between"
                              spacing={1}
                            >
                              <Stack spacing={0.5}>
                                <Chip
                                  label={session.type}
                                  color={SESSION_COLOR_MAP[session.type]}
                                  size="small"
                                  sx={{ width: "fit-content" }}
                                />
                                <Stack direction="row" spacing={1} alignItems="center">
                                  <AccessTimeIcon fontSize="small" color="action" />
                                  <Typography variant="body2" color="text.secondary">
                                    {formatSessionTime(session.date, session.time)} • {session.duration} minutes
                                  </Typography>
                                </Stack>
                              </Stack>
                              <Stack direction="row" spacing={1} alignItems="center">
                                <PeopleIcon fontSize="small" color="action" />
                                <Typography variant="body2" color="text.secondary">
                                  {registered}/{capacity} booked
                                </Typography>
                              </Stack>
                            </Stack>
                            <Stack direction="row" spacing={1} justifyContent="flex-end">
                              <IconButton
                                size="small"
                                color="primary"
                                onClick={() => handleOpenDialog(session)}
                                aria-label="Edit session"
                              >
                                <EditIcon fontSize="small" />
                              </IconButton>
                              <IconButton
                                size="small"
                                color="error"
                                onClick={() => handleDelete(session.id)}
                                aria-label="Delete session"
                              >
                                <DeleteIcon fontSize="small" />
                              </IconButton>
                            </Stack>
                          </Stack>
                        </Box>
                      );
                    })}
                  </Stack>
                </CardContent>
              </Card>
            </Grid>
          ))}
        </Grid>
      )}

      <Fab
        color="primary"
        aria-label="Create gym session"
        onClick={() => handleOpenDialog()}
        sx={{
          position: "fixed",
          bottom: 32,
          right: 32,
        }}
      >
        <AddIcon />
      </Fab>

      <Dialog open={dialogOpen} onClose={handleCloseDialog} maxWidth="sm" fullWidth>
        <DialogTitle>{editingSession ? "Edit Gym Session" : "Create New Gym Session"}</DialogTitle>
        <DialogContent>
          <Stack spacing={3} sx={{ mt: 2 }}>
            <Controller
              name="date"
              control={control}
              render={({ field }) => (
                <DatePicker
                  label="Date"
                  value={field.value ? dayjs(field.value) : null}
                  onChange={(date) => field.onChange(date?.toDate())}
                  slotProps={{
                    textField: {
                      error: Boolean(errors.date),
                      helperText: errors.date?.message,
                      fullWidth: true,
                    },
                  }}
                />
              )}
            />

            <Controller
              name="time"
              control={control}
              render={({ field }) => (
                <TimePicker
                  label="Time"
                  value={field.value ? dayjs(field.value, "HH:mm") : null}
                  onChange={(time) => field.onChange(time?.format("HH:mm"))}
                  slotProps={{
                    textField: {
                      error: Boolean(errors.time),
                      helperText: errors.time?.message,
                      fullWidth: true,
                    },
                  }}
                />
              )}
            />

            <TextField
              label="Duration (minutes)"
              type="number"
              {...register("duration")}
              error={Boolean(errors.duration)}
              helperText={errors.duration?.message}
              inputProps={{ min: 1 }}
              fullWidth
            />

            <Controller
              name="type"
              control={control}
              render={({ field }) => (
                <TextField
                  label="Session Type"
                  select
                  {...field}
                  error={Boolean(errors.type)}
                  helperText={errors.type?.message}
                  fullWidth
                >
                  {Object.values(GymSessionType).map((type) => (
                    <MenuItem key={type} value={type}>
                      {type}
                    </MenuItem>
                  ))}
                </TextField>
              )}
            />

            <TextField
              label="Max Participants"
              type="number"
              {...register("maxParticipants")}
              error={Boolean(errors.maxParticipants)}
              helperText={errors.maxParticipants?.message}
              inputProps={{ min: 1 }}
              fullWidth
            />
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseDialog}>Cancel</Button>
          <Button
            onClick={handleSubmit(onSubmit)}
            variant="contained"
            disabled={createMutation.isPending || updateMutation.isPending}
          >
            {editingSession ? "Update" : "Create"}
          </Button>
        </DialogActions>
      </Dialog>
    </Stack>
  );
}

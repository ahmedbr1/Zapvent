"use client";

import { useEffect, useMemo, useState } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import dayjs from "dayjs";
import localeData from "dayjs/plugin/localeData";
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
import LinearProgress from "@mui/material/LinearProgress";
import Divider from "@mui/material/Divider";
import Alert from "@mui/material/Alert";
import Skeleton from "@mui/material/Skeleton";
import Tooltip from "@mui/material/Tooltip";
import CircularProgress from "@mui/material/CircularProgress";
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
import FlagIcon from "@mui/icons-material/FlagRounded";
import StadiumIcon from "@mui/icons-material/StadiumRounded";
import { useAuthToken } from "@/hooks/useAuthToken";
import { useSessionUser } from "@/hooks/useSessionUser";
import { fetchGymSchedule, registerForGymSession } from "@/lib/services/gym";
import { type GymSession, GymSessionType, CourtType, UserRole } from "@/lib/types";
import { fetchCourts, fetchCourtAvailabilitySlots, reserveCourtSlot } from "@/lib/services/courts";
import { DatePicker } from "@mui/x-date-pickers/DatePicker";
import { useSnackbar } from "notistack";

dayjs.extend(localeData);

const MONTHS = dayjs.months();
const TODAY = dayjs();
const WEEKDAYS = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];

const SESSION_COLOR_MAP: Record<GymSessionType, "primary" | "secondary" | "success" | "info" | "warning" | "error"> = {
  [GymSessionType.Yoga]: "primary",
  [GymSessionType.Cardio]: "secondary",
  [GymSessionType.Strength]: "success",
  [GymSessionType.Pilates]: "info",
  [GymSessionType.CrossFit]: "warning",
};

const COURT_COLOR_MAP: Record<CourtType, "primary" | "secondary" | "success"> = {
  [CourtType.Basketball]: "primary",
  [CourtType.Tennis]: "success",
  [CourtType.Football]: "secondary",
};

const COURT_LABELS: Record<CourtType, string> = {
  [CourtType.Basketball]: "Basketball Court",
  [CourtType.Tennis]: "Tennis Court",
  [CourtType.Football]: "Football Pitch",
};

const COURT_FILTERS: Array<{ label: string; value: "all" | CourtType }> = [
  { label: "All courts", value: "all" },
  { label: COURT_LABELS[CourtType.Basketball], value: CourtType.Basketball },
  { label: COURT_LABELS[CourtType.Tennis], value: CourtType.Tennis },
  { label: COURT_LABELS[CourtType.Football], value: CourtType.Football },
];

function formatSessionDate(date: string) {
  return dayjs(date).format("MMM D, dddd");
}

function formatSessionTime(date: string, time: string) {
  const combined = dayjs(`${dayjs(date).format("YYYY-MM-DD")}T${time}`);
  return combined.isValid() ? combined.format("h:mm A") : time;
}

function formatCourtTime(time: string) {
  const parsed = dayjs(time, "HH:mm", true);
  return parsed.isValid() ? parsed.format("h:mm A") : time;
}

function formatExceptionRange(start: string, end: string) {
  const startDate = dayjs(start);
  const endDate = dayjs(end);
  if (!startDate.isValid() || !endDate.isValid()) {
    return `${start} – ${end}`;
  }
  const sameDay = startDate.isSame(endDate, "day");
  return sameDay
    ? startDate.format("MMM D, YYYY")
    : `${startDate.format("MMM D")} – ${endDate.format("MMM D, YYYY")}`;
}

export default function UserGymPage() {
  const token = useAuthToken();
  const user = useSessionUser();
  const isStudent = user?.userRole === UserRole.Student;
  const canRegisterForGym = Boolean(
    user?.userRole &&
      [UserRole.Student, UserRole.Staff, UserRole.Professor, UserRole.TA].includes(
        user.userRole
      )
  );
  const { enqueueSnackbar } = useSnackbar();
  const [selectedMonth, setSelectedMonth] = useState(TODAY.month());
  const [selectedYear, setSelectedYear] = useState(TODAY.year());
  const [courtTypeFilter, setCourtTypeFilter] = useState<"all" | CourtType>("all");
  const [pendingSessionId, setPendingSessionId] = useState<string | null>(null);
  const [reservationDialog, setReservationDialog] = useState<{
    courtId: string;
    courtLabel: string;
  } | null>(null);
  const [reservationDate, setReservationDate] = useState(dayjs());
  const [selectedSlot, setSelectedSlot] = useState<{ startTime: string; endTime: string } | null>(null);
  const reservationDateKey = reservationDate.format("YYYY-MM-DD");

  const scheduleQuery = useQuery({
    queryKey: ["gym-schedule", selectedYear, selectedMonth, token],
    queryFn: () => fetchGymSchedule(selectedYear, selectedMonth + 1, token ?? undefined),
    enabled: Boolean(token),
  });

  const courtsQuery = useQuery({
    queryKey: ["courts", token],
    queryFn: () => fetchCourts(token ?? undefined),
    enabled: Boolean(token && isStudent),
  });

  useEffect(() => {
    setSelectedSlot(null);
  }, [reservationDateKey, reservationDialog?.courtId]);

  const availabilityQuery = useQuery({
    queryKey: ["court-availability", reservationDialog?.courtId, reservationDateKey, token],
    queryFn: () =>
      fetchCourtAvailabilitySlots(
        reservationDialog!.courtId,
        reservationDateKey,
        token ?? undefined
      ),
    enabled: Boolean(reservationDialog && token),
  });
  const availabilitySlots = availabilityQuery.data ?? [];

  const registerMutation = useMutation({
    mutationFn: (sessionId: string) => registerForGymSession(sessionId, token ?? undefined),
    onMutate: (sessionId) => {
      setPendingSessionId(sessionId);
    },
    onSuccess: (result) => {
      enqueueSnackbar(result.message ?? "Successfully registered for the session.", {
        variant: "success",
      });
      scheduleQuery.refetch();
    },
    onError: (error: unknown) => {
      const message =
        error instanceof Error ? error.message : "Failed to register for this session.";
      enqueueSnackbar(message, { variant: "error" });
    },
    onSettled: () => setPendingSessionId(null),
  });

  const reservationMutation = useMutation({
    mutationFn: (payload: { courtId: string; date: string; startTime: string; endTime: string }) =>
      reserveCourtSlot(
        payload.courtId,
        { date: payload.date, startTime: payload.startTime, endTime: payload.endTime },
        token ?? undefined
      ),
    onSuccess: (message) => {
      enqueueSnackbar(message ?? "Court reserved successfully.", { variant: "success" });
      setReservationDialog(null);
      setSelectedSlot(null);
    },
    onError: (error: unknown) => {
      const message =
        error instanceof Error ? error.message : "Failed to reserve this court slot.";
      enqueueSnackbar(message, { variant: "error" });
    },
  });

  const sessionsWithFlags = useMemo(() => {
    const sessions = scheduleQuery.data ?? [];
    return sessions.map((session) => {
      const registeredUsers = session.registeredUsers ?? [];
      const registeredCount = session.registeredCount ?? registeredUsers.length;
      const isRegistered = user?.id ? registeredUsers.includes(user.id) : false;
      return {
        ...session,
        registeredUsers,
        registeredCount,
        isRegistered,
        remainingSpots: Math.max(session.maxParticipants - registeredCount, 0),
      };
    });
  }, [scheduleQuery.data, user?.id]);

  const groupedSessions = useMemo(() => {
    const sessions = sessionsWithFlags;
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
  }, [sessionsWithFlags]);

  const sessionStats = useMemo(() => {
    const sessions = sessionsWithFlags;
    const totals = new Map<GymSessionType, number>();

    sessions.forEach((session) => {
      totals.set(session.type, (totals.get(session.type) ?? 0) + 1);
    });

    return {
      total: sessions.length,
      totals,
    };
  }, [sessionsWithFlags]);

  const courts = useMemo(() => courtsQuery.data ?? [], [courtsQuery.data]);
  const courtCounts = useMemo(() => {
    const counts = new Map<CourtType, number>();
    courts.forEach((court) => {
      counts.set(court.type, (counts.get(court.type) ?? 0) + 1);
    });
    return counts;
  }, [courts]);

  const filteredCourts = useMemo(() => {
    if (courtTypeFilter === "all") return courts;
    return courts.filter((court) => court.type === courtTypeFilter);
  }, [courts, courtTypeFilter]);

  const handleMonthShift = (delta: number) => {
    const next = dayjs()
      .set("year", selectedYear)
      .set("month", selectedMonth)
      .add(delta, "month");
    setSelectedYear(next.year());
    setSelectedMonth(next.month());
  };

  const handleRegisterSession = (sessionId: string) => {
    if (!canRegisterForGym) {
      enqueueSnackbar("Only student, staff, professor, or TA accounts can register.", {
        variant: "info",
      });
      return;
    }

    registerMutation.mutate(sessionId);
  };

  const handleOpenReservationDialog = (courtId: string, label: string) => {
    setReservationDialog({ courtId, courtLabel: label });
    setReservationDate(dayjs());
    setSelectedSlot(null);
  };

  const handleCloseReservationDialog = () => {
    setReservationDialog(null);
    setSelectedSlot(null);
  };

  const handleSubmitReservation = () => {
    if (!reservationDialog || !selectedSlot) {
      enqueueSnackbar("Select an available slot to continue.", { variant: "info" });
      return;
    }

    reservationMutation.mutate({
      courtId: reservationDialog.courtId,
      date: reservationDateKey,
      startTime: selectedSlot.startTime,
      endTime: selectedSlot.endTime,
    });
  };

  const reservationLoading = availabilityQuery.isLoading || availabilityQuery.isFetching;

  return (
    <>
      <Stack spacing={4}>
      <Stack
        direction={{ xs: "column", md: "row" }}
        spacing={2}
        justifyContent="space-between"
        alignItems={{ xs: "flex-start", md: "center" }}
      >
        <Box>
          <Typography variant="h4" fontWeight={700}>
            Gym Sessions
          </Typography>
          <Typography variant="body1" color="text.secondary">
            View this month&apos;s schedule and plan ahead for yoga, pilates, cardio, and more.
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
          No gym sessions scheduled for {MONTHS[selectedMonth]} {selectedYear}. Check back later or choose another month.
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
                      const progress =
                        capacity > 0 ? Math.min((registered / capacity) * 100, 100) : undefined;
                      const isRegistered = session.isRegistered ?? false;
                      const remainingSpots = session.remainingSpots ?? Math.max(capacity - registered, 0);
                      const isProcessing = pendingSessionId === session.id && registerMutation.isPending;
                      const buttonLabel = isRegistered
                        ? "Registered"
                        : isProcessing
                          ? "Registering..."
                          : "Register";
                      const disableRegisterButton =
                        isRegistered ||
                        !canRegisterForGym ||
                        remainingSpots === 0 ||
                        isProcessing;
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
                          <Stack
                            direction={{ xs: "column", sm: "row" }}
                            justifyContent="space-between"
                            spacing={1}
                          >
                            <Stack spacing={0.5}>
                              <Typography variant="subtitle1" fontWeight={600}>
                                {session.type}
                              </Typography>
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
                          {progress !== undefined && (
                            <Tooltip title={`${registered} of ${capacity} spots taken`}>
                              <LinearProgress
                                variant="determinate"
                                value={progress}
                                sx={{ mt: 1.5, height: 6, borderRadius: 999 }}
                              />
                            </Tooltip>
                          )}
                          <Stack
                            direction={{ xs: "column", sm: "row" }}
                            spacing={1}
                            alignItems={{ sm: "center" }}
                            justifyContent="space-between"
                            mt={1.5}
                          >
                            <Typography variant="caption" color="text.secondary">
                              {remainingSpots} spot{remainingSpots === 1 ? "" : "s"} left
                            </Typography>
                            <Button
                              variant={isRegistered ? "outlined" : "contained"}
                              size="small"
                              disabled={disableRegisterButton}
                              onClick={() => handleRegisterSession(session.id)}
                            >
                              {buttonLabel}
                            </Button>
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

      {isStudent ? (
        <>
          <Divider sx={{ my: 1 }} />

          <Stack spacing={2}>
            <Stack
              direction={{ xs: "column", md: "row" }}
              spacing={2}
              justifyContent="space-between"
              alignItems={{ xs: "flex-start", md: "center" }}
            >
              <Box>
                <Typography variant="h4" fontWeight={700}>
                  Campus Courts
                </Typography>
                <Typography variant="body1" color="text.secondary">
                  View basketball, tennis, and football courts along with weekly availability and blackout dates.
                </Typography>
              </Box>
              <Stack direction="row" spacing={1} flexWrap="wrap">
                {COURT_FILTERS.map((option) => {
                  const selected = courtTypeFilter === option.value;
                  return (
                    <Chip
                      key={option.label}
                      label={
                        option.value === "all"
                          ? option.label
                          : `${option.label} (${courtCounts.get(option.value as CourtType) ?? 0})`
                      }
                      color={selected ? "primary" : "default"}
                      variant={selected ? "filled" : "outlined"}
                      onClick={() => setCourtTypeFilter(option.value)}
                      sx={{ textTransform: "capitalize" }}
                    />
                  );
                })}
              </Stack>
            </Stack>

            {courtsQuery.isLoading ? (
              <Skeleton variant="rectangular" height={320} sx={{ borderRadius: 3 }} />
            ) : courtsQuery.isError ? (
              <Alert severity="error" action={<Button onClick={() => courtsQuery.refetch()}>Retry</Button>}>
                Unable to load court availability right now.
              </Alert>
            ) : filteredCourts.length === 0 ? (
              <Alert severity="info">No courts match your current filter. Try selecting a different type.</Alert>
            ) : (
              <Grid container spacing={3}>
                {filteredCourts.map((court) => {
                  const courtType = court.type;
                  const openingHours = [...court.openingHours].sort((a, b) => a.weekday - b.weekday);
                  const exceptions = court.exceptions;

                  return (
                    <Grid key={court.id} size={{ xs: 12, md: 6 }}>
                      <Card
                        sx={{
                          borderRadius: 3,
                          height: "100%",
                          display: "flex",
                          flexDirection: "column",
                          boxShadow: "0 12px 32px rgba(15,23,42,0.05)",
                        }}
                      >
                        <CardContent sx={{ flexGrow: 1 }}>
                          <Stack
                            direction={{ xs: "column", sm: "row" }}
                            spacing={1.5}
                            justifyContent="space-between"
                            alignItems={{ sm: "center" }}
                            mb={2}
                          >
                            <Stack spacing={0.5}>
                              <Stack direction="row" spacing={1} alignItems="center">
                                <Chip
                                  label={COURT_LABELS[courtType] ?? court.type}
                                  color={COURT_COLOR_MAP[courtType] ?? "primary"}
                                />
                                <Tooltip title="Venue">
                                  <StadiumIcon fontSize="small" color="action" />
                                </Tooltip>
                                <Typography variant="body2" color="text.secondary">
                                  {court.venue}
                                </Typography>
                              </Stack>
                              {court.timezone && (
                                <Typography variant="caption" color="text.secondary">
                                  Local time zone: {court.timezone}
                                </Typography>
                              )}
                            </Stack>
                            <Chip
                              icon={<FlagIcon />}
                              label={`Court ID: ${court.id.slice(-6).toUpperCase()}`}
                              variant="outlined"
                              color="default"
                            />
                          </Stack>

                          <Divider sx={{ my: 2 }} />
                          <Typography variant="subtitle2" fontWeight={700} gutterBottom>
                            Weekly availability
                          </Typography>
                          {openingHours.length === 0 ? (
                            <Typography variant="body2" color="text.secondary">
                              No recurring availability set for this court.
                            </Typography>
                          ) : (
                            <Stack spacing={1}>
                              {openingHours.map((slot, index) => (
                                <Stack
                                  key={`${slot.weekday}-${index}`}
                                  direction="row"
                                  spacing={1.5}
                                  alignItems="center"
                                >
                                  <Chip label={WEEKDAYS[slot.weekday] ?? `Day ${slot.weekday}`} size="small" />
                                  <Typography variant="body2" color="text.secondary">
                                    {formatCourtTime(slot.startTime)} – {formatCourtTime(slot.endTime)}
                                  </Typography>
                                </Stack>
                              ))}
                            </Stack>
                          )}

                          {exceptions.length > 0 && (
                            <Alert severity="warning" variant="outlined" sx={{ mt: 3 }}>
                              <Typography variant="subtitle2" fontWeight={700}>
                                Upcoming exceptions
                              </Typography>
                              <Stack spacing={0.5} mt={1}>
                                {exceptions.map((exception, index) => (
                                  <Typography key={index} variant="body2">
                                    {formatExceptionRange(exception.startDate, exception.endDate)}
                                    {exception.reason ? ` — ${exception.reason}` : ""}
                                  </Typography>
                                ))}
                              </Stack>
                            </Alert>
                          )}
                          <Button
                            variant="contained"
                            sx={{ mt: 3 }}
                            onClick={() =>
                              handleOpenReservationDialog(
                                court.id,
                                COURT_LABELS[courtType] ?? court.venue
                              )
                            }
                          >
                            Reserve this court
                          </Button>
                        </CardContent>
                      </Card>
                    </Grid>
                  );
                })}
              </Grid>
            )}
          </Stack>
        </>
      ) : null}
    </Stack>
      <Dialog
        open={Boolean(reservationDialog)}
        onClose={handleCloseReservationDialog}
        fullWidth
        maxWidth="sm"
      >
        <DialogTitle>
          Reserve {reservationDialog?.courtLabel ?? "court"}
        </DialogTitle>
        <DialogContent dividers>
          <Stack spacing={2}>
            <DatePicker
              label="Choose a date"
              disablePast
              value={reservationDate}
              onChange={(value) => {
                if (value) {
                  setReservationDate(value);
                }
              }}
            />
            {reservationLoading ? (
              <Stack alignItems="center" py={3}>
                <CircularProgress size={28} />
              </Stack>
            ) : availabilitySlots.length === 0 ? (
              <Alert severity="info">
                No available slots for the selected date. Try another day.
              </Alert>
            ) : (
              <Stack direction="row" spacing={1} flexWrap="wrap" rowGap={1}>
                {availabilitySlots.map((slot) => {
                  const isSelected =
                    selectedSlot?.startTime === slot.startTime &&
                    selectedSlot?.endTime === slot.endTime;
                  return (
                    <Chip
                      key={`${slot.startTime}-${slot.endTime}`}
                      label={`${slot.startTime} – ${slot.endTime}`}
                      color={
                        !slot.isAvailable
                          ? "default"
                          : isSelected
                            ? "secondary"
                            : "primary"
                      }
                      variant={slot.isAvailable ? (isSelected ? "filled" : "outlined") : "outlined"}
                      disabled={!slot.isAvailable}
                      onClick={() => slot.isAvailable && setSelectedSlot(slot)}
                    />
                  );
                })}
              </Stack>
            )}
            {selectedSlot ? (
              <Alert severity="success" variant="outlined">
                Selected slot: {selectedSlot.startTime} – {selectedSlot.endTime}
              </Alert>
            ) : null}
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseReservationDialog}>Cancel</Button>
          <Button
            variant="contained"
            onClick={handleSubmitReservation}
            disabled={!selectedSlot || reservationMutation.isPending}
          >
            {reservationMutation.isPending ? "Reserving..." : "Reserve"}
          </Button>
        </DialogActions>
      </Dialog>
    </>
  );
}

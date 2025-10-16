"use client";

import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
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
import { fetchGymSchedule } from "@/lib/services/gym";
import { type GymSession, GymSessionType, CourtType, UserRole } from "@/lib/types";
import { fetchCourts } from "@/lib/services/courts";

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
  const [selectedMonth, setSelectedMonth] = useState(TODAY.month());
  const [selectedYear, setSelectedYear] = useState(TODAY.year());
  const [courtTypeFilter, setCourtTypeFilter] = useState<"all" | CourtType>("all");

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
  );
}

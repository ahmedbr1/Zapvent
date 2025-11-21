"use client";

import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import type { Dayjs } from "dayjs";
import Stack from "@mui/material/Stack";
import Typography from "@mui/material/Typography";
import Card from "@mui/material/Card";
import CardContent from "@mui/material/CardContent";
import Grid from "@mui/material/GridLegacy";
import TextField from "@mui/material/TextField";
import MenuItem from "@mui/material/MenuItem";
import Button from "@mui/material/Button";
import Alert from "@mui/material/Alert";
import Skeleton from "@mui/material/Skeleton";
import Table from "@mui/material/Table";
import TableBody from "@mui/material/TableBody";
import TableCell from "@mui/material/TableCell";
import TableHead from "@mui/material/TableHead";
import TableRow from "@mui/material/TableRow";
import RefreshIcon from "@mui/icons-material/RefreshRounded";
import { DatePicker } from "@mui/x-date-pickers/DatePicker";
import { useAuthToken } from "@/hooks/useAuthToken";
import { useSessionUser } from "@/hooks/useSessionUser";
import {
  fetchAttendanceReport,
  type AttendanceReportFiltersInput,
} from "@/lib/services/events";
import { EventType } from "@/lib/types";
import { formatDateTime } from "@/lib/date";

type AttendanceFiltersState = {
  name: string;
  eventType: "All" | EventType;
  date: Dayjs | null;
};

const EVENT_TYPE_OPTIONS: Array<"All" | EventType> = [
  "All",
  EventType.Workshop,
  EventType.Trip,
  EventType.Bazaar,
  EventType.Seminar,
  EventType.Conference,
];

export default function AttendanceReportPage() {
  const token = useAuthToken();
  const user = useSessionUser();
  const [filters, setFilters] = useState<AttendanceFiltersState>({
    name: "",
    eventType: "All",
    date: null,
  });

  const requestFilters = useMemo<AttendanceReportFiltersInput>(() => {
    return {
      name: filters.name.trim() || undefined,
      eventType: filters.eventType === "All" ? undefined : filters.eventType,
      date: filters.date ? filters.date.startOf("day").toISOString() : undefined,
    };
  }, [filters]);

  const filtersKey = JSON.stringify(requestFilters);

  const reportQuery = useQuery({
    queryKey: ["attendance-report", filtersKey, token],
    queryFn: () => fetchAttendanceReport(requestFilters, token ?? undefined),
    enabled: Boolean(token),
  });

  const handleFilterChange = (key: keyof AttendanceFiltersState, value: unknown) => {
    setFilters((current) => ({
      ...current,
      [key]: value,
    }));
  };

  const clearFilters = () => {
    setFilters({
      name: "",
      eventType: "All",
      date: null,
    });
  };

  const report = reportQuery.data;
  const events = report?.events ?? [];
  const totalAttendees = report?.totalAttendees ?? 0;

  return (
    <Stack spacing={3}>
      <Stack spacing={1}>
        <Typography variant="h4" fontWeight={700}>
          Attendance report
        </Typography>
        <Typography variant="body1" color="text.secondary">
          Track total attendees per event and filter by name, type, or date.
        </Typography>
        <Typography variant="body2" color="text.secondary">
          Signed in as{" "}
          <strong>{user?.name ?? user?.email ?? "Events Office"}</strong>.
          Data refreshes automatically when you adjust filters.
        </Typography>
      </Stack>

      <Card>
        <CardContent>
          <Stack spacing={2}>
            <Stack
              direction={{ xs: "column", md: "row" }}
              spacing={2}
              alignItems={{ xs: "stretch", md: "flex-end" }}
            >
              <TextField
                label="Event name"
                value={filters.name}
                onChange={(event) => handleFilterChange("name", event.target.value)}
                fullWidth
              />
              <TextField
                label="Event type"
                select
                value={filters.eventType}
                onChange={(event) =>
                  handleFilterChange("eventType", event.target.value as AttendanceFiltersState["eventType"])
                }
                fullWidth
              >
                {EVENT_TYPE_OPTIONS.map((option) => (
                  <MenuItem key={option} value={option}>
                    {option === "All" ? "All events" : option}
                  </MenuItem>
                ))}
              </TextField>
              <DatePicker
                label="Happening on"
                value={filters.date}
                onChange={(newValue) => handleFilterChange("date", newValue ?? null)}
                slotProps={{
                  textField: { fullWidth: true },
                }}
              />
            </Stack>
            <Stack direction={{ xs: "column", sm: "row" }} spacing={1}>
              <Button onClick={() => reportQuery.refetch()} startIcon={<RefreshIcon />}>
                Refresh
              </Button>
              <Button onClick={clearFilters}>Clear filters</Button>
            </Stack>
          </Stack>
        </CardContent>
      </Card>

      {reportQuery.isError ? (
        <Alert
          severity="error"
          action={
            <Button
              size="small"
              onClick={() => reportQuery.refetch()}
              startIcon={<RefreshIcon />}
            >
              Retry
            </Button>
          }
        >
          Unable to load the attendance report right now.
        </Alert>
      ) : null}

      <Grid container spacing={3}>
        <Grid item xs={12} md={4}>
          <Card sx={{ height: "100%" }}>
            <CardContent>
              <Typography variant="subtitle2" color="text.secondary">
                Total attendees
              </Typography>
              {reportQuery.isLoading ? (
                <Skeleton variant="text" height={48} width="60%" sx={{ mt: 1 }} />
              ) : (
                <Typography variant="h3" fontWeight={800}>
                  {totalAttendees.toLocaleString()}
                </Typography>
              )}
              <Typography variant="body2" color="text.secondary">
                Sum of unique registrations for filtered events.
              </Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} md={8}>
          <Card sx={{ height: "100%" }}>
            <CardContent>
              <Typography variant="subtitle1" fontWeight={700} gutterBottom>
                Event breakdown
              </Typography>
              {reportQuery.isLoading ? (
                <Skeleton variant="rectangular" height={240} sx={{ borderRadius: 2 }} />
              ) : events.length === 0 ? (
                <Alert severity="info">No events match the selected filters.</Alert>
              ) : (
                <Table size="small">
                  <TableHead>
                    <TableRow>
                      <TableCell>Event</TableCell>
                      <TableCell>Type</TableCell>
                      <TableCell>Start</TableCell>
                      <TableCell>End</TableCell>
                      <TableCell align="right">Attendees</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {events.map((event) => (
                      <TableRow key={event.eventId}>
                        <TableCell>{event.name}</TableCell>
                        <TableCell>{event.eventType}</TableCell>
                        <TableCell>{formatDateTime(event.startDate)}</TableCell>
                        <TableCell>{formatDateTime(event.endDate)}</TableCell>
                        <TableCell align="right">
                          {event.totalAttendees.toLocaleString()}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </Grid>
      </Grid>
    </Stack>
  );
}

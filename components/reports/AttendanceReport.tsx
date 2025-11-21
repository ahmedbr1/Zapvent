"use client";

import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import Stack from "@mui/material/Stack";
import Typography from "@mui/material/Typography";
import Card from "@mui/material/Card";
import CardContent from "@mui/material/CardContent";
import TextField from "@mui/material/TextField";
import MenuItem from "@mui/material/MenuItem";
import Button from "@mui/material/Button";
import Divider from "@mui/material/Divider";
import Alert from "@mui/material/Alert";
import CircularProgress from "@mui/material/CircularProgress";
import { DataGrid, type GridColDef } from "@mui/x-data-grid";
import DownloadIcon from "@mui/icons-material/DownloadRounded";
import RefreshIcon from "@mui/icons-material/RefreshRounded";
import type { EventType } from "@/lib/types";
import { formatDateTime } from "@/lib/date";
import {
  fetchAttendanceReport,
  type AttendanceReportItem,
} from "@/lib/services/reports";
import { useAuthToken } from "@/hooks/useAuthToken";

interface AttendanceReportProps {
  title?: string;
  subtitle?: string;
}

const eventTypeOptions: Array<{ label: string; value: EventType | "" }> = [
  { label: "All event types", value: "" },
  { label: "Bazaars", value: "Bazaar" },
  { label: "Trips", value: "Trip" },
  { label: "Workshops", value: "Workshop" },
  { label: "Conferences", value: "Conference" },
  { label: "Seminars", value: "Seminar" },
];

export function AttendanceReport({
  title = "Attendance report",
  subtitle = "Track how many attendees registered for campus events.",
}: AttendanceReportProps) {
  const token = useAuthToken();
  const [search, setSearch] = useState("");
  const [eventType, setEventType] = useState<EventType | "">("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");

  const filters = useMemo(
    () => ({
      name: search.trim() || undefined,
      eventType: eventType || undefined,
      startDate: startDate ? new Date(startDate).toISOString() : undefined,
      endDate: endDate ? new Date(endDate).toISOString() : undefined,
    }),
    [search, eventType, startDate, endDate]
  );

  const queryKey = [
    "attendance-report",
    token,
    filters.name,
    filters.eventType,
    filters.startDate,
    filters.endDate,
  ];

  const reportQuery = useQuery({
    queryKey,
    queryFn: () => fetchAttendanceReport(filters, token ?? undefined),
    enabled: Boolean(token),
  });

  const rows = reportQuery.data?.events ?? [];
  const totalAttendees = reportQuery.data?.totalAttendees ?? 0;

  const columns = useMemo<GridColDef<AttendanceReportItem>[]>(
    () => [
      {
        field: "name",
        headerName: "Event",
        flex: 1.4,
      },
      {
        field: "eventType",
        headerName: "Type",
        flex: 0.6,
      },
      {
        field: "startDate",
        headerName: "Start",
        flex: 0.8,
        valueFormatter: (params) => formatDateTime(String(params.value)),
      },
      {
        field: "endDate",
        headerName: "End",
        flex: 0.8,
        valueFormatter: (params) => formatDateTime(String(params.value)),
      },
      {
        field: "totalAttendees",
        headerName: "Attendees",
        flex: 0.6,
      },
    ],
    []
  );

  const handleExport = () => {
    if (!rows.length) return;
    const csvHeader = "Event,Type,Start,End,Attendees";
    const csvRows = rows.map((row) =>
      [
        row.name,
        row.eventType,
        formatDateTime(row.startDate),
        formatDateTime(row.endDate),
        row.totalAttendees,
      ]
        .map((value) => `"${String(value).replace(/"/g, '""')}"`)
        .join(",")
    );
    const blob = new Blob([`${csvHeader}\n${csvRows.join("\n")}`], {
      type: "text/csv;charset=utf-8;",
    });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = "attendance-report.csv";
    link.click();
    URL.revokeObjectURL(url);
  };

  return (
    <Stack spacing={4}>
      <Stack spacing={0.5}>
        <Typography variant="h4" fontWeight={700}>
          {title}
        </Typography>
        <Typography variant="body1" color="text.secondary">
          {subtitle}
        </Typography>
      </Stack>

      <Card sx={{ borderRadius: 3 }}>
        <CardContent>
          <Stack spacing={2} direction={{ xs: "column", md: "row" }}>
            <TextField
              label="Search by event name"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              fullWidth
            />
            <TextField
              select
              label="Event type"
              value={eventType}
              onChange={(event) => setEventType(event.target.value as EventType | "")}
              fullWidth
            >
              {eventTypeOptions.map((option) => (
                <MenuItem key={option.label} value={option.value}>
                  {option.label}
                </MenuItem>
              ))}
            </TextField>
            <TextField
              type="date"
              label="Start after"
              InputLabelProps={{ shrink: true }}
              value={startDate}
              onChange={(event) => setStartDate(event.target.value)}
              fullWidth
            />
            <TextField
              type="date"
              label="End before"
              InputLabelProps={{ shrink: true }}
              value={endDate}
              onChange={(event) => setEndDate(event.target.value)}
              fullWidth
            />
          </Stack>
          <Stack direction={{ xs: "column", md: "row" }} spacing={1.5} mt={2}>
            <Button
              startIcon={<RefreshIcon />}
              onClick={() => reportQuery.refetch()}
              disabled={reportQuery.isFetching}
            >
              Refresh
            </Button>
            <Button
              startIcon={<DownloadIcon />}
              onClick={handleExport}
              disabled={!rows.length}
            >
              Export CSV
            </Button>
          </Stack>
        </CardContent>
      </Card>

      <Card sx={{ borderRadius: 3 }}>
        <CardContent>
          {reportQuery.isLoading ? (
            <Stack alignItems="center" justifyContent="center" minHeight={200}>
              <CircularProgress />
            </Stack>
          ) : reportQuery.isError ? (
            <Alert severity="error">
              Unable to load attendance data. Please adjust filters or try again.
            </Alert>
          ) : rows.length === 0 ? (
            <Alert severity="info">No events match your filters.</Alert>
          ) : (
            <Stack spacing={3}>
              <Stack direction={{ xs: "column", md: "row" }} spacing={3}>
                <Stack spacing={0.5}>
                  <Typography variant="subtitle2" color="text.secondary">
                    Events in view
                  </Typography>
                  <Typography variant="h4" fontWeight={700}>
                    {rows.length}
                  </Typography>
                </Stack>
                <Divider orientation="vertical" flexItem sx={{ display: { xs: "none", md: "block" } }} />
                <Stack spacing={0.5}>
                  <Typography variant="subtitle2" color="text.secondary">
                    Total attendees
                  </Typography>
                  <Typography variant="h4" fontWeight={700}>
                    {totalAttendees.toLocaleString()}
                  </Typography>
                </Stack>
              </Stack>
              <DataGrid
                rows={rows}
                columns={columns}
                getRowId={(row) => row.eventId}
                autoHeight
                disableColumnMenu
                disableRowSelectionOnClick
                pageSizeOptions={[10, 25, 50]}
                initialState={{
                  pagination: { paginationModel: { pageSize: 10, page: 0 } },
                  sorting: { sortModel: [{ field: "startDate", sort: "asc" }] },
                }}
              />
            </Stack>
          )}
        </CardContent>
      </Card>
    </Stack>
  );
}

export default AttendanceReport;

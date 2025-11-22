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
import ToggleButton from "@mui/material/ToggleButton";
import ToggleButtonGroup from "@mui/material/ToggleButtonGroup";
import DownloadIcon from "@mui/icons-material/DownloadRounded";
import RefreshIcon from "@mui/icons-material/RefreshRounded";
import TrendingUpIcon from "@mui/icons-material/TrendingUpRounded";
import TrendingDownIcon from "@mui/icons-material/TrendingDownRounded";
import { DataGrid, type GridColDef } from "@mui/x-data-grid";
import type { EventType } from "@/lib/types";
import { formatDateTime } from "@/lib/date";
import {
  fetchSalesReport,
  type SalesReportItem,
} from "@/lib/services/reports";
import { useAuthToken } from "@/hooks/useAuthToken";

const eventTypeOptions: Array<{ label: string; value: EventType | "" }> = [
  { label: "All event types", value: "" },
  { label: "Bazaars", value: "Bazaar" },
  { label: "Trips", value: "Trip" },
  { label: "Workshops", value: "Workshop" },
  { label: "Conferences", value: "Conference" },
  { label: "Seminars", value: "Seminar" },
];

interface SalesReportProps {
  title?: string;
  subtitle?: string;
}

export function SalesReport({
  title = "Sales report",
  subtitle = "See how much revenue each event generated.",
}: SalesReportProps) {
  const token = useAuthToken();
  const [eventType, setEventType] = useState<EventType | "">("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [specificDate, setSpecificDate] = useState("");
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("desc");

  const filters = useMemo(
    () => ({
      eventType: eventType || undefined,
      startDate: startDate ? new Date(startDate).toISOString() : undefined,
      endDate: endDate ? new Date(endDate).toISOString() : undefined,
      date: specificDate ? new Date(specificDate).toISOString() : undefined,
      sortOrder,
    }),
    [eventType, startDate, endDate, specificDate, sortOrder]
  );

  const queryKey = [
    "sales-report",
    token,
    filters.eventType,
    filters.startDate,
    filters.endDate,
    filters.date,
    filters.sortOrder,
  ];

  const reportQuery = useQuery({
    queryKey,
    queryFn: () => fetchSalesReport(filters, token ?? undefined),
    enabled: Boolean(token),
  });

  const rows = reportQuery.data?.events ?? [];
  const totalRevenue = reportQuery.data?.totalRevenue ?? 0;

  const columns = useMemo<GridColDef<SalesReportItem>[]>(
    () => [
      { field: "name", headerName: "Event", flex: 1.2 },
      { field: "eventType", headerName: "Type", flex: 0.6 },
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
        field: "revenue",
        headerName: "Revenue",
        flex: 0.7,
        valueFormatter: (params) => `${Number(params.value).toLocaleString()} EGP`,
      },
    ],
    []
  );

  const handleExport = () => {
    if (!rows.length) return;
    const csvHeader = "Event,Type,Start,End,Revenue";
    const csvRows = rows.map((row) =>
      [
        row.name,
        row.eventType,
        formatDateTime(row.startDate),
        formatDateTime(row.endDate),
        row.revenue,
      ]
        .map((value) => `"${String(value).replace(/"/g, '""')}"`)
        .join(",")
    );
    const blob = new Blob([`${csvHeader}\n${csvRows.join("\n")}`], {
      type: "text/csv;charset=utf-8;",
    });
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.download = "sales-report.csv";
    link.click();
    URL.revokeObjectURL(link.href);
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
            <TextField
              type="date"
              label="Specific day"
              helperText="Events active on this date"
              InputLabelProps={{ shrink: true }}
              value={specificDate}
              onChange={(event) => setSpecificDate(event.target.value)}
              fullWidth
            />
          </Stack>
          <Stack direction={{ xs: "column", md: "row" }} spacing={1.5} mt={2} alignItems="center">
            <ToggleButtonGroup
              exclusive
              value={sortOrder}
              onChange={(_event, value) => value && setSortOrder(value)}
              color="primary"
            >
              <ToggleButton value="desc" aria-label="highest revenue first">
                <TrendingUpIcon fontSize="small" sx={{ mr: 1 }} /> High → Low
              </ToggleButton>
              <ToggleButton value="asc" aria-label="lowest revenue first">
                <TrendingDownIcon fontSize="small" sx={{ mr: 1 }} /> Low → High
              </ToggleButton>
            </ToggleButtonGroup>
            <Stack direction="row" spacing={1} sx={{ ml: { xs: 0, md: "auto" } }}>
              <Button
                startIcon={<RefreshIcon />}
                onClick={() => reportQuery.refetch()}
                disabled={reportQuery.isFetching}
              >
                Refresh
              </Button>
              <Button startIcon={<DownloadIcon />} onClick={handleExport} disabled={!rows.length}>
                Export CSV
              </Button>
            </Stack>
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
              Unable to load sales data. Please adjust filters or try again later.
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
                    Total revenue
                  </Typography>
                  <Typography variant="h4" fontWeight={700}>
                    {totalRevenue.toLocaleString()} EGP
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
                }}
              />
            </Stack>
          )}
        </CardContent>
      </Card>
    </Stack>
  );
}

export default SalesReport;

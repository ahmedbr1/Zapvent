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
import TrendingUpIcon from "@mui/icons-material/TrendingUpRounded";
import { DatePicker } from "@mui/x-date-pickers/DatePicker";
import { useAuthToken } from "@/hooks/useAuthToken";
import { useSessionUser } from "@/hooks/useSessionUser";
import {
  fetchSalesReport,
  type SalesReportFiltersInput,
  type SalesReportSortOrder,
} from "@/lib/services/events";
import { EventType } from "@/lib/types";
import { formatDateTime } from "@/lib/date";

type SalesFiltersState = {
  eventType: "All" | EventType;
  startDate: Dayjs | null;
  endDate: Dayjs | null;
  sortOrder: SalesReportSortOrder;
};

const EVENT_TYPE_OPTIONS: Array<"All" | EventType> = [
  "All",
  EventType.Workshop,
  EventType.Trip,
  EventType.Bazaar,
  EventType.Seminar,
  EventType.Conference,
];

export default function SalesReportPage() {
  const token = useAuthToken();
  const user = useSessionUser();
  const [filters, setFilters] = useState<SalesFiltersState>({
    eventType: "All",
    startDate: null,
    endDate: null,
    sortOrder: "desc",
  });

  const requestFilters = useMemo<SalesReportFiltersInput>(() => {
    return {
      eventType: filters.eventType === "All" ? undefined : filters.eventType,
      startDate: filters.startDate ? filters.startDate.startOf("day").toISOString() : undefined,
      endDate: filters.endDate ? filters.endDate.endOf("day").toISOString() : undefined,
    };
  }, [filters.eventType, filters.startDate, filters.endDate]);

  const filtersKey = JSON.stringify({
    ...requestFilters,
    sortOrder: filters.sortOrder,
  });

  const reportQuery = useQuery({
    queryKey: ["sales-report", filtersKey, token],
    queryFn: () => fetchSalesReport(requestFilters, filters.sortOrder, token ?? undefined),
    enabled: Boolean(token),
  });

  const handleFilterChange = (key: keyof SalesFiltersState, value: unknown) => {
    setFilters((current) => ({
      ...current,
      [key]: value,
    }));
  };

  const clearFilters = () => {
    setFilters({
      eventType: "All",
      startDate: null,
      endDate: null,
      sortOrder: "desc",
    });
  };

  const report = reportQuery.data;
  const events = report?.events ?? [];
  const totalRevenue = report?.totalRevenue ?? 0;

  return (
    <Stack spacing={3}>
      <Stack spacing={1}>
        <Typography variant="h4" fontWeight={700}>
          Sales report
        </Typography>
        <Typography variant="body1" color="text.secondary">
          Review revenue across all events and sort by highest or lowest sales.
        </Typography>
        <Typography variant="body2" color="text.secondary">
          Signed in as{" "}
          <strong>{user?.name ?? user?.email ?? "Events Office"}</strong>. Use
          the filters below to focus on specific timeframes or event types.
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
                label="Event type"
                select
                value={filters.eventType}
                onChange={(event) =>
                  handleFilterChange("eventType", event.target.value as SalesFiltersState["eventType"])
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
                label="Start date"
                value={filters.startDate}
                onChange={(value) => handleFilterChange("startDate", value ?? null)}
                slotProps={{ textField: { fullWidth: true } }}
              />
              <DatePicker
                label="End date"
                value={filters.endDate}
                onChange={(value) => handleFilterChange("endDate", value ?? null)}
                slotProps={{ textField: { fullWidth: true } }}
              />
              <TextField
                label="Sort by revenue"
                select
                value={filters.sortOrder}
                onChange={(event) =>
                  handleFilterChange("sortOrder", event.target.value as SalesReportSortOrder)
                }
                fullWidth
              >
                <MenuItem value="desc">Highest first</MenuItem>
                <MenuItem value="asc">Lowest first</MenuItem>
              </TextField>
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
            <Button size="small" onClick={() => reportQuery.refetch()} startIcon={<RefreshIcon />}>
              Retry
            </Button>
          }
        >
          Unable to load the sales report right now.
        </Alert>
      ) : null}

      <Grid container spacing={3}>
        <Grid item xs={12} md={4}>
          <Card sx={{ height: "100%" }}>
            <CardContent>
              <Stack direction="row" spacing={2} alignItems="center">
                <TrendingUpIcon color="primary" />
                <Stack spacing={0}>
                  <Typography variant="subtitle2" color="text.secondary">
                    Total revenue
                  </Typography>
                  {reportQuery.isLoading ? (
                    <Skeleton variant="text" width={120} height={32} />
                  ) : (
                    <Typography variant="h4" fontWeight={800}>
                      {formatCurrency(totalRevenue)}
                    </Typography>
                  )}
                </Stack>
              </Stack>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} md={8}>
          <Card sx={{ height: "100%" }}>
            <CardContent>
              <Typography variant="subtitle1" fontWeight={700} gutterBottom>
                Revenue by event
              </Typography>
              {reportQuery.isLoading ? (
                <Skeleton variant="rectangular" height={240} sx={{ borderRadius: 2 }} />
              ) : events.length === 0 ? (
                <Alert severity="info">No events found for the selected filters.</Alert>
              ) : (
                <Table size="small">
                  <TableHead>
                    <TableRow>
                      <TableCell>Event</TableCell>
                      <TableCell>Type</TableCell>
                      <TableCell>Start</TableCell>
                      <TableCell>End</TableCell>
                      <TableCell align="right">Revenue</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {events.map((event) => (
                      <TableRow key={event.eventId}>
                        <TableCell>{event.name}</TableCell>
                        <TableCell>{event.eventType}</TableCell>
                        <TableCell>{formatDateTime(event.startDate)}</TableCell>
                        <TableCell>{formatDateTime(event.endDate)}</TableCell>
                        <TableCell align="right">{formatCurrency(event.revenue)}</TableCell>
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

function formatCurrency(value: number) {
  return `EGP ${value.toLocaleString("en-US", { maximumFractionDigits: 0 })}`;
}

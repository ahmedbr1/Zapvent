"use client";

import { useMemo } from "react";
import {
  Box,
  Chip,
  Button,
  Divider,
  IconButton,
  InputAdornment,
  MenuItem,
  Stack,
  TextField,
  Typography,
} from "@mui/material";
import SearchIcon from "@mui/icons-material/SearchRounded";
import ClearIcon from "@mui/icons-material/ClearRounded";
import { DatePicker } from "@mui/x-date-pickers/DatePicker";
import dayjs, { type Dayjs } from "dayjs";
import { EventType, Location } from "@/lib/types";

export interface EventFilters {
  search: string;
  eventType?: EventType | "All";
  location?: Location | "All";
  professor?: string;
  startDate?: string | null;
  endDate?: string | null;
  sortOrder: "asc" | "desc";
}

interface EventFiltersBarProps {
  value: EventFilters;
  onChange: (filters: EventFilters) => void;
  professors?: string[];
}

export function EventFiltersBar({ value, onChange, professors = [] }: EventFiltersBarProps) {
  const activeFilters = useMemo(() => {
    const filters: Array<{ label: string; key: keyof EventFilters }> = [];
    if (value.eventType && value.eventType !== "All") {
      filters.push({ label: value.eventType, key: "eventType" });
    }
    if (value.location && value.location !== "All") {
      filters.push({ label: value.location, key: "location" });
    }
    if (value.professor) {
      filters.push({ label: `Professor: ${value.professor}`, key: "professor" });
    }
    if (value.startDate) {
      filters.push({ label: `From ${dayjs(value.startDate).format("MMM D")}`, key: "startDate" });
    }
    if (value.endDate) {
      filters.push({ label: `Until ${dayjs(value.endDate).format("MMM D")}`, key: "endDate" });
    }
    return filters;
  }, [value]);

  const setFilter = <K extends keyof EventFilters>(key: K, filterValue: EventFilters[K]) => {
    onChange({ ...value, [key]: filterValue });
  };

  const handleClearFilter = (key: keyof EventFilters) => {
    if (key === "eventType" || key === "location") {
      setFilter(key, "All" as EventFilters[typeof key]);
      return;
    }
    if (key === "sortOrder") {
      setFilter(key, "asc" as EventFilters[typeof key]);
      return;
    }
    if (key === "startDate" || key === "endDate") {
      setFilter(key, null as EventFilters[typeof key]);
      return;
    }
    setFilter(key, "" as EventFilters[typeof key]);
  };

  const handleResetAll = () => {
    onChange({
      search: "",
      eventType: "All",
      location: "All",
      professor: "",
      startDate: null,
      endDate: null,
      sortOrder: "asc",
    });
  };

  return (
    <Stack spacing={2} sx={{ p: 2.5, borderRadius: 3, backgroundColor: "#FFFFFF", mb: 3 }}>
      <Stack direction={{ xs: "column", md: "row" }} spacing={2} alignItems="stretch">
        <TextField
          fullWidth
          placeholder="Search by event or professor name"
          value={value.search}
          onChange={(event) => setFilter("search", event.target.value)}
          InputProps={{
            startAdornment: (
              <InputAdornment position="start">
                <SearchIcon />
              </InputAdornment>
            ),
            endAdornment: value.search ? (
              <InputAdornment position="end">
                <IconButton onClick={() => setFilter("search", "")} aria-label="Clear search">
                  <ClearIcon fontSize="small" />
                </IconButton>
              </InputAdornment>
            ) : undefined,
          }}
        />
        <TextField
          select
          label="Event type"
          value={value.eventType ?? "All"}
          onChange={(event) => setFilter("eventType", event.target.value as EventFilters["eventType"])}
          sx={{ minWidth: { md: 160 } }}
        >
          <MenuItem value="All">All</MenuItem>
          {Object.values(EventType).map((type) => (
            <MenuItem key={type} value={type}>
              {type}
            </MenuItem>
          ))}
        </TextField>
        <TextField
          select
          label="Location"
          value={value.location ?? "All"}
          onChange={(event) => setFilter("location", event.target.value as EventFilters["location"])}
          sx={{ minWidth: { md: 160 } }}
        >
          <MenuItem value="All">All</MenuItem>
          {Object.values(Location).map((loc) => (
            <MenuItem key={loc} value={loc}>
              {loc}
            </MenuItem>
          ))}
        </TextField>
        <TextField
          select
          label="Sort by date"
          value={value.sortOrder}
          onChange={(event) => setFilter("sortOrder", event.target.value as EventFilters["sortOrder"])}
          sx={{ minWidth: { md: 160 } }}
        >
          <MenuItem value="asc">Soonest first</MenuItem>
          <MenuItem value="desc">Latest first</MenuItem>
        </TextField>
      </Stack>
      <Stack direction={{ xs: "column", md: "row" }} spacing={2} alignItems={{ xs: "stretch", md: "center" }}>
        <Stack direction={{ xs: "column", sm: "row" }} spacing={2} flexGrow={1}>
          <DatePicker
            label="Start date"
            value={value.startDate ? dayjs(value.startDate) : null}
            onChange={(date: Dayjs | null) =>
              setFilter("startDate", date ? date.toISOString() : null)
            }
            slotProps={{
              textField: {
                fullWidth: true,
              },
            }}
          />
          <DatePicker
            label="End date"
            value={value.endDate ? dayjs(value.endDate) : null}
            onChange={(date: Dayjs | null) => setFilter("endDate", date ? date.toISOString() : null)}
            slotProps={{
              textField: {
                fullWidth: true,
              },
            }}
          />
        </Stack>
        <TextField
          select
          label="Professor"
          value={value.professor ?? ""}
          onChange={(event) => setFilter("professor", event.target.value)}
          sx={{ minWidth: { md: 200 } }}
        >
          <MenuItem value="">All professors</MenuItem>
          {professors.map((professor) => (
            <MenuItem key={professor} value={professor}>
              {professor}
            </MenuItem>
          ))}
        </TextField>
        <Button
          onClick={handleResetAll}
          color="primary"
          variant="text"
          sx={{ alignSelf: { xs: "stretch", md: "center" }, whiteSpace: "nowrap" }}
        >
          Reset filters
        </Button>
      </Stack>
      {activeFilters.length > 0 && (
        <>
          <Divider />
          <Stack direction="row" spacing={1} flexWrap="wrap">
            <Typography variant="body2" color="text.secondary" sx={{ mr: 1 }}>
              Active filters:
            </Typography>
            {activeFilters.map((filter) => (
              <Chip
                key={filter.key}
                label={filter.label}
                onDelete={() => handleClearFilter(filter.key)}
                color="primary"
                variant="outlined"
              />
            ))}
            <Box flexGrow={1} />
            <Chip
              label="Clear all"
              onClick={handleResetAll}
              onDelete={handleResetAll}
              color="secondary"
              variant="outlined"
            />
          </Stack>
        </>
      )}
    </Stack>
  );
}

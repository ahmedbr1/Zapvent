"use client";

import { useEffect, useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import Grid from "@mui/material/Grid";
import Box from "@mui/material/Box";
import Stack from "@mui/material/Stack";
import Typography from "@mui/material/Typography";
import Skeleton from "@mui/material/Skeleton";
import Alert from "@mui/material/Alert";
import Pagination from "@mui/material/Pagination";
import Button from "@mui/material/Button";
import RefreshIcon from "@mui/icons-material/RefreshRounded";
import { useSnackbar } from "notistack";
import { EventCard } from "@/components/events/EventCard";
import {
  EventFiltersBar,
  type EventFilters,
} from "@/components/events/EventFiltersBar";
import { fetchUpcomingEvents, registerForWorkshop } from "@/lib/services/events";
import { EventType, type EventSummary } from "@/lib/types";
import { useAuthToken } from "@/hooks/useAuthToken";
import { useSessionUser } from "@/hooks/useSessionUser";

const PAGE_SIZE = 6;

const INITIAL_FILTERS: EventFilters = {
  search: "",
  eventType: "All",
  location: "All",
  professor: "",
  startDate: null,
  endDate: null,
  sortOrder: "asc",
};

export default function UserEventsPage() {
  const token = useAuthToken();
  const user = useSessionUser();
  const { enqueueSnackbar } = useSnackbar();
  const [filters, setFilters] = useState<EventFilters>({ ...INITIAL_FILTERS });
  const [page, setPage] = useState(1);
  const [registeredEventIds, setRegisteredEventIds] = useState<Set<string>>(
    () => new Set()
  );
  const [pendingEventId, setPendingEventId] = useState<string | null>(null);
  const queryClient = useQueryClient();

  const eventsQuery = useQuery({
    queryKey: ["events", user?.id, token],
    queryFn: () => fetchUpcomingEvents(token ?? undefined, user?.id),
    enabled: Boolean(token),
  });

  useEffect(() => {
    setPage(1);
  }, [filters.search, filters.eventType, filters.location, filters.professor, filters.startDate, filters.endDate]);

  useEffect(() => {
    if (eventsQuery.data) {
      setRegisteredEventIds(
        new Set(
          eventsQuery.data
            .filter((event) => event.isRegistered)
            .map((event) => event.id)
        )
      );
    } else {
      setRegisteredEventIds(new Set());
    }
  }, [eventsQuery.data]);

  const professors = useMemo(() => {
    const names = new Set<string>();
    (eventsQuery.data ?? []).forEach((event) => {
      event.participatingProfessors?.forEach((professor) => names.add(professor));
    });
    return Array.from(names).sort();
  }, [eventsQuery.data]);

  const filteredEvents = useMemo(() => {
    if (!eventsQuery.data) return [];
    return eventsQuery.data
      .filter((event) => {
        if (filters.eventType && filters.eventType !== "All" && event.eventType !== filters.eventType) {
          return false;
        }
        if (filters.location && filters.location !== "All" && event.location !== filters.location) {
          return false;
        }
        if (filters.professor) {
          const professorsLower =
            event.participatingProfessors?.map((professor) => professor.toLowerCase()) ?? [];
          if (!professorsLower.some((name) => name.includes(filters.professor.toLowerCase()))) {
            return false;
          }
        }
        if (filters.search) {
          const haystack = [
            event.name,
            event.description,
            ...(event.participatingProfessors ?? []),
          ]
            .join(" ")
            .toLowerCase();
          if (!haystack.includes(filters.search.toLowerCase())) {
            return false;
          }
        }
        if (filters.startDate && new Date(event.startDate) < new Date(filters.startDate)) {
          return false;
        }
        if (filters.endDate && new Date(event.startDate) > new Date(filters.endDate)) {
          return false;
        }
        return true;
      })
      .sort((a, b) => {
        const delta =
          new Date(a.startDate).getTime() - new Date(b.startDate).getTime();
        return filters.sortOrder === "asc" ? delta : -delta;
      });
  }, [eventsQuery.data, filters]);

  const totalPages = Math.max(1, Math.ceil(filteredEvents.length / PAGE_SIZE));
  const paginatedEvents = filteredEvents.slice(
    (page - 1) * PAGE_SIZE,
    page * PAGE_SIZE
  );

  const getErrorMessage = (error: unknown, fallback: string) => {
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
    return fallback;
  };

  const registerMutation = useMutation({
    mutationFn: (event: EventSummary) =>
      registerForWorkshop(event.id, token ?? undefined),
    onMutate: (event) => {
      setPendingEventId(event.id);
    },
    onSuccess: (response, event) => {
      setRegisteredEventIds((prev) => {
        const next = new Set(prev);
        next.add(event.id);
        return next;
      });
      const successMessage =
        response.message ?? `Registration successful for ${event.name}.`;
      enqueueSnackbar(successMessage, { variant: "success" });
      queryClient.invalidateQueries({ queryKey: ["events", user?.id, token] });
      queryClient.invalidateQueries({
        queryKey: ["event", event.id, user?.id, token],
      });
    },
    onError: (error: unknown, event) => {
      const message = getErrorMessage(
        error,
        `Failed to register for ${event.name}.`
      );
      enqueueSnackbar(message, { variant: "error" });
    },
    onSettled: () => {
      setPendingEventId(null);
    },
  });

  const handleRegister = (event: EventSummary) => {
    if (!token) {
      enqueueSnackbar("You must be signed in to register for events.", {
        variant: "warning",
      });
      return;
    }

    const supportsRegistration =
      event.eventType === EventType.Workshop || event.eventType === EventType.Trip;

    if (!supportsRegistration) {
      enqueueSnackbar("Only workshops and trips support online registration.", {
        variant: "info",
      });
      return;
    }
    if (new Date(event.registrationDeadline).getTime() < Date.now()) {
      enqueueSnackbar("Registration for this event has already closed.", {
        variant: "info",
      });
      return;
    }
    if (registeredEventIds.has(event.id)) {
      enqueueSnackbar("You’ve already registered for this event.", {
        variant: "info",
      });
      return;
    }

    registerMutation.mutate(event);
  };

  return (
    <Stack spacing={3}>
      <Stack direction="row" justifyContent="space-between" alignItems="center">
        <Box>
          <Typography variant="h4" fontWeight={700}>
            Explore Events
          </Typography>
          <Typography variant="body1" color="text.secondary">
            Browse upcoming workshops, trips, conferences, and bazaars tailored for the GUC community.
          </Typography>
        </Box>
        <Button
          variant="outlined"
          startIcon={<RefreshIcon />}
          onClick={() => eventsQuery.refetch()}
          disabled={eventsQuery.isFetching}
        >
          Refresh
        </Button>
      </Stack>

      <EventFiltersBar
        value={filters}
        onChange={setFilters}
        professors={professors}
      />

      {eventsQuery.isLoading ? (
        <Grid container spacing={3}>
          {Array.from({ length: PAGE_SIZE }).map((_, index) => (
            <Grid key={index} size={{ xs: 12, md: 6, lg: 4 }}>
              <Skeleton variant="rectangular" height={280} sx={{ borderRadius: 3 }} />
            </Grid>
          ))}
        </Grid>
      ) : eventsQuery.isError ? (
        <Alert
          severity="error"
          action={
            <Button color="inherit" size="small" onClick={() => eventsQuery.refetch()}>
              Retry
            </Button>
          }
        >
          Failed to load events. {eventsQuery.error instanceof Error ? eventsQuery.error.message : ""}
        </Alert>
      ) : filteredEvents.length === 0 ? (
        <Box
          sx={{
            textAlign: "center",
            py: 10,
            borderRadius: 3,
            backgroundColor: "#FFFFFF",
            border: "1px dashed rgba(15,23,42,0.12)",
          }}
        >
          <Typography variant="h6" fontWeight={600}>
            No events match your filters.
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
            Try adjusting filters or resetting them to see all upcoming events.
          </Typography>
          <Button onClick={() => setFilters({ ...INITIAL_FILTERS })} sx={{ mt: 3 }}>
            Reset filters
          </Button>
        </Box>
      ) : (
        <>
          <Grid container spacing={3}>
            {paginatedEvents.map((event) => {
              const isRegistered =
                Boolean(event.isRegistered) || registeredEventIds.has(event.id);
              const eventWithStatus: EventSummary = {
                ...event,
                isRegistered,
              };
              const isRegisterable =
                event.eventType === EventType.Workshop || event.eventType === EventType.Trip;
              const isPendingRegistration =
                pendingEventId === event.id && registerMutation.isPending;

              return (
                <Grid key={event.id} size={{ xs: 12, md: 6, lg: 4 }}>
                  <EventCard
                    event={eventWithStatus}
                    onRegister={isRegisterable ? handleRegister : undefined}
                    disableRegister={isRegistered || isPendingRegistration}
                  />
                </Grid>
              );
            })}
          </Grid>
          {totalPages > 1 && (
            <Stack alignItems="center">
              <Pagination
                count={totalPages}
                page={page}
                onChange={(_, newPage) => setPage(newPage)}
                color="primary"
                shape="rounded"
              />
            </Stack>
          )}
        </>
      )}
    </Stack>
  );
}

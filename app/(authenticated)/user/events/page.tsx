"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import dayjs from "dayjs";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import Grid from "@mui/material/Grid";
import Box from "@mui/material/Box";
import Stack from "@mui/material/Stack";
import Typography from "@mui/material/Typography";
import Skeleton from "@mui/material/Skeleton";
import Alert from "@mui/material/Alert";
import Pagination from "@mui/material/Pagination";
import Button from "@mui/material/Button";
import Card from "@mui/material/Card";
import CardContent from "@mui/material/CardContent";
import CardActions from "@mui/material/CardActions";
import Divider from "@mui/material/Divider";
import Chip from "@mui/material/Chip";
import RefreshIcon from "@mui/icons-material/RefreshRounded";
import RateReviewIcon from "@mui/icons-material/RateReviewRounded";
import { useSnackbar } from "notistack";
import { EventCard } from "@/components/events/EventCard";
import EventPaymentDialog from "@/components/events/EventPaymentDialog";
import EventCancellationDialog from "@/components/events/EventCancellationDialog";
import {
  EventFiltersBar,
  type EventFilters,
} from "@/components/events/EventFiltersBar";
import {
  fetchUpcomingEvents,
  registerForWorkshop,
  payForEventByWallet,
  cancelEventRegistration,
  createStripePaymentIntent,
  finalizeStripePayment,
} from "@/lib/services/events";
import {
  EventType,
  type EventSummary,
  type UserRegisteredEvent,
} from "@/lib/types";
import { useAuthToken } from "@/hooks/useAuthToken";
import { useSessionUser } from "@/hooks/useSessionUser";
import { filterAndSortEvents } from "@/lib/events/filters";
import { fetchUserRegisteredEvents } from "@/lib/services/users";
import { formatDateTime } from "@/lib/date";

const PAGE_SIZE = 6;
const CANCELLATION_WINDOW_MS = 14 * 24 * 60 * 60 * 1000;

const INITIAL_FILTERS: EventFilters = {
  search: "",
  eventType: "All",
  location: "All",
  professor: "",
  sessionType: "All",
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
  const [paymentDialogOpen, setPaymentDialogOpen] = useState(false);
  const [paymentEvent, setPaymentEvent] = useState<EventSummary | null>(null);
  const [paymentStep, setPaymentStep] = useState<"method" | "card">("method");
  const [stripeIntent, setStripeIntent] = useState<
    { clientSecret: string; paymentIntentId: string } | null
  >(null);
  const [cardError, setCardError] = useState<string | null>(null);
  const [cancelDialogOpen, setCancelDialogOpen] = useState(false);
  const [cancelTarget, setCancelTarget] = useState<EventSummary | null>(null);
  const queryClient = useQueryClient();
  const resetPaymentFlow = () => {
    setPaymentStep("method");
    setStripeIntent(null);
    setCardError(null);
  };

  const eventsQuery = useQuery({
    queryKey: ["events", user?.id, token],
    queryFn: () => fetchUpcomingEvents(token ?? undefined, user?.id),
    enabled: Boolean(token),
  });

  const attendedQuery = useQuery({
    queryKey: ["registered-events", user?.id, token],
    queryFn: () => fetchUserRegisteredEvents(user!.id, token ?? undefined),
    enabled: Boolean(user?.id && token),
  });

  useEffect(() => {
    setPage(1);
  }, [
    filters.search,
    filters.eventType,
    filters.location,
    filters.professor,
    filters.startDate,
    filters.endDate,
  ]);

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
      event.participatingProfessors?.forEach((professor) =>
        names.add(professor)
      );
    });
    return Array.from(names).sort();
  }, [eventsQuery.data]);

  const filteredEvents = useMemo(
    () =>
      filterAndSortEvents(eventsQuery.data ?? [], filters, {
        getEventType: (event) => event.eventType,
        getLocation: (event) => event.location,
        getStartDate: (event) => event.startDate,
        getProfessorNames: (event) => event.participatingProfessors ?? [],
        getSearchValues: (event) => [
          event.name,
          event.description,
          ...(event.participatingProfessors ?? []),
        ],
      }),
    [eventsQuery.data, filters]
  );

  const totalPages = Math.max(1, Math.ceil(filteredEvents.length / PAGE_SIZE));
  const paginatedEvents = filteredEvents.slice(
    (page - 1) * PAGE_SIZE,
    page * PAGE_SIZE
  );

  const attendedEvents = useMemo(() => {
    const events = attendedQuery.data ?? [];
    return events
      .filter((event) => event.status === "Past")
      .sort(
        (a, b) =>
          new Date(b.endDate).getTime() - new Date(a.endDate).getTime()
      )
      .slice(0, 3);
  }, [attendedQuery.data]);

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

  const handleStartRegistration = (event: EventSummary) => {
    if (!token) {
      enqueueSnackbar("You must be signed in to register for events.", {
        variant: "warning",
      });
      return;
    }

    const supportsRegistration =
      event.eventType === EventType.Workshop ||
      event.eventType === EventType.Trip;

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

    resetPaymentFlow();
    setPaymentEvent(event);
    setPaymentDialogOpen(true);
  };

  const walletPaymentMutation = useMutation({
    mutationFn: (eventId: string) => payForEventByWallet(eventId, token ?? undefined),
    onMutate: (eventId) => {
      setPendingEventId(eventId);
    },
    onSuccess: (response, eventId) => {
      enqueueSnackbar(response.message ?? "Payment completed successfully.", {
        variant: "success",
      });
      queryClient.invalidateQueries({ queryKey: ["wallet-summary", token] });
      queryClient.invalidateQueries({ queryKey: ["events", user?.id, token] });
      queryClient.invalidateQueries({ queryKey: ["event", eventId, user?.id, token] });
    },
    onError: (error: unknown) => {
      const message = getErrorMessage(error, "Failed to process wallet payment.");
      enqueueSnackbar(message, { variant: "error" });
    },
    onSettled: () => {
      setPendingEventId(null);
    },
  });

  const createStripeIntentMutation = useMutation({
    mutationFn: (eventId: string) => createStripePaymentIntent(eventId, token ?? undefined),
  });

  const finalizeStripePaymentMutation = useMutation({
    mutationFn: ({ eventId, paymentIntentId }: { eventId: string; paymentIntentId: string }) =>
      finalizeStripePayment(eventId, paymentIntentId, token ?? undefined),
  });

  const cancelRegistrationMutation = useMutation({
    mutationFn: (eventId: string) => cancelEventRegistration(eventId, token ?? undefined),
    onSuccess: (response, eventId) => {
      setCancelDialogOpen(false);
      setCancelTarget(null);
      enqueueSnackbar(response.message ?? "Registration cancelled and refunded.", {
        variant: "success",
      });
      setRegisteredEventIds((prev) => {
        const next = new Set(prev);
        next.delete(eventId);
        return next;
      });
      queryClient.invalidateQueries({ queryKey: ["wallet-summary", token] });
      queryClient.invalidateQueries({ queryKey: ["events", user?.id, token] });
      queryClient.invalidateQueries({ queryKey: ["event", eventId, user?.id, token] });
      queryClient.invalidateQueries({ queryKey: ["registered-events", user?.id, token] });
    },
    onError: (error: unknown, eventId) => {
      const message = getErrorMessage(error, "Unable to cancel this registration.");
      enqueueSnackbar(message, { variant: "error" });
      queryClient.invalidateQueries({ queryKey: ["event", eventId, user?.id, token] });
    },
  });

  const closePaymentDialog = () => {
    if (
      registerMutation.isPending ||
      walletPaymentMutation.isPending ||
      createStripeIntentMutation.isPending ||
      finalizeStripePaymentMutation.isPending
    ) {
      return;
    }
    setPaymentDialogOpen(false);
    setPaymentEvent(null);
    resetPaymentFlow();
  };

  const handleWalletPayment = async () => {
    if (!paymentEvent) {
      return;
    }
    setCardError(null);
    try {
      await registerMutation.mutateAsync(paymentEvent);
      if ((paymentEvent.price ?? 0) > 0) {
        await walletPaymentMutation.mutateAsync(paymentEvent.id);
      } else {
        enqueueSnackbar(`Registration confirmed for ${paymentEvent.name}.`, {
          variant: "success",
        });
      }
      setPaymentDialogOpen(false);
      setPaymentEvent(null);
    } catch (error) {
      const message = getErrorMessage(error, "Unable to complete registration.");
      enqueueSnackbar(message, { variant: "error" });
    }
  };

  const handleStartCardPayment = async () => {
    if (!paymentEvent) {
      return;
    }

    if ((paymentEvent.price ?? 0) <= 0) {
      enqueueSnackbar("Card payments are only required for paid events.", {
        variant: "info",
      });
      return;
    }

    try {
      setCardError(null);
      const intent = await createStripeIntentMutation.mutateAsync(paymentEvent.id);
      setStripeIntent(intent);
      setPaymentStep("card");
    } catch (error) {
      const message = getErrorMessage(error, "Unable to start card payment.");
      setCardError(message);
      enqueueSnackbar(message, { variant: "error" });
    }
  };

  const handleCardPaymentSuccess = async (paymentIntentId: string) => {
    if (!paymentEvent) {
      return;
    }

    try {
      setCardError(null);
      const response = await finalizeStripePaymentMutation.mutateAsync({
        eventId: paymentEvent.id,
        paymentIntentId,
      });
      enqueueSnackbar(response.message ?? `Payment confirmed for ${paymentEvent.name}.`, {
        variant: "success",
      });
      queryClient.invalidateQueries({ queryKey: ["events", user?.id, token] });
      queryClient.invalidateQueries({
        queryKey: ["event", paymentEvent.id, user?.id, token],
      });
      queryClient.invalidateQueries({
        queryKey: ["registered-events", user?.id, token],
      });
      setPaymentDialogOpen(false);
      setPaymentEvent(null);
      resetPaymentFlow();
    } catch (error) {
      const message = getErrorMessage(error, "Unable to confirm card payment.");
      setCardError(message);
      enqueueSnackbar(message, { variant: "error" });
    }
  };

  const handleCardError = (message: string) => {
    setCardError(message);
  };

  const handleBackToMethods = () => {
    if (finalizeStripePaymentMutation.isPending) {
      return;
    }
    setPaymentStep("method");
    setStripeIntent(null);
    setCardError(null);
  };

  const handleCancelRegistration = (event: EventSummary) => {
    if (!token) {
      enqueueSnackbar("You must be signed in to manage registrations.", {
        variant: "warning",
      });
      return;
    }
    setCancelTarget(event);
    setCancelDialogOpen(true);
  };

  const confirmCancellation = () => {
    if (!cancelTarget) {
      return;
    }
    cancelRegistrationMutation.mutate(cancelTarget.id);
  };

  const closeCancellationDialog = () => {
    if (cancelRegistrationMutation.isPending) {
      return;
    }
    setCancelDialogOpen(false);
    setCancelTarget(null);
  };

  return (
    <>
      <Stack spacing={3}>
      <Stack direction="row" justifyContent="space-between" alignItems="center">
        <Box>
          <Typography variant="h4" fontWeight={700}>
            Explore Events
          </Typography>
          <Typography variant="body1" color="text.secondary">
            Browse upcoming workshops, trips, conferences, and bazaars tailored
            for the GUC community.
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

      <AttendedEventsHighlight
        loading={attendedQuery.isLoading}
        error={attendedQuery.isError}
        events={attendedEvents}
        showEmpty={!attendedQuery.isLoading && attendedEvents.length === 0}
        onRetry={() => attendedQuery.refetch()}
      />

      <EventFiltersBar
        value={filters}
        onChange={setFilters}
        professors={professors}
      />

      {eventsQuery.isLoading ? (
        <Grid container spacing={3}>
          {Array.from({ length: PAGE_SIZE }).map((_, index) => (
            <Grid key={index} size={{ xs: 12, md: 6, lg: 4 }}>
              <Skeleton
                variant="rectangular"
                height={280}
                sx={{ borderRadius: 3 }}
              />
            </Grid>
          ))}
        </Grid>
      ) : eventsQuery.isError ? (
        <Alert
          severity="error"
          action={
            <Button
              color="inherit"
              size="small"
              onClick={() => eventsQuery.refetch()}
            >
              Retry
            </Button>
          }
        >
          Failed to load events.{" "}
          {eventsQuery.error instanceof Error ? eventsQuery.error.message : ""}
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
          <Button
            onClick={() => setFilters({ ...INITIAL_FILTERS })}
            sx={{ mt: 3 }}
          >
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
                event.eventType === EventType.Workshop ||
                event.eventType === EventType.Trip;
              const isPendingRegistration =
                pendingEventId === event.id && registerMutation.isPending;
              const eventStartsIn = dayjs(event.startDate).diff(dayjs());
              const cancellationDisabled =
                !isRegistered || eventStartsIn < CANCELLATION_WINDOW_MS;
              const cancelTooltip = cancellationDisabled
                ? !isRegistered
                  ? "You are not registered for this event."
                  : "Cancellations are only available until 14 days before the event."
                : undefined;

              return (
                <Grid key={event.id} size={{ xs: 12, md: 6, lg: 4 }}>
                  <EventCard
                    event={eventWithStatus}
                    onRegister={isRegisterable ? handleStartRegistration : undefined}
                    disableRegister={isRegistered || isPendingRegistration}
                    onCancelRegistration={isRegistered ? handleCancelRegistration : undefined}
                    cancelDisabled={cancellationDisabled || cancelRegistrationMutation.isPending}
                    cancelDisabledReason={cancelTooltip}
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

      <EventPaymentDialog
        open={paymentDialogOpen}
        event={paymentEvent}
        loading={registerMutation.isPending || walletPaymentMutation.isPending}
        step={paymentStep}
        cardClientSecret={stripeIntent?.clientSecret}
        cardSelectionLoading={
          registerMutation.isPending || createStripeIntentMutation.isPending
        }
        cardFinalizing={finalizeStripePaymentMutation.isPending}
        cardError={cardError}
        onClose={closePaymentDialog}
        onPayWithWallet={handleWalletPayment}
        onStartCardFlow={handleStartCardPayment}
        onCardPaymentSuccess={handleCardPaymentSuccess}
        onCardError={handleCardError}
        onBackToMethods={handleBackToMethods}
      />
      <EventCancellationDialog
        open={cancelDialogOpen}
        event={cancelTarget}
        loading={cancelRegistrationMutation.isPending}
        onConfirm={confirmCancellation}
        onClose={closeCancellationDialog}
      />
    </>
  );
}

interface AttendedEventsHighlightProps {
  loading: boolean;
  error: boolean;
  events: UserRegisteredEvent[];
  showEmpty: boolean;
  onRetry: () => void;
}

function AttendedEventsHighlight({
  loading,
  error,
  events,
  showEmpty,
  onRetry,
}: AttendedEventsHighlightProps) {
  if (loading) {
    return (
      <Skeleton variant="rectangular" height={160} sx={{ borderRadius: 3 }} />
    );
  }

  if (error) {
    return (
      <Alert
        severity="error"
        action={
          <Button color="inherit" size="small" onClick={onRetry}>
            Retry
          </Button>
        }
      >
        We couldn&apos;t load your attended events. Please try again.
      </Alert>
    );
  }

  if (showEmpty) {
    return (
      <Alert severity="info">
        Once you finish attending events, they will appear here so you can leave
        quick feedback.
      </Alert>
    );
  }

  return (
    <Stack spacing={2}>
      <Stack direction="row" justifyContent="space-between" alignItems="center">
        <Typography variant="h6" fontWeight={700}>
          Events you&apos;ve recently attended
        </Typography>
        <Button component={Link} href="/user/registrations" size="small">
          View all registrations
        </Button>
      </Stack>
      <Grid container spacing={2}>
        {events.map((event) => (
          <Grid key={event.id} size={{ xs: 12, md: 4 }}>
            <Card
              sx={{
                height: "100%",
                borderRadius: 3,
                border: "1px solid rgba(15,23,42,0.08)",
              }}
            >
              <CardContent sx={{ pb: 1.5 }}>
                <Stack spacing={1}>
                  <Chip label="Past event" size="small" color="default" />
                  <Typography variant="subtitle1" fontWeight={700}>
                    {event.name}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    {event.location}
                  </Typography>
                  <Divider flexItem sx={{ my: 1 }} />
                  <Stack spacing={0.5}>
                    <Detail label="Started" value={formatDateTime(event.startDate)} />
                    <Detail label="Ended" value={formatDateTime(event.endDate)} />
                  </Stack>
                </Stack>
              </CardContent>
              <CardActions sx={{ px: 2.5, pb: 2.5 }}>
                <Button
                  component={Link}
                  href={`/user/events/${event.id}#feedback`}
                  variant="contained"
                  size="small"
                  startIcon={<RateReviewIcon />}
                >
                  Share feedback
                </Button>
                <Button
                  component={Link}
                  href={`/user/events/${event.id}`}
                  size="small"
                >
                  Details
                </Button>
              </CardActions>
            </Card>
          </Grid>
        ))}
      </Grid>
    </Stack>
  );
}

function Detail({ label, value }: { label: string; value: string }) {
  return (
    <Stack spacing={0.25}>
      <Typography variant="caption" color="text.secondary">
        {label}
      </Typography>
      <Typography variant="body2" fontWeight={600}>
        {value}
      </Typography>
    </Stack>
  );
}

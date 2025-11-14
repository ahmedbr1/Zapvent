"use client";

import { useEffect, useMemo, useState } from "react";
import { useParams } from "next/navigation";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import Box from "@mui/material/Box";
import Stack from "@mui/material/Stack";
import Typography from "@mui/material/Typography";
import Skeleton from "@mui/material/Skeleton";
import Alert from "@mui/material/Alert";
import Chip from "@mui/material/Chip";
import Button from "@mui/material/Button";
import Grid from "@mui/material/Grid";
import Tooltip from "@mui/material/Tooltip";
import CalendarIcon from "@mui/icons-material/CalendarMonthRounded";
import LocationIcon from "@mui/icons-material/FmdGoodRounded";
import PeopleIcon from "@mui/icons-material/PeopleAltRounded";
import MonetizationIcon from "@mui/icons-material/MonetizationOnRounded";
import EventIcon from "@mui/icons-material/EventAvailableRounded";
import EventBusyIcon from "@mui/icons-material/EventBusyRounded";
import BlockIcon from "@mui/icons-material/BlockRounded";
import FavoriteIcon from "@mui/icons-material/FavoriteRounded";
import FavoriteBorderIcon from "@mui/icons-material/FavoriteBorderRounded";
import dayjs from "dayjs";
import { useSnackbar } from "notistack";
import { useAuthToken } from "@/hooks/useAuthToken";
import { useSessionUser } from "@/hooks/useSessionUser";
import {
  fetchEventById,
  registerForWorkshop,
  payForEventByWallet,
  cancelEventRegistration,
  createStripePaymentIntent,
  finalizeStripePayment,
} from "@/lib/services/events";
import { EventType, type EventSummary } from "@/lib/types";
import { formatDateTime, formatRelative } from "@/lib/date";
import EventPaymentDialog from "@/components/events/EventPaymentDialog";
import EventCancellationDialog from "@/components/events/EventCancellationDialog";
import { fetchFavoriteEvents, addEventToFavorites } from "@/lib/services/users";
import { EventFeedbackSection } from "@/components/events/EventFeedbackSection";

const CANCELLATION_WINDOW_MS = 14 * 24 * 60 * 60 * 1000;

export default function EventDetailsPage() {
  const params = useParams<{ eventId: string }>();
  const eventId = params?.eventId;
  const token = useAuthToken();
  const user = useSessionUser();
  const { enqueueSnackbar } = useSnackbar();
  const queryClient = useQueryClient();
  const [isRegistered, setIsRegistered] = useState(false);
  const [paymentDialogOpen, setPaymentDialogOpen] = useState(false);
  const [paymentEvent, setPaymentEvent] = useState<EventSummary | null>(null);
  const [paymentStep, setPaymentStep] = useState<"method" | "card">("method");
  const [stripeIntent, setStripeIntent] = useState<
    { clientSecret: string; paymentIntentId: string } | null
  >(null);
  const [cardError, setCardError] = useState<string | null>(null);
  const [cancelDialogOpen, setCancelDialogOpen] = useState(false);
  const resetPaymentFlow = () => {
    setPaymentStep("method");
    setStripeIntent(null);
    setCardError(null);
  };

  const query = useQuery({
    queryKey: ["event", eventId, user?.id, token],
    queryFn: () => fetchEventById(eventId!, token ?? undefined, user?.id),
    enabled: Boolean(eventId && token),
  });

  const favoritesQuery = useQuery({
    queryKey: ["favorite-events", user?.id, token],
    queryFn: () => fetchFavoriteEvents(token ?? undefined),
    enabled: Boolean(token),
  });

  const event = query.data;
  const supportsRegistration =
    event?.eventType === EventType.Workshop || event?.eventType === EventType.Trip;
  const registeredCount = event?.registeredCount ?? 0;
  const totalCapacity = typeof event?.capacity === "number" ? event.capacity : undefined;
  const hasCapacity = typeof totalCapacity === "number";
  const remainingCapacity = hasCapacity ? Math.max((totalCapacity ?? 0) - registeredCount, 0) : undefined;
  const capacityReached = hasCapacity ? remainingCapacity === 0 : false;
  const registrationDeadlinePassed = event?.registrationDeadline
    ? dayjs(event.registrationDeadline).isBefore(dayjs())
    : false;
  const eventHasStarted = event?.startDate ? dayjs(event.startDate).isBefore(dayjs()) : false;

  useEffect(() => {
    setIsRegistered(Boolean(event?.isRegistered));
  }, [event?.isRegistered]);

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

  const vendorList = useMemo(() => {
    if (!event || !event.vendors || event.vendors.length === 0) return [];
    return event.vendors.map((vendor, index) => ({
      id: vendor.id ?? String(index),
      name: vendor.companyName ?? `Vendor ${index + 1}`,
    }));
  }, [event]);

  const isFavorite = useMemo(() => {
    if (!eventId || !favoritesQuery.data) return false;
    return favoritesQuery.data.some((favorite) => favorite.id === eventId);
  }, [eventId, favoritesQuery.data]);

  const registerMutation = useMutation({
    mutationFn: () => registerForWorkshop(eventId!, token ?? undefined),
    onSuccess: (response) => {
      setIsRegistered(true);
      const message =
        response.message ??
        (event ? `Registration successful for ${event.name}.` : "Registration successful.");
      enqueueSnackbar(message, { variant: "success" });
      queryClient.invalidateQueries({ queryKey: ["events", user?.id, token] });
      queryClient.invalidateQueries({
        queryKey: ["event", eventId, user?.id, token],
      });
    },
    onError: (error: unknown) => {
      const message = getErrorMessage(
        error,
        "Failed to register for this event."
      );
      enqueueSnackbar(message, { variant: "error" });
    },
  });

  const walletPaymentMutation = useMutation({
    mutationFn: () => payForEventByWallet(eventId!, token ?? undefined),
    onSuccess: (response) => {
      enqueueSnackbar(response.message ?? "Payment completed successfully.", {
        variant: "success",
      });
      queryClient.invalidateQueries({ queryKey: ["wallet-summary", token] });
      queryClient.invalidateQueries({ queryKey: ["event", eventId, user?.id, token] });
    },
    onError: (error: unknown) => {
      const message = getErrorMessage(error, "Failed to process wallet payment.");
      enqueueSnackbar(message, { variant: "error" });
    },
  });

  const createStripeIntentMutation = useMutation({
    mutationFn: () => createStripePaymentIntent(eventId!, token ?? undefined),
  });

  const finalizeStripePaymentMutation = useMutation({
    mutationFn: (paymentIntentId: string) =>
      finalizeStripePayment(eventId!, paymentIntentId, token ?? undefined),
  });

  const favoriteMutation = useMutation({
    mutationFn: () => addEventToFavorites(eventId!, token ?? undefined),
    onSuccess: (response) => {
      enqueueSnackbar(response.message ?? "Event saved to favorites.", {
        variant: "success",
      });
      queryClient.invalidateQueries({
        queryKey: ["favorite-events", user?.id, token],
      });
    },
    onError: (error: unknown) => {
      enqueueSnackbar(
        getErrorMessage(error, "Unable to save this event to favorites."),
        { variant: "error" }
      );
    },
  });

  const handleAddFavorite = () => {
    if (!eventId) {
      return;
    }
    if (!token) {
      enqueueSnackbar("You must be signed in to save favorites.", {
        variant: "info",
      });
      return;
    }
    if (isFavorite) {
      enqueueSnackbar("This event is already in your favorites.", {
        variant: "info",
      });
      return;
    }
    favoriteMutation.mutate();
  };

  const handleStartRegistration = () => {
    if (!event || !eventId) return;
    if (!token) {
      enqueueSnackbar("You must be signed in to register for events.", {
        variant: "warning",
      });
      return;
    }
    if (!supportsRegistration) {
      enqueueSnackbar("Only workshops and trips support online registration.", {
        variant: "info",
      });
      return;
    }
    if (registrationDeadlinePassed) {
      enqueueSnackbar("Registration deadline has passed.", {
        variant: "info",
      });
      return;
    }
    if (capacityReached) {
      enqueueSnackbar("This event is fully booked.", {
        variant: "info",
      });
      return;
    }
    if (isRegistered) {
      enqueueSnackbar("You have already registered for this event.", {
        variant: "info",
      });
      return;
    }

    resetPaymentFlow();
    setPaymentEvent(event);
    setPaymentDialogOpen(true);
  };

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
    if (!event) return;
    setCardError(null);
    try {
      await registerMutation.mutateAsync();
      if ((event.price ?? 0) > 0) {
        await walletPaymentMutation.mutateAsync();
      } else {
        enqueueSnackbar(`Registration confirmed for ${event.name}.`, {
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
    if (!event) return;
    if ((event.price ?? 0) <= 0) {
      enqueueSnackbar("Card payments are only required for paid events.", {
        variant: "info",
      });
      return;
    }

    try {
      setCardError(null);
      const intent = await createStripeIntentMutation.mutateAsync();
      setStripeIntent(intent);
      setPaymentStep("card");
    } catch (error) {
      const message = getErrorMessage(error, "Unable to start card payment.");
      setCardError(message);
      enqueueSnackbar(message, { variant: "error" });
    }
  };

  const handleCardPaymentSuccess = async (paymentIntentId: string) => {
    if (!event) return;
    try {
      setCardError(null);
      const response = await finalizeStripePaymentMutation.mutateAsync(paymentIntentId);
      enqueueSnackbar(response.message ?? `Payment confirmed for ${event.name}.`, {
        variant: "success",
      });
      queryClient.invalidateQueries({ queryKey: ["event", eventId, user?.id, token] });
      queryClient.invalidateQueries({ queryKey: ["events", user?.id, token] });
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

  const handleCancelRegistration = () => {
    if (!event) return;
    if (!canCancelRegistration) {
      enqueueSnackbar("Cancellations are only available until 14 days before the event.", {
        variant: "info",
      });
      return;
    }
    setCancelDialogOpen(true);
  };

  const confirmCancellation = () => {
    if (cancelRegistrationMutation.isPending) {
      return;
    }
    cancelRegistrationMutation.mutate();
  };

  const closeCancellationDialog = () => {
    if (cancelRegistrationMutation.isPending) {
      return;
    }
    setCancelDialogOpen(false);
  };

  const cancelRegistrationMutation = useMutation({
    mutationFn: () => cancelEventRegistration(eventId!, token ?? undefined),
    onSuccess: (response) => {
      enqueueSnackbar(response.message ?? "Registration cancelled and refunded", {
        variant: "success",
      });
      setIsRegistered(false);
      setCancelDialogOpen(false);
      queryClient.invalidateQueries({ queryKey: ["wallet-summary", token] });
      queryClient.invalidateQueries({ queryKey: ["event", eventId, user?.id, token] });
      queryClient.invalidateQueries({ queryKey: ["events", user?.id, token] });
    },
    onError: (error: unknown) => {
      const message = getErrorMessage(error, "Unable to cancel registration.");
      enqueueSnackbar(message, { variant: "error" });
    },
  });

  if (query.isLoading) {
    return (
      <Stack spacing={3}>
        <Skeleton variant="text" width="60%" height={48} />
        <Skeleton variant="rectangular" height={220} sx={{ borderRadius: 3 }} />
        <Skeleton variant="rectangular" height={300} sx={{ borderRadius: 3 }} />
      </Stack>
    );
  }

  if (query.isError) {
    return (
      <Alert severity="error" action={<Button onClick={() => query.refetch()}>Retry</Button>}>
        Unable to load event details.
      </Alert>
    );
  }

  if (!event) {
    return (
      <Alert severity="info">
        We couldn&apos;t find this event. It may have been archived or removed.
      </Alert>
    );
  }

  const cancellationWindowRemaining = event ? new Date(event.startDate).getTime() - Date.now() : 0;
  const canCancelRegistration = isRegistered && cancellationWindowRemaining >= CANCELLATION_WINDOW_MS;
  const registerDisabledReason = registrationDeadlinePassed
    ? "deadline"
    : capacityReached
      ? "capacity"
      : isRegistered
        ? "registered"
        : null;
  const registerButtonLabel =
    registerDisabledReason === "deadline"
      ? "Deadline passed"
      : registerDisabledReason === "capacity"
        ? "Fully booked"
        : registerDisabledReason === "registered"
          ? "Registered"
          : registerMutation.isPending
            ? "Registering..."
            : "Register";
  const registerButtonIcon =
    registerDisabledReason === "deadline"
      ? <EventBusyIcon />
      : registerDisabledReason === "capacity"
        ? <BlockIcon />
        : <EventIcon />;
  const canSubmitFeedback = Boolean(isRegistered && eventHasStarted);

  const paymentLoading = registerMutation.isPending || walletPaymentMutation.isPending;

  return (
    <Stack spacing={3}>
      <Stack direction="row" alignItems={{ xs: "flex-start", md: "center" }} justifyContent="space-between" spacing={2}>
        <Box>
          <Stack direction="row" spacing={1.5} alignItems="center">
            <Chip label={event.eventType} color="primary" variant="outlined" />
            <Typography variant="caption" color="text.secondary">
              Starts {formatRelative(event.startDate)}
            </Typography>
          </Stack>
          <Typography variant="h3" fontWeight={800} sx={{ mt: 1 }}>
            {event.name}
          </Typography>
          <Typography variant="body1" color="text.secondary" sx={{ mt: 2 }}>
            {event.description}
          </Typography>
        </Box>
        <Stack spacing={1} alignItems="flex-end">
          <Typography variant="subtitle2" color="text.secondary">
            Registration deadline
          </Typography>
          <Typography variant="h6">{formatDateTime(event.registrationDeadline)}</Typography>
          {supportsRegistration ? (
            <Stack direction="row" spacing={1} alignItems="center">
              <Button
                variant="contained"
                onClick={handleStartRegistration}
                startIcon={registerButtonIcon}
                disabled={Boolean(registerDisabledReason) || paymentLoading}
              >
                {paymentLoading ? "Processing..." : registerButtonLabel}
              </Button>
              {isRegistered ? (
                <Tooltip
                  title={
                    canCancelRegistration
                      ? "Cancel registration"
                      : "Cancellations are only available until 14 days before the event."
                  }
                >
                  <span>
                    <Button
                      variant="outlined"
                      color="error"
                      disabled={!canCancelRegistration || cancelRegistrationMutation.isPending}
                      onClick={handleCancelRegistration}
                    >
                      {cancelRegistrationMutation.isPending ? "Cancelling..." : "Cancel & refund"}
                    </Button>
                  </span>
                </Tooltip>
              ) : null}
            </Stack>
          ) : (
            <Typography variant="body2" color="text.secondary">
              Registration is managed offline for this event.
            </Typography>
          )}
          <Button
            variant="text"
            color="secondary"
            startIcon={
              isFavorite ? <FavoriteIcon color="error" /> : <FavoriteBorderIcon />
            }
            disabled={isFavorite || favoriteMutation.isPending}
            onClick={handleAddFavorite}
          >
            {isFavorite ? "Saved to favorites" : "Add to favorites"}
          </Button>
        </Stack>
      </Stack>

      <Grid container spacing={3}>
        <Grid size={{ xs: 12, md: 8 }}>
          <Stack spacing={2.5} sx={{ p: 3, backgroundColor: "#FFFFFF", borderRadius: 3 }}>
            <Typography variant="h6" fontWeight={700}>
              Schedule
            </Typography>
            <Stack spacing={1}>
              <DetailRow icon={<CalendarIcon />} label="Start" value={formatDateTime(event.startDate)} />
              <DetailRow icon={<CalendarIcon />} label="End" value={formatDateTime(event.endDate)} />
              <DetailRow icon={<LocationIcon />} label="Location" value={event.location} />
              {hasCapacity && remainingCapacity !== undefined && totalCapacity !== undefined ? (
                <DetailRow
                  icon={<PeopleIcon />}
                  label="Remaining capacity"
                  value={`${remainingCapacity.toLocaleString()}/${totalCapacity.toLocaleString()} attendees`}
                />
              ) : null}
              {event.price ? (
                <DetailRow
                  icon={<MonetizationIcon />}
                  label="Price"
                  value={`${event.price.toLocaleString()} EGP`}
                />
              ) : null}
            </Stack>
          </Stack>

          {event.participatingProfessors && event.participatingProfessors.length > 0 && (
            <Stack spacing={2} sx={{ p: 3, backgroundColor: "#FFFFFF", borderRadius: 3, mt: 3 }}>
              <Typography variant="h6" fontWeight={700}>
                Faculty & speakers
              </Typography>
              <Stack direction="row" spacing={1} flexWrap="wrap">
                {event.participatingProfessors.map((professor) => (
                  <Chip key={professor} label={professor} variant="outlined" />
                ))}
              </Stack>
            </Stack>
          )}
        </Grid>
        <Grid size={{ xs: 12, md: 4 }}>
          <Stack spacing={2.5} sx={{ p: 3, backgroundColor: "#FFFFFF", borderRadius: 3 }}>
            <Typography variant="h6" fontWeight={700}>
              Vendors & partners
            </Typography>
            {event.eventType === EventType.Bazaar ? (
              vendorList.length > 0 ? (
                <Stack spacing={1}>
                  {vendorList.map((vendor) => (
                    <Chip key={vendor.id} label={vendor.name} color="secondary" variant="outlined" />
                  ))}
                </Stack>
              ) : (
                <Typography variant="body2" color="text.secondary">
                  Vendors will be announced soon. Stay tuned!
                </Typography>
              )
            ) : (
              <Typography variant="body2" color="text.secondary">
                This event does not include vendor participation.
              </Typography>
            )}
            <Typography variant="caption" color="text.secondary">
              Vendor details are synced automatically from approved applications.
            </Typography>
          </Stack>

          <Stack spacing={2.5} sx={{ p: 3, backgroundColor: "#FFFFFF", borderRadius: 3, mt: 3 }}>
            <Typography variant="h6" fontWeight={700}>
              Timeline
            </Typography>
            <Stack spacing={1.5}>
              <TimelineItem label="Registration opens" value={dayjs(event.registrationDeadline).subtract(4, "week").format("MMM D, YYYY")}
              />
              <TimelineItem label="Registration closes" value={formatDateTime(event.registrationDeadline)} />
              <TimelineItem label="Event start" value={formatDateTime(event.startDate)} />
              <TimelineItem label="Event end" value={formatDateTime(event.endDate)} />
            </Stack>
          </Stack>
        </Grid>
      </Grid>

      <Box id="feedback">
        <EventFeedbackSection
          eventId={event.id}
          currentUserId={user?.id}
          token={token}
          canSubmitFeedback={canSubmitFeedback}
        />
      </Box>

      <EventPaymentDialog
        open={paymentDialogOpen}
        event={paymentEvent ?? event}
        loading={paymentLoading}
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
        event={event}
        loading={cancelRegistrationMutation.isPending}
        onConfirm={confirmCancellation}
        onClose={closeCancellationDialog}
      />
    </Stack>
  );
}

interface DetailRowProps {
  icon: React.ReactNode;
  label: string;
  value: string;
}

function DetailRow({ icon, label, value }: DetailRowProps) {
  return (
    <Stack direction="row" spacing={2} alignItems="center">
      <Box sx={{ color: "primary.main" }}>{icon}</Box>
      <Box>
        <Typography variant="subtitle2" fontWeight={600}>
          {label}
        </Typography>
        <Typography variant="body2" color="text.secondary">
          {value}
        </Typography>
      </Box>
    </Stack>
  );
}

interface TimelineItemProps {
  label: string;
  value: string;
}

function TimelineItem({ label, value }: TimelineItemProps) {
  return (
    <Stack>
      <Typography variant="subtitle2" fontWeight={600}>
        {label}
      </Typography>
      <Typography variant="body2" color="text.secondary">
        {value}
      </Typography>
    </Stack>
  );
}

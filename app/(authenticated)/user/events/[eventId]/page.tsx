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
import CalendarIcon from "@mui/icons-material/CalendarMonthRounded";
import LocationIcon from "@mui/icons-material/FmdGoodRounded";
import PeopleIcon from "@mui/icons-material/PeopleAltRounded";
import MonetizationIcon from "@mui/icons-material/MonetizationOnRounded";
import EventIcon from "@mui/icons-material/EventAvailableRounded";
import ArrowBackIcon from "@mui/icons-material/ArrowBackRounded";
import { useRouter } from "next/navigation";
import dayjs from "dayjs";
import { useSnackbar } from "notistack";
import { useAuthToken } from "@/hooks/useAuthToken";
import { useSessionUser } from "@/hooks/useSessionUser";
import { fetchEventById, registerForWorkshop } from "@/lib/services/events";
import { EventType } from "@/lib/types";
import { formatDateTime, formatRelative } from "@/lib/date";

export default function EventDetailsPage() {
  const params = useParams<{ eventId: string }>();
  const eventId = params?.eventId;
  const token = useAuthToken();
  const user = useSessionUser();
  const router = useRouter();
  const { enqueueSnackbar } = useSnackbar();
  const queryClient = useQueryClient();
  const [isRegistered, setIsRegistered] = useState(false);

  const query = useQuery({
    queryKey: ["event", eventId, user?.id, token],
    queryFn: () => fetchEventById(eventId!, token ?? undefined, user?.id),
    enabled: Boolean(eventId && token),
  });

  const event = query.data;
  const supportsRegistration =
    event?.eventType === EventType.Workshop || event?.eventType === EventType.Trip;

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

  const handleRegister = () => {
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
    if (new Date(event.registrationDeadline).getTime() < Date.now()) {
      enqueueSnackbar("Registration deadline has passed.", {
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

    registerMutation.mutate();
  };

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

  return (
    <Stack spacing={3}>
      <Stack direction="row" alignItems={{ xs: "flex-start", md: "center" }} justifyContent="space-between" spacing={2}>
        <Box>
          <Button startIcon={<ArrowBackIcon />} onClick={() => router.back()} sx={{ mb: 1 }}>
            Back to events
          </Button>
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
            <Button
              variant="contained"
              onClick={handleRegister}
              startIcon={<EventIcon />}
              disabled={isRegistered || registerMutation.isPending}
            >
              {isRegistered ? "Registered" : "Register"}
            </Button>
          ) : (
            <Typography variant="body2" color="text.secondary">
              Registration is managed offline for this event.
            </Typography>
          )}
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
              {event.capacity ? (
                <DetailRow
                  icon={<PeopleIcon />}
                  label="Capacity"
                  value={`${event.capacity.toLocaleString()} attendees`}
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

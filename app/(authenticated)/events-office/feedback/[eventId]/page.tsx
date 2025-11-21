"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import Stack from "@mui/material/Stack";
import Typography from "@mui/material/Typography";
import Card from "@mui/material/Card";
import CardContent from "@mui/material/CardContent";
import Alert from "@mui/material/Alert";
import Button from "@mui/material/Button";
import Chip from "@mui/material/Chip";
import Divider from "@mui/material/Divider";
import Skeleton from "@mui/material/Skeleton";
import ArrowBackIcon from "@mui/icons-material/ArrowBackRounded";
import CalendarIcon from "@mui/icons-material/EventRounded";
import LocationIcon from "@mui/icons-material/FmdGoodRounded";
import { useAuthToken } from "@/hooks/useAuthToken";
import { useSessionUser } from "@/hooks/useSessionUser";
import { fetchEventById } from "@/lib/services/events";
import { formatDateTime } from "@/lib/date";
import { EventFeedbackSection } from "@/components/events/EventFeedbackSection";
import type { EventSummary } from "@/lib/types";

export default function EventsOfficeEventFeedbackPage() {
  const params = useParams<{ eventId: string }>();
  const eventId = params?.eventId;
  const token = useAuthToken();
  const user = useSessionUser();

  const eventQuery = useQuery({
    queryKey: ["events-office-feedback-event", eventId, token, user?.id],
    queryFn: () => fetchEventById(eventId!, token ?? undefined, user?.id),
    enabled: Boolean(eventId && token),
  });

  if (!token) {
    return (
      <Alert severity="info">
        Sign in with an Events Office account to review event feedback.
      </Alert>
    );
  }

  if (!eventId) {
    return (
      <Alert severity="error">
        An event identifier is required to view its feedback page.
      </Alert>
    );
  }

  const event: EventSummary | null = eventQuery.data ?? null;

  return (
    <Stack spacing={4}>
      <Stack
        direction={{ xs: "column", sm: "row" }}
        alignItems={{ xs: "flex-start", sm: "center" }}
        justifyContent="space-between"
        spacing={2}
      >
        <Stack spacing={0.5}>
          <Typography variant="h4" fontWeight={700}>
            {event?.name ?? "Event feedback"}
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Review comments and ratings gathered for this event.
          </Typography>
        </Stack>
        <Button
          component={Link}
          href="/events-office/feedback"
          startIcon={<ArrowBackIcon />}
          variant="outlined"
        >
          Back to list
        </Button>
      </Stack>

      <Card sx={{ borderRadius: 3 }}>
        <CardContent>
          {eventQuery.isLoading ? (
            <Stack spacing={1.5}>
              <Skeleton variant="text" width="60%" height={32} />
              <Skeleton variant="text" width="40%" height={24} />
              <Skeleton variant="rectangular" height={96} sx={{ borderRadius: 2 }} />
            </Stack>
          ) : eventQuery.isError ? (
            <Alert severity="error">
              Unable to load event details. You can still review the feedback below.
            </Alert>
          ) : event ? (
            <Stack spacing={1.5}>
              <Stack direction="row" spacing={1} flexWrap="wrap" rowGap={0.5}>
                <Chip label={event.eventType} color="primary" size="small" />
                <Chip label={event.location} variant="outlined" size="small" />
                {event.archived ? (
                  <Chip label="Archived" size="small" color="default" />
                ) : null}
              </Stack>
              <Typography variant="h5" fontWeight={700}>
                {event.name}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                {event.description}
              </Typography>
              <Divider sx={{ my: 1.5 }} />
              <Stack
                direction={{ xs: "column", sm: "row" }}
                spacing={3}
                divider={
                  <Divider
                    orientation="vertical"
                    flexItem
                    sx={{ display: { xs: "none", sm: "block" } }}
                  />
                }
              >
                <Stack direction="row" spacing={1} alignItems="center">
                  <CalendarIcon color="primary" />
                  <Stack spacing={0}>
                    <Typography variant="subtitle2" color="text.secondary">
                      Starts
                    </Typography>
                    <Typography variant="body2">
                      {formatDateTime(event.startDate)}
                    </Typography>
                  </Stack>
                </Stack>
                <Stack direction="row" spacing={1} alignItems="center">
                  <CalendarIcon color="primary" />
                  <Stack spacing={0}>
                    <Typography variant="subtitle2" color="text.secondary">
                      Ends
                    </Typography>
                    <Typography variant="body2">
                      {formatDateTime(event.endDate)}
                    </Typography>
                  </Stack>
                </Stack>
                <Stack direction="row" spacing={1} alignItems="center">
                  <LocationIcon color="primary" />
                  <Stack spacing={0}>
                    <Typography variant="subtitle2" color="text.secondary">
                      Location
                    </Typography>
                    <Typography variant="body2">{event.location}</Typography>
                  </Stack>
                </Stack>
              </Stack>
            </Stack>
          ) : (
            <Alert severity="info">
              This event is not part of the current listings, but you can still
              review any submitted feedback below.
            </Alert>
          )}
        </CardContent>
      </Card>

      <EventFeedbackSection
        key={eventId}
        eventId={eventId}
        currentUserId={user?.id}
        token={token}
        canSubmitFeedback={false}
        readOnly
      />
    </Stack>
  );
}

"use client";

import { useEffect, useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import Stack from "@mui/material/Stack";
import Typography from "@mui/material/Typography";
import Grid from "@mui/material/Grid";
import Card from "@mui/material/Card";
import CardContent from "@mui/material/CardContent";
import List from "@mui/material/List";
import ListItem from "@mui/material/ListItem";
import ListItemButton from "@mui/material/ListItemButton";
import ListItemText from "@mui/material/ListItemText";
import Divider from "@mui/material/Divider";
import Alert from "@mui/material/Alert";
import TextField from "@mui/material/TextField";
import Button from "@mui/material/Button";
import Chip from "@mui/material/Chip";
import Box from "@mui/material/Box";
import InputAdornment from "@mui/material/InputAdornment";
import RefreshIcon from "@mui/icons-material/RefreshRounded";
import SearchIcon from "@mui/icons-material/SearchRounded";
import RateReviewIcon from "@mui/icons-material/RateReviewRounded";
import { useAuthToken } from "@/hooks/useAuthToken";
import { useSessionUser } from "@/hooks/useSessionUser";
import {
  EventFiltersBar,
  type EventFilters,
} from "@/components/events/EventFiltersBar";
import { filterAndSortEvents } from "@/lib/events/filters";
import { fetchUpcomingEvents } from "@/lib/services/events";
import { EventFeedbackSection } from "@/components/events/EventFeedbackSection";
import { formatDateTime } from "@/lib/date";
import type { EventSummary } from "@/lib/types";

export default function EventsOfficeFeedbackPage() {
  const token = useAuthToken();
  const user = useSessionUser();
  const [filters, setFilters] = useState<EventFilters>({
    search: "",
    eventType: "All",
    location: "All",
    professor: "",
    sessionType: "All",
    startDate: null,
    endDate: null,
    sortOrder: "asc",
  });
  const [selectedEventId, setSelectedEventId] = useState<string | null>(null);
  const [manualEventId, setManualEventId] = useState("");

  const eventsQuery = useQuery({
    queryKey: ["events", "feedback", token, user?.id],
    queryFn: () => fetchUpcomingEvents(token ?? undefined, user?.id),
    enabled: Boolean(token),
  });

  const events = eventsQuery.data ?? [];

  const professorOptions = useMemo(
    () =>
      Array.from(
        new Set(
          events
            .flatMap((event) => event.participatingProfessors ?? [])
            .filter((name): name is string => Boolean(name))
        )
      ),
    [events]
  );

  const filteredEvents = useMemo(
    () =>
      filterAndSortEvents(events, filters, {
        getEventType: (event) => event.eventType,
        getLocation: (event) => event.location,
        getProfessorNames: (event) => event.participatingProfessors ?? [],
        getSearchValues: (event) => [event.name, event.description],
      }),
    [events, filters]
  );

  useEffect(() => {
    if (!selectedEventId && filteredEvents.length > 0) {
      setSelectedEventId(filteredEvents[0].id);
    }
  }, [filteredEvents, selectedEventId]);

  const selectedEvent: EventSummary | undefined = useMemo(() => {
    if (!selectedEventId) return undefined;
    return events.find((event) => event.id === selectedEventId);
  }, [events, selectedEventId]);

  const handleManualSelection = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const trimmed = manualEventId.trim();
    if (!trimmed) return;
    setSelectedEventId(trimmed);
    setManualEventId("");
  };

  if (!token) {
    return (
      <Alert severity="info">
        Sign in with an Events Office account to review event feedback.
      </Alert>
    );
  }

  return (
    <Stack spacing={4}>
      <Stack spacing={1}>
        <Typography variant="h4" fontWeight={700}>
          Event feedback console
        </Typography>
        <Typography variant="body1" color="text.secondary">
          Track ratings and comments from students, staff, professors, TAs, and
          administrators in one place.
        </Typography>
        <Typography variant="body2" color="text.secondary">
          Signed in as{" "}
          <strong>{user?.name ?? user?.email ?? "Events Office"}</strong>. Use
          the list to pick an event or jump directly using its identifier.
        </Typography>
      </Stack>

      <Grid container spacing={3}>
        <Grid size={{ xs: 12, md: 5 }}>
          <Stack spacing={2}>
            <EventFiltersBar
              value={filters}
              onChange={setFilters}
              searchPlaceholder="Search events"
              showProfessorFilter={professorOptions.length > 0}
              professors={professorOptions}
            />

            <Card sx={{ borderRadius: 3 }}>
              <CardContent>
                <Stack
                  component="form"
                  spacing={2}
                  onSubmit={handleManualSelection}
                >
                  <Typography variant="subtitle1" fontWeight={600}>
                    Jump to event by ID
                  </Typography>
                  <TextField
                    value={manualEventId}
                    onChange={(event) => setManualEventId(event.target.value)}
                    placeholder="e.g. 675f1ead2b6e4b8cd6ed4fa1"
                    InputProps={{
                      startAdornment: (
                        <InputAdornment position="start">
                          <SearchIcon fontSize="small" />
                        </InputAdornment>
                      ),
                    }}
                    helperText="Use this for archived or past events not listed below."
                  />
                  <Button
                    type="submit"
                    variant="contained"
                    startIcon={<RateReviewIcon />}
                  >
                    View feedback
                  </Button>
                </Stack>
              </CardContent>
            </Card>

            <Card sx={{ borderRadius: 3, flexGrow: 1 }}>
              <CardContent>
                <Stack
                  direction="row"
                  spacing={1}
                  alignItems="center"
                  justifyContent="space-between"
                  mb={1}
                >
                  <Typography variant="subtitle1" fontWeight={600}>
                    Active events
                  </Typography>
                  <Button
                    size="small"
                    startIcon={<RefreshIcon fontSize="small" />}
                    onClick={() => eventsQuery.refetch()}
                    disabled={eventsQuery.isFetching}
                  >
                    Refresh
                  </Button>
                </Stack>
                {eventsQuery.isLoading ? (
                  <Stack spacing={1}>
                    {Array.from({ length: 3 }).map((_, index) => (
                      <Box
                        key={`feedback-skeleton-${index}`}
                        sx={{
                          height: 52,
                          borderRadius: 2,
                          backgroundColor: "rgba(148,163,184,0.18)",
                        }}
                      />
                    ))}
                  </Stack>
                ) : filteredEvents.length === 0 ? (
                  <Alert severity="info">
                    No events match your filters. Adjust the search criteria to
                    view results.
                  </Alert>
                ) : (
                  <List dense disablePadding>
                    {filteredEvents.map((event) => (
                      <ListItem key={event.id} disablePadding>
                        <ListItemButton
                          selected={selectedEventId === event.id}
                          onClick={() => setSelectedEventId(event.id)}
                          sx={{ borderRadius: 2, mb: 0.5 }}
                        >
                          <ListItemText
                            primary={
                              <Stack
                                direction="row"
                                spacing={1}
                                alignItems="center"
                              >
                                <Typography variant="subtitle2">
                                  {event.name}
                                </Typography>
                                <Chip
                                  label={event.eventType}
                                  size="small"
                                  color="primary"
                                />
                              </Stack>
                            }
                            secondary={`Starts ${formatDateTime(event.startDate)} · ${event.location}`}
                          />
                        </ListItemButton>
                      </ListItem>
                    ))}
                  </List>
                )}
              </CardContent>
            </Card>
          </Stack>
        </Grid>

        <Grid size={{ xs: 12, md: 7 }}>
          <Stack spacing={2}>
            <Card sx={{ borderRadius: 3 }}>
              <CardContent>
                <Stack spacing={1}>
                  <Typography variant="subtitle1" fontWeight={700}>
                    Feedback overview
                  </Typography>
                  {selectedEvent ? (
                    <Stack spacing={1}>
                      <Stack
                        direction="row"
                        spacing={1}
                        flexWrap="wrap"
                        rowGap={0.5}
                      >
                        <Chip
                          label={selectedEvent.eventType}
                          color="primary"
                          size="small"
                        />
                        <Chip
                          label={selectedEvent.location}
                          variant="outlined"
                          size="small"
                        />
                      </Stack>
                      <Typography variant="h6">
                        {selectedEvent.name}
                      </Typography>
                      <Typography variant="body2" color="text.secondary">
                        {selectedEvent.description}
                      </Typography>
                      <Divider sx={{ my: 1.5 }} />
                      <Stack direction="row" spacing={2}>
                        <Stack spacing={0}>
                          <Typography
                            variant="subtitle2"
                            color="text.secondary"
                          >
                            Start
                          </Typography>
                          <Typography variant="body2">
                            {formatDateTime(selectedEvent.startDate)}
                          </Typography>
                        </Stack>
                        <Stack spacing={0}>
                          <Typography
                            variant="subtitle2"
                            color="text.secondary"
                          >
                            End
                          </Typography>
                          <Typography variant="body2">
                            {formatDateTime(selectedEvent.endDate)}
                          </Typography>
                        </Stack>
                      </Stack>
                    </Stack>
                  ) : selectedEventId ? (
                    <Alert severity="info">
                      Showing feedback for event ID{" "}
                      <strong>{selectedEventId}</strong>. Details will load once
                      the event exists in the current listings.
                    </Alert>
                  ) : (
                    <Alert severity="info">
                      Select an event to start reviewing community insights.
                    </Alert>
                  )}
                </Stack>
              </CardContent>
            </Card>

            {selectedEventId ? (
              <EventFeedbackSection
                key={selectedEventId}
                eventId={selectedEventId}
                currentUserId={user?.id}
                token={token}
                canSubmitFeedback={false}
                readOnly
              />
            ) : null}
          </Stack>
        </Grid>
      </Grid>
    </Stack>
  );
}


"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import Stack from "@mui/material/Stack";
import Typography from "@mui/material/Typography";
import Card from "@mui/material/Card";
import CardContent from "@mui/material/CardContent";
import List from "@mui/material/List";
import ListItem from "@mui/material/ListItem";
import ListItemButton from "@mui/material/ListItemButton";
import ListItemText from "@mui/material/ListItemText";
import Alert from "@mui/material/Alert";
import TextField from "@mui/material/TextField";
import Button from "@mui/material/Button";
import Chip from "@mui/material/Chip";
import Box from "@mui/material/Box";
import InputAdornment from "@mui/material/InputAdornment";
import RefreshIcon from "@mui/icons-material/RefreshRounded";
import SearchIcon from "@mui/icons-material/SearchRounded";
import { useAuthToken } from "@/hooks/useAuthToken";
import { useSessionUser } from "@/hooks/useSessionUser";
import { fetchUpcomingEvents } from "@/lib/services/events";
import { formatDateTime } from "@/lib/date";
import type { EventSummary } from "@/lib/types";

export default function EventsOfficeFeedbackPage() {
  const token = useAuthToken();
  const user = useSessionUser();
  const [searchTerm, setSearchTerm] = useState("");

  const eventsQuery = useQuery({
    queryKey: ["events", "feedback", token, user?.id],
    queryFn: () => fetchUpcomingEvents(token ?? undefined, user?.id),
    enabled: Boolean(token),
  });

  const events = useMemo(
    () => eventsQuery.data ?? [],
    [eventsQuery.data]
  );

  const filteredEvents = useMemo(() => {
    const trimmed = searchTerm.trim().toLowerCase();
    if (!trimmed) {
      return events;
    }
    return events.filter((event) => {
      const title = event.name.toLowerCase();
      const type = event.eventType.toLowerCase();
      return title.includes(trimmed) || type.includes(trimmed);
    });
  }, [events, searchTerm]);

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
          Review student, staff, professor, TA, and administrator feedback per
          event.
        </Typography>
        <Typography variant="body2" color="text.secondary">
          Signed in as{" "}
          <strong>{user?.name ?? user?.email ?? "Events Office"}</strong>. Pick
          an event below to open its feedback page.
        </Typography>
      </Stack>

      <Card sx={{ borderRadius: 3 }}>
          <CardContent>
            <Stack spacing={3}>
              <Stack
                direction={{ xs: "column", sm: "row" }}
                spacing={2}
                alignItems={{ xs: "flex-start", sm: "center" }}
                justifyContent="space-between"
              >
                <Stack spacing={0.5}>
                  <Typography variant="subtitle1" fontWeight={700}>
                    Events with feedback
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    Click an event to open its dedicated comments and ratings
                    page.
                  </Typography>
                </Stack>
                <Button
                  size="small"
                  startIcon={<RefreshIcon fontSize="small" />}
                  onClick={() => eventsQuery.refetch()}
                  disabled={eventsQuery.isFetching}
                >
                  Refresh
                </Button>
              </Stack>
              <TextField
                value={searchTerm}
                onChange={(event) => setSearchTerm(event.target.value)}
                placeholder="Search by title or event type"
                InputProps={{
                  startAdornment: (
                    <InputAdornment position="start">
                      <SearchIcon fontSize="small" />
                    </InputAdornment>
                  ),
                }}
              />
              {eventsQuery.isLoading ? (
                <Stack spacing={1}>
                  {Array.from({ length: 4 }).map((_, index) => (
                    <Box
                      key={`feedback-skeleton-${index}`}
                      sx={{
                        height: 64,
                        borderRadius: 2,
                        backgroundColor: "rgba(148,163,184,0.18)",
                      }}
                    />
                  ))}
                </Stack>
              ) : eventsQuery.isError ? (
                <Alert severity="error">
                  Unable to load events. Try refreshing the list.
                </Alert>
              ) : filteredEvents.length === 0 ? (
                <Alert severity="info">
                  No events match that search. Try a different keyword.
                </Alert>
              ) : (
                <List dense disablePadding>
                  {filteredEvents.map((event: EventSummary) => (
                    <ListItem key={event.id} disablePadding>
                      <ListItemButton
                        component={Link}
                        href={`/events-office/feedback/${event.id}`}
                        sx={{
                          borderRadius: 2,
                          mb: 0.5,
                          alignItems: "flex-start",
                        }}
                      >
                        <ListItemText
                          primary={
                            <Stack
                              direction="row"
                              spacing={1}
                              alignItems="center"
                              flexWrap="wrap"
                              rowGap={0.5}
                            >
                              <Typography variant="subtitle2" fontWeight={600}>
                                {event.name}
                              </Typography>
                              <Chip
                                label={event.eventType}
                                size="small"
                                color="primary"
                              />
                            </Stack>
                          }
                          secondary={
                            <Typography variant="body2" color="text.secondary">
                              Starts {formatDateTime(event.startDate)} ·{" "}
                              {event.location}
                            </Typography>
                          }
                        />
                      </ListItemButton>
                    </ListItem>
                  ))}
                </List>
              )}
            </Stack>
          </CardContent>
      </Card>
    </Stack>
  );
}

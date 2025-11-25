"use client";

import { useEffect, useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import Stack from "@mui/material/Stack";
import Typography from "@mui/material/Typography";
import Card from "@mui/material/Card";
import CardContent from "@mui/material/CardContent";
import Autocomplete from "@mui/material/Autocomplete";
import TextField from "@mui/material/TextField";
import Alert from "@mui/material/Alert";
import Divider from "@mui/material/Divider";
import Chip from "@mui/material/Chip";
import Paper from "@mui/material/Paper";
import Avatar from "@mui/material/Avatar";
import Tooltip from "@mui/material/Tooltip";
import CircularProgress from "@mui/material/CircularProgress";
import Rating from "@mui/material/Rating";
import { DataGrid, type GridColDef } from "@mui/x-data-grid";
import { useAuthToken } from "@/hooks/useAuthToken";
import { useSessionUser } from "@/hooks/useSessionUser";
import { fetchUpcomingEvents } from "@/lib/services/events";
import { deleteEventComment, fetchEventFeedback } from "@/lib/services/feedback";
import type { EventComment, EventRatingEntry } from "@/lib/types";
import { formatDateTime, formatRelative } from "@/lib/date";
import IconButton from "@mui/material/IconButton";
import DeleteIcon from "@mui/icons-material/DeleteRounded";
import { useSnackbar } from "notistack";
import { AuthRole } from "@/lib/types";

interface EventFeedbackExplorerProps {
  title?: string;
  subtitle?: string;
  includePastEvents?: boolean;
}

export function EventFeedbackExplorer({
  title = "Event feedback",
  subtitle = "Browse event ratings and comments across the platform.",
  includePastEvents = false,
}: EventFeedbackExplorerProps) {
  const token = useAuthToken();
  const sessionUser = useSessionUser();
  const [selectedEventId, setSelectedEventId] = useState<string | null>(null);
  const queryClient = useQueryClient();
  const { enqueueSnackbar } = useSnackbar();

  const eventsQuery = useQuery({
    queryKey: ["events", "feedback-explorer", token, includePastEvents],
    queryFn: () =>
      fetchUpcomingEvents(token ?? undefined, sessionUser?.id, {
        includePast: includePastEvents,
      }),
    enabled: Boolean(token),
  });

  useEffect(() => {
    if (!selectedEventId && eventsQuery.data && eventsQuery.data.length > 0) {
      setSelectedEventId(eventsQuery.data[0].id);
    }
  }, [eventsQuery.data, selectedEventId]);

  const feedbackQuery = useQuery({
    queryKey: ["event-feedback", selectedEventId, token, "explorer"],
    queryFn: () => fetchEventFeedback(selectedEventId!, token ?? undefined),
    enabled: Boolean(selectedEventId && token),
  });

  const eventOptions = useMemo(
    () =>
      (eventsQuery.data ?? []).map((event) => ({
        label: event.name,
        id: event.id,
        subtitle: `${event.eventType} • ${formatDateTime(event.startDate)}`,
      })),
    [eventsQuery.data]
  );

  const selectedOption = eventOptions.find((option) => option.id === selectedEventId) ?? null;
  const ratings = feedbackQuery.data?.ratings?.ratings ?? [];
  const comments = feedbackQuery.data?.comments ?? [];
  const averageRating = feedbackQuery.data?.ratings?.averageRating ?? 0;
  const totalRatings = feedbackQuery.data?.ratings?.totalRatings ?? 0;
  const canModerate =
    sessionUser?.role === AuthRole.Admin || sessionUser?.role === AuthRole.EventOffice;

  const deleteMutation = useMutation({
    mutationFn: (commentId: string) => deleteEventComment(commentId, token ?? undefined),
    onSuccess: () => {
      enqueueSnackbar("Comment deleted.", { variant: "success" });
      queryClient.invalidateQueries({
        queryKey: ["event-feedback", selectedEventId, token, "explorer"],
      });
    },
    onError: (error: unknown) => {
      const message = error instanceof Error ? error.message : "Failed to delete comment.";
      enqueueSnackbar(message, { variant: "error" });
    },
  });

  const ratingColumns = useMemo<GridColDef<EventRatingEntry>[]>(
    () => [
      {
        field: "user",
        headerName: "Attendee",
        flex: 1,
        valueGetter: (_value, row) =>
          row.user && (row.user.firstName || row.user.lastName)
            ? `${row.user.firstName ?? ""} ${row.user.lastName ?? ""}`.trim()
            : "Community member",
      },
      {
        field: "role",
        headerName: "Role",
        flex: 0.6,
        valueGetter: (_value, row) => row.user?.role ?? "Attendee",
      },
      {
        field: "rating",
        headerName: "Rating",
        flex: 0.6,
        renderCell: ({ value }) => (
          <Rating value={value ?? 0} precision={0.5} readOnly size="small" />
        ),
      },
      {
        field: "comment",
        headerName: "Comment",
        flex: 1.4,
      },
      {
        field: "createdAt",
        headerName: "Submitted",
        flex: 0.8,
        renderCell: ({ row }) => (row.createdAt ? formatDateTime(row.createdAt) : "—"),
      },
    ],
    []
  );

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
          <Stack spacing={2}>
            <Typography variant="subtitle1" fontWeight={700}>
              Choose an event
            </Typography>
            {eventsQuery.isLoading ? (
              <Stack direction="row" spacing={1} alignItems="center">
                <CircularProgress size={20} />
                <Typography variant="body2" color="text.secondary">
                  Loading events…
                </Typography>
              </Stack>
            ) : eventsQuery.isError ? (
              <Alert severity="error">
                Unable to load events. Please refresh the page.
              </Alert>
            ) : eventOptions.length === 0 ? (
              <Alert severity="info">No upcoming events found.</Alert>
            ) : (
              <Autocomplete
                options={eventOptions}
                value={selectedOption}
                onChange={(_event, option) => setSelectedEventId(option?.id ?? null)}
                getOptionLabel={(option) => option.label}
                renderInput={(params) => (
                  <TextField {...params} label="Search events" placeholder="Start typing a name" />
                )}
                renderOption={(props, option) => (
                  <li {...props} key={option.id}>
                    <Stack>
                      <Typography component="span" variant="body1" fontWeight={600}>
                        {option.label}
                      </Typography>
                      <Typography component="span" variant="caption" color="text.secondary">
                        {option.subtitle}
                      </Typography>
                    </Stack>
                  </li>
                )}
              />
            )}
          </Stack>
        </CardContent>
      </Card>

      {feedbackQuery.isLoading ? (
        <Stack alignItems="center" justifyContent="center" minHeight={280}>
          <CircularProgress />
        </Stack>
      ) : feedbackQuery.isError ? (
        <Alert severity="error">
          Could not load feedback for the selected event.
        </Alert>
      ) : !selectedEventId ? (
        <Alert severity="info">Select an event to see its feedback.</Alert>
      ) : (
        <Stack spacing={3}>
          <Stack direction={{ xs: "column", md: "row" }} spacing={3}>
            <Card sx={{ flex: 1, borderRadius: 3 }}>
              <CardContent>
                <Stack spacing={2}>
                  <Stack direction="row" spacing={2} alignItems="center">
                    <Typography variant="h3" fontWeight={800}>
                      {averageRating.toFixed(1)}
                    </Typography>
                    <Stack spacing={0}>
                      <Typography variant="subtitle2" color="text.secondary">
                        Average rating
                      </Typography>
                      <Rating value={averageRating} precision={0.1} readOnly size="large" />
                    </Stack>
                  </Stack>
                  <Typography variant="body2" color="text.secondary">
                    Based on {totalRatings} {totalRatings === 1 ? "response" : "responses"}.
                  </Typography>
                  <Divider flexItem />
                  <Typography variant="subtitle1" fontWeight={600}>
                    Ratings
                  </Typography>
                  {ratings.length === 0 ? (
                    <Alert severity="info">No ratings yet for this event.</Alert>
                  ) : (
                    <DataGrid
                      autoHeight
                      rows={ratings}
                      getRowId={(row) => row.id}
                      columns={ratingColumns}
                      disableRowSelectionOnClick
                      disableColumnMenu
                      pageSizeOptions={[5, 10]}
                      initialState={{
                        pagination: { paginationModel: { pageSize: 5, page: 0 } },
                      }}
                    />
                  )}
                </Stack>
              </CardContent>
            </Card>

            <Card sx={{ flex: 1, borderRadius: 3 }}>
              <CardContent>
                <Stack spacing={2}>
                  <Typography variant="subtitle1" fontWeight={600}>
                    Comments
                  </Typography>
                  {comments.length === 0 ? (
                    <Alert severity="info">No comments have been shared for this event.</Alert>
                  ) : (
                    <Stack spacing={1.5}>
                      {comments.map((comment) => (
                        <CommentCard
                          key={comment.id}
                          comment={comment}
                          canDelete={canModerate}
                          onDelete={() => deleteMutation.mutate(comment.id)}
                          deleting={deleteMutation.isPending && deleteMutation.variables === comment.id}
                        />
                      ))}
                    </Stack>
                  )}
                </Stack>
              </CardContent>
            </Card>
          </Stack>

          <Chip
            label="Feedback data refreshes automatically after attendees submit new responses."
            variant="outlined"
          />
        </Stack>
      )}
    </Stack>
  );
}

function CommentCard({
  comment,
  canDelete,
  deleting = false,
  onDelete,
}: {
  comment: EventComment;
  canDelete?: boolean;
  deleting?: boolean;
  onDelete?: () => void;
}) {
  const displayName =
    comment.user && (comment.user.firstName || comment.user.lastName)
      ? `${comment.user.firstName ?? ""} ${comment.user.lastName ?? ""}`.trim()
      : "Community member";
  const initials = displayName
    .split(" ")
    .filter(Boolean)
    .map((part) => part[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();

  return (
    <Paper variant="outlined" sx={{ p: 2, borderRadius: 2 }}>
      <Stack spacing={1.25}>
        <Stack direction="row" spacing={1.5} alignItems="center">
          <Avatar sx={{ bgcolor: "primary.main", width: 38, height: 38 }}>
            {initials || "U"}
          </Avatar>
          <Stack spacing={0}>
            <Typography variant="subtitle2" fontWeight={600}>
              {displayName}
            </Typography>
            <Typography variant="caption" color="text.secondary">
              {comment.user?.role ?? "Attendee"}
            </Typography>
          </Stack>
          <Tooltip title={formatDateTime(comment.createdAt)}>
            <Typography variant="caption" color="text.secondary" sx={{ ml: "auto" }}>
              {formatRelative(comment.createdAt)}
            </Typography>
          </Tooltip>
          {canDelete ? (
            <Tooltip title="Delete comment">
              <span>
                <IconButton
                  size="small"
                  color="error"
                  onClick={onDelete}
                  disabled={deleting}
                >
                  <DeleteIcon fontSize="small" />
                </IconButton>
              </span>
            </Tooltip>
          ) : null}
        </Stack>
        <Typography variant="body2">{comment.content}</Typography>
      </Stack>
    </Paper>
  );
}

export default EventFeedbackExplorer;

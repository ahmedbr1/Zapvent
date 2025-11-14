"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import Stack from "@mui/material/Stack";
import Typography from "@mui/material/Typography";
import Card from "@mui/material/Card";
import CardContent from "@mui/material/CardContent";
import Rating from "@mui/material/Rating";
import TextField from "@mui/material/TextField";
import Divider from "@mui/material/Divider";
import Alert from "@mui/material/Alert";
import Skeleton from "@mui/material/Skeleton";
import Paper from "@mui/material/Paper";
import Avatar from "@mui/material/Avatar";
import Tooltip from "@mui/material/Tooltip";
import LoadingButton from "@mui/lab/LoadingButton";
import RateReviewIcon from "@mui/icons-material/RateReviewRounded";
import ChatIcon from "@mui/icons-material/ChatRounded";
import { useSnackbar } from "notistack";
import { fetchEventFeedback, submitEventComment, submitEventRating } from "@/lib/services/feedback";
import type { EventComment } from "@/lib/types";
import { formatDateTime, formatRelative } from "@/lib/date";

interface EventFeedbackSectionProps {
  eventId: string;
  token: string | null;
  currentUserId?: string;
  canSubmitFeedback: boolean;
}

export function EventFeedbackSection({
  eventId,
  token,
  currentUserId,
  canSubmitFeedback,
}: EventFeedbackSectionProps) {
  const queryClient = useQueryClient();
  const { enqueueSnackbar } = useSnackbar();
  const [ratingValue, setRatingValue] = useState<number | null>(4);
  const [ratingNotes, setRatingNotes] = useState("");
  const [commentValue, setCommentValue] = useState("");
  const ratingPrefilled = useRef(false);

  const feedbackQuery = useQuery({
    queryKey: ["event-feedback", eventId, token],
    queryFn: () => fetchEventFeedback(eventId, token ?? undefined),
    enabled: Boolean(eventId && token),
  });

  const existingRating = useMemo(() => {
    if (!feedbackQuery.data || !currentUserId) {
      return null;
    }
    return (
      feedbackQuery.data.ratings.ratings.find(
        (entry) => entry.user?.id === currentUserId
      ) ?? null
    );
  }, [currentUserId, feedbackQuery.data]);

  useEffect(() => {
    if (existingRating && !ratingPrefilled.current) {
      setRatingValue(existingRating.rating);
      setRatingNotes(existingRating.comment ?? "");
      ratingPrefilled.current = true;
    }
  }, [existingRating]);

  const ratingsSummary = feedbackQuery.data?.ratings;
  const averageDisplay =
    typeof ratingsSummary?.averageRating === "number"
      ? ratingsSummary.averageRating.toFixed(1)
      : "0.0";
  const comments = feedbackQuery.data?.comments ?? [];

  const ratingMutation = useMutation({
    mutationFn: (payload: { rating: number; comment?: string }) =>
      submitEventRating(eventId, payload, token ?? undefined),
    onSuccess: (response) => {
      enqueueSnackbar(response.message ?? "Rating saved.", {
        variant: "success",
      });
      queryClient.invalidateQueries({
        queryKey: ["event-feedback", eventId, token],
      });
    },
    onError: (error: unknown) => {
      enqueueSnackbar(getErrorMessage(error, "Unable to save rating."), {
        variant: "error",
      });
    },
  });

  const commentMutation = useMutation({
    mutationFn: (payload: { content: string }) =>
      submitEventComment(eventId, payload, token ?? undefined),
    onSuccess: (response) => {
      enqueueSnackbar(response.message ?? "Comment posted.", {
        variant: "success",
      });
      setCommentValue("");
      queryClient.invalidateQueries({
        queryKey: ["event-feedback", eventId, token],
      });
    },
    onError: (error: unknown) => {
      enqueueSnackbar(getErrorMessage(error, "Unable to post comment."), {
        variant: "error",
      });
    },
  });

  const handleSubmitRating = () => {
    if (!canSubmitFeedback) {
      enqueueSnackbar("You can rate an event after attending it.", {
        variant: "info",
      });
      return;
    }
    if (ratingValue === null) {
      enqueueSnackbar("Select a rating before submitting.", {
        variant: "info",
      });
      return;
    }
    ratingMutation.mutate({
      rating: ratingValue,
      comment: ratingNotes.trim() ? ratingNotes.trim() : undefined,
    });
  };

  const handleSubmitComment = () => {
    if (!canSubmitFeedback) {
      enqueueSnackbar("Comments open after you attend and check in to the event.", {
        variant: "info",
      });
      return;
    }
    const trimmed = commentValue.trim();
    if (!trimmed) {
      enqueueSnackbar("Please enter a comment before submitting.", {
        variant: "info",
      });
      return;
    }
    commentMutation.mutate({ content: trimmed });
  };

  if (feedbackQuery.isLoading) {
    return (
      <Card sx={{ borderRadius: 3 }}>
        <CardContent>
          <Skeleton variant="text" width="40%" height={32} />
          <Skeleton
            variant="rectangular"
            height={160}
            sx={{ borderRadius: 2, mt: 2 }}
          />
        </CardContent>
      </Card>
    );
  }

  if (feedbackQuery.isError) {
    return (
      <Alert severity="error">
        Unable to load feedback right now. Please try again later.
      </Alert>
    );
  }

  return (
    <Stack spacing={3}>
      <Stack spacing={0.5}>
        <Typography variant="h5" fontWeight={700}>
          Community feedback
        </Typography>
        <Typography variant="body2" color="text.secondary">
          Ratings and comments are only available to attendees. Everything you
          share is reviewed by the events office.
        </Typography>
      </Stack>

      <Stack direction={{ xs: "column", md: "row" }} spacing={3}>
        <Card sx={{ flex: 1, borderRadius: 3 }}>
          <CardContent>
            <Stack spacing={2}>
              <Stack direction="row" spacing={2} alignItems="center">
                <RateReviewIcon color="primary" />
                <Stack spacing={0}>
                  <Typography variant="subtitle2" color="text.secondary">
                    Average rating
                  </Typography>
                  <Typography variant="h3" fontWeight={800}>
                    {averageDisplay}
                  </Typography>
                </Stack>
              </Stack>
              <Rating
                name="event-average-rating"
                value={ratingsSummary?.averageRating ?? 0}
                precision={0.1}
                readOnly
                size="large"
              />
              <Typography variant="body2" color="text.secondary">
                {ratingsSummary?.totalRatings ?? 0}{" "}
                {ratingsSummary && ratingsSummary.totalRatings === 1
                  ? "response"
                  : "responses"}
              </Typography>
              <Divider flexItem />
              {canSubmitFeedback ? (
                <Alert severity="success">
                  You attended this event—thank you for sharing your perspective.
                </Alert>
              ) : (
                <Alert severity="info">
                  Only attendees can share ratings or comments once the event
                  starts.
                </Alert>
              )}
              <Stack spacing={2}>
                <Rating
                  value={ratingValue}
                  onChange={(_, newValue) => setRatingValue(newValue)}
                  max={5}
                  precision={0.5}
                  disabled={ratingMutation.isPending || !canSubmitFeedback}
                  size="large"
                />
                <TextField
                  label="Add a short note (optional)"
                  multiline
                  minRows={3}
                  value={ratingNotes}
                  onChange={(event) => setRatingNotes(event.target.value)}
                  disabled={ratingMutation.isPending || !canSubmitFeedback}
                />
                <LoadingButton
                  variant="contained"
                  onClick={handleSubmitRating}
                  loading={ratingMutation.isPending}
                  disabled={!canSubmitFeedback}
                  sx={{ alignSelf: "flex-start" }}
                >
                  Save rating
                </LoadingButton>
              </Stack>
            </Stack>
          </CardContent>
        </Card>

        <Card sx={{ flex: 1.3, borderRadius: 3 }}>
          <CardContent>
            <Stack spacing={2}>
              <Stack direction="row" spacing={1} alignItems="center">
                <ChatIcon color="primary" />
                <Typography variant="subtitle1" fontWeight={700}>
                  Discussion board
                </Typography>
              </Stack>
              <Stack spacing={1}>
                <TextField
                  label="Share your takeaways"
                  placeholder="What went well? Anything to improve?"
                  multiline
                  minRows={3}
                  value={commentValue}
                  onChange={(event) => setCommentValue(event.target.value)}
                  disabled={commentMutation.isPending || !canSubmitFeedback}
                />
                <LoadingButton
                  variant="contained"
                  onClick={handleSubmitComment}
                  loading={commentMutation.isPending}
                  disabled={!canSubmitFeedback}
                >
                  Post comment
                </LoadingButton>
              </Stack>
              <Divider flexItem />
              <Stack spacing={1}>
                {comments.length === 0 ? (
                  <Typography variant="body2" color="text.secondary">
                    No comments yet. Be the first to start the conversation.
                  </Typography>
                ) : (
                  comments.map((comment) => (
                    <CommentCard key={comment.id} comment={comment} />
                  ))
                )}
              </Stack>
            </Stack>
          </CardContent>
        </Card>
      </Stack>
    </Stack>
  );
}

function CommentCard({ comment }: { comment: EventComment }) {
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
    <Paper
      variant="outlined"
      sx={{
        p: 2,
        borderRadius: 2,
        borderColor: "rgba(15,23,42,0.08)",
      }}
    >
      <Stack spacing={1}>
        <Stack direction="row" spacing={2} alignItems="center">
          <Avatar sx={{ bgcolor: "primary.main", width: 40, height: 40 }}>
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
        </Stack>
        <Typography variant="body2">{comment.content}</Typography>
      </Stack>
    </Paper>
  );
}

function getErrorMessage(error: unknown, fallback: string) {
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
}

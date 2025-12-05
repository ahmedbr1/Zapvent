"use client";

import { useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  Alert,
  Box,
  Button,
  Card,
  CardContent,
  Chip,
  IconButton,
  Skeleton,
  Stack,
  TextField,
  Tooltip,
  Typography,
} from "@mui/material";
import ArrowBackIcon from "@mui/icons-material/ArrowBackRounded";
import ThumbUpIcon from "@mui/icons-material/ThumbUpAltRounded";
import ThumbDownIcon from "@mui/icons-material/ThumbDownAltRounded";
import CheckCircleIcon from "@mui/icons-material/CheckCircleRounded";
import CheckCircleOutlineIcon from "@mui/icons-material/CheckCircleOutlineRounded";
import DeleteIcon from "@mui/icons-material/DeleteRounded";
import PushPinIcon from "@mui/icons-material/PushPinRounded";
import LockIcon from "@mui/icons-material/LockRounded";
import LockOpenIcon from "@mui/icons-material/LockOpenRounded";
import ChatBubbleIcon from "@mui/icons-material/ChatBubbleOutlineRounded";
import { useSnackbar } from "notistack";
import { useAuthToken } from "@/hooks/useAuthToken";
import { useSessionUser } from "@/hooks/useSessionUser";
import {
  getForumPost,
  voteOnPost,
  voteOnAnswer,
  createAnswer,
  deleteAnswer,
  acceptAnswer,
  createComment,
  deleteComment,
  deleteForumPost,
  pinPost,
  closePost,
  reopenPost,
  ForumPostStatus,
  type ForumAnswer,
  type ForumComment,
} from "@/lib/services/forum";
import { formatRelative } from "@/lib/date";
import { AuthRole } from "@/lib/types";

export default function ForumPostDetailPage() {
  const params = useParams<{ postId: string }>();
  const postId = params?.postId;
  const router = useRouter();
  const token = useAuthToken();
  const user = useSessionUser();
  const queryClient = useQueryClient();
  const { enqueueSnackbar } = useSnackbar();
  const [answerContent, setAnswerContent] = useState("");

  const postQuery = useQuery({
    queryKey: ["forum-post", postId, token],
    queryFn: () => getForumPost(postId!, token ?? undefined),
    enabled: Boolean(postId && token),
  });

  const post = postQuery.data?.data;
  const isAuthor = user && post && post.authorId === user.id;
  const isAdmin =
    user?.role === AuthRole.Admin || user?.role === AuthRole.EventOffice;
  const isPinned = post?.status === ForumPostStatus.PINNED;
  const isClosed = post?.status === ForumPostStatus.CLOSED;

  const votePostMutation = useMutation({
    mutationFn: (vote: 1 | -1) => voteOnPost(postId!, vote, token!),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["forum-post", postId] });
    },
    onError: () => {
      enqueueSnackbar("Failed to vote", { variant: "error" });
    },
  });

  const createAnswerMutation = useMutation({
    mutationFn: () => createAnswer(postId!, answerContent, token!),
    onSuccess: (result) => {
      if (result.success) {
        setAnswerContent("");
        queryClient.invalidateQueries({ queryKey: ["forum-post", postId] });
        enqueueSnackbar("Answer posted!", { variant: "success" });
      } else {
        enqueueSnackbar(result.message || "Failed to post answer", {
          variant: "error",
        });
      }
    },
    onError: () => {
      enqueueSnackbar("Failed to post answer", { variant: "error" });
    },
  });

  const deletePostMutation = useMutation({
    mutationFn: () => deleteForumPost(postId!, token!),
    onSuccess: (result) => {
      if (result.success) {
        enqueueSnackbar("Post deleted", { variant: "success" });
        router.push("/user/forum");
      } else {
        enqueueSnackbar(result.message || "Failed to delete post", {
          variant: "error",
        });
      }
    },
  });

  const pinMutation = useMutation({
    mutationFn: () => pinPost(postId!, token!),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["forum-post", postId] });
      enqueueSnackbar("Post pinned!", { variant: "success" });
    },
  });

  const closeMutation = useMutation({
    mutationFn: () => closePost(postId!, token!),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["forum-post", postId] });
      enqueueSnackbar("Post closed", { variant: "success" });
    },
  });

  const reopenMutation = useMutation({
    mutationFn: () => reopenPost(postId!, token!),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["forum-post", postId] });
      enqueueSnackbar("Post reopened", { variant: "success" });
    },
  });

  if (postQuery.isLoading) {
    return (
      <Box>
        <Skeleton variant="text" width="60%" height={48} />
        <Skeleton
          variant="rectangular"
          height={200}
          sx={{ borderRadius: 2, my: 2 }}
        />
        <Skeleton variant="rectangular" height={150} sx={{ borderRadius: 2 }} />
      </Box>
    );
  }

  if (postQuery.isError || !post) {
    return (
      <Alert severity="error">
        Failed to load post.{" "}
        <Button onClick={() => postQuery.refetch()}>Retry</Button>
      </Alert>
    );
  }

  return (
    <Box>
      <Button
        startIcon={<ArrowBackIcon />}
        onClick={() => router.push("/user/forum")}
        sx={{ mb: 2 }}
      >
        Back to Forum
      </Button>

      {/* Post Header */}
      <Card sx={{ mb: 3 }}>
        <CardContent>
          <Stack direction="row" spacing={2}>
            {/* Voting */}
            <Stack alignItems="center" spacing={0.5}>
              <IconButton
                size="small"
                onClick={() => votePostMutation.mutate(1)}
                color={post.userVote === 1 ? "primary" : "default"}
              >
                <ThumbUpIcon />
              </IconButton>
              <Typography variant="h6" fontWeight={700}>
                {post.voteCount}
              </Typography>
              <IconButton
                size="small"
                onClick={() => votePostMutation.mutate(-1)}
                color={post.userVote === -1 ? "error" : "default"}
              >
                <ThumbDownIcon />
              </IconButton>
            </Stack>

            {/* Content */}
            <Box flex={1}>
              <Stack direction="row" alignItems="center" spacing={1} mb={1}>
                {isPinned && (
                  <Chip
                    icon={<PushPinIcon />}
                    label="Pinned"
                    size="small"
                    color="primary"
                  />
                )}
                {isClosed && (
                  <Chip icon={<LockIcon />} label="Closed" size="small" />
                )}
                {post.hasAcceptedAnswer && (
                  <Chip
                    icon={<CheckCircleIcon />}
                    label="Answered"
                    size="small"
                    color="success"
                  />
                )}
              </Stack>
              <Typography variant="h5" fontWeight={700} gutterBottom>
                {post.title}
              </Typography>
              <Typography
                variant="body1"
                sx={{ whiteSpace: "pre-wrap", mb: 2 }}
              >
                {post.content}
              </Typography>
              <Stack direction="row" spacing={1} mb={2}>
                {post.tags.map((tag) => (
                  <Chip key={tag} label={tag} size="small" variant="outlined" />
                ))}
              </Stack>
              <Stack
                direction="row"
                justifyContent="space-between"
                alignItems="center"
              >
                <Typography variant="caption" color="text.secondary">
                  Asked by {post.authorName} · {formatRelative(post.createdAt)}
                </Typography>
                <Stack direction="row" spacing={1}>
                  {(isAuthor || isAdmin) && (
                    <IconButton
                      size="small"
                      color="error"
                      onClick={() => {
                        if (confirm("Delete this post?"))
                          deletePostMutation.mutate();
                      }}
                    >
                      <DeleteIcon />
                    </IconButton>
                  )}
                  {isAdmin && (
                    <>
                      <Tooltip title={isPinned ? "Unpin" : "Pin"}>
                        <IconButton
                          size="small"
                          onClick={() => pinMutation.mutate()}
                          color={isPinned ? "primary" : "default"}
                        >
                          <PushPinIcon />
                        </IconButton>
                      </Tooltip>
                      <Tooltip title={isClosed ? "Reopen" : "Close"}>
                        <IconButton
                          size="small"
                          onClick={() =>
                            (isClosed ? reopenMutation : closeMutation).mutate()
                          }
                        >
                          {isClosed ? <LockOpenIcon /> : <LockIcon />}
                        </IconButton>
                      </Tooltip>
                    </>
                  )}
                </Stack>
              </Stack>
            </Box>
          </Stack>
        </CardContent>
      </Card>

      {/* Answers */}
      <Typography variant="h6" fontWeight={600} mb={2}>
        {post.answerCount} {post.answerCount === 1 ? "Answer" : "Answers"}
      </Typography>

      <Stack spacing={2} mb={4}>
        {post.answers.length === 0 ? (
          <Alert severity="info">No answers yet. Be the first to answer!</Alert>
        ) : (
          post.answers.map((answer) => (
            <AnswerCard
              key={answer.id}
              answer={answer}
              postId={postId!}
              isPostAuthor={isAuthor ?? false}
              token={token!}
              currentUserId={user?.id}
              isAdmin={isAdmin ?? false}
            />
          ))
        )}
      </Stack>

      {/* Post Answer */}
      {!isClosed && (
        <Card>
          <CardContent>
            <Typography variant="h6" fontWeight={600} gutterBottom>
              Your Answer
            </Typography>
            <TextField
              fullWidth
              multiline
              rows={6}
              placeholder="Write your answer here..."
              value={answerContent}
              onChange={(e) => setAnswerContent(e.target.value)}
              sx={{ mb: 2 }}
            />
            <Button
              variant="contained"
              onClick={() => createAnswerMutation.mutate()}
              disabled={!answerContent.trim() || createAnswerMutation.isPending}
            >
              {createAnswerMutation.isPending ? "Posting..." : "Post Answer"}
            </Button>
          </CardContent>
        </Card>
      )}
    </Box>
  );
}

function AnswerCard({
  answer,
  postId,
  isPostAuthor,
  token,
  currentUserId,
  isAdmin,
}: {
  answer: ForumAnswer;
  postId: string;
  isPostAuthor: boolean;
  token: string;
  currentUserId?: string;
  isAdmin: boolean;
}) {
  const queryClient = useQueryClient();
  const { enqueueSnackbar } = useSnackbar();
  const [showComments, setShowComments] = useState(false);
  const [commentContent, setCommentContent] = useState("");

  const isAnswerAuthor = currentUserId === answer.authorId;

  const voteMutation = useMutation({
    mutationFn: (vote: 1 | -1) => voteOnAnswer(postId, answer.id, vote, token),
    onSuccess: () =>
      queryClient.invalidateQueries({ queryKey: ["forum-post", postId] }),
  });

  const acceptMutation = useMutation({
    mutationFn: () => acceptAnswer(postId, answer.id, token),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["forum-post", postId] });
      enqueueSnackbar("Answer accepted!", { variant: "success" });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: () => deleteAnswer(postId, answer.id, token),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["forum-post", postId] });
      enqueueSnackbar("Answer deleted", { variant: "success" });
    },
  });

  const addCommentMutation = useMutation({
    mutationFn: () => createComment(postId, answer.id, commentContent, token),
    onSuccess: () => {
      setCommentContent("");
      queryClient.invalidateQueries({ queryKey: ["forum-post", postId] });
    },
  });

  return (
    <Card
      sx={{
        borderLeft: answer.isAccepted ? 4 : 0,
        borderColor: "success.main",
      }}
    >
      <CardContent>
        <Stack direction="row" spacing={2}>
          {/* Voting */}
          <Stack alignItems="center" spacing={0.5}>
            <IconButton
              size="small"
              onClick={() => voteMutation.mutate(1)}
              color={answer.userVote === 1 ? "primary" : "default"}
            >
              <ThumbUpIcon />
            </IconButton>
            <Typography variant="body1" fontWeight={600}>
              {answer.voteCount}
            </Typography>
            <IconButton
              size="small"
              onClick={() => voteMutation.mutate(-1)}
              color={answer.userVote === -1 ? "error" : "default"}
            >
              <ThumbDownIcon />
            </IconButton>
            {answer.isAccepted && (
              <CheckCircleIcon color="success" sx={{ mt: 1 }} />
            )}
          </Stack>

          {/* Content */}
          <Box flex={1}>
            <Typography variant="body1" sx={{ whiteSpace: "pre-wrap", mb: 2 }}>
              {answer.content}
            </Typography>
            <Stack
              direction="row"
              justifyContent="space-between"
              alignItems="center"
            >
              <Typography variant="caption" color="text.secondary">
                answered by {answer.authorName} ·{" "}
                {formatRelative(answer.createdAt)}
              </Typography>
              <Stack direction="row" spacing={1}>
                {isPostAuthor && !answer.isAccepted && (
                  <Tooltip title="Accept this answer">
                    <IconButton
                      size="small"
                      onClick={() => acceptMutation.mutate()}
                      color="success"
                    >
                      <CheckCircleOutlineIcon />
                    </IconButton>
                  </Tooltip>
                )}
                {(isAnswerAuthor || isAdmin) && (
                  <IconButton
                    size="small"
                    color="error"
                    onClick={() => {
                      if (confirm("Delete this answer?"))
                        deleteMutation.mutate();
                    }}
                  >
                    <DeleteIcon />
                  </IconButton>
                )}
                <Button
                  size="small"
                  startIcon={<ChatBubbleIcon />}
                  onClick={() => setShowComments(!showComments)}
                >
                  {answer.comments.length} Comments
                </Button>
              </Stack>
            </Stack>

            {/* Comments */}
            {showComments && (
              <Box mt={2} pl={2} borderLeft={2} borderColor="divider">
                <Stack spacing={1.5}>
                  {answer.comments.map((comment) => (
                    <CommentItem
                      key={comment.id}
                      comment={comment}
                      postId={postId}
                      answerId={answer.id}
                      token={token}
                      currentUserId={currentUserId}
                      isAdmin={isAdmin}
                    />
                  ))}
                  <Stack direction="row" spacing={1}>
                    <TextField
                      size="small"
                      fullWidth
                      placeholder="Add a comment..."
                      value={commentContent}
                      onChange={(e) => setCommentContent(e.target.value)}
                    />
                    <Button
                      variant="outlined"
                      size="small"
                      onClick={() => addCommentMutation.mutate()}
                      disabled={
                        !commentContent.trim() || addCommentMutation.isPending
                      }
                    >
                      Add
                    </Button>
                  </Stack>
                </Stack>
              </Box>
            )}
          </Box>
        </Stack>
      </CardContent>
    </Card>
  );
}

function CommentItem({
  comment,
  postId,
  answerId,
  token,
  currentUserId,
  isAdmin,
}: {
  comment: ForumComment;
  postId: string;
  answerId: string;
  token: string;
  currentUserId?: string;
  isAdmin: boolean;
}) {
  const queryClient = useQueryClient();
  const { enqueueSnackbar } = useSnackbar();
  const isAuthor = currentUserId === comment.authorId;

  const deleteMutation = useMutation({
    mutationFn: () => deleteComment(postId, answerId, comment.id, token),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["forum-post", postId] });
      enqueueSnackbar("Comment deleted", { variant: "success" });
    },
  });

  return (
    <Stack
      direction="row"
      justifyContent="space-between"
      alignItems="flex-start"
    >
      <Box>
        <Typography variant="body2">{comment.content}</Typography>
        <Typography variant="caption" color="text.secondary">
          – {comment.authorName} · {formatRelative(comment.createdAt)}
        </Typography>
      </Box>
      {(isAuthor || isAdmin) && (
        <IconButton
          size="small"
          onClick={() => {
            if (confirm("Delete this comment?")) deleteMutation.mutate();
          }}
        >
          <DeleteIcon fontSize="small" />
        </IconButton>
      )}
    </Stack>
  );
}

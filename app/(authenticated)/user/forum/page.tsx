"use client";

import { useState } from "react";
import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import {
  Box,
  Button,
  Card,
  CardContent,
  Chip,
  Grid,
  IconButton,
  InputAdornment,
  MenuItem,
  Select,
  Skeleton,
  Stack,
  TextField,
  Typography,
  Alert,
  Pagination,
  FormControl,
  InputLabel,
} from "@mui/material";
import SearchIcon from "@mui/icons-material/SearchRounded";
import AddIcon from "@mui/icons-material/AddRounded";
import CheckCircleIcon from "@mui/icons-material/CheckCircleRounded";
import ThumbUpIcon from "@mui/icons-material/ThumbUpAltRounded";
import ChatBubbleIcon from "@mui/icons-material/ChatBubbleOutlineRounded";
import PushPinIcon from "@mui/icons-material/PushPinRounded";
import LockIcon from "@mui/icons-material/LockRounded";
import { useAuthToken } from "@/hooks/useAuthToken";
import {
  getForumPosts,
  getPopularTags,
  ForumPostStatus,
  type ForumPostSummary,
} from "@/lib/services/forum";
import { formatRelative } from "@/lib/date";

type SortOption = "newest" | "oldest" | "votes" | "unanswered";

export default function ForumPage() {
  const token = useAuthToken();
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const [searchInput, setSearchInput] = useState("");
  const [sortBy, setSortBy] = useState<SortOption>("newest");
  const [selectedTags, setSelectedTags] = useState<string[]>([]);

  const postsQuery = useQuery({
    queryKey: ["forum-posts", page, search, sortBy, selectedTags],
    queryFn: () =>
      getForumPosts(
        { page, limit: 20, search, sortBy, tags: selectedTags },
        token ?? undefined
      ),
    enabled: Boolean(token),
    staleTime: 2 * 60 * 1000, // 2 minutes
  });

  const tagsQuery = useQuery({
    queryKey: ["forum-tags"],
    queryFn: () => getPopularTags(token ?? undefined),
    enabled: Boolean(token),
    staleTime: 5 * 60 * 1000, // 5 minutes
  });

  const handleSearch = () => {
    setSearch(searchInput);
    setPage(1);
  };

  const handleTagClick = (tag: string) => {
    if (selectedTags.includes(tag)) {
      setSelectedTags(selectedTags.filter((t) => t !== tag));
    } else {
      setSelectedTags([...selectedTags, tag]);
    }
    setPage(1);
  };

  const posts = postsQuery.data?.data?.posts ?? [];
  const total = postsQuery.data?.data?.total ?? 0;
  const totalPages = Math.ceil(total / 20);
  const popularTags = tagsQuery.data?.data ?? [];

  return (
    <Box>
      <Stack
        direction="row"
        justifyContent="space-between"
        alignItems="center"
        mb={3}
      >
        <Typography variant="h4" fontWeight={700}>
          Forum
        </Typography>
        <Button
          component={Link}
          href="/user/forum/new"
          variant="contained"
          startIcon={<AddIcon />}
        >
          Ask Question
        </Button>
      </Stack>

      <Grid container spacing={3}>
        {/* Main Content */}
        <Grid size={{ xs: 12, md: 8 }}>
          <Stack spacing={2}>
            {/* Search and Sort */}
            <Stack direction="row" spacing={2}>
              <TextField
                fullWidth
                placeholder="Search questions..."
                value={searchInput}
                onChange={(e) => setSearchInput(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleSearch()}
                InputProps={{
                  endAdornment: (
                    <InputAdornment position="end">
                      <IconButton onClick={handleSearch}>
                        <SearchIcon />
                      </IconButton>
                    </InputAdornment>
                  ),
                }}
                size="small"
              />
              <FormControl size="small" sx={{ minWidth: 150 }}>
                <InputLabel>Sort by</InputLabel>
                <Select
                  value={sortBy}
                  label="Sort by"
                  onChange={(e) => {
                    setSortBy(e.target.value as SortOption);
                    setPage(1);
                  }}
                >
                  <MenuItem value="newest">Newest</MenuItem>
                  <MenuItem value="oldest">Oldest</MenuItem>
                  <MenuItem value="votes">Most Votes</MenuItem>
                  <MenuItem value="unanswered">Unanswered</MenuItem>
                </Select>
              </FormControl>
            </Stack>

            {/* Selected Tags */}
            {selectedTags.length > 0 && (
              <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
                <Typography variant="body2" color="text.secondary">
                  Filtering by:
                </Typography>
                {selectedTags.map((tag) => (
                  <Chip
                    key={tag}
                    label={tag}
                    size="small"
                    onDelete={() => handleTagClick(tag)}
                  />
                ))}
              </Stack>
            )}

            {/* Posts List */}
            {postsQuery.isLoading ? (
              <Stack spacing={2}>
                {[1, 2, 3, 4, 5].map((i) => (
                  <Skeleton
                    key={i}
                    variant="rectangular"
                    height={120}
                    sx={{ borderRadius: 2 }}
                  />
                ))}
              </Stack>
            ) : postsQuery.isError ? (
              <Alert severity="error">Failed to load forum posts.</Alert>
            ) : posts.length === 0 ? (
              <Alert severity="info">
                No questions found. Be the first to ask!
              </Alert>
            ) : (
              <Stack spacing={2}>
                {posts.map((post) => (
                  <ForumPostCard
                    key={post.id}
                    post={post}
                    onTagClick={handleTagClick}
                  />
                ))}
              </Stack>
            )}

            {/* Pagination */}
            {totalPages > 1 && (
              <Box display="flex" justifyContent="center" mt={2}>
                <Pagination
                  count={totalPages}
                  page={page}
                  onChange={(_, value) => setPage(value)}
                  color="primary"
                />
              </Box>
            )}
          </Stack>
        </Grid>

        {/* Sidebar */}
        <Grid size={{ xs: 12, md: 4 }}>
          <Card>
            <CardContent>
              <Typography variant="h6" fontWeight={600} gutterBottom>
                Popular Tags
              </Typography>
              {tagsQuery.isLoading ? (
                <Stack spacing={1}>
                  {[1, 2, 3, 4, 5].map((i) => (
                    <Skeleton key={i} width="80%" height={24} />
                  ))}
                </Stack>
              ) : popularTags.length === 0 ? (
                <Typography variant="body2" color="text.secondary">
                  No tags yet.
                </Typography>
              ) : (
                <Stack direction="row" flexWrap="wrap" gap={1}>
                  {popularTags.map(({ tag, count }) => (
                    <Chip
                      key={tag}
                      label={`${tag} (${count})`}
                      size="small"
                      onClick={() => handleTagClick(tag)}
                      color={selectedTags.includes(tag) ? "primary" : "default"}
                      variant={
                        selectedTags.includes(tag) ? "filled" : "outlined"
                      }
                    />
                  ))}
                </Stack>
              )}
            </CardContent>
          </Card>
        </Grid>
      </Grid>
    </Box>
  );
}

function ForumPostCard({
  post,
  onTagClick,
}: {
  post: ForumPostSummary;
  onTagClick: (tag: string) => void;
}) {
  const isPinned = post.status === ForumPostStatus.PINNED;
  const isClosed = post.status === ForumPostStatus.CLOSED;

  return (
    <Card
      sx={{
        borderLeft: isPinned ? 4 : 0,
        borderColor: "primary.main",
        opacity: isClosed ? 0.7 : 1,
      }}
    >
      <CardContent>
        <Stack direction="row" spacing={2}>
          {/* Stats */}
          <Stack
            spacing={0.5}
            alignItems="center"
            sx={{ minWidth: 60, textAlign: "center" }}
          >
            <Stack direction="row" alignItems="center" spacing={0.5}>
              <ThumbUpIcon fontSize="small" color="action" />
              <Typography variant="body2" fontWeight={600}>
                {post.voteCount}
              </Typography>
            </Stack>
            <Stack direction="row" alignItems="center" spacing={0.5}>
              <ChatBubbleIcon
                fontSize="small"
                color={post.hasAcceptedAnswer ? "success" : "action"}
              />
              <Typography
                variant="body2"
                fontWeight={600}
                color={post.hasAcceptedAnswer ? "success.main" : "inherit"}
              >
                {post.answerCount}
              </Typography>
            </Stack>
          </Stack>

          {/* Content */}
          <Box flex={1}>
            <Stack direction="row" alignItems="center" spacing={1} mb={0.5}>
              {isPinned && <PushPinIcon fontSize="small" color="primary" />}
              {isClosed && <LockIcon fontSize="small" color="action" />}
              {post.hasAcceptedAnswer && (
                <CheckCircleIcon fontSize="small" color="success" />
              )}
              <Typography
                component={Link}
                href={`/user/forum/${post.id}`}
                variant="subtitle1"
                fontWeight={600}
                sx={{
                  textDecoration: "none",
                  color: "inherit",
                  "&:hover": { color: "primary.main" },
                }}
              >
                {post.title}
              </Typography>
            </Stack>
            <Typography
              variant="body2"
              color="text.secondary"
              sx={{
                overflow: "hidden",
                textOverflow: "ellipsis",
                display: "-webkit-box",
                WebkitLineClamp: 2,
                WebkitBoxOrient: "vertical",
                mb: 1,
              }}
            >
              {post.content}
            </Typography>
            <Stack
              direction="row"
              justifyContent="space-between"
              alignItems="center"
            >
              <Stack direction="row" spacing={0.5}>
                {post.tags.slice(0, 4).map((tag) => (
                  <Chip
                    key={tag}
                    label={tag}
                    size="small"
                    variant="outlined"
                    onClick={(e) => {
                      e.preventDefault();
                      onTagClick(tag);
                    }}
                    sx={{ cursor: "pointer" }}
                  />
                ))}
              </Stack>
              <Typography variant="caption" color="text.secondary">
                asked by {post.authorName} · {formatRelative(post.createdAt)}
              </Typography>
            </Stack>
          </Box>
        </Stack>
      </CardContent>
    </Card>
  );
}

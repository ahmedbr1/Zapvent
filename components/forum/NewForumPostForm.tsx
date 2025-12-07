"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useMutation } from "@tanstack/react-query";
import {
  Box,
  Button,
  Card,
  CardContent,
  Chip,
  Stack,
  TextField,
  Typography,
  Alert,
} from "@mui/material";
import ArrowBackIcon from "@mui/icons-material/ArrowBackRounded";
import { useSnackbar } from "notistack";
import { createForumPost } from "@/lib/services/forum";

interface NewForumPostFormProps {
  token: string | null;
  basePath: string;
}

export function NewForumPostForm({ token, basePath }: NewForumPostFormProps) {
  const router = useRouter();
  const { enqueueSnackbar } = useSnackbar();
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [tagInput, setTagInput] = useState("");
  const [tags, setTags] = useState<string[]>([]);
  const [error, setError] = useState<string | null>(null);

  const createMutation = useMutation({
    mutationFn: () => {
      if (!token) throw new Error("Not authenticated");
      return createForumPost({ title, content, tags }, token);
    },
    onSuccess: (result) => {
      if (result.success && result.data) {
        enqueueSnackbar("Question posted successfully!", {
          variant: "success",
        });
        router.push(`${basePath}/${result.data.id}`);
      } else {
        setError(result.message || "Failed to create post");
      }
    },
    onError: (err: Error) => {
      setError(err.message || "Failed to create post");
    },
  });

  const handleAddTag = () => {
    const tag = tagInput.trim().toLowerCase();
    if (tag && tags.length < 5 && !tags.includes(tag)) {
      setTags([...tags, tag]);
      setTagInput("");
    }
  };

  const handleRemoveTag = (tagToRemove: string) => {
    setTags(tags.filter((t) => t !== tagToRemove));
  };

  const handleSubmit = () => {
    setError(null);

    if (!title.trim()) {
      setError("Title is required");
      return;
    }
    if (title.length > 200) {
      setError("Title cannot exceed 200 characters");
      return;
    }
    if (!content.trim()) {
      setError("Content is required");
      return;
    }
    if (content.length > 10000) {
      setError("Content cannot exceed 10,000 characters");
      return;
    }

    createMutation.mutate();
  };

  return (
    <Box>
      <Button
        startIcon={<ArrowBackIcon />}
        onClick={() => router.back()}
        sx={{ mb: 2 }}
      >
        Back to Forum
      </Button>

      <Typography variant="h4" fontWeight={700} mb={3}>
        Ask a Question
      </Typography>

      <Card>
        <CardContent>
          <Stack spacing={3}>
            {error && <Alert severity="error">{error}</Alert>}

            <TextField
              label="Title"
              placeholder="What's your question? Be specific."
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              fullWidth
              required
              helperText={`${title.length}/200 characters`}
              error={title.length > 200}
            />

            <TextField
              label="Details"
              placeholder="Provide all the details someone would need to answer your question..."
              value={content}
              onChange={(e) => setContent(e.target.value)}
              fullWidth
              multiline
              rows={8}
              required
              helperText={`${content.length}/10,000 characters`}
              error={content.length > 10000}
            />

            <Box>
              <Typography variant="subtitle2" gutterBottom>
                Tags (up to 5)
              </Typography>
              <Stack direction="row" spacing={1} mb={1}>
                <TextField
                  size="small"
                  placeholder="Add a tag"
                  value={tagInput}
                  onChange={(e) => setTagInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      e.preventDefault();
                      handleAddTag();
                    }
                  }}
                  disabled={tags.length >= 5}
                />
                <Button
                  variant="outlined"
                  onClick={handleAddTag}
                  disabled={tags.length >= 5 || !tagInput.trim()}
                >
                  Add
                </Button>
              </Stack>
              <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
                {tags.map((tag) => (
                  <Chip
                    key={tag}
                    label={tag}
                    onDelete={() => handleRemoveTag(tag)}
                    size="small"
                  />
                ))}
              </Stack>
            </Box>

            <Box display="flex" justifyContent="flex-end" gap={2}>
              <Button variant="outlined" onClick={() => router.back()}>
                Cancel
              </Button>
              <Button
                variant="contained"
                onClick={handleSubmit}
                disabled={createMutation.isPending}
              >
                {createMutation.isPending ? "Posting..." : "Post Question"}
              </Button>
            </Box>
          </Stack>
        </CardContent>
      </Card>
    </Box>
  );
}

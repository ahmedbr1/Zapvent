"use client";

import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  Alert,
  Box,
  Button,
  Card,
  CardContent,
  CardMedia,
  Chip,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  FormControl,
  Grid,
  IconButton,
  InputLabel,
  MenuItem,
  Select,
  Skeleton,
  Stack,
  TextField,
  Typography,
} from "@mui/material";
import AddIcon from "@mui/icons-material/AddRounded";
import DeleteIcon from "@mui/icons-material/DeleteRounded";
import EditIcon from "@mui/icons-material/EditRounded";
import VideoIcon from "@mui/icons-material/VideoLibraryRounded";
import ImageIcon from "@mui/icons-material/ImageRounded";
import { useSnackbar } from "notistack";
import { useAuthToken } from "@/hooks/useAuthToken";
import {
  getUploaderVideos,
  getEligibleConferences,
  uploadConferenceVideo,
  updateConferenceVideo,
  deleteConferenceVideo,
  MediaType,
  type ConferenceVideoSummary,
} from "@/lib/services/conference-videos";
import { formatRelative } from "@/lib/date";
import { SERVER_BASE_URL } from "@/lib/config";

export default function EventOfficeConferenceVideosPage() {
  const token = useAuthToken();
  const queryClient = useQueryClient();
  const { enqueueSnackbar } = useSnackbar();
  const [uploadDialogOpen, setUploadDialogOpen] = useState(false);
  const [editingVideo, setEditingVideo] =
    useState<ConferenceVideoSummary | null>(null);

  const videosQuery = useQuery({
    queryKey: ["eventsoffice-videos", token],
    queryFn: () => getUploaderVideos(token!),
    enabled: Boolean(token),
  });

  const videos = videosQuery.data?.data ?? [];

  const deleteMutation = useMutation({
    mutationFn: (videoId: string) => deleteConferenceVideo(videoId, token!),
    onSuccess: (result) => {
      if (result.success) {
        enqueueSnackbar("Video deleted", { variant: "success" });
        queryClient.invalidateQueries({ queryKey: ["eventsoffice-videos"] });
      } else {
        enqueueSnackbar(result.message || "Failed to delete", {
          variant: "error",
        });
      }
    },
  });

  return (
    <Box>
      <Stack
        direction="row"
        justifyContent="space-between"
        alignItems="center"
        mb={3}
      >
        <Typography variant="h4" fontWeight={700}>
          Conference Videos
        </Typography>
        <Button
          variant="contained"
          startIcon={<AddIcon />}
          onClick={() => setUploadDialogOpen(true)}
        >
          Upload Video
        </Button>
      </Stack>

      {videosQuery.isLoading ? (
        <Grid container spacing={3}>
          {[1, 2, 3].map((i) => (
            <Grid size={{ xs: 12, sm: 6, md: 4 }} key={i}>
              <Skeleton
                variant="rectangular"
                height={200}
                sx={{ borderRadius: 2 }}
              />
            </Grid>
          ))}
        </Grid>
      ) : videos.length === 0 ? (
        <Alert severity="info">
          No conference videos uploaded yet. Upload videos from completed
          conferences to share with attendees.
        </Alert>
      ) : (
        <Grid container spacing={3}>
          {videos.map((video) => (
            <Grid size={{ xs: 12, sm: 6, md: 4 }} key={video.id}>
              <VideoCard
                video={video}
                onEdit={() => setEditingVideo(video)}
                onDelete={() => {
                  if (confirm("Delete this video?")) {
                    deleteMutation.mutate(video.id);
                  }
                }}
                deleting={deleteMutation.isPending}
              />
            </Grid>
          ))}
        </Grid>
      )}

      {/* Upload Dialog */}
      <UploadVideoDialog
        open={uploadDialogOpen}
        onClose={() => setUploadDialogOpen(false)}
        token={token!}
        onSuccess={() => {
          setUploadDialogOpen(false);
          queryClient.invalidateQueries({ queryKey: ["eventsoffice-videos"] });
        }}
      />

      {/* Edit Dialog */}
      {editingVideo && (
        <EditVideoDialog
          video={editingVideo}
          open={Boolean(editingVideo)}
          onClose={() => setEditingVideo(null)}
          token={token!}
          onSuccess={() => {
            setEditingVideo(null);
            queryClient.invalidateQueries({
              queryKey: ["eventsoffice-videos"],
            });
          }}
        />
      )}
    </Box>
  );
}

function VideoCard({
  video,
  onEdit,
  onDelete,
  deleting,
}: {
  video: ConferenceVideoSummary;
  onEdit: () => void;
  onDelete: () => void;
  deleting: boolean;
}) {
  const isVideo = video.mediaType === MediaType.VIDEO;
  const mediaUrl = `${SERVER_BASE_URL}/${video.filePath}`;

  return (
    <Card>
      {isVideo ? (
        <CardMedia
          component="video"
          src={mediaUrl}
          controls
          sx={{ height: 180 }}
        />
      ) : (
        <CardMedia
          component="img"
          src={mediaUrl}
          alt={video.title}
          sx={{ height: 180, objectFit: "cover" }}
        />
      )}
      <CardContent>
        <Stack direction="row" alignItems="center" spacing={1} mb={1}>
          {isVideo ? (
            <VideoIcon color="primary" />
          ) : (
            <ImageIcon color="secondary" />
          )}
          <Typography variant="subtitle1" fontWeight={600} noWrap>
            {video.title}
          </Typography>
        </Stack>
        {video.description && (
          <Typography variant="body2" color="text.secondary" mb={1} noWrap>
            {video.description}
          </Typography>
        )}
        <Chip label={video.eventName} size="small" sx={{ mb: 1 }} />
        <Typography variant="caption" color="text.secondary" display="block">
          Uploaded {formatRelative(video.createdAt)}
        </Typography>
        <Stack direction="row" spacing={1} mt={1}>
          <IconButton size="small" onClick={onEdit}>
            <EditIcon />
          </IconButton>
          <IconButton
            size="small"
            color="error"
            onClick={onDelete}
            disabled={deleting}
          >
            <DeleteIcon />
          </IconButton>
        </Stack>
      </CardContent>
    </Card>
  );
}

function UploadVideoDialog({
  open,
  onClose,
  token,
  onSuccess,
}: {
  open: boolean;
  onClose: () => void;
  token: string;
  onSuccess: () => void;
}) {
  const { enqueueSnackbar } = useSnackbar();
  const [eventId, setEventId] = useState("");
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [file, setFile] = useState<File | null>(null);

  // Fetch eligible conferences
  const conferencesQuery = useQuery({
    queryKey: ["eligible-conferences", token],
    queryFn: () => getEligibleConferences(token),
    enabled: Boolean(token) && open,
  });

  const eligibleConferences = conferencesQuery.data?.data ?? [];

  const uploadMutation = useMutation({
    mutationFn: () => {
      if (!file || !eventId) throw new Error("Missing file or event");
      return uploadConferenceVideo(
        eventId,
        file,
        { title, description },
        token
      );
    },
    onSuccess: (result) => {
      if (result.success) {
        enqueueSnackbar("Video uploaded successfully!", { variant: "success" });
        onSuccess();
        resetForm();
      } else {
        enqueueSnackbar(result.message || "Upload failed", {
          variant: "error",
        });
      }
    },
    onError: (err: Error) => {
      enqueueSnackbar(err.message || "Upload failed", { variant: "error" });
    },
  });

  const resetForm = () => {
    setEventId("");
    setTitle("");
    setDescription("");
    setFile(null);
  };

  const handleClose = () => {
    resetForm();
    onClose();
  };

  return (
    <Dialog open={open} onClose={handleClose} maxWidth="sm" fullWidth>
      <DialogTitle>Upload Conference Video</DialogTitle>
      <DialogContent>
        <Stack spacing={2} sx={{ mt: 1 }}>
          <FormControl fullWidth required>
            <InputLabel>Conference</InputLabel>
            <Select
              value={eventId}
              label="Conference"
              onChange={(e) => setEventId(e.target.value)}
            >
              {conferencesQuery.isLoading ? (
                <MenuItem disabled>Loading conferences...</MenuItem>
              ) : eligibleConferences.length === 0 ? (
                <MenuItem disabled>No eligible conferences</MenuItem>
              ) : (
                eligibleConferences.map((conf) => (
                  <MenuItem key={conf.eventId} value={conf.eventId}>
                    {conf.eventName} ({conf.videoCount} videos uploaded)
                  </MenuItem>
                ))
              )}
            </Select>
          </FormControl>
          {eligibleConferences.length === 0 && !conferencesQuery.isLoading && (
            <Alert severity="info" sx={{ mt: -1 }}>
              No eligible conferences available. Videos can only be uploaded for
              conferences that have ended.
            </Alert>
          )}
          <TextField
            label="Title"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            fullWidth
          />
          <TextField
            label="Description"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            fullWidth
            multiline
            rows={3}
          />
          <Button variant="outlined" component="label">
            {file ? file.name : "Select Video or Image"}
            <input
              type="file"
              hidden
              accept="video/*,image/*"
              onChange={(e) => setFile(e.target.files?.[0] || null)}
            />
          </Button>
        </Stack>
      </DialogContent>
      <DialogActions>
        <Button onClick={handleClose}>Cancel</Button>
        <Button
          variant="contained"
          onClick={() => uploadMutation.mutate()}
          disabled={!file || !eventId || uploadMutation.isPending}
        >
          {uploadMutation.isPending ? "Uploading..." : "Upload"}
        </Button>
      </DialogActions>
    </Dialog>
  );
}

function EditVideoDialog({
  video,
  open,
  onClose,
  token,
  onSuccess,
}: {
  video: ConferenceVideoSummary;
  open: boolean;
  onClose: () => void;
  token: string;
  onSuccess: () => void;
}) {
  const { enqueueSnackbar } = useSnackbar();
  const [title, setTitle] = useState(video.title);
  const [description, setDescription] = useState(video.description || "");

  const updateMutation = useMutation({
    mutationFn: () =>
      updateConferenceVideo(video.id, { title, description }, token),
    onSuccess: (result) => {
      if (result.success) {
        enqueueSnackbar("Video updated!", { variant: "success" });
        onSuccess();
      } else {
        enqueueSnackbar(result.message || "Update failed", {
          variant: "error",
        });
      }
    },
  });

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle>Edit Video</DialogTitle>
      <DialogContent>
        <Stack spacing={2} sx={{ mt: 1 }}>
          <TextField
            label="Title"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            fullWidth
          />
          <TextField
            label="Description"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            fullWidth
            multiline
            rows={3}
          />
        </Stack>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>Cancel</Button>
        <Button
          variant="contained"
          onClick={() => updateMutation.mutate()}
          disabled={updateMutation.isPending}
        >
          {updateMutation.isPending ? "Saving..." : "Save"}
        </Button>
      </DialogActions>
    </Dialog>
  );
}

"use client";

import { useState } from "react";
import {
  Alert,
  Box,
  Card,
  CardContent,
  CardMedia,
  Dialog,
  DialogContent,
  DialogTitle,
  Grid,
  IconButton,
  Skeleton,
  Stack,
  Typography,
} from "@mui/material";
import CloseIcon from "@mui/icons-material/CloseRounded";
import PlayCircleIcon from "@mui/icons-material/PlayCircleRounded";
import ImageIcon from "@mui/icons-material/ImageRounded";
import VideoLibraryIcon from "@mui/icons-material/VideoLibraryRounded";
import { MediaType, type ConferenceVideoSummary } from "@/lib/services/conference-videos";
import { formatRelative } from "@/lib/date";
import { SERVER_BASE_URL } from "@/lib/config";

interface ConferenceVideosSectionProps {
  videos: ConferenceVideoSummary[];
  eventName?: string;
  isLoading?: boolean;
  isError?: boolean;
  showHeader?: boolean;
  emptyMessage?: string;
}

export function ConferenceVideosSection({
  videos,
  eventName,
  isLoading = false,
  isError = false,
  showHeader = true,
  emptyMessage = "No videos have been uploaded for this conference yet.",
}: ConferenceVideosSectionProps) {
  const [selectedVideo, setSelectedVideo] =
    useState<ConferenceVideoSummary | null>(null);

  if (isError) {
    return (
      <Stack spacing={2}>
        {showHeader && (
          <Typography variant="h6" fontWeight={700}>
            <VideoLibraryIcon sx={{ mr: 1, verticalAlign: "middle" }} />
            Conference Videos
          </Typography>
        )}
        <Alert severity="error" sx={{ borderRadius: 2 }}>
          Failed to load conference videos. Please try again later.
        </Alert>
      </Stack>
    );
  }

  if (isLoading) {
    return (
      <Stack spacing={2}>
        {showHeader && (
          <Typography variant="h6" fontWeight={700}>
            <VideoLibraryIcon sx={{ mr: 1, verticalAlign: "middle" }} />
            Conference Videos
          </Typography>
        )}
        <Grid container spacing={2}>
          {[1, 2].map((i) => (
            <Grid size={{ xs: 12, sm: 6, md: 4 }} key={i}>
              <Skeleton
                variant="rectangular"
                height={140}
                sx={{ borderRadius: 2 }}
              />
            </Grid>
          ))}
        </Grid>
      </Stack>
    );
  }

  if (videos.length === 0) {
    return (
      <Stack spacing={2}>
        {showHeader && (
          <Typography variant="h6" fontWeight={700}>
            <VideoLibraryIcon sx={{ mr: 1, verticalAlign: "middle" }} />
            Conference Videos
          </Typography>
        )}
        <Alert severity="info" sx={{ borderRadius: 2 }}>
          {emptyMessage}
        </Alert>
      </Stack>
    );
  }

  return (
    <Stack spacing={2}>
      {showHeader && (
        <Typography variant="h6" fontWeight={700}>
          <VideoLibraryIcon sx={{ mr: 1, verticalAlign: "middle" }} />
          Conference Videos
        </Typography>
      )}
      <Typography variant="caption" color="text.secondary">
        Click on a video to view it
      </Typography>
      <Grid container spacing={2}>
        {videos.map((video) => (
          <Grid size={{ xs: 12, sm: 6, md: 4 }} key={video.id}>
            <VideoThumbnailCard
              video={video}
              onClick={() => setSelectedVideo(video)}
            />
          </Grid>
        ))}
      </Grid>

      {/* Video Viewer Dialog */}
      {selectedVideo && (
        <ConferenceVideoDialog
          open={Boolean(selectedVideo)}
          onClose={() => setSelectedVideo(null)}
          video={selectedVideo}
          eventName={eventName}
        />
      )}
    </Stack>
  );
}

function VideoThumbnailCard({
  video,
  onClick,
}: {
  video: ConferenceVideoSummary;
  onClick: () => void;
}) {
  const isVideo = video.mediaType === MediaType.VIDEO;
  const mediaUrl = `${SERVER_BASE_URL}/${video.filePath}`;

  return (
    <Card
      sx={{
        cursor: "pointer",
        transition: "transform 0.2s, box-shadow 0.2s",
        "&:hover": {
          transform: "scale(1.02)",
          boxShadow: 4,
        },
      }}
      onClick={onClick}
    >
      <Box sx={{ position: "relative" }}>
        {isVideo ? (
          <>
            <CardMedia
              component="video"
              src={mediaUrl}
              sx={{ height: 140, objectFit: "cover" }}
            />
            <Box
              sx={{
                position: "absolute",
                top: "50%",
                left: "50%",
                transform: "translate(-50%, -50%)",
                color: "white",
                backgroundColor: "rgba(0,0,0,0.5)",
                borderRadius: "50%",
                p: 0.5,
              }}
            >
              <PlayCircleIcon sx={{ fontSize: 48 }} />
            </Box>
          </>
        ) : (
          <CardMedia
            component="img"
            src={mediaUrl}
            alt={video.title}
            sx={{ height: 140, objectFit: "cover" }}
          />
        )}
        <Box
          sx={{
            position: "absolute",
            top: 8,
            right: 8,
            backgroundColor: "rgba(0,0,0,0.6)",
            borderRadius: 1,
            px: 1,
            py: 0.25,
          }}
        >
          {isVideo ? (
            <PlayCircleIcon sx={{ color: "white", fontSize: 18 }} />
          ) : (
            <ImageIcon sx={{ color: "white", fontSize: 18 }} />
          )}
        </Box>
      </Box>
      <CardContent sx={{ py: 1.5, "&:last-child": { pb: 1.5 } }}>
        <Typography variant="subtitle2" fontWeight={600} noWrap>
          {video.title}
        </Typography>
        {video.description && (
          <Typography variant="caption" color="text.secondary" noWrap>
            {video.description}
          </Typography>
        )}
        <Typography
          variant="caption"
          color="text.secondary"
          display="block"
          mt={0.5}
        >
          {formatRelative(video.createdAt)}
        </Typography>
      </CardContent>
    </Card>
  );
}

interface ConferenceVideoDialogProps {
  open: boolean;
  onClose: () => void;
  video: ConferenceVideoSummary;
  eventName?: string;
}

function ConferenceVideoDialog({
  open,
  onClose,
  video,
  eventName,
}: ConferenceVideoDialogProps) {
  const isVideo = video.mediaType === MediaType.VIDEO;
  const mediaUrl = `${SERVER_BASE_URL}/${video.filePath}`;

  return (
    <Dialog open={open} onClose={onClose} maxWidth="md" fullWidth>
      <DialogTitle>
        <Stack
          direction="row"
          justifyContent="space-between"
          alignItems="flex-start"
        >
          <Box>
            <Typography variant="h6">{video.title}</Typography>
            {eventName && (
              <Typography variant="caption" color="text.secondary">
                {eventName}
              </Typography>
            )}
          </Box>
          <IconButton onClick={onClose} size="small">
            <CloseIcon />
          </IconButton>
        </Stack>
      </DialogTitle>
      <DialogContent dividers>
        <Stack spacing={2}>
          {isVideo ? (
            <Box
              component="video"
              src={mediaUrl}
              controls
              autoPlay
              sx={{
                width: "100%",
                maxHeight: "60vh",
                borderRadius: 2,
                backgroundColor: "#000",
              }}
            />
          ) : (
            <Box
              component="img"
              src={mediaUrl}
              alt={video.title}
              sx={{
                width: "100%",
                maxHeight: "60vh",
                objectFit: "contain",
                borderRadius: 2,
              }}
            />
          )}
          {video.description && (
            <Typography variant="body2" color="text.secondary">
              {video.description}
            </Typography>
          )}
          <Stack
            direction="row"
            justifyContent="space-between"
            alignItems="center"
          >
            <Typography variant="caption" color="text.secondary">
              Uploaded by {video.uploadedByName}
            </Typography>
            <Typography variant="caption" color="text.secondary">
              {formatRelative(video.createdAt)}
            </Typography>
          </Stack>
        </Stack>
      </DialogContent>
    </Dialog>
  );
}

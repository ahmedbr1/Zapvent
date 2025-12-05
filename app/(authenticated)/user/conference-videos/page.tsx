"use client";

import { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  Alert,
  Autocomplete,
  Box,
  Paper,
  Stack,
  TextField,
  Typography,
} from "@mui/material";
import VideoLibraryIcon from "@mui/icons-material/VideoLibraryRounded";
import EventIcon from "@mui/icons-material/EventRounded";
import { ConferenceVideosSection } from "@/components/events/ConferenceVideosSection";
import {
  getConferencesWithVideos,
  type ConferenceWithVideos,
} from "@/lib/services/conference-videos";
import { formatDate } from "@/lib/date";

export default function UserConferenceVideosPage() {
  const [selectedConference, setSelectedConference] =
    useState<ConferenceWithVideos | null>(null);

  // Fetch all conferences with videos in a single call
  const conferencesQuery = useQuery({
    queryKey: ["conferences-with-videos"],
    queryFn: () => getConferencesWithVideos(),
  });

  const conferences = conferencesQuery.data?.data ?? [];

  // Get videos for selected conference (already loaded from initial fetch)
  const selectedVideos = useMemo(() => {
    if (!selectedConference) return [];
    return selectedConference.videos;
  }, [selectedConference]);

  return (
    <Stack spacing={3}>
      {/* Page Header */}
      <Box>
        <Typography variant="h4" fontWeight={700} gutterBottom>
          <VideoLibraryIcon
            sx={{ mr: 1.5, verticalAlign: "middle", fontSize: 36 }}
          />
          Conference Videos
        </Typography>
        <Typography variant="body1" color="text.secondary">
          Browse videos from past conferences. Select a conference to view its
          uploaded videos and recordings.
        </Typography>
      </Box>

      {/* Conference Selector */}
      <Paper sx={{ p: 3, borderRadius: 3 }}>
        <Stack spacing={2}>
          <Typography variant="h6" fontWeight={600}>
            <EventIcon sx={{ mr: 1, verticalAlign: "middle" }} />
            Select a Conference
          </Typography>

          {conferencesQuery.isError && (
            <Alert severity="error" sx={{ borderRadius: 2 }}>
              Failed to load conferences. Please try again later.
            </Alert>
          )}

          <Autocomplete
            options={conferences}
            getOptionLabel={(option) =>
              `${option.eventName} (${formatDate(option.eventDate)})`
            }
            value={selectedConference}
            onChange={(_, newValue) => setSelectedConference(newValue)}
            loading={conferencesQuery.isLoading}
            disabled={conferencesQuery.isError}
            isOptionEqualToValue={(option, value) =>
              option.eventId === value.eventId
            }
            renderOption={(props, option) => (
              <Box
                component="li"
                {...props}
                key={option.eventId}
                sx={{ py: 1.5 }}
              >
                <Stack>
                  <Typography variant="body1" fontWeight={500}>
                    {option.eventName}
                  </Typography>
                  <Stack direction="row" spacing={2}>
                    <Typography variant="caption" color="text.secondary">
                      {formatDate(option.eventDate)}
                    </Typography>
                    <Typography variant="caption" color="primary">
                      {option.videos.length} video
                      {option.videos.length !== 1 ? "s" : ""}
                    </Typography>
                  </Stack>
                </Stack>
              </Box>
            )}
            renderInput={(params) => (
              <TextField
                {...params}
                placeholder="Search for a conference..."
                variant="outlined"
                fullWidth
              />
            )}
            noOptionsText={
              conferencesQuery.isLoading
                ? "Loading conferences..."
                : "No conferences with videos found"
            }
          />

          {conferences.length > 0 && !selectedConference && (
            <Typography variant="caption" color="text.secondary">
              {conferences.length} conference{conferences.length !== 1 ? "s" : ""}{" "}
              with videos available
            </Typography>
          )}
        </Stack>
      </Paper>

      {/* Videos Section */}
      {selectedConference ? (
        <Paper sx={{ p: 3, borderRadius: 3 }}>
          <Stack spacing={2}>
            <Box>
              <Typography variant="h6" fontWeight={600}>
                {selectedConference.eventName}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                {formatDate(selectedConference.eventDate)} •{" "}
                {selectedVideos.length} video
                {selectedVideos.length !== 1 ? "s" : ""}
              </Typography>
            </Box>

            <ConferenceVideosSection
              videos={selectedVideos}
              eventName={selectedConference.eventName}
              showHeader={false}
              emptyMessage="No videos available for this conference."
            />
          </Stack>
        </Paper>
      ) : (
        <Paper
          sx={{
            p: 6,
            borderRadius: 3,
            textAlign: "center",
            backgroundColor: "grey.50",
          }}
        >
          <VideoLibraryIcon
            sx={{ fontSize: 64, color: "grey.400", mb: 2 }}
          />
          <Typography variant="h6" color="text.secondary" gutterBottom>
            No Conference Selected
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Select a conference from the dropdown above to view its videos.
          </Typography>
        </Paper>
      )}
    </Stack>
  );
}

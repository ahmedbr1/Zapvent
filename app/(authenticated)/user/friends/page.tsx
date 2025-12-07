"use client";

import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  Alert,
  Avatar,
  Box,
  Button,
  Chip,
  Divider,
  FormControlLabel,
  IconButton,
  InputAdornment,
  List,
  ListItem,
  ListItemAvatar,
  ListItemSecondaryAction,
  ListItemText,
  Skeleton,
  Stack,
  Switch,
  Tab,
  Tabs,
  TextField,
  Typography,
} from "@mui/material";
import SearchIcon from "@mui/icons-material/SearchRounded";
import PersonAddIcon from "@mui/icons-material/PersonAddRounded";
import PersonRemoveIcon from "@mui/icons-material/PersonRemoveRounded";
import CheckIcon from "@mui/icons-material/CheckRounded";
import CloseIcon from "@mui/icons-material/CloseRounded";
import { useSnackbar } from "notistack";
import { useAuthToken } from "@/hooks/useAuthToken";
import {
  getFriendsList,
  getPendingFriendRequests,
  searchStudents,
  sendFriendRequest,
  acceptFriendRequest,
  rejectFriendRequest,
  cancelFriendRequest,
  removeFriend,
  updatePrivacySettings,
  type FriendSummary,
} from "@/lib/services/friends";

interface TabPanelProps {
  children?: React.ReactNode;
  index: number;
  value: number;
}

function TabPanel({ children, value, index }: TabPanelProps) {
  return value === index ? <Box sx={{ pt: 3 }}>{children}</Box> : null;
}

export default function FriendsPage() {
  const token = useAuthToken();
  const queryClient = useQueryClient();
  const { enqueueSnackbar } = useSnackbar();
  const [tab, setTab] = useState(0);
  const [searchQuery, setSearchQuery] = useState("");
  const [searchInput, setSearchInput] = useState("");
  const [hideAttendance, setHideAttendance] = useState(false);

  // Queries
  const friendsQuery = useQuery({
    queryKey: ["friends"],
    queryFn: () => getFriendsList(token!),
    enabled: Boolean(token),
    staleTime: 2 * 60 * 1000, // 2 minutes
  });

  const requestsQuery = useQuery({
    queryKey: ["friend-requests"],
    queryFn: () => getPendingFriendRequests(token!),
    enabled: Boolean(token),
    staleTime: 60 * 1000, // 1 minute
  });

  const searchResultsQuery = useQuery({
    queryKey: ["search-students", searchQuery],
    queryFn: () => searchStudents(searchQuery, token!, 20),
    enabled: Boolean(token && searchQuery.length >= 2),
    staleTime: 30 * 1000, // 30 seconds
  });

  const friends = friendsQuery.data?.data ?? [];
  const receivedRequests = requestsQuery.data?.data?.received ?? [];
  const sentRequests = requestsQuery.data?.data?.sent ?? [];
  const searchResults = searchResultsQuery.data?.data ?? [];

  // Mutations
  const sendRequestMutation = useMutation({
    mutationFn: (userId: string) => sendFriendRequest(userId, token!),
    onSuccess: (result) => {
      if (result.success) {
        enqueueSnackbar("Friend request sent!", { variant: "success" });
        queryClient.invalidateQueries({ queryKey: ["friend-requests"] });
        queryClient.invalidateQueries({ queryKey: ["search-students"] });
      } else {
        enqueueSnackbar(result.message || "Failed to send request", {
          variant: "error",
        });
      }
    },
  });

  const acceptRequestMutation = useMutation({
    mutationFn: (userId: string) => acceptFriendRequest(userId, token!),
    onSuccess: (result) => {
      if (result.success) {
        enqueueSnackbar("Friend request accepted!", { variant: "success" });
        queryClient.invalidateQueries({ queryKey: ["friends"] });
        queryClient.invalidateQueries({ queryKey: ["friend-requests"] });
      }
    },
  });

  const rejectRequestMutation = useMutation({
    mutationFn: (userId: string) => rejectFriendRequest(userId, token!),
    onSuccess: (result) => {
      if (result.success) {
        enqueueSnackbar("Friend request rejected", { variant: "info" });
        queryClient.invalidateQueries({ queryKey: ["friend-requests"] });
      }
    },
  });

  const cancelRequestMutation = useMutation({
    mutationFn: (userId: string) => cancelFriendRequest(userId, token!),
    onSuccess: (result) => {
      if (result.success) {
        enqueueSnackbar("Friend request cancelled", { variant: "info" });
        queryClient.invalidateQueries({ queryKey: ["friend-requests"] });
        queryClient.invalidateQueries({ queryKey: ["search-students"] });
      }
    },
  });

  const removeFriendMutation = useMutation({
    mutationFn: (userId: string) => removeFriend(userId, token!),
    onSuccess: (result) => {
      if (result.success) {
        enqueueSnackbar("Friend removed", { variant: "info" });
        queryClient.invalidateQueries({ queryKey: ["friends"] });
      }
    },
  });

  const privacyMutation = useMutation({
    mutationFn: (hide: boolean) =>
      updatePrivacySettings({ hideEventAttendance: hide }, token!),
    onSuccess: () => {
      enqueueSnackbar("Privacy settings updated", { variant: "success" });
    },
  });

  const handleSearch = () => {
    if (searchInput.trim().length >= 2) {
      setSearchQuery(searchInput.trim());
    }
  };

  const handlePrivacyChange = (checked: boolean) => {
    setHideAttendance(checked);
    privacyMutation.mutate(checked);
  };

  const pendingCount = receivedRequests.length;

  return (
    <Box>
      <Stack
        direction="row"
        justifyContent="space-between"
        alignItems="center"
        mb={3}
      >
        <Typography variant="h4" fontWeight={700}>
          Friends
        </Typography>
        <FormControlLabel
          control={
            <Switch
              checked={hideAttendance}
              onChange={(e) => handlePrivacyChange(e.target.checked)}
            />
          }
          label="Hide my event attendance"
        />
      </Stack>

      <Tabs value={tab} onChange={(_, v) => setTab(v)} sx={{ mb: 2 }}>
        <Tab label={`My Friends (${friends.length})`} />
        <Tab
          label={
            <Stack direction="row" spacing={1} alignItems="center">
              <span>Requests</span>
              {pendingCount > 0 && (
                <Chip label={pendingCount} size="small" color="error" />
              )}
            </Stack>
          }
        />
        <Tab label="Find Friends" />
      </Tabs>

      {/* My Friends Tab */}
      <TabPanel value={tab} index={0}>
        {friendsQuery.isLoading ? (
          <Stack spacing={1}>
            {[1, 2, 3].map((i) => (
              <Skeleton
                key={i}
                variant="rectangular"
                height={72}
                sx={{ borderRadius: 2 }}
              />
            ))}
          </Stack>
        ) : friends.length === 0 ? (
          <Alert severity="info">
            You don&apos;t have any friends yet. Search for students to add
            them!
          </Alert>
        ) : (
          <List>
            {friends.map((friend) => (
              <FriendItem
                key={friend.id}
                friend={friend}
                onRemove={() => removeFriendMutation.mutate(friend.id)}
                loading={removeFriendMutation.isPending}
              />
            ))}
          </List>
        )}
      </TabPanel>

      {/* Requests Tab */}
      <TabPanel value={tab} index={1}>
        <Stack spacing={3}>
          {/* Received Requests */}
          <Box>
            <Typography variant="h6" fontWeight={600} gutterBottom>
              Received Requests
            </Typography>
            {receivedRequests.length === 0 ? (
              <Typography variant="body2" color="text.secondary">
                No pending requests.
              </Typography>
            ) : (
              <List>
                {receivedRequests.map((request) => (
                  <ListItem key={request.odId} divider>
                    <ListItemAvatar>
                      <Avatar>{request.odName[0]}</Avatar>
                    </ListItemAvatar>
                    <ListItemText
                      primary={request.odName}
                      secondary="Wants to be your friend"
                    />
                    <ListItemSecondaryAction>
                      <IconButton
                        color="success"
                        onClick={() =>
                          acceptRequestMutation.mutate(request.odId)
                        }
                        disabled={acceptRequestMutation.isPending}
                      >
                        <CheckIcon />
                      </IconButton>
                      <IconButton
                        color="error"
                        onClick={() =>
                          rejectRequestMutation.mutate(request.odId)
                        }
                        disabled={rejectRequestMutation.isPending}
                      >
                        <CloseIcon />
                      </IconButton>
                    </ListItemSecondaryAction>
                  </ListItem>
                ))}
              </List>
            )}
          </Box>

          <Divider />

          {/* Sent Requests */}
          <Box>
            <Typography variant="h6" fontWeight={600} gutterBottom>
              Sent Requests
            </Typography>
            {sentRequests.length === 0 ? (
              <Typography variant="body2" color="text.secondary">
                No pending sent requests.
              </Typography>
            ) : (
              <List>
                {sentRequests.map((request) => (
                  <ListItem key={request.odId} divider>
                    <ListItemAvatar>
                      <Avatar>{request.odName[0]}</Avatar>
                    </ListItemAvatar>
                    <ListItemText
                      primary={request.odName}
                      secondary="Pending"
                    />
                    <ListItemSecondaryAction>
                      <Button
                        size="small"
                        color="error"
                        onClick={() =>
                          cancelRequestMutation.mutate(request.odId)
                        }
                        disabled={cancelRequestMutation.isPending}
                      >
                        Cancel
                      </Button>
                    </ListItemSecondaryAction>
                  </ListItem>
                ))}
              </List>
            )}
          </Box>
        </Stack>
      </TabPanel>

      {/* Find Friends Tab */}
      <TabPanel value={tab} index={2}>
        <Stack spacing={2}>
          <TextField
            fullWidth
            placeholder="Search by name or email..."
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
          />

          {searchQuery && (
            <>
              {searchResultsQuery.isLoading ? (
                <Stack spacing={1}>
                  {[1, 2, 3].map((i) => (
                    <Skeleton
                      key={i}
                      variant="rectangular"
                      height={72}
                      sx={{ borderRadius: 2 }}
                    />
                  ))}
                </Stack>
              ) : searchResults.length === 0 ? (
                <Alert severity="info">
                  No students found matching &quot;{searchQuery}&quot;
                </Alert>
              ) : (
                <List>
                  {searchResults.map((student) => (
                    <ListItem key={student.id} divider>
                      <ListItemAvatar>
                        <Avatar>{student.firstName[0]}</Avatar>
                      </ListItemAvatar>
                      <ListItemText
                        primary={`${student.firstName} ${student.lastName}`}
                        secondary={student.email}
                      />
                      <ListItemSecondaryAction>
                        {student.isFriend ? (
                          <Chip label="Friend" color="success" size="small" />
                        ) : student.hasPendingRequest ? (
                          <Chip label="Pending" size="small" />
                        ) : (
                          <IconButton
                            color="primary"
                            onClick={() =>
                              sendRequestMutation.mutate(student.id)
                            }
                            disabled={sendRequestMutation.isPending}
                          >
                            <PersonAddIcon />
                          </IconButton>
                        )}
                      </ListItemSecondaryAction>
                    </ListItem>
                  ))}
                </List>
              )}
            </>
          )}
        </Stack>
      </TabPanel>
    </Box>
  );
}

function FriendItem({
  friend,
  onRemove,
  loading,
}: {
  friend: FriendSummary;
  onRemove: () => void;
  loading: boolean;
}) {
  return (
    <ListItem divider>
      <ListItemAvatar>
        <Avatar>{friend.firstName[0]}</Avatar>
      </ListItemAvatar>
      <ListItemText
        primary={`${friend.firstName} ${friend.lastName}`}
        secondary={
          <Stack direction="row" spacing={1} alignItems="center">
            <Typography variant="caption">{friend.email}</Typography>
            <Chip label={friend.role} size="small" variant="outlined" />
          </Stack>
        }
      />
      <ListItemSecondaryAction>
        <IconButton color="error" onClick={onRemove} disabled={loading}>
          <PersonRemoveIcon />
        </IconButton>
      </ListItemSecondaryAction>
    </ListItem>
  );
}

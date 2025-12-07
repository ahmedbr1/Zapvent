"use client";

import { useQuery } from "@tanstack/react-query";
import {
  Avatar,
  AvatarGroup,
  Chip,
  Stack,
  Tooltip,
  Typography,
} from "@mui/material";
import PeopleIcon from "@mui/icons-material/PeopleRounded";
import { useAuthToken } from "@/hooks/useAuthToken";
import { useSessionUser } from "@/hooks/useSessionUser";
import { getFriendsAttendingEvent } from "@/lib/services/friends";
import { AuthRole, UserRole } from "@/lib/types";

interface FriendsAttendingBadgeProps {
  eventId: string;
  compact?: boolean;
}

export function FriendsAttendingBadge({
  eventId,
  compact = false,
}: FriendsAttendingBadgeProps) {
  const token = useAuthToken();
  const user = useSessionUser();

  // Only show for students
  const isStudent =
    user?.role === AuthRole.User && user?.userRole === UserRole.Student;

  const { data } = useQuery({
    queryKey: ["friends-attending", eventId, token],
    queryFn: () => getFriendsAttendingEvent(eventId, token!),
    enabled: Boolean(token && isStudent && eventId),
    staleTime: 5 * 60 * 1000, // 5 minutes
  });

  const friends = data?.data ?? [];

  if (!isStudent || friends.length === 0) {
    return null;
  }

  if (compact) {
    return (
      <Tooltip
        title={
          <Stack spacing={0.5}>
            <Typography variant="caption" fontWeight={600}>
              Friends attending:
            </Typography>
            {friends.map((f) => (
              <Typography key={f.id} variant="caption">
                {f.name}
              </Typography>
            ))}
          </Stack>
        }
      >
        <Chip
          icon={<PeopleIcon />}
          label={`${friends.length} friend${friends.length > 1 ? "s" : ""}`}
          size="small"
          color="info"
          variant="outlined"
        />
      </Tooltip>
    );
  }

  return (
    <Stack direction="row" spacing={1} alignItems="center">
      <AvatarGroup
        max={3}
        sx={{ "& .MuiAvatar-root": { width: 28, height: 28, fontSize: 12 } }}
      >
        {friends.map((friend) => (
          <Tooltip key={friend.id} title={friend.name}>
            <Avatar sx={{ bgcolor: "primary.main" }}>{friend.name[0]}</Avatar>
          </Tooltip>
        ))}
      </AvatarGroup>
      <Typography variant="caption" color="text.secondary">
        {friends.length === 1
          ? `${friends[0].name} is attending`
          : `${friends.length} friends attending`}
      </Typography>
    </Stack>
  );
}

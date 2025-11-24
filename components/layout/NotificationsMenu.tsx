"use client";

import { useEffect, useMemo, useState } from "react";
import IconButton from "@mui/material/IconButton";
import Badge from "@mui/material/Badge";
import Menu from "@mui/material/Menu";
import MenuItem from "@mui/material/MenuItem";
import List from "@mui/material/List";
import ListItem from "@mui/material/ListItem";
import ListItemText from "@mui/material/ListItemText";
import Stack from "@mui/material/Stack";
import Typography from "@mui/material/Typography";
import CircularProgress from "@mui/material/CircularProgress";
import Button from "@mui/material/Button";
import NotificationsIcon from "@mui/icons-material/NotificationsRounded";
import RefreshIcon from "@mui/icons-material/RefreshRounded";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/components/providers/AuthProvider";
import { AuthRole, type NotificationList } from "@/lib/types";
import {
  fetchEventOfficeNotifications,
  fetchUserNotifications,
  markEventOfficeNotificationsSeen,
  markUserNotificationsSeen,
} from "@/lib/services/notifications";

export function NotificationsMenu() {
  const { session } = useAuth();
  const token = session?.token ?? undefined;
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);

  const role = session?.user.role ?? null;
  const isAdminAccount = role === AuthRole.Admin || role === AuthRole.EventOffice;
  const isUserAccount = role === AuthRole.User;

  const queryKey = useMemo(
    () => ["notifications", role, session?.user.id],
    [role, session?.user.id]
  );

  const notificationsQuery = useQuery({
    queryKey,
    queryFn: () =>
      isAdminAccount
        ? fetchEventOfficeNotifications(token)
        : fetchUserNotifications(token),
    enabled: Boolean(token) && (isAdminAccount || isUserAccount),
    refetchOnWindowFocus: false,
  });

  const notificationsData = notificationsQuery.data?.notifications;
  const notifications = useMemo(
    () => notificationsData ?? [],
    [notificationsData]
  );
  const badgeCount = notifications.filter((notification) => !notification.seen).length;
  const hasUnseen = notifications.some((notification) => !notification.seen);
  const queryClient = useQueryClient();

  const {
    mutate: markNotificationsSeen,
    isPending: isMarkingNotifications,
  } = useMutation({
    mutationFn: () =>
      isAdminAccount
        ? markEventOfficeNotificationsSeen(token)
        : markUserNotificationsSeen(token),
    onSuccess: () => {
      queryClient.setQueryData<NotificationList | undefined>(queryKey, (prev) => {
        if (!prev) {
          return prev;
        }
        if (!prev.notifications.some((notification) => !notification.seen)) {
          return prev;
        }
        return {
          notifications: prev.notifications.map((notification) => ({
            ...notification,
            seen: true,
          })),
        };
      });
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey });
    },
  });

  const handleOpen = (event: React.MouseEvent<HTMLButtonElement>) => {
    setAnchorEl(event.currentTarget);
  };

  const handleClose = () => setAnchorEl(null);

  useEffect(() => {
    if (anchorEl && hasUnseen && !isMarkingNotifications) {
      markNotificationsSeen();
    }
  }, [anchorEl, hasUnseen, isMarkingNotifications, markNotificationsSeen]);

  if (!token || (!isUserAccount && !isAdminAccount)) {
    return null;
  }

  return (
    <>
      <IconButton
        size="large"
        sx={{ ml: 1 }}
        aria-label="Notifications"
        onClick={handleOpen}
        color="inherit"
      >
        <Badge color="secondary" badgeContent={badgeCount} max={99} invisible={badgeCount === 0}>
          <NotificationsIcon />
        </Badge>
      </IconButton>
      <Menu
        anchorEl={anchorEl}
        open={Boolean(anchorEl)}
        onClose={handleClose}
        anchorOrigin={{ vertical: "bottom", horizontal: "right" }}
        transformOrigin={{ vertical: "top", horizontal: "right" }}
        sx={{ minWidth: 320 }}
      >
        <Stack direction="row" alignItems="center" justifyContent="space-between" px={2} py={1}>
          <Typography variant="subtitle1" fontWeight={600}>
            Notifications
          </Typography>
          <IconButton
            size="small"
            onClick={() => notificationsQuery.refetch()}
            disabled={notificationsQuery.isFetching}
          >
            <RefreshIcon fontSize="small" />
          </IconButton>
        </Stack>
        {notificationsQuery.isLoading ? (
          <Stack alignItems="center" justifyContent="center" sx={{ px: 2, py: 3 }}>
            <CircularProgress size={24} />
          </Stack>
        ) : notificationsQuery.isError ? (
          <Stack spacing={1} sx={{ px: 2, py: 2 }}>
            <Typography variant="body2" color="error">
              Unable to load notifications.
            </Typography>
            <Button onClick={() => notificationsQuery.refetch()} size="small">
              Retry
            </Button>
          </Stack>
        ) : notifications.length === 0 ? (
          <MenuItem disabled>
            <ListItemText
              primary="You're all caught up"
              secondary="New updates will appear here."
            />
          </MenuItem>
        ) : (
          <List dense disablePadding sx={{ minWidth: 320, maxWidth: 360 }}>
            {notifications.map((notification, index) => (
              <ListItem
                key={`${notification.message}-${notification.createdAt ?? index}`}
                sx={{ alignItems: "flex-start" }}
              >
                <ListItemText primary={notification.message} />
              </ListItem>
            ))}
          </List>
        )}
      </Menu>
    </>
  );
}

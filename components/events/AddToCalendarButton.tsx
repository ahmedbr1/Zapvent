"use client";

import { useState } from "react";
import {
  IconButton,
  Menu,
  MenuItem,
  ListItemIcon,
  ListItemText,
  Tooltip,
} from "@mui/material";
import CalendarMonthIcon from "@mui/icons-material/CalendarMonthRounded";
import GoogleIcon from "@mui/icons-material/Google";
import EventIcon from "@mui/icons-material/EventRounded";
import {
  getGoogleCalendarUrl,
  getOutlookCalendarUrl,
  type CalendarEvent,
} from "@/lib/calendar";

interface AddToCalendarButtonProps {
  event: CalendarEvent;
  size?: "small" | "medium" | "large";
}

export function AddToCalendarButton({
  event,
  size = "medium",
}: AddToCalendarButtonProps) {
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
  const open = Boolean(anchorEl);

  const handleClick = (e: React.MouseEvent<HTMLButtonElement>) => {
    setAnchorEl(e.currentTarget);
  };

  const handleClose = () => {
    setAnchorEl(null);
  };

  const handleGoogleCalendar = () => {
    window.open(getGoogleCalendarUrl(event), "_blank", "noopener,noreferrer");
    handleClose();
  };

  const handleOutlookCalendar = () => {
    window.open(getOutlookCalendarUrl(event), "_blank", "noopener,noreferrer");
    handleClose();
  };

  return (
    <>
      <Tooltip title="Add to calendar">
        <IconButton
          onClick={handleClick}
          size={size}
          color="primary"
          aria-label="add to calendar"
        >
          <CalendarMonthIcon />
        </IconButton>
      </Tooltip>
      <Menu
        anchorEl={anchorEl}
        open={open}
        onClose={handleClose}
        anchorOrigin={{
          vertical: "bottom",
          horizontal: "right",
        }}
        transformOrigin={{
          vertical: "top",
          horizontal: "right",
        }}
      >
        <MenuItem onClick={handleGoogleCalendar}>
          <ListItemIcon>
            <GoogleIcon fontSize="small" />
          </ListItemIcon>
          <ListItemText>Google Calendar</ListItemText>
        </MenuItem>
        <MenuItem onClick={handleOutlookCalendar}>
          <ListItemIcon>
            <EventIcon fontSize="small" />
          </ListItemIcon>
          <ListItemText>Outlook Calendar</ListItemText>
        </MenuItem>
      </Menu>
    </>
  );
}

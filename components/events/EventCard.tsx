"use client";

import Link from "next/link";
import {
  Box,
  Card,
  CardActions,
  CardContent,
  Chip,
  Stack,
  Typography,
  Button,
  Tooltip,
} from "@mui/material";
import CalendarIcon from "@mui/icons-material/CalendarMonthRounded";
import LocationIcon from "@mui/icons-material/FmdGoodRounded";
import GroupIcon from "@mui/icons-material/PeopleAltRounded";
import { formatDateTime, formatRelative } from "@/lib/date";
import { EventType, type EventSummary } from "@/lib/types";

interface EventCardProps {
  event: EventSummary;
  onRegister?: (event: EventSummary) => void;
  disableRegister?: boolean;
}

const typeColorMap: Record<EventType, "primary" | "secondary" | "default"> = {
  [EventType.Workshop]: "primary",
  [EventType.Seminar]: "default",
  [EventType.Conference]: "primary",
  [EventType.Trip]: "secondary",
  [EventType.Bazaar]: "secondary",
};

export function EventCard({ event, onRegister, disableRegister }: EventCardProps) {
  const isBazaar = event.eventType === EventType.Bazaar;

  return (
    <Card
      sx={{
        height: "100%",
        display: "flex",
        flexDirection: "column",
        borderRadius: 3,
      }}
    >
      <CardContent sx={{ flexGrow: 1 }}>
        <Stack direction="row" spacing={1.5} alignItems="center" mb={2}>
          <Chip
            label={event.eventType}
            color={typeColorMap[event.eventType]}
            variant="outlined"
            size="small"
          />
          <Typography variant="caption" color="text.secondary">
            Starts {formatRelative(event.startDate)}
          </Typography>
        </Stack>
        <Typography variant="h6" fontWeight={700} gutterBottom>
          {event.name}
        </Typography>
        <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
          {event.description}
        </Typography>
        <Stack spacing={1.2} sx={{ color: "text.secondary" }}>
          <Stack direction="row" spacing={1} alignItems="center">
            <CalendarIcon fontSize="small" />
            <Typography variant="body2">
              {formatDateTime(event.startDate)} – {formatDateTime(event.endDate)}
            </Typography>
          </Stack>
          <Stack direction="row" spacing={1} alignItems="center">
            <LocationIcon fontSize="small" />
            <Typography variant="body2">{event.location}</Typography>
          </Stack>
          {typeof event.capacity === "number" && (
            <Stack direction="row" spacing={1} alignItems="center">
              <GroupIcon fontSize="small" />
              <Typography variant="body2">
                Capacity {event.capacity.toLocaleString()}
              </Typography>
            </Stack>
          )}
          {isBazaar && event.vendors && event.vendors.length > 0 && (
            <Tooltip
              title={event.vendors.map((vendor) => vendor.companyName).join(", ")}
              arrow
            >
              <Chip
                label={`${event.vendors.length} participating vendors`}
                size="small"
                color="secondary"
                variant="outlined"
                sx={{ alignSelf: "flex-start" }}
              />
            </Tooltip>
          )}
        </Stack>
      </CardContent>
      <CardActions sx={{ px: 3, pb: 3, pt: 0, gap: 1 }}>
        <Button
          component={Link}
          href={`/user/events/${event.id}`}
          variant="outlined"
          color="primary"
          size="small"
        >
          Details
        </Button>
        {onRegister && (
          <Button
            onClick={() => onRegister(event)}
            disabled={disableRegister}
            variant="contained"
            size="small"
          >
            Register
          </Button>
        )}
        <Box flexGrow={1} />
        <Typography variant="caption" color="text.secondary">
          Register by {formatDateTime(event.registrationDeadline, "MMM D, h:mm A")}
        </Typography>
      </CardActions>
    </Card>
  );
}

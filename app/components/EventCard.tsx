import {
  Card,
  CardContent,
  CardActions,
  Typography,
  Button,
  Chip,
  Box,
  Stack,
} from "@mui/material";
import {
  CalendarMonth,
  LocationOn,
  People,
  AttachMoney,
} from "@mui/icons-material";
import { Event, EventType } from "@/lib/types";

interface EventCardProps {
  event: Event;
  onRegister?: (eventId: string) => void;
  onView?: (eventId: string) => void;
  showActions?: boolean;
}

export default function EventCard({
  event,
  onRegister,
  onView,
  showActions = true,
}: EventCardProps) {
  const getEventTypeColor = (type: EventType) => {
    switch (type) {
      case EventType.WORKSHOP:
        return "primary";
      case EventType.SEMINAR:
        return "secondary";
      case EventType.CONFERENCE:
        return "error";
      case EventType.TRIP:
        return "success";
      case EventType.BAZAAR:
        return "warning";
      default:
        return "default";
    }
  };

  const formatDate = (date: string) => {
    return new Date(date).toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    });
  };

  return (
    <Card
      sx={{
        height: "100%",
        display: "flex",
        flexDirection: "column",
        transition: "transform 0.2s, box-shadow 0.2s",
        "&:hover": {
          transform: "translateY(-4px)",
          boxShadow: 4,
        },
      }}
    >
      <CardContent sx={{ flex: 1 }}>
        <Box
          display="flex"
          justifyContent="space-between"
          alignItems="start"
          mb={2}
        >
          <Typography variant="h6" component="h3" fontWeight="bold">
            {event.name}
          </Typography>
          <Chip
            label={event.eventType}
            color={getEventTypeColor(event.eventType) as any}
            size="small"
          />
        </Box>

        <Typography variant="body2" color="text.secondary" mb={2}>
          {event.description}
        </Typography>

        <Stack spacing={1}>
          <Box display="flex" alignItems="center" gap={1}>
            <CalendarMonth fontSize="small" color="action" />
            <Typography variant="body2">
              {formatDate(event.startDate)} - {formatDate(event.endDate)}
            </Typography>
          </Box>

          <Box display="flex" alignItems="center" gap={1}>
            <LocationOn fontSize="small" color="action" />
            <Typography variant="body2">{event.location}</Typography>
          </Box>

          {event.capacity && (
            <Box display="flex" alignItems="center" gap={1}>
              <People fontSize="small" color="action" />
              <Typography variant="body2">
                {event.registeredUsers?.length || 0} / {event.capacity}{" "}
                registered
              </Typography>
            </Box>
          )}

          {event.price !== undefined && event.price > 0 && (
            <Box display="flex" alignItems="center" gap={1}>
              <AttachMoney fontSize="small" color="action" />
              <Typography variant="body2">{event.price} EGP</Typography>
            </Box>
          )}

          {event.fundingSource && (
            <Chip
              label={`Funded by: ${event.fundingSource}`}
              size="small"
              variant="outlined"
              sx={{ mt: 1, width: "fit-content" }}
            />
          )}
        </Stack>
      </CardContent>

      {showActions && (
        <CardActions sx={{ p: 2, pt: 0 }}>
          {onView && (
            <Button size="small" onClick={() => onView(event._id)}>
              View Details
            </Button>
          )}
          {onRegister && (
            <Button
              size="small"
              variant="contained"
              onClick={() => onRegister(event._id)}
              disabled={
                event.capacity !== undefined &&
                (event.registeredUsers?.length || 0) >= event.capacity
              }
            >
              {event.capacity !== undefined &&
              (event.registeredUsers?.length || 0) >= event.capacity
                ? "Full"
                : "Register"}
            </Button>
          )}
        </CardActions>
      )}
    </Card>
  );
}

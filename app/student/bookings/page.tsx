"use client";

import { useEffect, useState } from "react";
import {
  Box,
  Typography,
  Paper,
  Alert,
  Grid,
  Card,
  CardContent,
  CardActions,
  Button,
  Chip,
} from "@mui/material";
import {
  Dashboard as DashboardIcon,
  EventAvailable,
  SportsBasketball,
  Assignment,
  CalendarMonth,
  LocationOn,
} from "@mui/icons-material";
import DashboardLayout from "@/app/components/DashboardLayout";
import ProtectedRoute from "@/app/components/ProtectedRoute";
import Loading from "@/app/components/Loading";
import { usersApi } from "@/lib/api";
import { Event } from "@/lib/types";
import { useAuth } from "@/app/contexts/AuthContext";

export default function MyBookingsPage() {
  const { user } = useAuth();
  const [bookings, setBookings] = useState<Event[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const menuItems = [
    {
      text: "Dashboard",
      icon: <DashboardIcon />,
      path: "/student/dashboard",
    },
    {
      text: "My Bookings",
      icon: <EventAvailable />,
      path: "/student/bookings",
    },
    {
      text: "Gym & Sports",
      icon: <SportsBasketball />,
      path: "/student/gym",
    },
    {
      text: "Complaints",
      icon: <Assignment />,
      path: "/student/complaints",
    },
  ];

  useEffect(() => {
    loadBookings();
  }, []);

  const loadBookings = async () => {
    if (!user) return;

    try {
      setLoading(true);
      const response = await usersApi.getRegisteredEvents(user._id);
      if (response.success && response.data) {
        setBookings(response.data);
      } else {
        setError("Failed to load bookings");
      }
    } catch (err: any) {
      setError(err.message || "Failed to load bookings");
    } finally {
      setLoading(false);
    }
  };

  const handleCancelBooking = async (eventId: string) => {
    if (confirm("Are you sure you want to cancel this booking?")) {
      try {
        // TODO: Implement cancel booking API
        alert(`Booking ${eventId} cancelled`);
        await loadBookings();
      } catch (err: any) {
        alert(err.message || "Failed to cancel booking");
      }
    }
  };

  const formatDate = (date: string) => {
    return new Date(date).toLocaleDateString("en-US", {
      weekday: "long",
      year: "numeric",
      month: "long",
      day: "numeric",
    });
  };

  return (
    <ProtectedRoute allowedRoles={["user"]}>
      <DashboardLayout title="My Bookings" menuItems={menuItems}>
        <Box mb={4}>
          <Typography variant="h4" gutterBottom fontWeight="bold">
            My Event Bookings
          </Typography>
          <Typography variant="body1" color="text.secondary">
            View and manage your registered events
          </Typography>
        </Box>

        {error && (
          <Alert severity="error" sx={{ mb: 3 }}>
            {error}
          </Alert>
        )}

        {loading ? (
          <Loading message="Loading your bookings..." />
        ) : bookings.length === 0 ? (
          <Alert severity="info">
            You haven't registered for any events yet. Visit the dashboard to
            browse available events!
          </Alert>
        ) : (
          <Grid container spacing={3}>
            {bookings.map((event) => {
              const isPast = new Date(event.endDate) < new Date();

              return (
                <Grid size={{ xs: 12, md: 6 }} key={event._id}>
                  <Card>
                    <CardContent>
                      <Box
                        display="flex"
                        justifyContent="space-between"
                        alignItems="start"
                        mb={2}
                      >
                        <Typography variant="h6" fontWeight="bold">
                          {event.name}
                        </Typography>
                        {isPast ? (
                          <Chip label="Past" size="small" />
                        ) : (
                          <Chip label="Upcoming" color="success" size="small" />
                        )}
                      </Box>

                      <Typography variant="body2" color="text.secondary" mb={2}>
                        {event.description}
                      </Typography>

                      <Box display="flex" alignItems="center" gap={1} mb={1}>
                        <CalendarMonth fontSize="small" color="action" />
                        <Typography variant="body2">
                          {formatDate(event.startDate)}
                        </Typography>
                      </Box>

                      <Box display="flex" alignItems="center" gap={1} mb={1}>
                        <LocationOn fontSize="small" color="action" />
                        <Typography variant="body2">
                          {event.location}
                        </Typography>
                      </Box>

                      {event.price && event.price > 0 && (
                        <Box mt={2}>
                          <Chip
                            label={`${event.price} EGP`}
                            color="primary"
                            size="small"
                          />
                        </Box>
                      )}
                    </CardContent>

                    <CardActions>
                      <Button size="small">View Details</Button>
                      {!isPast && (
                        <Button
                          size="small"
                          color="error"
                          onClick={() => handleCancelBooking(event._id)}
                        >
                          Cancel Booking
                        </Button>
                      )}
                    </CardActions>
                  </Card>
                </Grid>
              );
            })}
          </Grid>
        )}
      </DashboardLayout>
    </ProtectedRoute>
  );
}

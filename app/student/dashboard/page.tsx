"use client";

import { useEffect, useState } from "react";
import {
  Box,
  Grid,
  TextField,
  MenuItem,
  Typography,
  Alert,
  CircularProgress,
  Tabs,
  Tab,
  Paper,
} from "@mui/material";
import {
  Dashboard as DashboardIcon,
  EventAvailable,
  SportsBasketball,
  Assignment,
} from "@mui/icons-material";
import DashboardLayout from "@/app/components/DashboardLayout";
import ProtectedRoute from "@/app/components/ProtectedRoute";
import EventCard from "@/app/components/EventCard";
import { eventsApi } from "@/lib/api";
import { Event, EventType } from "@/lib/types";

export default function StudentDashboard() {
  const [events, setEvents] = useState<Event[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [filterType, setFilterType] = useState<string>("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [tabValue, setTabValue] = useState(0);

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
    loadEvents();
  }, []);

  const loadEvents = async () => {
    try {
      setLoading(true);
      const response = await eventsApi.getAll();
      if (response.success && response.data) {
        setEvents(response.data);
      } else {
        setError("Failed to load events");
      }
    } catch (err: any) {
      setError(err.message || "Failed to load events");
    } finally {
      setLoading(false);
    }
  };

  const handleRegister = async (eventId: string) => {
    try {
      // Call registration API
      alert(`Registering for event ${eventId}`);
      // TODO: Implement actual registration
    } catch (err: any) {
      alert(err.message || "Registration failed");
    }
  };

  const filteredEvents = events.filter((event) => {
    const matchesType = filterType === "all" || event.eventType === filterType;
    const matchesSearch =
      event.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      event.description.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesTab = tabValue === 0 || !event.archived;
    return matchesType && matchesSearch && matchesTab;
  });

  return (
    <ProtectedRoute allowedRoles={["user"]}>
      <DashboardLayout title="Student Dashboard" menuItems={menuItems}>
        <Box mb={4}>
          <Typography variant="h4" gutterBottom fontWeight="bold">
            Browse Events
          </Typography>
          <Typography variant="body1" color="text.secondary">
            Discover and register for upcoming university events
          </Typography>
        </Box>

        <Paper sx={{ mb: 3 }}>
          <Tabs
            value={tabValue}
            onChange={(_, newValue) => setTabValue(newValue)}
          >
            <Tab label="All Events" />
            <Tab label="Active Events" />
          </Tabs>
        </Paper>

        <Box mb={3} display="flex" gap={2} flexWrap="wrap">
          <TextField
            label="Search events"
            variant="outlined"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            sx={{ minWidth: 250, flex: 1 }}
          />
          <TextField
            select
            label="Event Type"
            value={filterType}
            onChange={(e) => setFilterType(e.target.value)}
            sx={{ minWidth: 200 }}
          >
            <MenuItem value="all">All Types</MenuItem>
            <MenuItem value={EventType.WORKSHOP}>Workshop</MenuItem>
            <MenuItem value={EventType.SEMINAR}>Seminar</MenuItem>
            <MenuItem value={EventType.CONFERENCE}>Conference</MenuItem>
            <MenuItem value={EventType.TRIP}>Trip</MenuItem>
            <MenuItem value={EventType.BAZAAR}>Bazaar</MenuItem>
          </TextField>
        </Box>

        {error && (
          <Alert severity="error" sx={{ mb: 3 }}>
            {error}
          </Alert>
        )}

        {loading ? (
          <Box display="flex" justifyContent="center" py={8}>
            <CircularProgress />
          </Box>
        ) : filteredEvents.length === 0 ? (
          <Alert severity="info">
            No events found. Try adjusting your filters.
          </Alert>
        ) : (
          <Grid container spacing={3}>
            {filteredEvents.map((event) => (
              <Grid size={{ xs: 12, sm: 6, md: 4 }} key={event._id}>
                <EventCard
                  event={event}
                  onRegister={handleRegister}
                  onView={(id) => alert(`View event ${id}`)}
                />
              </Grid>
            ))}
          </Grid>
        )}
      </DashboardLayout>
    </ProtectedRoute>
  );
}

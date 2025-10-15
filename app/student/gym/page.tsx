"use client";

import { useEffect, useState } from "react";
import {
  Box,
  Typography,
  Grid,
  Card,
  CardContent,
  CardActions,
  Button,
  Alert,
  Chip,
  Tabs,
  Tab,
  Paper,
} from "@mui/material";
import {
  Dashboard as DashboardIcon,
  EventAvailable,
  SportsBasketball,
  Assignment,
  FitnessCenter,
  SportsBaseball,
} from "@mui/icons-material";
import DashboardLayout from "@/app/components/DashboardLayout";
import ProtectedRoute from "@/app/components/ProtectedRoute";
import Loading from "@/app/components/Loading";
import { gymSessionsApi } from "@/lib/api";
import { GymSession, GymSessionType } from "@/lib/types";

export default function GymPage() {
  const [tabValue, setTabValue] = useState(0);
  const [gymSessions, setGymSessions] = useState<GymSession[]>([]);
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
    loadGymSessions();
  }, []);

  const loadGymSessions = async () => {
    try {
      setLoading(true);
      const response = await gymSessionsApi.getAll();
      if (response.success && response.data) {
        setGymSessions(response.data);
      } else {
        setError("Failed to load gym sessions");
      }
    } catch (err: any) {
      setError(err.message || "Failed to load gym sessions");
    } finally {
      setLoading(false);
    }
  };

  const handleRegister = async (sessionId: string) => {
    try {
      await gymSessionsApi.register(sessionId);
      alert("Successfully registered for gym session!");
      await loadGymSessions();
    } catch (err: any) {
      alert(err.message || "Registration failed");
    }
  };

  const getSessionIcon = (type: GymSessionType) => {
    switch (type) {
      case GymSessionType.YOGA:
        return <FitnessCenter />;
      case GymSessionType.CARDIO:
        return <SportsBaseball />;
      case GymSessionType.STRENGTH:
        return <FitnessCenter />;
      default:
        return <SportsBasketball />;
    }
  };

  const getSessionColor = (type: GymSessionType) => {
    switch (type) {
      case GymSessionType.YOGA:
        return "success";
      case GymSessionType.CARDIO:
        return "error";
      case GymSessionType.STRENGTH:
        return "warning";
      default:
        return "primary";
    }
  };

  const formatTime = (time: string) => {
    return new Date(`1970-01-01T${time}`).toLocaleTimeString("en-US", {
      hour: "numeric",
      minute: "2-digit",
      hour12: true,
    });
  };

  const formatDate = (date: string) => {
    return new Date(date).toLocaleDateString("en-US", {
      weekday: "short",
      month: "short",
      day: "numeric",
    });
  };

  return (
    <ProtectedRoute allowedRoles={["user"]}>
      <DashboardLayout title="Gym & Sports" menuItems={menuItems}>
        <Box mb={4}>
          <Typography variant="h4" gutterBottom fontWeight="bold">
            Gym & Sports Facilities
          </Typography>
          <Typography variant="body1" color="text.secondary">
            Book gym sessions and sports facilities
          </Typography>
        </Box>

        <Paper sx={{ mb: 3 }}>
          <Tabs
            value={tabValue}
            onChange={(_, newValue) => setTabValue(newValue)}
          >
            <Tab label="Gym Sessions" />
            <Tab label="Court Bookings" />
          </Tabs>
        </Paper>

        {error && (
          <Alert severity="error" sx={{ mb: 3 }}>
            {error}
          </Alert>
        )}

        {loading ? (
          <Loading message="Loading sessions..." />
        ) : tabValue === 0 ? (
          gymSessions.length === 0 ? (
            <Alert severity="info">
              No gym sessions available at the moment
            </Alert>
          ) : (
            <Grid container spacing={3}>
              {gymSessions.map((session) => {
                const spotsLeft =
                  session.maxParticipants -
                  (session.registeredUsers?.length || 0);
                const isFull = spotsLeft <= 0;

                return (
                  <Grid size={{ xs: 12, sm: 6, md: 4 }} key={session._id}>
                    <Card>
                      <CardContent>
                        <Box display="flex" alignItems="center" gap={2} mb={2}>
                          <Box
                            sx={{
                              color: `${getSessionColor(session.type)}.main`,
                            }}
                          >
                            {getSessionIcon(session.type)}
                          </Box>
                          <Box flex={1}>
                            <Typography variant="h6" fontWeight="bold">
                              {session.type}
                            </Typography>
                            <Typography
                              variant="caption"
                              color="text.secondary"
                            >
                              {formatDate(session.date)}
                            </Typography>
                          </Box>
                          <Chip
                            label={session.type}
                            color={getSessionColor(session.type) as any}
                            size="small"
                          />
                        </Box>

                        <Typography variant="body2" mb={2}>
                          🕐 {formatTime(session.startTime)} -{" "}
                          {formatTime(session.endTime)}
                        </Typography>

                        <Box
                          display="flex"
                          justifyContent="space-between"
                          alignItems="center"
                        >
                          <Typography variant="body2" color="text.secondary">
                            {spotsLeft} spots left
                          </Typography>
                          <Typography variant="caption">
                            {session.registeredUsers?.length || 0} /{" "}
                            {session.maxParticipants}
                          </Typography>
                        </Box>
                      </CardContent>

                      <CardActions>
                        <Button
                          fullWidth
                          variant="contained"
                          color={getSessionColor(session.type) as any}
                          onClick={() => handleRegister(session._id)}
                          disabled={isFull}
                        >
                          {isFull ? "Full" : "Register"}
                        </Button>
                      </CardActions>
                    </Card>
                  </Grid>
                );
              })}
            </Grid>
          )
        ) : (
          <Alert severity="info">Court booking feature coming soon!</Alert>
        )}
      </DashboardLayout>
    </ProtectedRoute>
  );
}

"use client";

import { useState } from "react";
import {
  Box,
  Typography,
  Paper,
  TextField,
  Button,
  Alert,
  Grid,
} from "@mui/material";
import {
  Dashboard as DashboardIcon,
  EventAvailable,
  SportsBasketball,
  Assignment,
  Send,
} from "@mui/icons-material";
import DashboardLayout from "@/app/components/DashboardLayout";
import ProtectedRoute from "@/app/components/ProtectedRoute";

export default function ComplaintsPage() {
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [success, setSuccess] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setSuccess("");
    setLoading(true);

    try {
      // TODO: Implement complaint submission API
      // await complaintsApi.create({ title, description });

      // Simulate API call
      await new Promise((resolve) => setTimeout(resolve, 1000));

      setSuccess(
        "Complaint submitted successfully! Our team will review it shortly."
      );
      setTitle("");
      setDescription("");
    } catch (err: any) {
      setError(err.message || "Failed to submit complaint");
    } finally {
      setLoading(false);
    }
  };

  return (
    <ProtectedRoute allowedRoles={["user"]}>
      <DashboardLayout title="Complaints" menuItems={menuItems}>
        <Box mb={4}>
          <Typography variant="h4" gutterBottom fontWeight="bold">
            Submit a Complaint
          </Typography>
          <Typography variant="body1" color="text.secondary">
            Let us know about any issues or concerns you have
          </Typography>
        </Box>

        {success && (
          <Alert
            severity="success"
            sx={{ mb: 3 }}
            onClose={() => setSuccess("")}
          >
            {success}
          </Alert>
        )}

        {error && (
          <Alert severity="error" sx={{ mb: 3 }} onClose={() => setError("")}>
            {error}
          </Alert>
        )}

        <Paper sx={{ p: 4 }}>
          <form onSubmit={handleSubmit}>
            <Grid container spacing={3}>
              <Grid size={{ xs: 12 }}>
                <TextField
                  fullWidth
                  label="Complaint Title"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  required
                  placeholder="Brief summary of your complaint"
                />
              </Grid>

              <Grid size={{ xs: 12 }}>
                <TextField
                  fullWidth
                  label="Description"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  multiline
                  rows={6}
                  required
                  placeholder="Please provide detailed information about your complaint..."
                />
              </Grid>

              <Grid size={{ xs: 12 }}>
                <Button
                  type="submit"
                  variant="contained"
                  color="primary"
                  size="large"
                  startIcon={<Send />}
                  disabled={loading}
                >
                  {loading ? "Submitting..." : "Submit Complaint"}
                </Button>
              </Grid>
            </Grid>
          </form>
        </Paper>

        <Box mt={4}>
          <Typography variant="h6" gutterBottom fontWeight="bold">
            Guidelines
          </Typography>
          <Paper sx={{ p: 3 }}>
            <Typography variant="body2" paragraph>
              • Be specific and provide as much detail as possible
            </Typography>
            <Typography variant="body2" paragraph>
              • Include relevant dates, times, and locations
            </Typography>
            <Typography variant="body2" paragraph>
              • Remain professional and respectful in your language
            </Typography>
            <Typography variant="body2">
              • Allow 2-3 business days for a response
            </Typography>
          </Paper>
        </Box>
      </DashboardLayout>
    </ProtectedRoute>
  );
}

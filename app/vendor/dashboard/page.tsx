"use client";

import { useEffect, useState } from "react";
import {
  Box,
  Typography,
  Paper,
  Grid,
  Card,
  CardContent,
  Button,
  Alert,
  CircularProgress,
  Chip,
} from "@mui/material";
import {
  Dashboard as DashboardIcon,
  Store,
  Assignment,
  Pending,
  CheckCircle,
  Cancel,
} from "@mui/icons-material";
import DashboardLayout from "@/app/components/DashboardLayout";
import EventCard from "@/app/components/EventCard";
import StatusChip from "@/app/components/StatusChip";
import { eventsApi, vendorsApi } from "@/lib/api";
import { Event, EventType } from "@/lib/types";
import { useAuth } from "@/app/contexts/AuthContext";

export default function VendorDashboard() {
  const { user } = useAuth();
  const [bazaars, setBazaars] = useState<Event[]>([]);
  const [myApplications, setMyApplications] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const menuItems = [
    {
      text: "Dashboard",
      icon: <DashboardIcon />,
      path: "/vendor/dashboard",
    },
    {
      text: "My Booth",
      icon: <Store />,
      path: "/vendor/booth",
    },
    {
      text: "Applications",
      icon: <Assignment />,
      path: "/vendor/applications",
    },
  ];

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      setError("");

      const [eventsResponse, applicationsResponse] = await Promise.all([
        eventsApi.getUpcomingBazaars(),
        vendorsApi.getMyApplications(),
      ]);

      if (eventsResponse.success && eventsResponse.data) {
        setBazaars(eventsResponse.data);
      }
      if (applicationsResponse.success && applicationsResponse.data) {
        setMyApplications(
          Array.isArray(applicationsResponse.data)
            ? applicationsResponse.data
            : []
        );
      }
    } catch (err: any) {
      setError(err.message || "Failed to load data");
    } finally {
      setLoading(false);
    }
  };

  const handleApplyToBazaar = async (bazaarId: string) => {
    try {
      const response = await vendorsApi.applyToBazaar(bazaarId, {
        boothSize: "standard",
        products: "Various products",
      });

      if (response.success) {
        alert("Application submitted successfully!");
        await loadData();
      } else {
        alert(response.message || "Application failed");
      }
    } catch (err: any) {
      alert(err.message || "Application failed");
    }
  };

  const vendorStatus = (user as any)?.status || "pending";

  return (
    <DashboardLayout title="Vendor Dashboard" menuItems={menuItems}>
      <Box mb={4}>
        <Typography variant="h4" gutterBottom fontWeight="bold">
          Vendor Dashboard
        </Typography>
        <Box display="flex" alignItems="center" gap={2}>
          <Typography variant="body1" color="text.secondary">
            Manage your bazaar applications and booth
          </Typography>
          <StatusChip status={vendorStatus} />
        </Box>
      </Box>

      {vendorStatus === "pending" && (
        <Alert severity="info" sx={{ mb: 3 }}>
          Your vendor application is pending approval. You'll be able to apply
          to bazaars once approved.
        </Alert>
      )}

      {vendorStatus === "rejected" && (
        <Alert severity="error" sx={{ mb: 3 }}>
          Your vendor application was rejected. Please contact support for more
          information.
        </Alert>
      )}

      {error && (
        <Alert severity="error" sx={{ mb: 3 }}>
          {error}
        </Alert>
      )}

      {loading ? (
        <Box display="flex" justifyContent="center" py={8}>
          <CircularProgress />
        </Box>
      ) : (
        <>
          {/* Statistics */}
          <Grid container spacing={3} mb={4}>
            <Grid size={{ xs: 12, sm: 6, md: 3 }}>
              <Card>
                <CardContent>
                  <Box display="flex" alignItems="center" gap={2}>
                    <Pending color="warning" />
                    <Box>
                      <Typography variant="h4" fontWeight="bold">
                        {
                          myApplications.filter((a) => a.status === "pending")
                            .length
                        }
                      </Typography>
                      <Typography variant="body2" color="text.secondary">
                        Pending
                      </Typography>
                    </Box>
                  </Box>
                </CardContent>
              </Card>
            </Grid>

            <Grid size={{ xs: 12, sm: 6, md: 3 }}>
              <Card>
                <CardContent>
                  <Box display="flex" alignItems="center" gap={2}>
                    <CheckCircle color="success" />
                    <Box>
                      <Typography variant="h4" fontWeight="bold">
                        {
                          myApplications.filter((a) => a.status === "approved")
                            .length
                        }
                      </Typography>
                      <Typography variant="body2" color="text.secondary">
                        Approved
                      </Typography>
                    </Box>
                  </Box>
                </CardContent>
              </Card>
            </Grid>

            <Grid size={{ xs: 12, sm: 6, md: 3 }}>
              <Card>
                <CardContent>
                  <Box display="flex" alignItems="center" gap={2}>
                    <Cancel color="error" />
                    <Box>
                      <Typography variant="h4" fontWeight="bold">
                        {
                          myApplications.filter((a) => a.status === "rejected")
                            .length
                        }
                      </Typography>
                      <Typography variant="body2" color="text.secondary">
                        Rejected
                      </Typography>
                    </Box>
                  </Box>
                </CardContent>
              </Card>
            </Grid>

            <Grid size={{ xs: 12, sm: 6, md: 3 }}>
              <Card>
                <CardContent>
                  <Box display="flex" alignItems="center" gap={2}>
                    <Assignment color="primary" />
                    <Box>
                      <Typography variant="h4" fontWeight="bold">
                        {myApplications.length}
                      </Typography>
                      <Typography variant="body2" color="text.secondary">
                        Total Applications
                      </Typography>
                    </Box>
                  </Box>
                </CardContent>
              </Card>
            </Grid>
          </Grid>

          {/* Upcoming Bazaars */}
          <Box mb={4}>
            <Typography variant="h5" gutterBottom fontWeight="bold">
              Upcoming Bazaars
            </Typography>
            <Typography variant="body2" color="text.secondary" mb={3}>
              Apply to participate in upcoming university bazaars
            </Typography>

            {bazaars.length === 0 ? (
              <Alert severity="info">No upcoming bazaars available</Alert>
            ) : (
              <Grid container spacing={3}>
                {bazaars.map((bazaar) => (
                  <Grid size={{ xs: 12, sm: 6, md: 4 }} key={bazaar._id}>
                    <Card>
                      <CardContent>
                        <Box
                          display="flex"
                          justifyContent="space-between"
                          alignItems="start"
                          mb={2}
                        >
                          <Typography variant="h6" fontWeight="bold">
                            {bazaar.name}
                          </Typography>
                          <Chip
                            label={bazaar.eventType}
                            color="warning"
                            size="small"
                          />
                        </Box>
                        <Typography
                          variant="body2"
                          color="text.secondary"
                          mb={2}
                        >
                          {bazaar.description}
                        </Typography>
                        <Typography variant="body2" mb={1}>
                          📅 {new Date(bazaar.startDate).toLocaleDateString()}
                        </Typography>
                        <Typography variant="body2" mb={2}>
                          📍 {bazaar.location}
                        </Typography>
                        <Button
                          fullWidth
                          variant="contained"
                          color="success"
                          onClick={() => handleApplyToBazaar(bazaar._id)}
                          disabled={vendorStatus !== "approved"}
                        >
                          {vendorStatus !== "approved"
                            ? "Pending Approval"
                            : "Apply Now"}
                        </Button>
                      </CardContent>
                    </Card>
                  </Grid>
                ))}
              </Grid>
            )}
          </Box>
        </>
      )}
    </DashboardLayout>
  );
}

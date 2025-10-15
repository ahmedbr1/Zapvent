"use client";

import { useRouter } from "next/navigation";
import {
  Box,
  Container,
  Typography,
  Button,
  Card,
  CardContent,
  CardActions,
  Grid,
  Paper,
} from "@mui/material";
import {
  Person as PersonIcon,
  AdminPanelSettings as AdminIcon,
  Business as VendorIcon,
  CalendarMonth as CalendarIcon,
} from "@mui/icons-material";

export default function LandingPage() {
  const router = useRouter();

  const userTypes = [
    {
      title: "Student/Staff",
      description:
        "Browse events, register for activities, and manage your bookings",
      icon: <PersonIcon sx={{ fontSize: 60 }} />,
      color: "primary",
      loginPath: "/auth/login/user",
      registerPath: "/auth/register/user",
    },
    {
      title: "Admin",
      description: "Manage users, vendors, and oversee system operations",
      icon: <AdminIcon sx={{ fontSize: 60 }} />,
      color: "error",
      loginPath: "/auth/login/admin",
      registerPath: null,
    },
    {
      title: "Events Office",
      description: "Create and manage university events and bazaars",
      icon: <CalendarIcon sx={{ fontSize: 60 }} />,
      color: "secondary",
      loginPath: "/auth/login/events-office",
      registerPath: null,
    },
    {
      title: "Vendor",
      description:
        "Register your business and participate in university bazaars",
      icon: <VendorIcon sx={{ fontSize: 60 }} />,
      color: "success",
      loginPath: "/auth/login/vendor",
      registerPath: "/auth/register/vendor",
    },
  ];

  return (
    <Box
      sx={{
        minHeight: "100vh",
        background: "linear-gradient(135deg, #003366 0%, #1a5490 100%)",
        display: "flex",
        flexDirection: "column",
      }}
    >
      {/* Header */}
      <Paper
        elevation={3}
        sx={{
          py: 3,
          px: 4,
          backgroundColor: "rgba(255, 255, 255, 0.95)",
          borderRadius: 0,
        }}
      >
        <Container maxWidth="lg">
          <Box display="flex" alignItems="center" gap={2}>
            <CalendarIcon sx={{ fontSize: 40, color: "primary.main" }} />
            <Typography
              variant="h4"
              component="h1"
              fontWeight="bold"
              color="primary"
            >
              Zapvent
            </Typography>
          </Box>
          <Typography variant="subtitle1" color="text.secondary" sx={{ mt: 1 }}>
            University Event Management System
          </Typography>
        </Container>
      </Paper>

      {/* Main Content */}
      <Container maxWidth="lg" sx={{ flex: 1, py: 8 }}>
        <Box textAlign="center" mb={6}>
          <Typography
            variant="h3"
            component="h2"
            gutterBottom
            sx={{ color: "white", fontWeight: "bold" }}
          >
            Welcome to Zapvent
          </Typography>
          <Typography variant="h6" sx={{ color: "rgba(255, 255, 255, 0.9)" }}>
            Choose your role to get started
          </Typography>
        </Box>

        <Grid container spacing={4}>
          {userTypes.map((type) => (
            <Grid size={{ xs: 12, sm: 6, md: 3 }} key={type.title}>
              <Card
                sx={{
                  height: "100%",
                  display: "flex",
                  flexDirection: "column",
                  transition: "transform 0.3s, box-shadow 0.3s",
                  "&:hover": {
                    transform: "translateY(-8px)",
                    boxShadow: 6,
                  },
                }}
              >
                <CardContent sx={{ flex: 1, textAlign: "center", pt: 4 }}>
                  <Box
                    sx={{
                      color: `${type.color}.main`,
                      mb: 2,
                    }}
                  >
                    {type.icon}
                  </Box>
                  <Typography
                    variant="h5"
                    component="h3"
                    gutterBottom
                    fontWeight="bold"
                  >
                    {type.title}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    {type.description}
                  </Typography>
                </CardContent>
                <CardActions sx={{ flexDirection: "column", gap: 1, p: 2 }}>
                  <Button
                    fullWidth
                    variant="contained"
                    color={type.color as any}
                    onClick={() => router.push(type.loginPath)}
                  >
                    Login
                  </Button>
                  {type.registerPath && (
                    <Button
                      fullWidth
                      variant="outlined"
                      color={type.color as any}
                      onClick={() => router.push(type.registerPath!)}
                    >
                      Register
                    </Button>
                  )}
                </CardActions>
              </Card>
            </Grid>
          ))}
        </Grid>
      </Container>

      {/* Footer */}
      <Box
        component="footer"
        sx={{
          py: 3,
          px: 2,
          backgroundColor: "rgba(0, 0, 0, 0.2)",
          color: "white",
        }}
      >
        <Container maxWidth="lg">
          <Typography variant="body2" align="center">
            © 2024 Zapvent - German University in Cairo
          </Typography>
        </Container>
      </Box>
    </Box>
  );
}

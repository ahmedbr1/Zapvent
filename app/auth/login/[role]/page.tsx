"use client";

import { useState } from "react";
import { useParams, useRouter } from "next/navigation";
import {
  Box,
  Container,
  Paper,
  Typography,
  TextField,
  Button,
  Alert,
  Link as MuiLink,
  InputAdornment,
  IconButton,
} from "@mui/material";
import {
  Visibility,
  VisibilityOff,
  Person as PersonIcon,
  AdminPanelSettings as AdminIcon,
  Business as VendorIcon,
  CalendarMonth as CalendarIcon,
} from "@mui/icons-material";
import Link from "next/link";
import { useAuth } from "@/app/contexts/AuthContext";

export default function LoginPage() {
  const params = useParams();
  const router = useRouter();
  const { login } = useAuth();
  const role = params.role as string;

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  // Map URL role to backend role type
  const roleConfig = {
    user: {
      type: "user" as const,
      title: "Student/Staff Login",
      icon: <PersonIcon sx={{ fontSize: 60 }} />,
      color: "primary",
      registerPath: "/auth/register/user",
    },
    admin: {
      type: "admin" as const,
      title: "Admin Login",
      icon: <AdminIcon sx={{ fontSize: 60 }} />,
      color: "error",
      registerPath: null,
    },
    "events-office": {
      type: "admin" as const,
      title: "Events Office Login",
      icon: <CalendarIcon sx={{ fontSize: 60 }} />,
      color: "secondary",
      registerPath: null,
    },
    vendor: {
      type: "vendor" as const,
      title: "Vendor Login",
      icon: <VendorIcon sx={{ fontSize: 60 }} />,
      color: "success",
      registerPath: "/auth/register/vendor",
    },
  };

  const config = roleConfig[role as keyof typeof roleConfig];

  if (!config) {
    return (
      <Container maxWidth="sm" sx={{ mt: 8 }}>
        <Alert severity="error">Invalid login page</Alert>
      </Container>
    );
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      await login({ email, password }, config.type);
    } catch (err: any) {
      setError(err.message || "Login failed. Please check your credentials.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Box
      sx={{
        minHeight: "100vh",
        background: "linear-gradient(135deg, #003366 0%, #1a5490 100%)",
        display: "flex",
        alignItems: "center",
        py: 8,
      }}
    >
      <Container maxWidth="sm">
        <Paper elevation={6} sx={{ p: 4 }}>
          <Box textAlign="center" mb={4}>
            <Box sx={{ color: `${config.color}.main`, mb: 2 }}>
              {config.icon}
            </Box>
            <Typography
              variant="h4"
              component="h1"
              gutterBottom
              fontWeight="bold"
            >
              {config.title}
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Enter your credentials to access your account
            </Typography>
          </Box>

          {error && (
            <Alert severity="error" sx={{ mb: 3 }}>
              {error}
            </Alert>
          )}

          <form onSubmit={handleSubmit}>
            <TextField
              fullWidth
              label="Email Address"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              margin="normal"
              required
              autoComplete="email"
              autoFocus
            />

            <TextField
              fullWidth
              label="Password"
              type={showPassword ? "text" : "password"}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              margin="normal"
              required
              autoComplete="current-password"
              InputProps={{
                endAdornment: (
                  <InputAdornment position="end">
                    <IconButton
                      onClick={() => setShowPassword(!showPassword)}
                      edge="end"
                    >
                      {showPassword ? <VisibilityOff /> : <Visibility />}
                    </IconButton>
                  </InputAdornment>
                ),
              }}
            />

            <Button
              type="submit"
              fullWidth
              variant="contained"
              color={config.color as any}
              size="large"
              disabled={loading}
              sx={{ mt: 3, mb: 2 }}
            >
              {loading ? "Logging in..." : "Login"}
            </Button>

            {config.registerPath && (
              <Box textAlign="center" mt={2}>
                <Typography variant="body2" color="text.secondary">
                  Don't have an account?{" "}
                  <MuiLink
                    component={Link}
                    href={config.registerPath}
                    color={config.color}
                    sx={{ fontWeight: 600 }}
                  >
                    Register here
                  </MuiLink>
                </Typography>
              </Box>
            )}

            <Box textAlign="center" mt={3}>
              <MuiLink
                component={Link}
                href="/"
                color="text.secondary"
                sx={{ fontSize: "0.875rem" }}
              >
                ← Back to home
              </MuiLink>
            </Box>
          </form>
        </Paper>
      </Container>
    </Box>
  );
}

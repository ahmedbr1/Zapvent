"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
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
  MenuItem,
  Stepper,
  Step,
  StepLabel,
} from "@mui/material";
import {
  Visibility,
  VisibilityOff,
  Person as PersonIcon,
} from "@mui/icons-material";
import Link from "next/link";
import { authApi } from "@/lib/api";
import { UserRole, Faculty } from "@/lib/types";

const steps = ["Personal Info", "Account Details", "University Info"];

export default function UserRegisterPage() {
  const router = useRouter();
  const [activeStep, setActiveStep] = useState(0);
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  // Form state
  const [formData, setFormData] = useState({
    email: "",
    password: "",
    confirmPassword: "",
    name: "",
    phoneNumber: "",
    role: UserRole.STUDENT,
    faculty: Faculty.IET,
    studentId: "",
  });

  const handleChange =
    (field: string) => (e: React.ChangeEvent<HTMLInputElement>) => {
      setFormData({ ...formData, [field]: e.target.value });
    };

  const handleNext = () => {
    setError("");

    // Validation for each step
    if (activeStep === 0) {
      if (!formData.name || !formData.phoneNumber) {
        setError("Please fill in all fields");
        return;
      }
    } else if (activeStep === 1) {
      if (!formData.email || !formData.password || !formData.confirmPassword) {
        setError("Please fill in all fields");
        return;
      }
      if (formData.password !== formData.confirmPassword) {
        setError("Passwords do not match");
        return;
      }
      if (formData.password.length < 6) {
        setError("Password must be at least 6 characters");
        return;
      }
    }

    setActiveStep((prev) => prev + 1);
  };

  const handleBack = () => {
    setError("");
    setActiveStep((prev) => prev - 1);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      const response = await authApi.registerUser({
        email: formData.email,
        password: formData.password,
        name: formData.name,
        phoneNumber: formData.phoneNumber,
        role: formData.role,
        faculty: formData.faculty,
        studentId:
          formData.role === UserRole.STUDENT ? formData.studentId : undefined,
      });

      if (response.success) {
        router.push("/auth/login/user?registered=true");
      } else {
        setError(response.message || "Registration failed");
      }
    } catch (err: any) {
      setError(err.message || "Registration failed. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const renderStepContent = (step: number) => {
    switch (step) {
      case 0:
        return (
          <>
            <TextField
              fullWidth
              label="Full Name"
              value={formData.name}
              onChange={handleChange("name")}
              margin="normal"
              required
              autoFocus
            />
            <TextField
              fullWidth
              label="Phone Number"
              value={formData.phoneNumber}
              onChange={handleChange("phoneNumber")}
              margin="normal"
              required
              placeholder="+20 123 456 7890"
            />
          </>
        );

      case 1:
        return (
          <>
            <TextField
              fullWidth
              label="Email Address"
              type="email"
              value={formData.email}
              onChange={handleChange("email")}
              margin="normal"
              required
              autoComplete="email"
            />
            <TextField
              fullWidth
              label="Password"
              type={showPassword ? "text" : "password"}
              value={formData.password}
              onChange={handleChange("password")}
              margin="normal"
              required
              helperText="Must be at least 6 characters"
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
            <TextField
              fullWidth
              label="Confirm Password"
              type={showPassword ? "text" : "password"}
              value={formData.confirmPassword}
              onChange={handleChange("confirmPassword")}
              margin="normal"
              required
            />
          </>
        );

      case 2:
        return (
          <>
            <TextField
              fullWidth
              select
              label="Role"
              value={formData.role}
              onChange={handleChange("role")}
              margin="normal"
              required
            >
              <MenuItem value={UserRole.STUDENT}>Student</MenuItem>
              <MenuItem value={UserRole.STAFF}>Staff</MenuItem>
              <MenuItem value={UserRole.TA}>Teaching Assistant</MenuItem>
              <MenuItem value={UserRole.PROFESSOR}>Professor</MenuItem>
            </TextField>

            <TextField
              fullWidth
              select
              label="Faculty"
              value={formData.faculty}
              onChange={handleChange("faculty")}
              margin="normal"
              required
            >
              <MenuItem value={Faculty.IET}>
                IET - Informatics and Engineering
              </MenuItem>
              <MenuItem value={Faculty.MEDIA}>
                Media Engineering and Technology
              </MenuItem>
              <MenuItem value={Faculty.PHARMACY}>Pharmacy</MenuItem>
              <MenuItem value={Faculty.BUSINESS}>
                Management Technology
              </MenuItem>
              <MenuItem value={Faculty.BIOTECHNOLOGY}>Biotechnology</MenuItem>
            </TextField>

            {formData.role === UserRole.STUDENT && (
              <TextField
                fullWidth
                label="Student ID"
                value={formData.studentId}
                onChange={handleChange("studentId")}
                margin="normal"
                required
                placeholder="e.g., 49-12345"
              />
            )}
          </>
        );

      default:
        return null;
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
      <Container maxWidth="md">
        <Paper elevation={6} sx={{ p: 4 }}>
          <Box textAlign="center" mb={4}>
            <Box sx={{ color: "primary.main", mb: 2 }}>
              <PersonIcon sx={{ fontSize: 60 }} />
            </Box>
            <Typography
              variant="h4"
              component="h1"
              gutterBottom
              fontWeight="bold"
            >
              Student/Staff Registration
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Create your account to access university events
            </Typography>
          </Box>

          <Stepper activeStep={activeStep} sx={{ mb: 4 }}>
            {steps.map((label) => (
              <Step key={label}>
                <StepLabel>{label}</StepLabel>
              </Step>
            ))}
          </Stepper>

          {error && (
            <Alert severity="error" sx={{ mb: 3 }}>
              {error}
            </Alert>
          )}

          <form onSubmit={handleSubmit}>
            {renderStepContent(activeStep)}

            <Box sx={{ display: "flex", gap: 2, mt: 4 }}>
              <Button
                onClick={handleBack}
                disabled={activeStep === 0}
                fullWidth
              >
                Back
              </Button>
              {activeStep === steps.length - 1 ? (
                <Button
                  type="submit"
                  variant="contained"
                  color="primary"
                  fullWidth
                  disabled={loading}
                >
                  {loading ? "Registering..." : "Register"}
                </Button>
              ) : (
                <Button
                  variant="contained"
                  color="primary"
                  onClick={handleNext}
                  fullWidth
                >
                  Next
                </Button>
              )}
            </Box>

            <Box textAlign="center" mt={3}>
              <Typography variant="body2" color="text.secondary">
                Already have an account?{" "}
                <MuiLink
                  component={Link}
                  href="/auth/login/user"
                  color="primary"
                  sx={{ fontWeight: 600 }}
                >
                  Login here
                </MuiLink>
              </Typography>
            </Box>

            <Box textAlign="center" mt={2}>
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

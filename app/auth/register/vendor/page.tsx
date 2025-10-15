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
  Stepper,
  Step,
  StepLabel,
} from "@mui/material";
import {
  Visibility,
  VisibilityOff,
  Business as VendorIcon,
  CloudUpload,
} from "@mui/icons-material";
import Link from "next/link";
import { authApi } from "@/lib/api";

const steps = ["Business Info", "Account Details", "Documents"];

export default function VendorRegisterPage() {
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
    businessName: "",
    phoneNumber: "",
    businessDescription: "",
    commercialRegistrationNumber: "",
    taxCardNumber: "",
  });

  const [documents, setDocuments] = useState({
    commercialRegistration: null as File | null,
    taxCard: null as File | null,
  });

  const handleChange =
    (field: string) => (e: React.ChangeEvent<HTMLInputElement>) => {
      setFormData({ ...formData, [field]: e.target.value });
    };

  const handleFileChange =
    (field: "commercialRegistration" | "taxCard") =>
    (e: React.ChangeEvent<HTMLInputElement>) => {
      if (e.target.files && e.target.files[0]) {
        setDocuments({ ...documents, [field]: e.target.files[0] });
      }
    };

  const handleNext = () => {
    setError("");

    if (activeStep === 0) {
      if (
        !formData.businessName ||
        !formData.phoneNumber ||
        !formData.businessDescription
      ) {
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

    if (!formData.commercialRegistrationNumber || !formData.taxCardNumber) {
      setError("Please provide all registration numbers");
      return;
    }

    setLoading(true);

    try {
      // Note: In a real implementation, you'd upload files to a storage service first
      // and get URLs, then pass those URLs to the registration API
      const response = await authApi.registerVendor({
        email: formData.email,
        password: formData.password,
        businessName: formData.businessName,
        phoneNumber: formData.phoneNumber,
        businessDescription: formData.businessDescription,
        commercialRegistrationNumber: formData.commercialRegistrationNumber,
        taxCardNumber: formData.taxCardNumber,
        // In production, these would be file URLs from your storage service
        commercialRegistrationDocument:
          documents.commercialRegistration?.name || "",
        taxCardDocument: documents.taxCard?.name || "",
      });

      if (response.success) {
        router.push("/auth/login/vendor?registered=true");
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
              label="Business Name"
              value={formData.businessName}
              onChange={handleChange("businessName")}
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
            <TextField
              fullWidth
              label="Business Description"
              value={formData.businessDescription}
              onChange={handleChange("businessDescription")}
              margin="normal"
              required
              multiline
              rows={4}
              placeholder="Describe your business and what products/services you offer"
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
              label="Commercial Registration Number"
              value={formData.commercialRegistrationNumber}
              onChange={handleChange("commercialRegistrationNumber")}
              margin="normal"
              required
            />
            <Button
              component="label"
              variant="outlined"
              startIcon={<CloudUpload />}
              fullWidth
              sx={{ mt: 2, mb: 1 }}
            >
              Upload Commercial Registration
              <input
                type="file"
                hidden
                accept=".pdf,.jpg,.jpeg,.png"
                onChange={handleFileChange("commercialRegistration")}
              />
            </Button>
            {documents.commercialRegistration && (
              <Typography
                variant="caption"
                color="success.main"
                display="block"
              >
                ✓ {documents.commercialRegistration.name}
              </Typography>
            )}

            <TextField
              fullWidth
              label="Tax Card Number"
              value={formData.taxCardNumber}
              onChange={handleChange("taxCardNumber")}
              margin="normal"
              required
              sx={{ mt: 3 }}
            />
            <Button
              component="label"
              variant="outlined"
              startIcon={<CloudUpload />}
              fullWidth
              sx={{ mt: 2, mb: 1 }}
            >
              Upload Tax Card
              <input
                type="file"
                hidden
                accept=".pdf,.jpg,.jpeg,.png"
                onChange={handleFileChange("taxCard")}
              />
            </Button>
            {documents.taxCard && (
              <Typography
                variant="caption"
                color="success.main"
                display="block"
              >
                ✓ {documents.taxCard.name}
              </Typography>
            )}

            <Alert severity="info" sx={{ mt: 3 }}>
              Your application will be reviewed by admins. You'll receive an
              email once approved.
            </Alert>
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
            <Box sx={{ color: "success.main", mb: 2 }}>
              <VendorIcon sx={{ fontSize: 60 }} />
            </Box>
            <Typography
              variant="h4"
              component="h1"
              gutterBottom
              fontWeight="bold"
            >
              Vendor Registration
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Register your business to participate in university bazaars
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
                  color="success"
                  fullWidth
                  disabled={loading}
                >
                  {loading ? "Submitting..." : "Submit Application"}
                </Button>
              ) : (
                <Button
                  variant="contained"
                  color="success"
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
                  href="/auth/login/vendor"
                  color="success"
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

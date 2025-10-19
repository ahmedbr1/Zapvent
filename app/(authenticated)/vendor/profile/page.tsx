"use client";

import { useState, useEffect } from "react";
import {
  Box,
  Container,
  Paper,
  Typography,
  TextField,
  Button,
  Grid,
  CircularProgress,
  Alert,
  Divider,
  Link,
} from "@mui/material";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useAuthToken } from "@/hooks/useAuthToken";
import { fetchVendorProfile, updateVendorProfile } from "@/lib/services/vendor";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";

// Validation schema for editable fields
const profileSchema = z.object({
  companyName: z.string().min(1, "Company name is required"),
  loyaltyForum: z
    .string()
    .url("Must be a valid URL")
    .or(z.literal(""))
    .optional(),
});

type ProfileFormData = z.infer<typeof profileSchema>;

export default function VendorProfilePage() {
  const token = useAuthToken();
  const queryClient = useQueryClient();
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  // Fetch vendor profile
  const {
    data: profileData,
    isLoading,
    error,
  } = useQuery({
    queryKey: ["vendorProfile"],
    queryFn: () => fetchVendorProfile(token || ""),
    enabled: !!token,
  });

  const profile = profileData?.data;

  // Form setup
  const {
    control,
    handleSubmit,
    reset,
    formState: { errors, isDirty },
  } = useForm<ProfileFormData>({
    resolver: zodResolver(profileSchema),
    defaultValues: {
      companyName: "",
      loyaltyForum: "",
    },
  });

  // Update form when profile loads
  useEffect(() => {
    if (profile) {
      reset({
        companyName: profile.companyName || "",
        loyaltyForum: profile.loyaltyForum || "",
      });
    }
  }, [profile, reset]);

  // Update mutation
  const updateMutation = useMutation({
    mutationFn: (data: ProfileFormData) =>
      updateVendorProfile(data, token || ""),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["vendorProfile"] });
      setSuccessMessage("Profile updated successfully!");
      setTimeout(() => setSuccessMessage(null), 3000);
    },
  });

  const onSubmit = (data: ProfileFormData) => {
    updateMutation.mutate(data);
  };

  if (isLoading) {
    return (
      <Box
        display="flex"
        justifyContent="center"
        alignItems="center"
        minHeight="60vh"
      >
        <CircularProgress />
      </Box>
    );
  }

  if (error) {
    return (
      <Container maxWidth="md" sx={{ mt: 4 }}>
        <Alert severity="error">
          Failed to load profile. Please try again later.
        </Alert>
      </Container>
    );
  }

  return (
    <Container maxWidth="md" sx={{ mt: 4, mb: 4 }}>
      <Paper sx={{ p: 4 }}>
        <Typography variant="h4" gutterBottom>
          Vendor Profile
        </Typography>

        {successMessage && (
          <Alert severity="success" sx={{ mb: 2 }}>
            {successMessage}
          </Alert>
        )}

        {updateMutation.isError && (
          <Alert severity="error" sx={{ mb: 2 }}>
            Failed to update profile. Please try again.
          </Alert>
        )}

        <form onSubmit={handleSubmit(onSubmit)}>
          <Grid container spacing={3}>
            {/* Read-only Email */}
            <Grid size={{ xs: 12 }}>
              <TextField
                fullWidth
                label="Email"
                value={profile?.email || ""}
                disabled
                helperText="Email cannot be changed"
              />
            </Grid>

            {/* Editable Company Name */}
            <Grid size={{ xs: 12 }}>
              <Controller
                name="companyName"
                control={control}
                render={({ field }) => (
                  <TextField
                    {...field}
                    fullWidth
                    label="Company Name"
                    error={!!errors.companyName}
                    helperText={errors.companyName?.message}
                  />
                )}
              />
            </Grid>

            {/* Editable Loyalty Forum URL */}
            <Grid size={{ xs: 12 }}>
              <Controller
                name="loyaltyForum"
                control={control}
                render={({ field }) => (
                  <TextField
                    {...field}
                    fullWidth
                    label="Loyalty Forum URL (optional)"
                    placeholder="https://example.com"
                    error={!!errors.loyaltyForum}
                    helperText={errors.loyaltyForum?.message}
                  />
                )}
              />
            </Grid>

            <Grid size={{ xs: 12 }}>
              <Divider sx={{ my: 2 }} />
              <Typography variant="h6" gutterBottom>
                Documents
              </Typography>
              <Typography variant="body2" color="text.secondary" gutterBottom>
                Documents can only be uploaded during registration and cannot be
                changed here.
              </Typography>
            </Grid>

            {/* Read-only Documents */}
            <Grid size={{ xs: 12, md: 4 }}>
              <TextField
                fullWidth
                label="Logo"
                value={profile?.logo ? "Uploaded" : "Not uploaded"}
                disabled
                slotProps={{
                  input: {
                    endAdornment: profile?.logo && (
                      <Link
                        href={profile.logo}
                        target="_blank"
                        rel="noopener"
                        sx={{ ml: 1 }}
                      >
                        View
                      </Link>
                    ),
                  },
                }}
              />
            </Grid>

            <Grid size={{ xs: 12, md: 4 }}>
              <TextField
                fullWidth
                label="Tax Card"
                value={profile?.taxCard ? "Uploaded" : "Not uploaded"}
                disabled
                slotProps={{
                  input: {
                    endAdornment: profile?.taxCard && (
                      <Link
                        href={profile.taxCard}
                        target="_blank"
                        rel="noopener"
                        sx={{ ml: 1 }}
                      >
                        View
                      </Link>
                    ),
                  },
                }}
              />
            </Grid>

            <Grid size={{ xs: 12, md: 4 }}>
              <TextField
                fullWidth
                label="Documents"
                value={profile?.documents ? "Uploaded" : "Not uploaded"}
                disabled
                slotProps={{
                  input: {
                    endAdornment: profile?.documents && (
                      <Link
                        href={profile.documents}
                        target="_blank"
                        rel="noopener"
                        sx={{ ml: 1 }}
                      >
                        View
                      </Link>
                    ),
                  },
                }}
              />
            </Grid>

            {/* Verification Status */}
            <Grid size={{ xs: 12 }}>
              <Alert severity={profile?.isVerified ? "success" : "warning"}>
                Verification Status:{" "}
                {profile?.isVerified ? "Verified" : "Pending Verification"}
              </Alert>
            </Grid>

            {/* Submit Button */}
            <Grid size={{ xs: 12 }}>
              <Button
                type="submit"
                variant="contained"
                size="large"
                disabled={!isDirty || updateMutation.isPending}
                fullWidth
              >
                {updateMutation.isPending ? "Saving..." : "Save Changes"}
              </Button>
            </Grid>
          </Grid>
        </form>
      </Paper>
    </Container>
  );
}

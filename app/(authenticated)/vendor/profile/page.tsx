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
  IconButton,
  InputAdornment,
} from "@mui/material";
import UploadFileIcon from "@mui/icons-material/UploadFile";
import DownloadIcon from "@mui/icons-material/Download";
import DeleteIcon from "@mui/icons-material/Delete";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useAuthToken } from "@/hooks/useAuthToken";
import { API_BASE_URL } from "@/lib/config";
import {
  fetchVendorProfile,
  updateVendorProfile,
} from "@/lib/services/vendor";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";

// Validation schema for editable fields
const relaxedUrlRegex =
  /^(https?:\/\/)?([\w-]+\.)+[A-Za-z]{2,}([/?#].*)?$/;

const profileSchema = z.object({
  companyName: z.string().min(1, "Company name is required"),
  loyaltyForum: z
    .string()
    .trim()
    .optional()
    .refine(
      (value) => !value || relaxedUrlRegex.test(value),
      "Must be a valid URL (e.g., vendor.com or https://vendor.com)"
    ),
});

type ProfileFormData = z.infer<typeof profileSchema>;

export default function VendorProfilePage() {
  const token = useAuthToken();
  const queryClient = useQueryClient();
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [logoFile, setLogoFile] = useState<File | null>(null);
  const [taxCardFile, setTaxCardFile] = useState<File | null>(null);
  const [documentsFile, setDocumentsFile] = useState<File | null>(null);
  const apiHost = API_BASE_URL.replace(/\/api$/, "");

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

  // Update mutation with multipart form data
  const updateMutation = useMutation({
    mutationFn: async (data: ProfileFormData) => {
      const formData = new FormData();
      formData.append("companyName", data.companyName.trim());
      if (data.loyaltyForum) {
        formData.append("loyaltyForum", data.loyaltyForum.trim());
      }

      if (logoFile) {
        formData.append("logo", logoFile);
      }
      if (taxCardFile) {
        formData.append("taxCard", taxCardFile);
      }
      if (documentsFile) {
        formData.append("documents", documentsFile);
      }

      const response = await updateVendorProfile(formData, token ?? undefined);
      if (!response.success) {
        throw new Error(
          response.message ?? "Failed to update vendor profile."
        );
      }
      return response;
    },
    onSuccess: (response) => {
      queryClient.invalidateQueries({ queryKey: ["vendorProfile"] });
      setSuccessMessage(
        response.message || "Profile updated successfully!"
      );
      setLogoFile(null);
      setTaxCardFile(null);
      setDocumentsFile(null);
      setTimeout(() => setSuccessMessage(null), 3000);
    },
  });

  const onSubmit = (data: ProfileFormData) => {
    updateMutation.mutate(data);
  };

  const handleFileChange = (
    event: React.ChangeEvent<HTMLInputElement>,
    setter: (file: File | null) => void
  ) => {
    const file = event.target.files?.[0] || null;
    setter(file);
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

  if (!profile) {
    return (
      <Container maxWidth="md" sx={{ mt: 4 }}>
        <Alert severity="warning">
          No profile data found. Please contact support.
        </Alert>
      </Container>
    );
  }

  const hasChanges = isDirty || logoFile || taxCardFile || documentsFile;

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
            {updateMutation.error instanceof Error
              ? updateMutation.error.message
              : "Failed to update profile. Please try again."}
          </Alert>
        )}

        {/* Verification Status */}
        <Alert
          severity={profile.isVerified ? "success" : "warning"}
          sx={{ mb: 3 }}
        >
          Verification Status:{" "}
          {profile.isVerified ? "✓ Verified" : "⏳ Pending Verification"}
        </Alert>

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
                Upload or update your business documents below.
              </Typography>
            </Grid>

            {/* Logo Upload */}
            <Grid size={{ xs: 12 }}>
              <TextField
                fullWidth
                label="Company Logo"
                value={
                  logoFile?.name ||
                  (profile.logo ? "Current file uploaded" : "No file")
                }
                disabled
                slotProps={{
                  input: {
                    endAdornment: (
                      <InputAdornment position="end">
                        {profile.logo && !logoFile && (
                          <IconButton
                            component="a"
                            href={`${apiHost}/${profile.logo}`}
                            target="_blank"
                            size="small"
                            sx={{ mr: 1 }}
                          >
                            <DownloadIcon />
                          </IconButton>
                        )}
                        {logoFile && (
                          <IconButton
                            onClick={() => setLogoFile(null)}
                            size="small"
                            sx={{ mr: 1 }}
                          >
                            <DeleteIcon />
                          </IconButton>
                        )}
                        <Button
                          component="label"
                          variant="contained"
                          size="small"
                          startIcon={<UploadFileIcon />}
                        >
                          Upload
                          <input
                            type="file"
                            hidden
                            accept="image/*"
                            onChange={(e) => handleFileChange(e, setLogoFile)}
                          />
                        </Button>
                      </InputAdornment>
                    ),
                  },
                }}
              />
            </Grid>

            {/* Tax Card Upload */}
            <Grid size={{ xs: 12 }}>
              <TextField
                fullWidth
                label="Tax Card"
                value={
                  taxCardFile?.name ||
                  (profile.taxCard ? "Current file uploaded" : "No file")
                }
                disabled
                slotProps={{
                  input: {
                    endAdornment: (
                      <InputAdornment position="end">
                        {profile.taxCard && !taxCardFile && (
                          <IconButton
                            component="a"
                            href={`${apiHost}/${profile.taxCard}`}
                            target="_blank"
                            size="small"
                            sx={{ mr: 1 }}
                          >
                            <DownloadIcon />
                          </IconButton>
                        )}
                        {taxCardFile && (
                          <IconButton
                            onClick={() => setTaxCardFile(null)}
                            size="small"
                            sx={{ mr: 1 }}
                          >
                            <DeleteIcon />
                          </IconButton>
                        )}
                        <Button
                          component="label"
                          variant="contained"
                          size="small"
                          startIcon={<UploadFileIcon />}
                        >
                          Upload
                          <input
                            type="file"
                            hidden
                            accept=".pdf,.jpg,.jpeg,.png"
                            onChange={(e) =>
                              handleFileChange(e, setTaxCardFile)
                            }
                          />
                        </Button>
                      </InputAdornment>
                    ),
                  },
                }}
              />
            </Grid>

            {/* Documents Upload */}
            <Grid size={{ xs: 12 }}>
              <TextField
                fullWidth
                label="Business Documents"
                value={
                  documentsFile?.name ||
                  (profile.documents ? "Current file uploaded" : "No file")
                }
                disabled
                slotProps={{
                  input: {
                    endAdornment: (
                      <InputAdornment position="end">
                        {profile.documents && !documentsFile && (
                          <IconButton
                            component="a"
                            href={`${apiHost}/${profile.documents}`}
                            target="_blank"
                            size="small"
                            sx={{ mr: 1 }}
                          >
                            <DownloadIcon />
                          </IconButton>
                        )}
                        {documentsFile && (
                          <IconButton
                            onClick={() => setDocumentsFile(null)}
                            size="small"
                            sx={{ mr: 1 }}
                          >
                            <DeleteIcon />
                          </IconButton>
                        )}
                        <Button
                          component="label"
                          variant="contained"
                          size="small"
                          startIcon={<UploadFileIcon />}
                        >
                          Upload
                          <input
                            type="file"
                            hidden
                            accept=".pdf,.jpg,.jpeg,.png"
                            onChange={(e) =>
                              handleFileChange(e, setDocumentsFile)
                            }
                          />
                        </Button>
                      </InputAdornment>
                    ),
                  },
                }}
              />
            </Grid>

            {/* Submit Button */}
            <Grid size={{ xs: 12 }}>
              <Button
                type="submit"
                variant="contained"
                size="large"
                disabled={!hasChanges || updateMutation.isPending}
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

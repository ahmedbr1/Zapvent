"use client";

import { useEffect, useState } from "react";
import Stack from "@mui/material/Stack";
import Typography from "@mui/material/Typography";
import Paper from "@mui/material/Paper";
import TextField from "@mui/material/TextField";
import Button from "@mui/material/Button";
import Grid from "@mui/material/Grid2";
import Avatar from "@mui/material/Avatar";
import Box from "@mui/material/Box";
import Divider from "@mui/material/Divider";
import Alert from "@mui/material/Alert";
import CircularProgress from "@mui/material/CircularProgress";
import PersonIcon from "@mui/icons-material/PersonRounded";
import SaveIcon from "@mui/icons-material/SaveRounded";
import LoadingButton from "@mui/lab/LoadingButton";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useSnackbar } from "notistack";
import { useSessionUser } from "@/hooks/useSessionUser";
import { useAuthToken } from "@/hooks/useAuthToken";
import { useAuth } from "@/components/providers/AuthProvider";
import { fetchAdminAccount, updateAdmin } from "@/lib/services/admin";

export default function AdminProfilePage() {
  const sessionUser = useSessionUser();
  const token = useAuthToken();
  const { enqueueSnackbar } = useSnackbar();
  const { session, setSession } = useAuth();
  const queryClient = useQueryClient();

  const adminId = sessionUser?.id;

  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [email, setEmail] = useState(sessionUser?.email ?? "");
  const [isEditing, setIsEditing] = useState(false);

  const profileQuery = useQuery({
    queryKey: ["admin", "profile", adminId],
    queryFn: () => fetchAdminAccount(adminId!, token ?? undefined),
    enabled: Boolean(adminId && token),
    refetchOnWindowFocus: false,
  });

  const profile = profileQuery.data;

  useEffect(() => {
    if (profile && !isEditing) {
      setFirstName(profile.firstName ?? "");
      setLastName(profile.lastName ?? "");
      setEmail(profile.email ?? "");
    }
  }, [profile, isEditing]);

  const trimmedFirstName = firstName.trim();
  const trimmedLastName = lastName.trim();
  const originalFirstName = profile?.firstName ?? "";
  const originalLastName = profile?.lastName ?? "";
  const isDirty =
    trimmedFirstName !== originalFirstName ||
    trimmedLastName !== originalLastName;

  const updateProfile = useMutation({
    mutationFn: (payload: { firstName: string; lastName: string; email: string }) => {
      if (!adminId) {
        throw new Error("Missing admin identifier");
      }
      return updateAdmin(adminId, payload, token ?? undefined);
    },
    onSuccess: (_result, variables) => {
      enqueueSnackbar("Profile updated successfully", { variant: "success" });
      setIsEditing(false);
      queryClient.invalidateQueries({ queryKey: ["admin", "profile", adminId] });

      if (session) {
        setSession({
          ...session,
          user: {
            ...session.user,
            name: `${variables.firstName} ${variables.lastName}`.trim(),
            email: variables.email,
          },
        });
      }
    },
    onError: (error: unknown) => {
      const message =
        error instanceof Error ? error.message : "Failed to update profile";
      enqueueSnackbar(message, { variant: "error" });
    },
  });

  const handleSave = () => {
    if (!profile) return;
    updateProfile.mutate({
      firstName: trimmedFirstName,
      lastName: trimmedLastName,
      email: profile.email,
    });
  };

  const handleCancel = () => {
    if (profile) {
      setFirstName(profile.firstName ?? "");
      setLastName(profile.lastName ?? "");
    }
    setIsEditing(false);
  };

  if (!adminId) {
    return (
      <Stack spacing={2}>
        <Alert severity="error">Unable to load admin profile.</Alert>
      </Stack>
    );
  }

  const renderContent = () => {
    if (profileQuery.isLoading || profileQuery.isFetching) {
      return (
        <Stack alignItems="center" justifyContent="center" minHeight={320}>
          <CircularProgress />
        </Stack>
      );
    }

    if (profileQuery.isError) {
      return (
        <Alert
          severity="error"
          action={
            <Button onClick={() => profileQuery.refetch()} color="inherit" size="small">
              Retry
            </Button>
          }
        >
          Could not load your profile data. Please try again.
        </Alert>
      );
    }

    const displayName =
      `${profile?.firstName ?? ""} ${profile?.lastName ?? ""}`.trim() ||
      sessionUser?.name ||
      "Admin User";
    const statusLabel = profile?.status ?? sessionUser?.status ?? "Active";
    const statusColor = statusLabel === "Blocked" ? "error.main" : "success.main";
    const roleLabel = sessionUser?.adminType ?? "Admin";

    return (
      <Stack spacing={4}>
        <Box
          sx={{
            display: "flex",
            alignItems: "center",
            gap: 3,
            pb: 3,
            borderBottom: "1px solid",
            borderColor: "divider",
          }}
        >
          <Avatar
            sx={{
              width: 80,
              height: 80,
              bgcolor: "primary.main",
              fontSize: "2rem",
            }}
          >
            {displayName.charAt(0).toUpperCase() || email.charAt(0).toUpperCase() || "A"}
          </Avatar>
          <Stack spacing={0.5}>
            <Typography variant="h5" fontWeight={600}>
              {displayName}
            </Typography>
            <Typography variant="body2" color="text.secondary">
              {roleLabel}
            </Typography>
            <Typography variant="body2" color="text.secondary">
              {email}
            </Typography>
          </Stack>
        </Box>

        <Stack spacing={3}>
          <Box
            sx={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
            }}
          >
            <Typography variant="h6" fontWeight={600}>
              Personal Information
            </Typography>
            {!isEditing && (
              <Button
                variant="outlined"
                startIcon={<PersonIcon />}
                onClick={() => setIsEditing(true)}
              >
                Edit Profile
              </Button>
            )}
          </Box>

          <Grid container spacing={3}>
            <Grid size={{ xs: 12, md: 6 }}>
              <TextField
                label="First Name"
                fullWidth
                value={firstName}
                onChange={(e) => setFirstName(e.target.value)}
                disabled={!isEditing}
                variant={isEditing ? "outlined" : "filled"}
              />
            </Grid>
            <Grid size={{ xs: 12, md: 6 }}>
              <TextField
                label="Last Name"
                fullWidth
                value={lastName}
                onChange={(e) => setLastName(e.target.value)}
                disabled={!isEditing}
                variant={isEditing ? "outlined" : "filled"}
              />
            </Grid>
            <Grid size={{ xs: 12, md: 6 }}>
              <TextField
                label="Email"
                fullWidth
                value={email}
                disabled
                variant="filled"
                helperText="Email cannot be changed"
              />
            </Grid>
            <Grid size={{ xs: 12, md: 6 }}>
              <TextField
                label="Role"
                fullWidth
                value={roleLabel}
                disabled
                variant="filled"
                helperText="Role is assigned by system"
              />
            </Grid>
          </Grid>

          {isEditing && (
            <>
              <Divider />
              <Box sx={{ display: "flex", gap: 2, justifyContent: "flex-end" }}>
                <Button variant="outlined" onClick={handleCancel} disabled={updateProfile.isPending}>
                  Cancel
                </Button>
                <LoadingButton
                  variant="contained"
                  startIcon={<SaveIcon />}
                  onClick={handleSave}
                  loading={updateProfile.isPending}
                  disabled={!isDirty || !trimmedFirstName || !trimmedLastName}
                >
                  Save Changes
                </LoadingButton>
              </Box>
            </>
          )}
        </Stack>

        <Stack spacing={2}>
          <Typography variant="h6" fontWeight={600}>
            Account Information
          </Typography>
          <Grid container spacing={2}>
            <Grid size={{ xs: 12, md: 6 }}>
              <Stack spacing={0.5}>
                <Typography variant="body2" color="text.secondary">
                  Account ID
                </Typography>
                <Typography variant="body1" fontFamily="monospace">
                  {profile?.id ?? sessionUser?.id ?? "N/A"}
                </Typography>
              </Stack>
            </Grid>
            <Grid size={{ xs: 12, md: 6 }}>
              <Stack spacing={0.5}>
                <Typography variant="body2" color="text.secondary">
                  Account Status
                </Typography>
                <Typography variant="body1" color={statusColor} fontWeight={600}>
                  {statusLabel}
                </Typography>
              </Stack>
            </Grid>
          </Grid>
        </Stack>
      </Stack>
    );
  };

  return (
    <Stack spacing={3}>
      <Stack spacing={1}>
        <Typography variant="h4" fontWeight={700}>
          My Profile
        </Typography>
        <Typography variant="body1" color="text.secondary">
          View and manage your account information
        </Typography>
      </Stack>

      <Paper sx={{ p: 4 }}>{renderContent()}</Paper>
    </Stack>
  );
}

"use client";

import { useState } from "react";
import Stack from "@mui/material/Stack";
import Typography from "@mui/material/Typography";
import Paper from "@mui/material/Paper";
import TextField from "@mui/material/TextField";
import Button from "@mui/material/Button";
import Grid from "@mui/material/Grid";
import Avatar from "@mui/material/Avatar";
import Box from "@mui/material/Box";
import Divider from "@mui/material/Divider";
import PersonIcon from "@mui/icons-material/PersonRounded";
import SaveIcon from "@mui/icons-material/SaveRounded";
import { useSessionUser } from "@/hooks/useSessionUser";
import { useSnackbar } from "notistack";

export default function AdminProfilePage() {
  const sessionUser = useSessionUser();
  const { enqueueSnackbar } = useSnackbar();

  const [firstName, setFirstName] = useState(
    sessionUser?.name?.split(" ")[0] ?? ""
  );
  const [lastName, setLastName] = useState(
    sessionUser?.name?.split(" ").slice(1).join(" ") ?? ""
  );
  const [email] = useState(sessionUser?.email ?? "");
  const [isEditing, setIsEditing] = useState(false);

  const handleSave = () => {
    // TODO: Implement API call to update admin profile
    enqueueSnackbar("Profile updated successfully", { variant: "success" });
    setIsEditing(false);
  };

  const handleCancel = () => {
    setFirstName(sessionUser?.name?.split(" ")[0] ?? "");
    setLastName(sessionUser?.name?.split(" ").slice(1).join(" ") ?? "");
    setIsEditing(false);
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

      <Paper sx={{ p: 4 }}>
        <Stack spacing={4}>
          {/* Profile Header */}
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
              {sessionUser?.name?.charAt(0)?.toUpperCase() ??
                sessionUser?.email.charAt(0)?.toUpperCase() ??
                "A"}
            </Avatar>
            <Stack spacing={0.5}>
              <Typography variant="h5" fontWeight={600}>
                {sessionUser?.name ?? "Admin User"}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                {sessionUser?.role ?? "Administrator"}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                {email}
              </Typography>
            </Stack>
          </Box>

          {/* Profile Information */}
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
                  value={sessionUser?.role ?? "Admin"}
                  disabled
                  variant="filled"
                  helperText="Role is assigned by system"
                />
              </Grid>
            </Grid>

            {isEditing && (
              <>
                <Divider />
                <Box
                  sx={{ display: "flex", gap: 2, justifyContent: "flex-end" }}
                >
                  <Button variant="outlined" onClick={handleCancel}>
                    Cancel
                  </Button>
                  <Button
                    variant="contained"
                    startIcon={<SaveIcon />}
                    onClick={handleSave}
                  >
                    Save Changes
                  </Button>
                </Box>
              </>
            )}
          </Stack>

          {/* Account Information */}
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
                    {sessionUser?.id ?? "N/A"}
                  </Typography>
                </Stack>
              </Grid>
              <Grid size={{ xs: 12, md: 6 }}>
                <Stack spacing={0.5}>
                  <Typography variant="body2" color="text.secondary">
                    Account Status
                  </Typography>
                  <Typography
                    variant="body1"
                    color="success.main"
                    fontWeight={600}
                  >
                    Active
                  </Typography>
                </Stack>
              </Grid>
            </Grid>
          </Stack>
        </Stack>
      </Paper>
    </Stack>
  );
}

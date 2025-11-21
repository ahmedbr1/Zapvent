"use client";

import { useMemo, useState } from "react";
import Stack from "@mui/material/Stack";
import Typography from "@mui/material/Typography";
import Button from "@mui/material/Button";
import Alert from "@mui/material/Alert";
import Box from "@mui/material/Box";
import CircularProgress from "@mui/material/CircularProgress";
import Dialog from "@mui/material/Dialog";
import DialogTitle from "@mui/material/DialogTitle";
import DialogContent from "@mui/material/DialogContent";
import DialogActions from "@mui/material/DialogActions";
import TextField from "@mui/material/TextField";
import Grid from "@mui/material/Grid";
import Chip from "@mui/material/Chip";
import Avatar from "@mui/material/Avatar";
import RefreshIcon from "@mui/icons-material/RefreshRounded";
import AddIcon from "@mui/icons-material/AddRounded";
import EditIcon from "@mui/icons-material/EditRounded";
import DeleteIcon from "@mui/icons-material/DeleteRounded";
import EmailIcon from "@mui/icons-material/EmailRounded";
import CalendarIcon from "@mui/icons-material/CalendarTodayRounded";
import AdminPanelSettingsIcon from "@mui/icons-material/AdminPanelSettingsRounded";
import BlockIcon from "@mui/icons-material/BlockRounded";
import CheckCircleIcon from "@mui/icons-material/CheckCircleRounded";
import {
  DataGrid,
  GridActionsCellItem,
  type GridColDef,
} from "@mui/x-data-grid";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useSnackbar } from "notistack";
import { useAuthToken } from "@/hooks/useAuthToken";
import { useSessionUser } from "@/hooks/useSessionUser";
import {
  fetchAllAdmins,
  createAdmin,
  updateAdmin,
  deleteAdmin,
  blockAdmin,
  unblockAdmin,
  type AdminAccount,
  type CreateAdminData,
  type UpdateAdminData,
} from "@/lib/services/admin";
import { formatDateTime, formatRelative } from "@/lib/date";

interface FormData {
  firstName: string;
  lastName: string;
  email: string;
  password: string;
}

export default function AdminManagementPage() {
  const token = useAuthToken();
  const sessionUser = useSessionUser();
  const { enqueueSnackbar } = useSnackbar();
  const queryClient = useQueryClient();

  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [selectedAdmin, setSelectedAdmin] = useState<AdminAccount | null>(null);

  const [formData, setFormData] = useState<FormData>({
    firstName: "",
    lastName: "",
    email: "",
    password: "",
  });

  const { data, isLoading, isFetching, isError, error, refetch } = useQuery({
    queryKey: ["admins", token],
    queryFn: () => fetchAllAdmins(token ?? undefined),
    enabled: Boolean(token),
    retry: 1,
  });

  const admins = useMemo(
    () => (data ?? []).filter((admin) => admin.adminType !== "EventOffice"),
    [data]
  );

  const createMutation = useMutation({
    mutationFn: (data: CreateAdminData) =>
      createAdmin(data, token ?? undefined),
    onSuccess: () => {
      enqueueSnackbar("Admin account created successfully", {
        variant: "success",
      });
      queryClient.invalidateQueries({ queryKey: ["admins"] });
      handleCloseCreateDialog();
    },
    onError: (mutationError: unknown) => {
      const message =
        mutationError instanceof Error
          ? mutationError.message
          : (mutationError as { message?: string }).message;
      enqueueSnackbar(message ?? "Failed to create admin", {
        variant: "error",
      });
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: UpdateAdminData }) =>
      updateAdmin(id, data, token ?? undefined),
    onSuccess: () => {
      enqueueSnackbar("Admin account updated successfully", {
        variant: "success",
      });
      queryClient.invalidateQueries({ queryKey: ["admins"] });
      handleCloseEditDialog();
    },
    onError: (mutationError: unknown) => {
      const message =
        mutationError instanceof Error
          ? mutationError.message
          : (mutationError as { message?: string }).message;
      enqueueSnackbar(message ?? "Failed to update admin", {
        variant: "error",
      });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => deleteAdmin(id, token ?? undefined),
    onSuccess: () => {
      enqueueSnackbar("Admin account deleted successfully", {
        variant: "success",
      });
      queryClient.invalidateQueries({ queryKey: ["admins"] });
      handleCloseDeleteDialog();
    },
    onError: (mutationError: unknown) => {
      const message =
        mutationError instanceof Error
          ? mutationError.message
          : (mutationError as { message?: string }).message;
      enqueueSnackbar(message ?? "Failed to delete admin", {
        variant: "error",
      });
    },
  });

  const blockMutation = useMutation({
    mutationFn: (adminId: string) => blockAdmin(adminId, token ?? undefined),
    onSuccess: () => {
      enqueueSnackbar("Admin blocked successfully", { variant: "success" });
      queryClient.invalidateQueries({ queryKey: ["admins"] });
    },
    onError: (mutationError: unknown) => {
      const message =
        mutationError instanceof Error
          ? mutationError.message
          : (mutationError as { message?: string }).message;
      enqueueSnackbar(message ?? "Failed to block admin", {
        variant: "error",
      });
    },
  });

  const unblockMutation = useMutation({
    mutationFn: (adminId: string) => unblockAdmin(adminId, token ?? undefined),
    onSuccess: () => {
      enqueueSnackbar("Admin unblocked successfully", { variant: "success" });
      queryClient.invalidateQueries({ queryKey: ["admins"] });
    },
    onError: (mutationError: unknown) => {
      const message =
        mutationError instanceof Error
          ? mutationError.message
          : (mutationError as { message?: string }).message;
      enqueueSnackbar(message ?? "Failed to unblock admin", {
        variant: "error",
      });
    },
  });

  const handleOpenCreateDialog = () => {
    setFormData({ firstName: "", lastName: "", email: "", password: "" });
    setCreateDialogOpen(true);
  };

  const handleCloseCreateDialog = () => {
    setCreateDialogOpen(false);
    setFormData({ firstName: "", lastName: "", email: "", password: "" });
  };

  const handleOpenEditDialog = (admin: AdminAccount) => {
    setSelectedAdmin(admin);
    setFormData({
      firstName: admin.firstName,
      lastName: admin.lastName,
      email: admin.email,
      password: "",
    });
    setEditDialogOpen(true);
  };

  const handleCloseEditDialog = () => {
    setEditDialogOpen(false);
    setSelectedAdmin(null);
    setFormData({ firstName: "", lastName: "", email: "", password: "" });
  };

  const handleOpenDeleteDialog = (admin: AdminAccount) => {
    setSelectedAdmin(admin);
    setDeleteDialogOpen(true);
  };

  const handleCloseDeleteDialog = () => {
    setDeleteDialogOpen(false);
    setSelectedAdmin(null);
  };

  const handleCreate = () => {
    if (
      !formData.firstName ||
      !formData.lastName ||
      !formData.email ||
      !formData.password
    ) {
      enqueueSnackbar("Please fill in all fields", { variant: "warning" });
      return;
    }
    createMutation.mutate({
      firstName: formData.firstName,
      lastName: formData.lastName,
      email: formData.email,
      password: formData.password,
      adminType: "Admin",
    });
  };

  const handleUpdate = () => {
    if (!selectedAdmin) return;
    if (!formData.firstName || !formData.lastName || !formData.email) {
      enqueueSnackbar("Please fill in all fields", { variant: "warning" });
      return;
    }
    updateMutation.mutate({
      id: selectedAdmin.id,
      data: {
        firstName: formData.firstName,
        lastName: formData.lastName,
        email: formData.email,
      },
    });
  };

  const handleDelete = () => {
    if (!selectedAdmin) return;
    // Prevent deleting self
    if (selectedAdmin.id === sessionUser?.id) {
      enqueueSnackbar("You cannot delete your own account", {
        variant: "error",
      });
      return;
    }
    deleteMutation.mutate(selectedAdmin.id);
  };

  const columns = useMemo<GridColDef<AdminAccount>[]>(
    () => [
      {
        field: "name",
        headerName: "Account Details",
        flex: 1.5,
        minWidth: 280,
        valueGetter: (_value, row: AdminAccount) => {
          return `${row.firstName} ${row.lastName}`.trim();
        },
        renderCell: ({ row }) => (
          <Stack direction="row" spacing={2} alignItems="center" sx={{ py: 1 }}>
            <Avatar
              sx={{
                width: 44,
                height: 44,
                bgcolor: "error.main",
                fontWeight: 600,
                fontSize: "1.1rem",
              }}
            >
              {row.firstName?.charAt(0) ?? ""}
              {row.lastName?.charAt(0) ?? ""}
            </Avatar>
            <Stack spacing={0.25}>
              <Typography component="div"
                variant="body1"
                fontWeight={600}
                sx={{ fontSize: "0.95rem" }}
              >
                {row.firstName} {row.lastName}
                {row.id === sessionUser?.id && (
                  <Chip
                    label="You"
                    size="small"
                    color="info"
                    sx={{ ml: 1, height: 20, fontSize: "0.7rem" }}
                  />
                )}
              </Typography>
              <Stack direction="row" spacing={0.5} alignItems="center">
                <EmailIcon sx={{ fontSize: 14, color: "text.secondary" }} />
                <Typography component="div"
                  variant="body2"
                  color="text.secondary"
                  sx={{ fontSize: "0.85rem" }}
                >
                  {row.email}
                </Typography>
              </Stack>
            </Stack>
          </Stack>
        ),
      },
      {
        field: "role",
        headerName: "Role",
        flex: 0.8,
        minWidth: 150,
        renderCell: () => (
          <Chip
            icon={<AdminPanelSettingsIcon sx={{ fontSize: 18 }} />}
            label="Administrator"
            color="error"
            size="small"
            sx={{
              fontWeight: 600,
              fontSize: "0.8rem",
              height: 28,
            }}
          />
        ),
      },
      {
        field: "status",
        headerName: "Status",
        flex: 0.6,
        minWidth: 120,
        renderCell: ({ row }) => (
          <Chip
            label={row.status}
            color={row.status === "Active" ? "success" : "error"}
            size="small"
            sx={{
              fontWeight: 600,
              fontSize: "0.75rem",
              height: 26,
            }}
          />
        ),
      },
      {
        field: "createdAt",
        headerName: "Created",
        flex: 1.1,
        minWidth: 200,
        valueGetter: (_value, row: AdminAccount) => row?.createdAt ?? null,
        renderCell: (params) => {
          const createdAt = params.row?.createdAt as string | undefined;
          if (!createdAt) return "—";
          try {
            const formattedDate = formatDateTime(createdAt, "MMM D, YYYY");
            const formattedTime = formatDateTime(createdAt, "h:mm A");
            const relativeTime = formatRelative(createdAt);

            return (
              <Stack spacing={0.5} sx={{ py: 0.5 }}>
                <Stack direction="row" spacing={0.75} alignItems="center">
                  <CalendarIcon
                    sx={{
                      fontSize: 16,
                      color: "error.main",
                    }}
                  />
                  <Typography component="div"
                    variant="body2"
                    fontWeight={600}
                    sx={{ fontSize: "0.875rem" }}
                  >
                    {formattedDate}
                  </Typography>
                </Stack>
                <Typography component="div"
                  variant="caption"
                  color="text.secondary"
                  sx={{
                    fontSize: "0.75rem",
                    pl: 3,
                    fontStyle: "italic",
                  }}
                >
                  {formattedTime} • {relativeTime}
                </Typography>
              </Stack>
            );
          } catch (dateError) {
            console.error("Error formatting date:", dateError, createdAt);
            return "—";
          }
        },
        sortComparator: (v1, v2) => {
          const toTime = (v: unknown) => {
            if (!v) return -Infinity;
            try {
              const d = new Date(String(v));
              const t = d.getTime();
              return isNaN(t) ? -Infinity : t;
            } catch {
              return -Infinity;
            }
          };
          return toTime(v1) - toTime(v2);
        },
      },
      {
        field: "actions",
        type: "actions",
        headerName: "Actions",
        width: 60,
        getActions: ({ row }) => {
          const actions = [];

          // Only aaadmin@gmail.com (original admin) can block/unblock other admins
          const isOriginalAdmin = sessionUser?.email === "aaadmin@gmail.com";

          // Edit action - always show
          actions.push(
            <GridActionsCellItem
              key="edit"
              icon={<EditIcon />}
              label="Edit"
              onClick={() => handleOpenEditDialog(row)}
              showInMenu
            />
          );

          // Block/Unblock actions - only for original admin, not for themselves
          if (isOriginalAdmin && row.id !== sessionUser?.id) {
            if (row.status === "Active") {
              actions.push(
                <GridActionsCellItem
                  key="block"
                  icon={<BlockIcon />}
                  label="Block"
                  onClick={() => blockMutation.mutate(row.id)}
                  showInMenu
                />
              );
            } else {
              actions.push(
                <GridActionsCellItem
                  key="unblock"
                  icon={<CheckCircleIcon />}
                  label="Unblock"
                  onClick={() => unblockMutation.mutate(row.id)}
                  showInMenu
                />
              );
            }
          }

          // Delete action - disabled for self
          actions.push(
            <GridActionsCellItem
              key="delete"
              icon={<DeleteIcon />}
              label="Delete"
              onClick={() => handleOpenDeleteDialog(row)}
              disabled={row.id === sessionUser?.id}
              showInMenu
            />
          );

          return actions;
        },
      },
    ],
    [sessionUser?.id, sessionUser?.email, blockMutation, unblockMutation]
  );

  return (
    <Stack spacing={4}>
      <Stack spacing={1.5}>
        <Typography component="div" variant="h3" fontWeight={800} sx={{ fontSize: "2rem" }}>
          Admin Accounts
        </Typography>
        <Typography component="div"
          variant="body1"
          color="text.secondary"
          sx={{ fontSize: "1rem" }}
        >
          Manage administrator accounts with full system access and permissions.
        </Typography>
      </Stack>

      <Stack
        direction="row"
        spacing={2}
        alignItems="center"
        sx={{
          py: 2,
          borderRadius: 2,
          bgcolor: "background.paper",
          px: 2,
        }}
      >
        <Button
          startIcon={<AddIcon />}
          variant="contained"
          color="error"
          onClick={handleOpenCreateDialog}
          size="large"
          sx={{
            fontWeight: 600,
            px: 3,
            py: 1.25,
            textTransform: "none",
            fontSize: "0.95rem",
          }}
        >
          Create Admin
        </Button>
        <Button
          startIcon={<RefreshIcon />}
          onClick={() => refetch()}
          disabled={isFetching}
          size="large"
          sx={{
            fontWeight: 600,
            textTransform: "none",
          }}
        >
          Refresh
        </Button>
        {isFetching && <CircularProgress size={20} />}
        <Box sx={{ flex: 1 }} />
        <Chip
          label={`${admins.length} Admin${admins.length !== 1 ? "s" : ""}`}
          color="error"
          variant="outlined"
          sx={{ fontWeight: 600, fontSize: "0.85rem" }}
        />
      </Stack>

      {isError ? (
        <Alert severity="warning">
          <Typography component="div" variant="body2" fontWeight={600} gutterBottom>
            Could not load admin accounts
          </Typography>
          <Typography component="div" variant="body2" color="text.secondary">
            {error instanceof Error && error.message.includes("fetch")
              ? "Unable to connect to the server. Please check that the backend is running."
              : error instanceof Error
                ? error.message
                : "This feature may not be available yet. Try refreshing or contact support."}
          </Typography>
        </Alert>
      ) : (
        <Box
          sx={{
            height: 600,
            width: "100%",
            "& .MuiDataGrid-root": {
              border: "none",
              borderRadius: 2,
            },
            "& .MuiDataGrid-cell": {
              borderColor: "divider",
            },
            "& .MuiDataGrid-columnHeaders": {
              bgcolor: "background.paper",
              borderRadius: "8px 8px 0 0",
              borderBottom: "2px solid",
              borderColor: "divider",
            },
            "& .MuiDataGrid-columnHeaderTitle": {
              fontWeight: 700,
              fontSize: "0.9rem",
            },
            "& .MuiDataGrid-row": {
              "&:hover": {
                bgcolor: "action.hover",
              },
            },
            "& .MuiDataGrid-footerContainer": {
              borderTop: "2px solid",
              borderColor: "divider",
              bgcolor: "background.paper",
            },
          }}
        >
          <DataGrid
            rows={admins}
            columns={columns}
            getRowId={(row) => row.id}
            loading={isLoading}
            disableColumnMenu
            disableRowSelectionOnClick
            initialState={{
              pagination: { paginationModel: { pageSize: 10, page: 0 } },
              sorting: {
                sortModel: [{ field: "createdAt", sort: "desc" }],
              },
            }}
            pageSizeOptions={[10, 25, 50]}
            sx={{
              border: "1px solid",
              borderColor: "divider",
              borderRadius: 2,
            }}
            slots={{
              noRowsOverlay: () => (
                <Stack
                  height="100%"
                  alignItems="center"
                  justifyContent="center"
                  spacing={2}
                  sx={{ py: 4 }}
                >
                  <Avatar
                    sx={{
                      width: 64,
                      height: 64,
                      bgcolor: "error.light",
                      color: "error.main",
                    }}
                  >
                    <AdminPanelSettingsIcon sx={{ fontSize: 32 }} />
                  </Avatar>
                  <Stack spacing={0.5} alignItems="center">
                    <Typography component="div" variant="h6" fontWeight={600}>
                      No admin accounts yet
                    </Typography>
                    <Typography component="div" variant="body2" color="text.secondary">
                      Create an admin account to manage the system.
                    </Typography>
                  </Stack>
                  <Button
                    variant="contained"
                    color="error"
                    startIcon={<AddIcon />}
                    onClick={handleOpenCreateDialog}
                    sx={{ mt: 1 }}
                  >
                    Create First Admin
                  </Button>
                </Stack>
              ),
            }}
            rowHeight={72}
          />
        </Box>
      )}

      {/* Create Dialog */}
      <Dialog
        open={createDialogOpen}
        onClose={handleCloseCreateDialog}
        maxWidth="sm"
        fullWidth
        PaperProps={{
          sx: {
            borderRadius: 2,
          },
        }}
      >
        <DialogTitle sx={{ pb: 1 }}>
          <Typography component="div" variant="h5" fontWeight={700}>
            Create Admin Account
          </Typography>
          <Typography component="div" variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
            Add a new administrator with full system access
          </Typography>
        </DialogTitle>
        <DialogContent sx={{ pt: 2 }}>
          <Grid container spacing={2.5}>
            <Grid size={12}>
              <Typography component="div" variant="subtitle2" fontWeight={600} gutterBottom>
                Personal Information
              </Typography>
            </Grid>
            <Grid size={{ xs: 12, sm: 6 }}>
              <TextField
                label="First Name"
                placeholder="Enter first name"
                fullWidth
                value={formData.firstName}
                onChange={(e) =>
                  setFormData({ ...formData, firstName: e.target.value })
                }
                required
                autoFocus
              />
            </Grid>
            <Grid size={{ xs: 12, sm: 6 }}>
              <TextField
                label="Last Name"
                placeholder="Enter last name"
                fullWidth
                value={formData.lastName}
                onChange={(e) =>
                  setFormData({ ...formData, lastName: e.target.value })
                }
                required
              />
            </Grid>
            <Grid size={12}>
              <Typography component="div"
                variant="subtitle2"
                fontWeight={600}
                gutterBottom
                sx={{ mt: 1 }}
              >
                Account Credentials
              </Typography>
            </Grid>
            <Grid size={12}>
              <TextField
                label="Email Address"
                type="email"
                placeholder="admin@university.edu"
                fullWidth
                value={formData.email}
                onChange={(e) =>
                  setFormData({ ...formData, email: e.target.value })
                }
                required
                helperText="This will be used for login"
              />
            </Grid>
            <Grid size={12}>
              <TextField
                label="Password"
                type="password"
                placeholder="Enter secure password"
                fullWidth
                value={formData.password}
                onChange={(e) =>
                  setFormData({ ...formData, password: e.target.value })
                }
                required
                helperText="Minimum 8 characters required"
              />
            </Grid>
          </Grid>
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2.5 }}>
          <Button onClick={handleCloseCreateDialog} size="large">
            Cancel
          </Button>
          <Button
            onClick={handleCreate}
            variant="contained"
            color="error"
            size="large"
            disabled={createMutation.isPending}
            startIcon={
              createMutation.isPending ? (
                <CircularProgress size={18} color="inherit" />
              ) : (
                <AddIcon />
              )
            }
          >
            {createMutation.isPending ? "Creating..." : "Create Admin"}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Edit Dialog */}
      <Dialog
        open={editDialogOpen}
        onClose={handleCloseEditDialog}
        maxWidth="sm"
        fullWidth
        PaperProps={{
          sx: {
            borderRadius: 2,
          },
        }}
      >
        <DialogTitle sx={{ pb: 1 }}>
          <Typography component="div" variant="h5" fontWeight={700}>
            Edit Admin Account
          </Typography>
          <Typography component="div" variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
            Update account information for {selectedAdmin?.firstName}{" "}
            {selectedAdmin?.lastName}
          </Typography>
        </DialogTitle>
        <DialogContent sx={{ pt: 2 }}>
          <Grid container spacing={2.5}>
            <Grid size={12}>
              <Typography component="div" variant="subtitle2" fontWeight={600} gutterBottom>
                Personal Information
              </Typography>
            </Grid>
            <Grid size={{ xs: 12, sm: 6 }}>
              <TextField
                label="First Name"
                placeholder="Enter first name"
                fullWidth
                value={formData.firstName}
                onChange={(e) =>
                  setFormData({ ...formData, firstName: e.target.value })
                }
                required
                autoFocus
              />
            </Grid>
            <Grid size={{ xs: 12, sm: 6 }}>
              <TextField
                label="Last Name"
                placeholder="Enter last name"
                fullWidth
                value={formData.lastName}
                onChange={(e) =>
                  setFormData({ ...formData, lastName: e.target.value })
                }
                required
              />
            </Grid>
            <Grid size={12}>
              <Typography component="div"
                variant="subtitle2"
                fontWeight={600}
                gutterBottom
                sx={{ mt: 1 }}
              >
                Account Information
              </Typography>
            </Grid>
            <Grid size={12}>
              <TextField
                label="Email Address"
                type="email"
                placeholder="admin@university.edu"
                fullWidth
                value={formData.email}
                onChange={(e) =>
                  setFormData({ ...formData, email: e.target.value })
                }
                required
                helperText="Email address for login"
              />
            </Grid>
          </Grid>
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2.5 }}>
          <Button onClick={handleCloseEditDialog} size="large">
            Cancel
          </Button>
          <Button
            onClick={handleUpdate}
            variant="contained"
            color="error"
            size="large"
            disabled={updateMutation.isPending}
            startIcon={
              updateMutation.isPending ? (
                <CircularProgress size={18} color="inherit" />
              ) : (
                <EditIcon />
              )
            }
          >
            {updateMutation.isPending ? "Updating..." : "Update Admin"}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <Dialog
        open={deleteDialogOpen}
        onClose={handleCloseDeleteDialog}
        maxWidth="xs"
        fullWidth
        PaperProps={{
          sx: {
            borderRadius: 2,
          },
        }}
      >
        <DialogTitle sx={{ pb: 1 }}>
          <Typography component="div" variant="h6" fontWeight={700} color="error.main">
            Delete Admin Account
          </Typography>
        </DialogTitle>
        <DialogContent>
          <Typography component="div">
            Are you sure you want to delete the admin account for{" "}
            <strong>
              {selectedAdmin?.firstName} {selectedAdmin?.lastName}
            </strong>{" "}
            ({selectedAdmin?.email})? This action cannot be undone and will
            permanently remove their administrative access.
          </Typography>
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2.5 }}>
          <Button onClick={handleCloseDeleteDialog} size="large">
            Cancel
          </Button>
          <Button
            onClick={handleDelete}
            color="error"
            variant="contained"
            size="large"
            disabled={deleteMutation.isPending}
            startIcon={
              deleteMutation.isPending ? (
                <CircularProgress size={18} color="inherit" />
              ) : (
                <DeleteIcon />
              )
            }
          >
            {deleteMutation.isPending ? "Deleting..." : "Delete Admin"}
          </Button>
        </DialogActions>
      </Dialog>
    </Stack>
  );
}

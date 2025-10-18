"use client";

import { useMemo, useState } from "react";
import Stack from "@mui/material/Stack";
import Typography from "@mui/material/Typography";
import Button from "@mui/material/Button";
import Alert from "@mui/material/Alert";
import Box from "@mui/material/Box";
import Toolbar from "@mui/material/Toolbar";
import CircularProgress from "@mui/material/CircularProgress";
import Dialog from "@mui/material/Dialog";
import DialogTitle from "@mui/material/DialogTitle";
import DialogContent from "@mui/material/DialogContent";
import DialogActions from "@mui/material/DialogActions";
import TextField from "@mui/material/TextField";
import Grid from "@mui/material/Grid";
import RefreshIcon from "@mui/icons-material/RefreshRounded";
import AddIcon from "@mui/icons-material/AddRounded";
import EditIcon from "@mui/icons-material/EditRounded";
import DeleteIcon from "@mui/icons-material/DeleteRounded";
import {
  DataGrid,
  GridActionsCellItem,
  type GridColDef,
} from "@mui/x-data-grid";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useSnackbar } from "notistack";
import { useAuthToken } from "@/hooks/useAuthToken";
import {
  fetchEventsOfficeAccounts,
  createEventsOfficeAccount,
  updateEventsOfficeAccount,
  deleteEventsOfficeAccount,
  type EventsOfficeAccount,
  type CreateEventsOfficeAccountData,
  type UpdateEventsOfficeAccountData,
} from "@/lib/services/admin";
import { formatDateTime } from "@/lib/date";

interface FormData {
  firstName: string;
  lastName: string;
  email: string;
  password: string;
}

export default function EventsOfficeAccountsPage() {
  const token = useAuthToken();
  const { enqueueSnackbar } = useSnackbar();
  const queryClient = useQueryClient();

  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [selectedAccount, setSelectedAccount] =
    useState<EventsOfficeAccount | null>(null);

  const [formData, setFormData] = useState<FormData>({
    firstName: "",
    lastName: "",
    email: "",
    password: "",
  });

  const { data, isLoading, isFetching, isError, error, refetch } = useQuery({
    queryKey: ["admin", "events-office", token],
    queryFn: () => fetchEventsOfficeAccounts(token ?? undefined),
    enabled: Boolean(token),
    retry: 1, // Only retry once to avoid excessive error messages
  });

  const accounts = data ?? [];

  const createMutation = useMutation({
    mutationFn: (data: CreateEventsOfficeAccountData) =>
      createEventsOfficeAccount(data, token ?? undefined),
    onSuccess: () => {
      enqueueSnackbar("Events Office account created successfully", {
        variant: "success",
      });
      queryClient.invalidateQueries({ queryKey: ["admin", "events-office"] });
      handleCloseCreateDialog();
    },
    onError: (mutationError: unknown) => {
      const message =
        mutationError instanceof Error
          ? mutationError.message
          : (mutationError as { message?: string }).message;
      enqueueSnackbar(message ?? "Failed to create account", {
        variant: "error",
      });
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({
      id,
      data,
    }: {
      id: string;
      data: UpdateEventsOfficeAccountData;
    }) => updateEventsOfficeAccount(id, data, token ?? undefined),
    onSuccess: () => {
      enqueueSnackbar("Events Office account updated successfully", {
        variant: "success",
      });
      queryClient.invalidateQueries({ queryKey: ["admin", "events-office"] });
      handleCloseEditDialog();
    },
    onError: (mutationError: unknown) => {
      const message =
        mutationError instanceof Error
          ? mutationError.message
          : (mutationError as { message?: string }).message;
      enqueueSnackbar(message ?? "Failed to update account", {
        variant: "error",
      });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) =>
      deleteEventsOfficeAccount(id, token ?? undefined),
    onSuccess: () => {
      enqueueSnackbar("Events Office account deleted successfully", {
        variant: "success",
      });
      queryClient.invalidateQueries({ queryKey: ["admin", "events-office"] });
      handleCloseDeleteDialog();
    },
    onError: (mutationError: unknown) => {
      const message =
        mutationError instanceof Error
          ? mutationError.message
          : (mutationError as { message?: string }).message;
      enqueueSnackbar(message ?? "Failed to delete account", {
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

  const handleOpenEditDialog = (account: EventsOfficeAccount) => {
    setSelectedAccount(account);
    setFormData({
      firstName: account.firstName,
      lastName: account.lastName,
      email: account.email,
      password: "",
    });
    setEditDialogOpen(true);
  };

  const handleCloseEditDialog = () => {
    setEditDialogOpen(false);
    setSelectedAccount(null);
    setFormData({ firstName: "", lastName: "", email: "", password: "" });
  };

  const handleOpenDeleteDialog = (account: EventsOfficeAccount) => {
    setSelectedAccount(account);
    setDeleteDialogOpen(true);
  };

  const handleCloseDeleteDialog = () => {
    setDeleteDialogOpen(false);
    setSelectedAccount(null);
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
    });
  };

  const handleUpdate = () => {
    if (!selectedAccount) return;
    if (!formData.firstName || !formData.lastName || !formData.email) {
      enqueueSnackbar("Please fill in all fields", { variant: "warning" });
      return;
    }
    updateMutation.mutate({
      id: selectedAccount.id,
      data: {
        firstName: formData.firstName,
        lastName: formData.lastName,
        email: formData.email,
      },
    });
  };

  const handleDelete = () => {
    if (!selectedAccount) return;
    deleteMutation.mutate(selectedAccount.id);
  };

  const columns = useMemo<GridColDef<EventsOfficeAccount>[]>(
    () => [
      {
        field: "name",
        headerName: "Name",
        flex: 1.2,
        valueGetter: (_value, row: EventsOfficeAccount) => {
          return `${row.firstName} ${row.lastName}`.trim();
        },
        renderCell: ({ row }) => (
          <Stack spacing={0.25}>
            <Typography variant="body1" fontWeight={600}>
              {row.firstName} {row.lastName}
            </Typography>
            <Typography variant="body2" color="text.secondary">
              {row.email}
            </Typography>
          </Stack>
        ),
      },
      {
        field: "role",
        headerName: "Role",
        flex: 0.8,
        renderCell: () => (
          <Typography variant="body2" color="primary">
            Events Office
          </Typography>
        ),
      },
      {
        field: "createdAt",
        headerName: "Created",
        flex: 0.8,
        valueGetter: (_value, row: EventsOfficeAccount) =>
          row?.createdAt ?? null,
        renderCell: (params) => {
          const createdAt = params.row?.createdAt as string | undefined;
          if (!createdAt) return "—";
          try {
            return formatDateTime(createdAt);
          } catch (error) {
            console.error("Error formatting date:", error, createdAt);
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
        flex: 0.6,
        getActions: ({ row }) => [
          <GridActionsCellItem
            key="edit"
            icon={<EditIcon />}
            label="Edit"
            onClick={() => handleOpenEditDialog(row)}
          />,
          <GridActionsCellItem
            key="delete"
            icon={<DeleteIcon />}
            label="Delete"
            onClick={() => handleOpenDeleteDialog(row)}
          />,
        ],
      },
    ],
    []
  );

  return (
    <Stack spacing={3}>
      <Stack spacing={1}>
        <Typography variant="h4" fontWeight={700}>
          Events Office Accounts
        </Typography>
        <Typography variant="body1" color="text.secondary">
          Manage Events Office team members who can coordinate bazaars,
          workshops, and campus events.
        </Typography>
      </Stack>

      <Toolbar disableGutters sx={{ gap: 1 }}>
        <Button
          startIcon={<AddIcon />}
          variant="contained"
          onClick={handleOpenCreateDialog}
        >
          Create Account
        </Button>
        <Button
          startIcon={<RefreshIcon />}
          onClick={() => refetch()}
          disabled={isFetching}
        >
          Refresh
        </Button>
        {isFetching && <CircularProgress size={20} />}
      </Toolbar>

      {isError ? (
        <Alert severity="warning">
          <Typography variant="body2" fontWeight={600} gutterBottom>
            Could not load Events Office accounts
          </Typography>
          <Typography variant="body2" color="text.secondary">
            {error instanceof Error && error.message.includes("fetch")
              ? "Unable to connect to the server. Please check that the backend is running."
              : error instanceof Error
                ? error.message
                : "This feature may not be available yet. Try refreshing or contact support."}
          </Typography>
        </Alert>
      ) : (
        <Box sx={{ height: 560, width: "100%" }}>
          <DataGrid
            rows={accounts}
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
            slots={{
              noRowsOverlay: () => (
                <Stack
                  height="100%"
                  alignItems="center"
                  justifyContent="center"
                  spacing={1}
                >
                  <Typography variant="subtitle1" fontWeight={600}>
                    No Events Office accounts yet
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    Create an account to get started.
                  </Typography>
                </Stack>
              ),
            }}
          />
        </Box>
      )}

      {/* Create Dialog */}
      <Dialog
        open={createDialogOpen}
        onClose={handleCloseCreateDialog}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>Create Events Office Account</DialogTitle>
        <DialogContent>
          <Grid container spacing={2} sx={{ mt: 0.5 }}>
            <Grid size={{ xs: 12, sm: 6 }}>
              <TextField
                label="First Name"
                fullWidth
                value={formData.firstName}
                onChange={(e) =>
                  setFormData({ ...formData, firstName: e.target.value })
                }
                required
              />
            </Grid>
            <Grid size={{ xs: 12, sm: 6 }}>
              <TextField
                label="Last Name"
                fullWidth
                value={formData.lastName}
                onChange={(e) =>
                  setFormData({ ...formData, lastName: e.target.value })
                }
                required
              />
            </Grid>
            <Grid size={12}>
              <TextField
                label="Email"
                type="email"
                fullWidth
                value={formData.email}
                onChange={(e) =>
                  setFormData({ ...formData, email: e.target.value })
                }
                required
              />
            </Grid>
            <Grid size={12}>
              <TextField
                label="Password"
                type="password"
                fullWidth
                value={formData.password}
                onChange={(e) =>
                  setFormData({ ...formData, password: e.target.value })
                }
                required
                helperText="Minimum 8 characters"
              />
            </Grid>
          </Grid>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseCreateDialog}>Cancel</Button>
          <Button
            onClick={handleCreate}
            variant="contained"
            disabled={createMutation.isPending}
          >
            {createMutation.isPending ? "Creating..." : "Create"}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Edit Dialog */}
      <Dialog
        open={editDialogOpen}
        onClose={handleCloseEditDialog}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>Edit Events Office Account</DialogTitle>
        <DialogContent>
          <Grid container spacing={2} sx={{ mt: 0.5 }}>
            <Grid size={{ xs: 12, sm: 6 }}>
              <TextField
                label="First Name"
                fullWidth
                value={formData.firstName}
                onChange={(e) =>
                  setFormData({ ...formData, firstName: e.target.value })
                }
                required
              />
            </Grid>
            <Grid size={{ xs: 12, sm: 6 }}>
              <TextField
                label="Last Name"
                fullWidth
                value={formData.lastName}
                onChange={(e) =>
                  setFormData({ ...formData, lastName: e.target.value })
                }
                required
              />
            </Grid>
            <Grid size={12}>
              <TextField
                label="Email"
                type="email"
                fullWidth
                value={formData.email}
                onChange={(e) =>
                  setFormData({ ...formData, email: e.target.value })
                }
                required
              />
            </Grid>
          </Grid>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseEditDialog}>Cancel</Button>
          <Button
            onClick={handleUpdate}
            variant="contained"
            disabled={updateMutation.isPending}
          >
            {updateMutation.isPending ? "Updating..." : "Update"}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <Dialog
        open={deleteDialogOpen}
        onClose={handleCloseDeleteDialog}
        maxWidth="xs"
        fullWidth
      >
        <DialogTitle>Delete Events Office Account</DialogTitle>
        <DialogContent>
          <Typography>
            Are you sure you want to delete the account for{" "}
            <strong>
              {selectedAccount?.firstName} {selectedAccount?.lastName}
            </strong>
            ? This action cannot be undone.
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseDeleteDialog}>Cancel</Button>
          <Button
            onClick={handleDelete}
            color="error"
            variant="contained"
            disabled={deleteMutation.isPending}
          >
            {deleteMutation.isPending ? "Deleting..." : "Delete"}
          </Button>
        </DialogActions>
      </Dialog>
    </Stack>
  );
}

"use client";

import React, { useMemo } from "react";
import {
  DataGrid,
  GridActionsCellItem,
  GridColDef,
  GridValueGetterParams,
} from "@mui/x-data-grid";
import Box from "@mui/material/Box";
import Stack from "@mui/material/Stack";
import Typography from "@mui/material/Typography";
import Chip from "@mui/material/Chip";
import Button from "@mui/material/Button";
import Alert from "@mui/material/Alert";
import Toolbar from "@mui/material/Toolbar";
import CircularProgress from "@mui/material/CircularProgress";
import RefreshIcon from "@mui/icons-material/RefreshRounded";
import CheckIcon from "@mui/icons-material/CheckCircleRounded";
import BlockIcon from "@mui/icons-material/BlockRounded";
import CancelIcon from "@mui/icons-material/CancelRounded";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useSnackbar } from "notistack";
import { useAuthToken } from "@/hooks/useAuthToken";
import { fetchAdminUsers, approveUser, rejectUser, blockUser, type AdminUser } from "@/lib/services/admin";
import { UserStatus } from "@/lib/types";
import { formatDateTime } from "@/lib/date";
import { useSessionUser } from "@/hooks/useSessionUser";

export default function AdminUserManagementPage() {
  const token = useAuthToken();
  const sessionUser = useSessionUser();
  const queryClient = useQueryClient();
  const { enqueueSnackbar } = useSnackbar();
  const { data, isLoading, isError, error, refetch, isFetching } = useQuery({
    queryKey: ["admin", "users", token],
    queryFn: () => fetchAdminUsers(token ?? undefined),
    enabled: Boolean(token),
  });

  const approveMutation = useMutation({
    mutationFn: (userId: string) => approveUser(userId, token ?? undefined),
    onSuccess: () => {
      enqueueSnackbar("User approved successfully", { variant: "success" });
      queryClient.invalidateQueries({ queryKey: ["admin", "users"] });
    },
    onError: (mutationError: unknown) => {
      enqueueSnackbar(resolveErrorMessage(mutationError), { variant: "error" });
    },
  });

  const rejectMutation = useMutation({
    mutationFn: (userId: string) => rejectUser(userId, undefined, token ?? undefined),
    onSuccess: () => {
      enqueueSnackbar("User rejection recorded", { variant: "info" });
      queryClient.invalidateQueries({ queryKey: ["admin", "users"] });
    },
    onError: (mutationError: unknown) => {
      enqueueSnackbar(resolveErrorMessage(mutationError), { variant: "error" });
    },
  });

  const blockMutation = useMutation({
    mutationFn: (userId: string) => blockUser(userId, token ?? undefined),
    onSuccess: () => {
      enqueueSnackbar("User blocked", { variant: "warning" });
      queryClient.invalidateQueries({ queryKey: ["admin", "users"] });
    },
    onError: (mutationError: unknown) => {
      enqueueSnackbar(resolveErrorMessage(mutationError), { variant: "error" });
    },
  });

  const rows: AdminUser[] = data ?? [];

  const columns = useMemo<GridColDef[]>(
    () => [
      {
        field: "name",
        headerName: "Name",
        flex: 1.2,
        valueGetter: (params: GridValueGetterParams<AdminUser>) => {
          const row = params?.row;
          if (!row) return "";
          const firstName = row.firstName?.trim() ?? "";
          const lastName = row.lastName?.trim() ?? "";
          const fullName = `${firstName} ${lastName}`.trim();
          if (fullName.length > 0) {
            return fullName;
          }
          return row.email ?? "Unknown user";
        },
      },
      {
        field: "email",
        headerName: "Email",
        flex: 1.4,
      },
      {
        field: "role",
        headerName: "Role",
        flex: 0.6,
        renderCell: ({ value }) => <Chip label={value} size="small" color="primary" variant="outlined" />,
      },
      {
        field: "status",
        headerName: "Status",
        flex: 0.6,
        renderCell: ({ value }) => (
          <Chip
            label={value}
            size="small"
            color={value === UserStatus.Active ? "success" : "default"}
            variant="outlined"
          />
        ),
      },
      {
        field: "verified",
        headerName: "Verified",
        flex: 0.5,
        renderCell: ({ value }) => (
          <Chip
            label={value ? "Verified" : "Pending"}
            size="small"
            color={value ? "success" : "warning"}
            variant={value ? "filled" : "outlined"}
          />
        ),
      },
      {
        field: "createdAt",
        headerName: "Created",
        flex: 0.8,
        valueGetter: ({ value }) => formatDateTime(value),
      },
      {
        field: "actions",
        type: "actions",
        headerName: "Actions",
        flex: 0.8,
        getActions: ({ row }) => {
          const actions: JSX.Element[] = [];
          const isSelf = sessionUser?.id === row.id;

          if (!row.verified) {
            actions.push(
              <GridActionsCellItem
                key="approve"
                icon={<CheckIcon color="success" />}
                label="Approve user"
                disabled={approveMutation.isPending}
                onClick={() => approveMutation.mutate(row.id)}
                showInMenu
              />
            );
            actions.push(
              <GridActionsCellItem
                key="reject"
                icon={<CancelIcon color="error" />}
                label="Reject user"
                disabled={rejectMutation.isPending}
                onClick={() => rejectMutation.mutate(row.id)}
                showInMenu
              />
            );
          }

          actions.push(
            <GridActionsCellItem
              key="block"
              icon={<BlockIcon color="warning" />}
              label="Block user"
              disabled={isSelf || blockMutation.isPending || row.status === UserStatus.Blocked}
              onClick={() => blockMutation.mutate(row.id)}
              showInMenu
            />
          );

          return actions;
        },
      },
    ],
    [approveMutation, blockMutation, rejectMutation, sessionUser?.id]
  );

  return (
    <Stack spacing={3}>
      <Stack spacing={1}>
        <Typography variant="h4" fontWeight={700}>
          User management
        </Typography>
        <Typography variant="body1" color="text.secondary">
          Verify faculty accounts, monitor status, and keep the community safe.
        </Typography>
      </Stack>

      <Toolbar disableGutters sx={{ gap: 1 }}>
        <Button
          startIcon={<RefreshIcon />}
          onClick={() => refetch()}
          disabled={isFetching}
        >
          Refresh data
        </Button>
        {isFetching && <CircularProgress size={20} />}
      </Toolbar>

      {isError ? (
        <Alert severity="error">
          {resolveErrorMessage(error)}
        </Alert>
      ) : (
        <Box sx={{ height: 560, width: "100%" }}>
          <DataGrid
            rows={rows}
            columns={columns}
            getRowId={(row) => row.id}
            loading={isLoading}
            disableColumnMenu
            disableRowSelectionOnClick
            initialState={{
              pagination: { paginationModel: { pageSize: 10, page: 0 } },
              sorting: {
                sortModel: [{ field: "createdAt", sort: "desc" as const }],
              },
            }}
            pageSizeOptions={[10, 25, 50]}
            slots={{
              noRowsOverlay: () => (
                <Stack height="100%" alignItems="center" justifyContent="center" spacing={1}>
                  <Typography variant="subtitle1" fontWeight={600}>
                    No users found
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    Invite faculty members or adjust your filters.
                  </Typography>
                </Stack>
              ),
            }}
          />
        </Box>
      )}
    </Stack>
  );
}

function resolveErrorMessage(error: unknown) {
  if (error instanceof Error) return error.message;
  if (error && typeof error === "object" && "message" in error) {
    const value = (error as { message?: string }).message;
    if (typeof value === "string") return value;
  }
  return "Something went wrong. Please try again.";
}

"use client";

import { useEffect, useMemo } from "react";
import Stack from "@mui/material/Stack";
import Typography from "@mui/material/Typography";
import Alert from "@mui/material/Alert";
import Box from "@mui/material/Box";
import Toolbar from "@mui/material/Toolbar";
import Button from "@mui/material/Button";
import CircularProgress from "@mui/material/CircularProgress";
import IconButton from "@mui/material/IconButton";
import Tooltip from "@mui/material/Tooltip";
import RefreshIcon from "@mui/icons-material/RefreshRounded";
import VisibilityIcon from "@mui/icons-material/VisibilityRounded";
import { DataGrid, type GridColDef } from "@mui/x-data-grid";
import { useQuery } from "@tanstack/react-query";
import { useSnackbar } from "notistack";
import { useRouter } from "next/navigation";
import { useAuthToken } from "@/hooks/useAuthToken";
import { fetchAdminVendors, type AdminVendor } from "@/lib/services/admin";
import { formatDateTime } from "@/lib/date";

export default function VendorApplicationsPage() {
  const token = useAuthToken();
  const { enqueueSnackbar } = useSnackbar();
  const router = useRouter();

  const { data, isLoading, isFetching, isError, error, refetch } = useQuery({
    queryKey: ["admin", "vendors", token],
    queryFn: () => fetchAdminVendors(token ?? undefined),
    enabled: Boolean(token),
  });

  const vendors = data ?? [];

  const columns = useMemo<GridColDef<AdminVendor>[]>(
    () => [
      {
        field: "companyName",
        headerName: "Company",
        flex: 1.4,
        renderCell: ({ row }) => (
          <Stack spacing={0.25}>
            <Typography variant="body1" fontWeight={600}>
              {row.companyName}
            </Typography>
            <Typography variant="body2" color="text.secondary">
              {row.email}
            </Typography>
          </Stack>
        ),
        sortable: false,
      },
      {
        field: "pendingApplications",
        headerName: "Pending Apps",
        flex: 0.6,
      },
      {
        field: "approvedApplications",
        headerName: "Approved Apps",
        flex: 0.6,
      },
      {
        field: "rejectedApplications",
        headerName: "Rejected Apps",
        flex: 0.6,
      },
      {
        field: "loyaltyForum",
        headerName: "Loyalty Forum",
        flex: 1,
        renderCell: ({ value }) =>
          value ? (
            <Button
              href={value}
              target="_blank"
              rel="noopener noreferrer"
              variant="text"
              size="small"
            >
              Open link
            </Button>
          ) : (
            <Typography variant="body2" color="text.secondary">
              Not provided
            </Typography>
          ),
        sortable: false,
      },
      {
        field: "createdAt",
        headerName: "Joined",
        flex: 0.8,
        // Provide the raw ISO string for sorting
        valueGetter: (_value, row: AdminVendor) => row?.createdAt ?? null,
        // Display formatted date
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
        // Sort by timestamp
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
        headerName: "Actions",
        flex: 0.6,
        sortable: false,
        renderCell: ({ row }) => (
          <Tooltip title="View Applications">
            <IconButton
              size="small"
              color="primary"
              onClick={() =>
                router.push(`/admin/vendors/${row.id}/applications`)
              }
            >
              <VisibilityIcon fontSize="small" />
            </IconButton>
          </Tooltip>
        ),
      },
    ],
    [router]
  );

  useEffect(() => {
    if (isError) {
      enqueueSnackbar(
        error instanceof Error ? error.message : "Failed to load vendors",
        { variant: "error" }
      );
    }
  }, [enqueueSnackbar, error, isError]);

  return (
    <Stack spacing={3}>
      <Stack spacing={1}>
        <Typography variant="h4" fontWeight={700}>
          Vendor applications
        </Typography>
        <Typography variant="body1" color="text.secondary">
          Review vendor onboarding submissions, monitor verification status, and
          track bazaar applications.
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
          {error instanceof Error
            ? error.message
            : "Failed to load vendor applications."}
        </Alert>
      ) : (
        <Box sx={{ height: 560, width: "100%" }}>
          <DataGrid
            rows={vendors}
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
                    No vendors yet
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    When vendors register, their applications will appear here.
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

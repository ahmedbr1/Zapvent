"use client";

import { use, useEffect, useMemo } from "react";
import { useRouter } from "next/navigation";
import Stack from "@mui/material/Stack";
import Typography from "@mui/material/Typography";
import Card from "@mui/material/Card";
import Alert from "@mui/material/Alert";
import Button from "@mui/material/Button";
import IconButton from "@mui/material/IconButton";
import Chip from "@mui/material/Chip";
import CircularProgress from "@mui/material/CircularProgress";
import Box from "@mui/material/Box";
import ArrowBackIcon from "@mui/icons-material/ArrowBackRounded";
import CheckCircleIcon from "@mui/icons-material/CheckCircleRounded";
import CancelIcon from "@mui/icons-material/CancelRounded";
import DownloadIcon from "@mui/icons-material/DownloadRounded";
import { DataGrid, type GridColDef } from "@mui/x-data-grid";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useSnackbar } from "notistack";
import { useAuthToken } from "@/hooks/useAuthToken";
import {
  fetchAdminVendors,
  updateVendorApplicationStatus,
  type AdminVendor,
  type AdminVendorApplication,
} from "@/lib/services/admin";
import { formatDateTime } from "@/lib/date";

export default function VendorApplicationsDetailPage({
  params,
}: {
  params: Promise<{ vendorId: string }>;
}) {
  const { vendorId } = use(params);
  const token = useAuthToken();
  const router = useRouter();
  const { enqueueSnackbar } = useSnackbar();
  const queryClient = useQueryClient();

  const { data, isLoading, isError, error } = useQuery({
    queryKey: ["admin", "vendors", token],
    queryFn: () => fetchAdminVendors(token ?? undefined),
    enabled: Boolean(token),
  });

  const vendor = data?.find((v: AdminVendor) => v.id === vendorId);

  // Mutation for updating application status
  const updateStatusMutation = useMutation({
    mutationFn: ({
      eventId,
      status,
    }: {
      eventId: string;
      status: "approved" | "rejected";
    }) =>
      updateVendorApplicationStatus(
        vendorId,
        eventId,
        status,
        token ?? undefined
      ),
    onSuccess: () => {
      enqueueSnackbar("Application status updated successfully", {
        variant: "success",
      });
      // Invalidate queries to trigger refetch of active queries
      queryClient.invalidateQueries({ queryKey: ["admin", "vendors"] });
    },
    onError: (error: Error) => {
      console.error("Failed to update application status:", error);
      const errorMessage = error.message || "Failed to update application status";
      enqueueSnackbar(errorMessage, {
        variant: "error",
      });
    },
  });

  useEffect(() => {
    if (isError) {
      enqueueSnackbar(
        error instanceof Error ? error.message : "Failed to load vendor",
        { variant: "error" }
      );
    }
  }, [enqueueSnackbar, error, isError]);

  const getStatusColor = (
    status: string
  ): "success" | "warning" | "error" | "default" => {
    switch (status) {
      case "approved":
        return "success";
      case "pending":
        return "warning";
      case "rejected":
        return "error";
      default:
        return "default";
    }
  };

  // Define columns for DataGrid
  const columns = useMemo<GridColDef<AdminVendorApplication>[]>(
    () => [
      {
        field: "eventName",
        headerName: "Event Name",
        flex: 1.5,
        minWidth: 200,
        renderCell: ({ row }) => (
          <Typography variant="body2" fontWeight={500}>
            {row.eventName || "Unknown Event"}
          </Typography>
        ),
      },
      {
        field: "eventId",
        headerName: "Event ID",
        flex: 1,
        minWidth: 120,
        renderCell: ({ value }) => (
          <Typography variant="body2" fontFamily="monospace" fontSize="0.75rem">
            {value.substring(0, 8)}...
          </Typography>
        ),
      },
      {
        field: "applicationDate",
        headerName: "Application Date",
        flex: 1.2,
        minWidth: 180,
        renderCell: ({ value }) => (
          <Typography variant="body2">
            {value ? formatDateTime(value) : "—"}
          </Typography>
        ),
      },
      {
        field: "attendees",
        headerName: "Attendees",
        flex: 0.7,
        minWidth: 100,
        align: "center",
        headerAlign: "center",
      },
      {
        field: "boothSize",
        headerName: "Booth Size",
        flex: 0.8,
        minWidth: 110,
        renderCell: ({ value }) => (
          <Typography variant="body2">{value} sq m</Typography>
        ),
      },
      {
        field: "boothLocation",
        headerName: "Booth Location",
        flex: 1,
        minWidth: 150,
        renderCell: ({ value }) =>
          value ? (
            <Typography variant="body2">{value}</Typography>
          ) : (
            <Typography variant="body2" color="text.secondary">
              Not assigned
            </Typography>
          ),
      },
      {
        field: "status",
        headerName: "Status",
        flex: 0.8,
        minWidth: 110,
        renderCell: ({ value }) => (
          <Chip
            label={value?.toUpperCase() || "PENDING"}
            size="small"
            color={getStatusColor(value)}
          />
        ),
      },
      {
        field: "actions",
        headerName: "Actions",
        flex: 0.8,
        minWidth: 120,
        sortable: false,
        align: "right",
        headerAlign: "right",
        renderCell: ({ row }) =>
          row.status === "pending" ? (
            <Stack direction="row" spacing={0.5}>
              <IconButton
                size="small"
                color="success"
                onClick={() =>
                  updateStatusMutation.mutate({
                    eventId: row.eventId,
                    status: "approved",
                  })
                }
                disabled={updateStatusMutation.isPending}
              >
                <CheckCircleIcon fontSize="small" />
              </IconButton>
              <IconButton
                size="small"
                color="error"
                onClick={() =>
                  updateStatusMutation.mutate({
                    eventId: row.eventId,
                    status: "rejected",
                  })
                }
                disabled={updateStatusMutation.isPending}
              >
                <CancelIcon fontSize="small" />
              </IconButton>
            </Stack>
          ) : null,
      },
    ],
    [updateStatusMutation]
  );

  if (isLoading) {
    return (
      <Stack alignItems="center" justifyContent="center" minHeight={400}>
        <CircularProgress />
      </Stack>
    );
  }

  if (!vendor) {
    return (
      <Stack spacing={3}>
        <Button
          startIcon={<ArrowBackIcon />}
          onClick={() => router.push("/admin/vendors")}
        >
          Back to Vendors
        </Button>
        <Alert severity="error">Vendor not found</Alert>
      </Stack>
    );
  }

  return (
    <Stack spacing={4}>
      {/* Header */}
      <Stack spacing={2}>
        <Button
          startIcon={<ArrowBackIcon />}
          onClick={() => router.push("/admin/vendors")}
          sx={{ alignSelf: "flex-start" }}
        >
          Back to Vendors
        </Button>
        <Stack spacing={1}>
          <Typography variant="h4" fontWeight={700}>
            {vendor.companyName}
          </Typography>
          <Typography variant="body1" color="text.secondary">
            {vendor.email}
          </Typography>
        </Stack>
      </Stack>

      {/* Vendor Information */}
      <Card>
        <Stack spacing={2} p={3}>
          <Typography variant="h6" fontWeight={600}>
            Vendor Information
          </Typography>
          <Stack spacing={1}>
            <Stack direction="row" spacing={2}>
              <Typography variant="body2" color="text.secondary" minWidth={150}>
                Company Name:
              </Typography>
              <Typography variant="body2" fontWeight={500}>
                {vendor.companyName}
              </Typography>
            </Stack>
            <Stack direction="row" spacing={2}>
              <Typography variant="body2" color="text.secondary" minWidth={150}>
                Email:
              </Typography>
              <Typography variant="body2" fontWeight={500}>
                {vendor.email}
              </Typography>
            </Stack>
            <Stack direction="row" spacing={2}>
              <Typography variant="body2" color="text.secondary" minWidth={150}>
                Joined:
              </Typography>
              <Typography variant="body2" fontWeight={500}>
                {formatDateTime(vendor.createdAt)}
              </Typography>
            </Stack>
            {vendor.loyaltyForum && (
              <Stack direction="row" spacing={2}>
                <Typography
                  variant="body2"
                  color="text.secondary"
                  minWidth={150}
                >
                  Loyalty Forum:
                </Typography>
                <Button
                  href={vendor.loyaltyForum}
                  target="_blank"
                  rel="noopener noreferrer"
                  variant="text"
                  size="small"
                  sx={{ p: 0 }}
                >
                  Open Link
                </Button>
              </Stack>
            )}
          </Stack>
        </Stack>
      </Card>

      <Card>
        <Stack spacing={2} p={3}>
          <Typography variant="h6" fontWeight={600}>
            Supporting documents
          </Typography>
          {[
            { label: "Company logo", path: vendor.logo },
            { label: "Tax card", path: vendor.taxCard },
            { label: "Business documents", path: vendor.documents },
          ].map((file) => (
            <Stack
              key={file.label}
              direction={{ xs: "column", sm: "row" }}
              spacing={1}
              alignItems={{ xs: "flex-start", sm: "center" }}
              justifyContent="space-between"
            >
              <Typography variant="body2" color="text.secondary">
                {file.label}
              </Typography>
              {file.path ? (
                <Button
                  component="a"
                  href={`/${file.path}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  startIcon={<DownloadIcon />}
                  variant="outlined"
                  size="small"
                >
                  View / download
                </Button>
              ) : (
                <Typography variant="body2" color="text.secondary">
                  Not provided
                </Typography>
              )}
            </Stack>
          ))}
        </Stack>
      </Card>

      {/* Applications Summary */}
      <Card>
        <Stack spacing={2} p={3}>
          <Typography variant="h6" fontWeight={600}>
            Applications Summary
          </Typography>
          <Stack direction="row" spacing={4}>
            <Stack spacing={0.5}>
              <Typography variant="h4" fontWeight={700} color="warning.main">
                {vendor.pendingApplications}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Pending
              </Typography>
            </Stack>
            <Stack spacing={0.5}>
              <Typography variant="h4" fontWeight={700} color="success.main">
                {vendor.approvedApplications}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Approved
              </Typography>
            </Stack>
            <Stack spacing={0.5}>
              <Typography variant="h4" fontWeight={700} color="error.main">
                {vendor.rejectedApplications}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Rejected
              </Typography>
            </Stack>
          </Stack>
        </Stack>
      </Card>

      {/* Applications Table */}
      <Card>
        <Stack spacing={3} p={3}>
          <Typography variant="h6" fontWeight={600}>
            Bazaar Applications
          </Typography>

          {vendor.applications.length === 0 ? (
            <Alert severity="info">
              This vendor hasn&apos;t submitted any applications yet.
            </Alert>
          ) : (
            <Box sx={{ height: 500, width: "100%" }}>
              <DataGrid
                rows={vendor.applications}
                columns={columns}
                getRowId={(row) => row.eventId}
                disableColumnMenu={false}
                disableRowSelectionOnClick
                initialState={{
                  pagination: {
                    paginationModel: { pageSize: 10, page: 0 },
                  },
                }}
                pageSizeOptions={[5, 10, 25]}
                getRowClassName={(params) =>
                  params.row.status === "pending" ? "pending-row" : ""
                }
                sx={{
                  "& .pending-row": {
                    bgcolor: "warning.lighter",
                  },
                  "& .MuiDataGrid-columnHeader": {
                    fontWeight: 600,
                  },
                }}
              />
            </Box>
          )}
        </Stack>
      </Card>
    </Stack>
  );
}

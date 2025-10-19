"use client";

import { use, useEffect } from "react";
import { useRouter } from "next/navigation";
import Stack from "@mui/material/Stack";
import Typography from "@mui/material/Typography";
import Card from "@mui/material/CardContent";
import Alert from "@mui/material/Alert";
import Button from "@mui/material/Button";
import IconButton from "@mui/material/IconButton";
import Chip from "@mui/material/Chip";
import CircularProgress from "@mui/material/CircularProgress";
import ArrowBackIcon from "@mui/icons-material/ArrowBackRounded";
import CheckCircleIcon from "@mui/icons-material/CheckCircleRounded";
import CancelIcon from "@mui/icons-material/CancelRounded";
import Table from "@mui/material/Table";
import TableBody from "@mui/material/TableBody";
import TableCell from "@mui/material/TableCell";
import TableContainer from "@mui/material/TableContainer";
import TableHead from "@mui/material/TableHead";
import TableRow from "@mui/material/TableRow";
import Paper from "@mui/material/Paper";
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
      queryClient.invalidateQueries({ queryKey: ["admin", "vendors"] });
    },
    onError: (error: Error) => {
      enqueueSnackbar(error.message || "Failed to update application status", {
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
          <Stack direction="row" spacing={1} alignItems="center">
            <Typography variant="body2" color="text.secondary">
              Account Status:
            </Typography>
            <Chip
              label={vendor.verificationStatus?.toUpperCase() || "PENDING"}
              size="small"
              color={getStatusColor(vendor.verificationStatus)}
            />
          </Stack>
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
            <TableContainer component={Paper} variant="outlined">
              <Table>
                <TableHead>
                  <TableRow>
                    <TableCell>Event ID</TableCell>
                    <TableCell>Application Date</TableCell>
                    <TableCell>Attendees</TableCell>
                    <TableCell>Booth Size</TableCell>
                    <TableCell>Booth Location</TableCell>
                    <TableCell>Status</TableCell>
                    <TableCell align="right">Actions</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {vendor.applications.map(
                    (app: AdminVendorApplication, index: number) => (
                      <TableRow
                        key={index}
                        sx={{
                          bgcolor:
                            app.status === "pending"
                              ? "warning.lighter"
                              : "inherit",
                        }}
                      >
                        <TableCell>
                          <Typography variant="body2" fontFamily="monospace">
                            {app.eventId.substring(0, 8)}...
                          </Typography>
                        </TableCell>
                        <TableCell>
                          <Typography variant="body2">
                            {app.applicationDate
                              ? formatDateTime(app.applicationDate)
                              : "—"}
                          </Typography>
                        </TableCell>
                        <TableCell>{app.attendees}</TableCell>
                        <TableCell>{app.boothSize} sq m</TableCell>
                        <TableCell>
                          {app.boothLocation || (
                            <Typography variant="body2" color="text.secondary">
                              Not assigned
                            </Typography>
                          )}
                        </TableCell>
                        <TableCell>
                          <Chip
                            label={app.status.toUpperCase()}
                            size="small"
                            color={getStatusColor(app.status)}
                          />
                        </TableCell>
                        <TableCell align="right">
                          {app.status === "pending" && (
                            <Stack
                              direction="row"
                              spacing={1}
                              justifyContent="flex-end"
                            >
                              <IconButton
                                size="small"
                                color="success"
                                onClick={() =>
                                  updateStatusMutation.mutate({
                                    eventId: app.eventId,
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
                                    eventId: app.eventId,
                                    status: "rejected",
                                  })
                                }
                                disabled={updateStatusMutation.isPending}
                              >
                                <CancelIcon fontSize="small" />
                              </IconButton>
                            </Stack>
                          )}
                        </TableCell>
                      </TableRow>
                    )
                  )}
                </TableBody>
              </Table>
            </TableContainer>
          )}
        </Stack>
      </Card>
    </Stack>
  );
}

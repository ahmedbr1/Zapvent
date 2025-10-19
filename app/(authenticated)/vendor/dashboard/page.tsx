"use client";

import { useQuery } from "@tanstack/react-query";
import Grid from "@mui/material/Grid";
import Stack from "@mui/material/Stack";
import Typography from "@mui/material/Typography";
import Card from "@mui/material/Card";
import CardContent from "@mui/material/CardContent";
import Skeleton from "@mui/material/Skeleton";
import Table from "@mui/material/Table";
import TableBody from "@mui/material/TableBody";
import TableCell from "@mui/material/TableCell";
import TableContainer from "@mui/material/TableContainer";
import TableHead from "@mui/material/TableHead";
import TableRow from "@mui/material/TableRow";
import Chip from "@mui/material/Chip";
import Button from "@mui/material/Button";
import Alert from "@mui/material/Alert";
import StorefrontIcon from "@mui/icons-material/StorefrontRounded";
import CheckCircleIcon from "@mui/icons-material/CheckCircleRounded";
import PendingIcon from "@mui/icons-material/PendingRounded";
import CancelIcon from "@mui/icons-material/CancelRounded";
import ArrowForwardIcon from "@mui/icons-material/ArrowForwardRounded";
import { useRouter } from "next/navigation";
import { useAuthToken } from "@/hooks/useAuthToken";
import { useSessionUser } from "@/hooks/useSessionUser";
import { apiFetch } from "@/lib/api-client";
import { formatDateTime } from "@/lib/date";

interface VendorStats {
  totalApplications: number;
  pendingApplications: number;
  approvedApplications: number;
  rejectedApplications: number;
}

interface VendorApplication {
  id: string;
  eventId: string;
  eventName: string;
  eventDate?: string;
  eventLocation?: string;
  applicationDate: string;
  attendees: number;
  boothSize: number;
  boothLocation?: string;
  status: "pending" | "approved" | "rejected";
}

export default function VendorDashboardPage() {
  const token = useAuthToken();
  const user = useSessionUser();
  const router = useRouter();
  const companyName = user?.name ?? "Vendor";

  // Fetch all applications from the API
  const applicationsQuery = useQuery({
    queryKey: ["vendor-applications", user?.id, token],
    queryFn: async (): Promise<VendorApplication[]> => {
      const response = (await apiFetch("/vendors/my-applications", {
        method: "GET",
        token: token ?? undefined,
      })) as { success: boolean; data: VendorApplication[] };

      if (!response.success) {
        throw new Error("Failed to fetch applications");
      }

      return response.data || [];
    },
    enabled: Boolean(token && user?.id),
  });

  const applications = applicationsQuery.data ?? [];

  // Calculate stats from applications data
  const stats: VendorStats = {
    totalApplications: applications.length,
    pendingApplications: applications.filter((app) => app.status === "pending")
      .length,
    approvedApplications: applications.filter(
      (app) => app.status === "approved"
    ).length,
    rejectedApplications: applications.filter(
      (app) => app.status === "rejected"
    ).length,
  };

  // Get pending applications for quick view
  const pendingApplications = applications.filter(
    (app) => app.status === "pending"
  );

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

  const StatCard = ({
    title,
    value,
    icon,
    color = "primary.main",
  }: {
    title: string;
    value: number | string;
    icon: React.ReactNode;
    color?: string;
  }) => (
    <Card sx={{ height: "100%" }}>
      <CardContent>
        <Stack spacing={2}>
          <Stack
            direction="row"
            justifyContent="space-between"
            alignItems="center"
          >
            <Typography variant="body2" color="text.secondary" fontWeight={500}>
              {title}
            </Typography>
            <Stack
              sx={{
                width: 48,
                height: 48,
                borderRadius: 2,
                bgcolor: `${color}15`,
                color: color,
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              {icon}
            </Stack>
          </Stack>
          <Typography variant="h3" fontWeight={700}>
            {applicationsQuery.isLoading ? <Skeleton width={60} /> : value}
          </Typography>
        </Stack>
      </CardContent>
    </Card>
  );

  return (
    <Stack spacing={4}>
      {/* Header */}
      <Stack spacing={1}>
        <Typography variant="h4" fontWeight={700}>
          Welcome back, {companyName}!
        </Typography>
        <Typography variant="body1" color="text.secondary">
          Manage your bazaar applications and booth setups from your vendor
          dashboard.
        </Typography>
      </Stack>

      {/* Stats Grid */}
      <Grid container spacing={3}>
        <Grid size={{ xs: 12, sm: 6, md: 3 }}>
          <StatCard
            title="Total Applications"
            value={stats?.totalApplications ?? 0}
            icon={<StorefrontIcon />}
            color="primary.main"
          />
        </Grid>
        <Grid size={{ xs: 12, sm: 6, md: 3 }}>
          <StatCard
            title="Pending"
            value={stats?.pendingApplications ?? 0}
            icon={<PendingIcon />}
            color="warning.main"
          />
        </Grid>
        <Grid size={{ xs: 12, sm: 6, md: 3 }}>
          <StatCard
            title="Approved"
            value={stats?.approvedApplications ?? 0}
            icon={<CheckCircleIcon />}
            color="success.main"
          />
        </Grid>
        <Grid size={{ xs: 12, sm: 6, md: 3 }}>
          <StatCard
            title="Rejected"
            value={stats?.rejectedApplications ?? 0}
            icon={<CancelIcon />}
            color="error.main"
          />
        </Grid>
      </Grid>

      {/* Pending Applications Alert */}
      {stats.pendingApplications > 0 && (
        <Alert
          severity="warning"
          icon={<PendingIcon />}
          action={
            <Button
              size="small"
              color="inherit"
              onClick={() => router.push("/vendor/applications")}
            >
              View All
            </Button>
          }
        >
          <Typography variant="body2" fontWeight={500}>
            You have {stats.pendingApplications} pending application
            {stats.pendingApplications > 1 ? "s" : ""} awaiting review
          </Typography>
        </Alert>
      )}

      {/* Quick Actions */}
      <Card>
        <CardContent>
          <Stack spacing={3}>
            <Typography variant="h6" fontWeight={600}>
              Quick Actions
            </Typography>
            <Stack direction={{ xs: "column", sm: "row" }} spacing={2}>
              <Button
                variant="contained"
                size="large"
                endIcon={<ArrowForwardIcon />}
                onClick={() => router.push("/vendor/bazaars")}
                fullWidth
                sx={{ py: 1.5 }}
              >
                Browse Available Bazaars
              </Button>
              <Button
                variant="outlined"
                size="large"
                endIcon={<ArrowForwardIcon />}
                onClick={() => router.push("/vendor/applications")}
                fullWidth
                sx={{ py: 1.5 }}
              >
                View My Applications
              </Button>
            </Stack>
          </Stack>
        </CardContent>
      </Card>

      {/* Pending Applications */}
      {pendingApplications.length > 0 && (
        <Card sx={{ bgcolor: "warning.lighter" }}>
          <CardContent>
            <Stack spacing={3}>
              <Stack
                direction="row"
                justifyContent="space-between"
                alignItems="center"
              >
                <Stack direction="row" alignItems="center" spacing={1}>
                  <PendingIcon color="warning" />
                  <Typography variant="h6" fontWeight={600}>
                    Pending Applications ({pendingApplications.length})
                  </Typography>
                </Stack>
                <Button
                  size="small"
                  endIcon={<ArrowForwardIcon />}
                  onClick={() => router.push("/vendor/applications")}
                >
                  View All
                </Button>
              </Stack>

              <TableContainer>
                <Table>
                  <TableHead>
                    <TableRow>
                      <TableCell>Bazaar Event</TableCell>
                      <TableCell>Applied On</TableCell>
                      <TableCell>Attendees</TableCell>
                      <TableCell>Booth Size</TableCell>
                      <TableCell align="right">Actions</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {pendingApplications
                      .slice(0, 3)
                      .map((app: VendorApplication) => (
                        <TableRow key={app.id}>
                          <TableCell>
                            <Stack spacing={0.5}>
                              <Typography variant="body2" fontWeight={500}>
                                {app.eventName}
                              </Typography>
                              {app.eventLocation && (
                                <Typography
                                  variant="caption"
                                  color="text.secondary"
                                >
                                  {app.eventLocation}
                                </Typography>
                              )}
                            </Stack>
                          </TableCell>
                          <TableCell>
                            <Typography variant="body2">
                              {formatDateTime(app.applicationDate)}
                            </Typography>
                          </TableCell>
                          <TableCell>
                            <Typography variant="body2">
                              {app.attendees}
                            </Typography>
                          </TableCell>
                          <TableCell>
                            <Typography variant="body2">
                              {app.boothSize} sq m
                            </Typography>
                          </TableCell>
                          <TableCell align="right">
                            <Button
                              size="small"
                              variant="outlined"
                              onClick={() =>
                                router.push(`/vendor/applications`)
                              }
                            >
                              View Details
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))}
                  </TableBody>
                </Table>
              </TableContainer>
            </Stack>
          </CardContent>
        </Card>
      )}

      {/* Recent Applications */}
      <Card>
        <CardContent>
          <Stack spacing={3}>
            <Stack
              direction="row"
              justifyContent="space-between"
              alignItems="center"
            >
              <Typography variant="h6" fontWeight={600}>
                All Applications
              </Typography>
              {applications.length > 0 && (
                <Button
                  size="small"
                  endIcon={<ArrowForwardIcon />}
                  onClick={() => router.push("/vendor/applications")}
                >
                  View All
                </Button>
              )}
            </Stack>

            {applicationsQuery.isLoading ? (
              <Stack spacing={2}>
                {[1, 2, 3].map((i) => (
                  <Skeleton key={i} height={60} />
                ))}
              </Stack>
            ) : applications.length === 0 ? (
              <Alert severity="info">
                You haven&apos;t submitted any applications yet. Browse
                available bazaars to get started!
              </Alert>
            ) : (
              <TableContainer>
                <Table>
                  <TableHead>
                    <TableRow>
                      <TableCell>Bazaar Event</TableCell>
                      <TableCell>Application Date</TableCell>
                      <TableCell>Attendees</TableCell>
                      <TableCell>Booth Size</TableCell>
                      <TableCell>Status</TableCell>
                      <TableCell align="right">Actions</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {applications.slice(0, 5).map((app: VendorApplication) => (
                      <TableRow
                        key={app.id}
                        sx={{
                          bgcolor:
                            app.status === "pending"
                              ? "warning.lighter"
                              : "inherit",
                        }}
                      >
                        <TableCell>
                          <Stack spacing={0.5}>
                            <Typography variant="body2" fontWeight={500}>
                              {app.eventName}
                            </Typography>
                            {app.eventLocation && (
                              <Typography
                                variant="caption"
                                color="text.secondary"
                              >
                                {app.eventLocation}
                              </Typography>
                            )}
                          </Stack>
                        </TableCell>
                        <TableCell>
                          <Typography variant="body2">
                            {formatDateTime(app.applicationDate)}
                          </Typography>
                        </TableCell>
                        <TableCell>
                          <Typography variant="body2">
                            {app.attendees}
                          </Typography>
                        </TableCell>
                        <TableCell>
                          <Typography variant="body2">
                            {app.boothSize} sq m
                          </Typography>
                        </TableCell>
                        <TableCell>
                          <Chip
                            label={app.status.toUpperCase()}
                            size="small"
                            color={getStatusColor(app.status)}
                          />
                        </TableCell>
                        <TableCell align="right">
                          <Button
                            size="small"
                            onClick={() => router.push(`/vendor/applications`)}
                          >
                            View Details
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </TableContainer>
            )}
          </Stack>
        </CardContent>
      </Card>
    </Stack>
  );
}

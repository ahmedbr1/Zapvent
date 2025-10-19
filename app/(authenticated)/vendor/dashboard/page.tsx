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

interface VendorStats {
  totalApplications: number;
  pendingApplications: number;
  approvedApplications: number;
  rejectedApplications: number;
}

interface VendorApplication {
  id: string;
  eventName: string;
  applicationDate: string;
  boothSize: string;
  status: "pending" | "approved" | "rejected";
}

export default function VendorDashboardPage() {
  const token = useAuthToken();
  const user = useSessionUser();
  const router = useRouter();
  const companyName = user?.name ?? "Vendor";

  // TODO: Replace with actual API calls when backend is ready
  const statsQuery = useQuery({
    queryKey: ["vendor-stats", user?.id, token],
    queryFn: async (): Promise<VendorStats> => {
      // Placeholder data - replace with actual API call
      return {
        totalApplications: 0,
        pendingApplications: 0,
        approvedApplications: 0,
        rejectedApplications: 0,
      };
    },
    enabled: Boolean(token && user?.id),
  });

  const applicationsQuery = useQuery({
    queryKey: ["vendor-applications", user?.id, token],
    queryFn: async (): Promise<VendorApplication[]> => {
      // Placeholder - replace with actual API call
      return [];
    },
    enabled: Boolean(token && user?.id),
  });

  const stats = statsQuery.data;
  const applications = applicationsQuery.data ?? [];

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
            {statsQuery.isLoading ? <Skeleton width={60} /> : value}
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
                Recent Applications
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
                      <TableCell>Booth Size</TableCell>
                      <TableCell>Status</TableCell>
                      <TableCell align="right">Actions</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {applications.slice(0, 5).map((app: VendorApplication) => (
                      <TableRow key={app.id}>
                        <TableCell>{app.eventName}</TableCell>
                        <TableCell>{app.applicationDate}</TableCell>
                        <TableCell>{app.boothSize}</TableCell>
                        <TableCell>
                          <Chip
                            label={app.status}
                            size="small"
                            color={
                              app.status === "approved"
                                ? "success"
                                : app.status === "pending"
                                  ? "warning"
                                  : "error"
                            }
                          />
                        </TableCell>
                        <TableCell align="right">
                          <Button
                            size="small"
                            onClick={() => router.push(`/vendor/applications`)}
                          >
                            View
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

"use client";

import { useQuery } from "@tanstack/react-query";
import Stack from "@mui/material/Stack";
import Typography from "@mui/material/Typography";
import Card from "@mui/material/Card";
import CardContent from "@mui/material/CardContent";
import Table from "@mui/material/Table";
import TableBody from "@mui/material/TableBody";
import TableCell from "@mui/material/TableCell";
import TableContainer from "@mui/material/TableContainer";
import TableHead from "@mui/material/TableHead";
import TableRow from "@mui/material/TableRow";
import Chip from "@mui/material/Chip";
import Skeleton from "@mui/material/Skeleton";
import Alert from "@mui/material/Alert";
import ChecklistIcon from "@mui/icons-material/ChecklistRounded";
import { useAuthToken } from "@/hooks/useAuthToken";
import { useSessionUser } from "@/hooks/useSessionUser";
import { formatDateTime } from "@/lib/date";
import { apiFetch } from "@/lib/api-client";

interface VendorApplication {
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

export default function VendorApplicationsPage() {
  const token = useAuthToken();
  const user = useSessionUser();

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

  return (
    <Stack spacing={4}>
      {/* Header */}
      <Stack spacing={1}>
        <Stack direction="row" alignItems="center" spacing={2}>
          <ChecklistIcon sx={{ fontSize: 40 }} color="primary" />
          <div>
            <Typography variant="h4" fontWeight={700}>
              My Applications
            </Typography>
            <Typography variant="body1" color="text.secondary">
              Track and manage your bazaar applications
            </Typography>
          </div>
        </Stack>
      </Stack>

      {/* Applications Table */}
      <Card>
        <CardContent>
          {applicationsQuery.isLoading ? (
            <Stack spacing={2}>
              {[1, 2, 3, 4].map((i) => (
                <Skeleton key={i} height={60} />
              ))}
            </Stack>
          ) : applicationsQuery.isError ? (
            <Alert severity="error">
              Failed to load applications. Please try again later.
            </Alert>
          ) : applicationsQuery.data?.length === 0 ? (
            <Alert severity="info">
              You haven&apos;t submitted any applications yet. Browse available
              bazaars to get started!
            </Alert>
          ) : (
            <TableContainer>
              <Table>
                <TableHead>
                  <TableRow>
                    <TableCell>
                      <Typography variant="subtitle2" fontWeight={600}>
                        Bazaar Event
                      </Typography>
                    </TableCell>
                    <TableCell>
                      <Typography variant="subtitle2" fontWeight={600}>
                        Application Date
                      </Typography>
                    </TableCell>
                    <TableCell>
                      <Typography variant="subtitle2" fontWeight={600}>
                        Attendees
                      </Typography>
                    </TableCell>
                    <TableCell>
                      <Typography variant="subtitle2" fontWeight={600}>
                        Booth Size
                      </Typography>
                    </TableCell>
                    <TableCell>
                      <Typography variant="subtitle2" fontWeight={600}>
                        Location
                      </Typography>
                    </TableCell>
                    <TableCell>
                      <Typography variant="subtitle2" fontWeight={600}>
                        Status
                      </Typography>
                    </TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {applicationsQuery.data?.map((application) => (
                    <TableRow
                      key={`application-${application.eventId}-${application.applicationDate}`}
                      hover
                    >
                      <TableCell>
                        <Typography variant="body2" fontWeight={500}>
                          {application.eventName}
                        </Typography>
                      </TableCell>
                      <TableCell>
                        <Typography variant="body2">
                          {formatDateTime(application.applicationDate)}
                        </Typography>
                      </TableCell>
                      <TableCell>
                        <Typography variant="body2">
                          {application.attendees}
                        </Typography>
                      </TableCell>
                      <TableCell>
                        <Typography variant="body2">
                          {application.boothSize} sq m
                        </Typography>
                      </TableCell>
                      <TableCell>
                        <Typography variant="body2" color="text.secondary">
                          {application.boothLocation || "TBD"}
                        </Typography>
                      </TableCell>
                      <TableCell>
                        <Chip
                          label={application.status.toUpperCase()}
                          size="small"
                          color={getStatusColor(application.status)}
                        />
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
          )}
        </CardContent>
      </Card>
    </Stack>
  );
}

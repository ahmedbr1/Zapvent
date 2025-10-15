"use client";

import { useMemo, type ReactNode } from "react";
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
import ArrowForwardIcon from "@mui/icons-material/ArrowForwardRounded";
import EventNoteIcon from "@mui/icons-material/EventNoteRounded";
import GroupIcon from "@mui/icons-material/GroupRounded";
import CelebrationIcon from "@mui/icons-material/CelebrationRounded";
import dayjs from "dayjs";
import { useRouter } from "next/navigation";
import { useAuthToken } from "@/hooks/useAuthToken";
import { useSessionUser } from "@/hooks/useSessionUser";
import { fetchUpcomingEvents } from "@/lib/services/events";
import { fetchUserRegisteredEvents } from "@/lib/services/users";
import { formatDateTime } from "@/lib/date";

export default function UserDashboardPage() {
  const token = useAuthToken();
  const user = useSessionUser();
  const router = useRouter();

  const eventsQuery = useQuery({
    queryKey: ["events", user?.id, token],
    queryFn: () => fetchUpcomingEvents(token ?? undefined, user?.id),
    enabled: Boolean(token),
  });

  const registrationsQuery = useQuery({
    queryKey: ["registered-events", user?.id, token],
    queryFn: () => fetchUserRegisteredEvents(user!.id, token ?? undefined),
    enabled: Boolean(user?.id && token),
  });

  const stats = useMemo(() => {
    const upcomingEvents = eventsQuery.data ?? [];
    const registrations = registrationsQuery.data ?? [];
    const nextRegistration = registrations
      .filter((registration) => dayjs(registration.startDate).isAfter(dayjs()))
      .sort((a, b) => dayjs(a.startDate).diff(dayjs(b.startDate)))[0];

    return {
      upcomingCount: upcomingEvents.length,
      registeredCount: registrations.length,
      nextRegistration,
    };
  }, [eventsQuery.data, registrationsQuery.data]);

  const recentRegistrations = useMemo(() => {
    return (registrationsQuery.data ?? [])
      .slice()
      .sort((a, b) => dayjs(b.startDate).diff(dayjs(a.startDate)))
      .slice(0, 5);
  }, [registrationsQuery.data]);

  return (
    <Stack spacing={4}>
      <Stack spacing={1}>
        <Typography variant="h4" fontWeight={700}>
          Welcome back{user?.name ? `, ${user.name.split(" ")[0]}` : ""}!
        </Typography>
        <Typography variant="body1" color="text.secondary">
          Track your registrations, discover new events, and stay on top of campus life.
        </Typography>
      </Stack>

      <Grid container spacing={3}>
        <Grid size={{ xs: 12, md: 4 }}>
          <MetricCard
            title="Upcoming events"
            value={stats.upcomingCount.toString()}
            icon={<CelebrationIcon fontSize="large" color="primary" />}
            actionLabel="Explore"
            onAction={() => router.push("/user/events")}
            loading={eventsQuery.isLoading}
          />
        </Grid>
        <Grid size={{ xs: 12, md: 4 }}>
          <MetricCard
            title="My registrations"
            value={stats.registeredCount.toString()}
            icon={<GroupIcon fontSize="large" color="secondary" />}
            actionLabel="Manage"
            onAction={() => router.push("/user/registrations")}
            loading={registrationsQuery.isLoading}
          />
        </Grid>
        <Grid size={{ xs: 12, md: 4 }}>
          <MetricCard
            title="Next on your calendar"
            value={
              stats.nextRegistration
                ? formatDateTime(stats.nextRegistration.startDate, "MMM D, h:mm A")
                : "No upcoming events"
            }
            icon={<EventNoteIcon fontSize="large" color="action" />}
            actionLabel="View details"
            onAction={() =>
              stats.nextRegistration
                ? router.push(`/user/events/${stats.nextRegistration.id}`)
                : router.push("/user/events")
            }
            loading={registrationsQuery.isLoading}
          />
        </Grid>
      </Grid>

      <Stack spacing={2}>
        <Stack direction="row" justifyContent="space-between" alignItems="center">
          <Typography variant="h6" fontWeight={700}>
            Recent registrations
          </Typography>
          <Button
            variant="text"
            endIcon={<ArrowForwardIcon />}
            onClick={() => router.push("/user/registrations")}
          >
            View all
          </Button>
        </Stack>
        {registrationsQuery.isLoading ? (
          <Skeleton variant="rectangular" height={240} sx={{ borderRadius: 3 }} />
        ) : registrationsQuery.isError ? (
          <Alert severity="error">
            Unable to load registrations. Please try again later.
          </Alert>
        ) : recentRegistrations.length === 0 ? (
          <Alert severity="info">
            You haven&apos;t registered for any events yet. Browse the catalogue to get started.
          </Alert>
        ) : (
          <TableContainer component={Card} sx={{ borderRadius: 3 }}>
            <Table>
              <TableHead>
                <TableRow>
                  <TableCell>Event</TableCell>
                  <TableCell>Location</TableCell>
                  <TableCell>Start</TableCell>
                  <TableCell>Registration deadline</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {recentRegistrations.map((registration) => (
                  <TableRow key={registration.id} hover>
                    <TableCell>
                      <Stack spacing={0.5}>
                        <Typography fontWeight={600}>{registration.name}</Typography>
                        <Typography variant="caption" color="text.secondary">
                          ID: {registration.id}
                        </Typography>
                      </Stack>
                    </TableCell>
                    <TableCell>
                      <Chip label={registration.location} size="small" />
                    </TableCell>
                    <TableCell>{formatDateTime(registration.startDate)}</TableCell>
                    <TableCell>{formatDateTime(registration.registrationDeadline)}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        )}
      </Stack>
    </Stack>
  );
}

interface MetricCardProps {
  title: string;
  value: string;
  icon: ReactNode;
  actionLabel: string;
  onAction: () => void;
  loading?: boolean;
}

function MetricCard({ title, value, icon, actionLabel, onAction, loading }: MetricCardProps) {
  return (
    <Card sx={{ borderRadius: 3, boxShadow: "0 14px 40px rgba(15,23,42,0.08)" }}>
      <CardContent>
        <Stack spacing={2}>
          <Stack direction="row" spacing={2} alignItems="center">
            <Stack
              sx={{
                width: 52,
                height: 52,
                borderRadius: 2,
                backgroundColor: "rgba(30,58,138,0.08)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              {icon}
            </Stack>
            <Stack spacing={0.5}>
              <Typography variant="subtitle2" color="text.secondary">
                {title}
              </Typography>
              {loading ? (
                <Skeleton variant="text" width={120} height={32} />
              ) : (
                <Typography variant="h5" fontWeight={700}>
                  {value}
                </Typography>
              )}
            </Stack>
          </Stack>
          <Button onClick={onAction} endIcon={<ArrowForwardIcon />} sx={{ alignSelf: "flex-start" }}>
            {actionLabel}
          </Button>
        </Stack>
      </CardContent>
    </Card>
  );
}

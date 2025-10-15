"use client";

import { useMemo } from "react";
import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import Stack from "@mui/material/Stack";
import Typography from "@mui/material/Typography";
import Alert from "@mui/material/Alert";
import Button from "@mui/material/Button";
import Skeleton from "@mui/material/Skeleton";
import Chip from "@mui/material/Chip";
import Card from "@mui/material/Card";
import CardContent from "@mui/material/CardContent";
import CardActions from "@mui/material/CardActions";
import Divider from "@mui/material/Divider";
import EventIcon from "@mui/icons-material/EventAvailableRounded";
import { useAuthToken } from "@/hooks/useAuthToken";
import { useSessionUser } from "@/hooks/useSessionUser";
import { fetchUserRegisteredEvents } from "@/lib/services/users";
import { formatDateTime } from "@/lib/date";

export default function UserRegistrationsPage() {
  const token = useAuthToken();
  const user = useSessionUser();

  const query = useQuery({
    queryKey: ["registered-events", user?.id, token],
    queryFn: () => fetchUserRegisteredEvents(user!.id, token ?? undefined),
    enabled: Boolean(user?.id && token),
  });

  const registrations = useMemo(() => query.data ?? [], [query.data]);

  return (
    <Stack spacing={3}>
      <Stack spacing={1}>
        <Typography variant="h4" fontWeight={700}>
          My registered events
        </Typography>
        <Typography variant="body1" color="text.secondary">
          Browse your confirmed spots and jump straight into the event details.
        </Typography>
      </Stack>

      {query.isLoading ? (
        <Skeleton variant="rectangular" height={360} sx={{ borderRadius: 3 }} />
      ) : query.isError ? (
        <Alert severity="error" action={<Button onClick={() => query.refetch()}>Retry</Button>}>
          Unable to load your registrations right now.
        </Alert>
      ) : registrations.length === 0 ? (
        <Alert severity="info">
          You haven&apos;t registered for events yet. Explore the catalogue to get started.
        </Alert>
      ) : (
        <Stack spacing={1.5}>
          {registrations.map((item) => (
            <Card
              key={item.id}
              sx={{
                borderRadius: 3,
                boxShadow: "0 14px 40px rgba(15,23,42,0.08)",
                overflow: "hidden",
              }}
            >
              <CardContent sx={{ p: { xs: 2.5, md: 3 } }}>
                <Stack
                  direction={{ xs: "column", md: "row" }}
                  spacing={1.5}
                  justifyContent="space-between"
                  alignItems={{ md: "center" }}
                >
                  <Stack spacing={0.5}>
                    <Typography variant="h6" fontWeight={700}>
                      {item.name}
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      Registration closes {formatDateTime(item.registrationDeadline)}
                    </Typography>
                  </Stack>
                  <Chip label={item.location} size="small" />
                </Stack>
                <Divider sx={{ my: 2 }} />
                <GridDetails
                  data={[
                    { label: "Event starts", value: formatDateTime(item.startDate) },
                    { label: "Event ends", value: formatDateTime(item.endDate) },
                    { label: "Event ID", value: item.id },
                  ]}
                />
              </CardContent>
              <CardActions sx={{ px: { xs: 2.5, md: 3 }, pb: 3, pt: 0 }}>
                <Button
                  component={Link}
                  href={`/user/events/${item.id}`}
                  variant="contained"
                  startIcon={<EventIcon />}
                  sx={{ borderRadius: 2 }}
                >
                  View event details
                </Button>
              </CardActions>
            </Card>
          ))}
        </Stack>
      )}
    </Stack>
  );
}

interface GridDetailsProps {
  data: Array<{ label: string; value: string }>;
}

function GridDetails({ data }: GridDetailsProps) {
  return (
    <Stack
      direction={{ xs: "column", md: "row" }}
      spacing={2}
      divider={<Divider orientation="vertical" flexItem sx={{ display: { xs: "none", md: "block" } }} />}
    >
      {data.map((item) => (
        <Stack key={item.label} spacing={0.5} flex={1} minWidth={0}>
          <Typography variant="caption" color="text.secondary" textTransform="uppercase">
            {item.label}
          </Typography>
          <Typography variant="body2" fontWeight={600}>
            {item.value}
          </Typography>
        </Stack>
      ))}
    </Stack>
  );
}

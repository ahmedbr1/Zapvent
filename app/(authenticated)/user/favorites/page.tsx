"use client";

import { useMemo } from "react";
import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import Grid from "@mui/material/Grid";
import Stack from "@mui/material/Stack";
import Typography from "@mui/material/Typography";
import Alert from "@mui/material/Alert";
import Button from "@mui/material/Button";
import Skeleton from "@mui/material/Skeleton";
import Card from "@mui/material/Card";
import CardContent from "@mui/material/CardContent";
import CardActions from "@mui/material/CardActions";
import Chip from "@mui/material/Chip";
import Divider from "@mui/material/Divider";
import FavoriteIcon from "@mui/icons-material/FavoriteRounded";
import EventIcon from "@mui/icons-material/EventAvailableRounded";
import { useAuthToken } from "@/hooks/useAuthToken";
import { useSessionUser } from "@/hooks/useSessionUser";
import { fetchFavoriteEvents } from "@/lib/services/users";
import { formatDateTime } from "@/lib/date";

export default function UserFavoritesPage() {
  const token = useAuthToken();
  const user = useSessionUser();

  const query = useQuery({
    queryKey: ["favorite-events", user?.id, token],
    queryFn: () => fetchFavoriteEvents(token ?? undefined),
    enabled: Boolean(token),
  });

  const favorites = useMemo(() => query.data ?? [], [query.data]);

  return (
    <Stack spacing={3}>
      <Stack spacing={1}>
        <Typography variant="h4" fontWeight={700}>
          Saved favorites
        </Typography>
        <Typography variant="body1" color="text.secondary">
          Keep tabs on the events you care about. We&apos;ll surface them here for quick access.
        </Typography>
      </Stack>

      {query.isLoading ? (
        <Grid container spacing={3}>
          {Array.from({ length: 3 }).map((_, index) => (
            <Grid key={index} size={{ xs: 12, md: 6 }}>
              <Skeleton variant="rectangular" height={220} sx={{ borderRadius: 3 }} />
            </Grid>
          ))}
        </Grid>
      ) : query.isError ? (
        <Alert severity="error" action={<Button onClick={() => query.refetch()}>Retry</Button>}>
          We couldn&apos;t load your favorites just now.
        </Alert>
      ) : favorites.length === 0 ? (
        <Alert
          severity="info"
          action={
            <Button component={Link} href="/user/events" color="inherit" size="small">
              Browse events
            </Button>
          }
        >
          You haven&apos;t added any favorites yet. Visit the events browser to start bookmarking.
        </Alert>
      ) : (
        <Grid container spacing={3}>
          {favorites.map((event) => (
            <Grid key={event.id} size={{ xs: 12, md: 6 }}>
              <Card
                sx={{
                  borderRadius: 3,
                  height: "100%",
                  display: "flex",
                  flexDirection: "column",
                }}
              >
                <CardContent sx={{ flexGrow: 1 }}>
                  <Stack direction="row" spacing={1} alignItems="center" mb={1}>
                    <Chip
                      icon={<FavoriteIcon fontSize="small" />}
                      label="Saved"
                      color="secondary"
                      size="small"
                    />
                    <Chip label={event.eventType} size="small" variant="outlined" />
                  </Stack>
                  <Typography variant="h6" fontWeight={700}>
                    {event.name}
                  </Typography>
                  <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                    {event.description}
                  </Typography>
                  <Stack spacing={1} divider={<Divider flexItem />}>
                    <Detail label="Starts" value={formatDateTime(event.startDate)} />
                    <Detail label="Ends" value={formatDateTime(event.endDate)} />
                    <Detail label="Location" value={event.location} />
                    {typeof event.price === "number" ? (
                      <Detail label="Ticket price" value={`${event.price.toLocaleString()} EGP`} />
                    ) : null}
                  </Stack>
                </CardContent>
                <CardActions sx={{ px: 3, pb: 3 }}>
                  <Button
                    component={Link}
                    href={`/user/events/${event.id}`}
                    variant="contained"
                    startIcon={<EventIcon />}
                    sx={{ borderRadius: 2 }}
                  >
                    View event
                  </Button>
                  <Button component={Link} href="/user/events" sx={{ ml: "auto" }}>
                    Find more
                  </Button>
                </CardActions>
              </Card>
            </Grid>
          ))}
        </Grid>
      )}
    </Stack>
  );
}

function Detail({ label, value }: { label: string; value: string }) {
  return (
    <Stack spacing={0.5} direction="row" justifyContent="space-between">
      <Typography variant="caption" color="text.secondary" textTransform="uppercase">
        {label}
      </Typography>
      <Typography variant="body2" fontWeight={600}>
        {value}
      </Typography>
    </Stack>
  );
}

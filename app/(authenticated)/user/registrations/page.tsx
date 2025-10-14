"use client";

import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import Stack from "@mui/material/Stack";
import Typography from "@mui/material/Typography";
import Alert from "@mui/material/Alert";
import Button from "@mui/material/Button";
import Table from "@mui/material/Table";
import TableBody from "@mui/material/TableBody";
import TableCell from "@mui/material/TableCell";
import TableContainer from "@mui/material/TableContainer";
import TableHead from "@mui/material/TableHead";
import TableRow from "@mui/material/TableRow";
import Paper from "@mui/material/Paper";
import Skeleton from "@mui/material/Skeleton";
import TablePagination from "@mui/material/TablePagination";
import Chip from "@mui/material/Chip";
import CancelIcon from "@mui/icons-material/CancelRounded";
import { useSnackbar } from "notistack";
import { useAuthToken } from "@/hooks/useAuthToken";
import { useSessionUser } from "@/hooks/useSessionUser";
import { fetchUserRegisteredEvents } from "@/lib/services/users";
import type { UserRegisteredEvent } from "@/lib/types";
import { formatDateTime } from "@/lib/date";

export default function UserRegistrationsPage() {
  const token = useAuthToken();
  const user = useSessionUser();
  const { enqueueSnackbar } = useSnackbar();
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(5);

  const query = useQuery({
    queryKey: ["registered-events", user?.id, token],
    queryFn: () => fetchUserRegisteredEvents(user!.id, token ?? undefined),
    enabled: Boolean(user?.id && token),
  });

  const registrations = useMemo(() => query.data ?? [], [query.data]);

  const paginated = useMemo(() => {
    const start = page * rowsPerPage;
    return registrations.slice(start, start + rowsPerPage);
  }, [registrations, page, rowsPerPage]);

  const handleCancel = (item: UserRegisteredEvent) => {
    enqueueSnackbar(`Cancellation request for ${item.name} queued.`, {
      variant: "info",
    });
  };

  return (
    <Stack spacing={3}>
      <Stack spacing={1}>
        <Typography variant="h4" fontWeight={700}>
          My registered events
        </Typography>
        <Typography variant="body1" color="text.secondary">
          Review your upcoming attendance and request cancellations when needed.
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
        <Paper sx={{ borderRadius: 3 }}>
          <TableContainer>
            <Table>
              <TableHead>
                <TableRow>
                  <TableCell>Event</TableCell>
                  <TableCell>Location</TableCell>
                  <TableCell>Starts</TableCell>
                  <TableCell>Deadline</TableCell>
                  <TableCell align="right">Actions</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {paginated.map((item) => (
                  <TableRow key={item.id} hover>
                    <TableCell>{item.name}</TableCell>
                    <TableCell>
                      <Chip label={item.location} size="small" />
                    </TableCell>
                    <TableCell>{formatDateTime(item.startDate)}</TableCell>
                    <TableCell>{formatDateTime(item.registrationDeadline)}</TableCell>
                    <TableCell align="right">
                      <Button
                        variant="text"
                        color="error"
                        startIcon={<CancelIcon />}
                        onClick={() => handleCancel(item)}
                      >
                        Cancel registration
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
          <TablePagination
            component="div"
            count={registrations.length}
            page={page}
            onPageChange={(_, newPage) => setPage(newPage)}
            rowsPerPage={rowsPerPage}
            onRowsPerPageChange={(event) => {
              setRowsPerPage(parseInt(event.target.value, 10));
              setPage(0);
            }}
          />
        </Paper>
      )}
    </Stack>
  );
}

"use client";

import { useMemo } from "react";
import type { ReactNode } from "react";
import { useQuery } from "@tanstack/react-query";
import Stack from "@mui/material/Stack";
import Grid from "@mui/material/Grid";
import Card from "@mui/material/Card";
import CardContent from "@mui/material/CardContent";
import Typography from "@mui/material/Typography";
import Alert from "@mui/material/Alert";
import Skeleton from "@mui/material/Skeleton";
import Table from "@mui/material/Table";
import TableBody from "@mui/material/TableBody";
import TableCell from "@mui/material/TableCell";
import TableContainer from "@mui/material/TableContainer";
import TableHead from "@mui/material/TableHead";
import TableRow from "@mui/material/TableRow";
import Paper from "@mui/material/Paper";
import Chip from "@mui/material/Chip";
import Button from "@mui/material/Button";
import AccountBalanceIcon from "@mui/icons-material/AccountBalanceWalletRounded";
import RestoreIcon from "@mui/icons-material/RestoreRounded";
import ReceiptIcon from "@mui/icons-material/ReceiptLongRounded";
import { useAuthToken } from "@/hooks/useAuthToken";
import { fetchWalletSummary } from "@/lib/services/users";
import { formatDateTime } from "@/lib/date";

const currencyFormatter = new Intl.NumberFormat(undefined, {
  style: "currency",
  currency: "EGP",
  minimumFractionDigits: 2,
});

export default function UserWalletPage() {
  const token = useAuthToken();

  const walletQuery = useQuery({
    queryKey: ["wallet-summary", token],
    queryFn: () => fetchWalletSummary(token ?? undefined),
    enabled: Boolean(token),
  });

  const summary = walletQuery.data ?? { balance: 0, totalRefunded: 0, refunds: [] };
  const refunds = useMemo(() => summary.refunds ?? [], [summary.refunds]);

  return (
    <Stack spacing={3}>
      <Stack spacing={1}>
        <Typography variant="h4" fontWeight={700}>
          Wallet overview
        </Typography>
        <Typography variant="body1" color="text.secondary">
          Track your current balance and see the most recent refunds related to trip and workshop registrations.
        </Typography>
      </Stack>

      {walletQuery.isLoading ? (
        <Grid container spacing={3}>
          {[0, 1].map((item) => (
            <Grid key={item} size={{ xs: 12, md: 6 }}>
              <Skeleton variant="rectangular" height={140} sx={{ borderRadius: 3 }} />
            </Grid>
          ))}
        </Grid>
      ) : walletQuery.isError ? (
        <Alert
          severity="error"
          action={<Button onClick={() => walletQuery.refetch()}>Retry</Button>}
        >
          Unable to load your wallet summary at the moment.
        </Alert>
      ) : (
        <Grid container spacing={3}>
          <Grid size={{ xs: 12, md: 6 }}>
            <SummaryCard
              icon={<AccountBalanceIcon color="primary" />}
              label="Current balance"
              value={currencyFormatter.format(summary.balance)}
            />
          </Grid>
          <Grid size={{ xs: 12, md: 6 }}>
            <SummaryCard
              icon={<RestoreIcon color="secondary" />}
              label="Total refunded"
              value={currencyFormatter.format(summary.totalRefunded)}
            />
          </Grid>
        </Grid>
      )}

      {walletQuery.isLoading ? (
        <Skeleton variant="rectangular" height={320} sx={{ borderRadius: 3 }} />
      ) : refunds.length === 0 ? (
        <Alert severity="info">No refunds have been processed on your wallet yet.</Alert>
      ) : (
        <TableContainer component={Paper} sx={{ borderRadius: 3 }}>
          <Table>
            <TableHead>
              <TableRow>
                <TableCell>Event</TableCell>
                <TableCell>Amount</TableCell>
                <TableCell>Date</TableCell>
                <TableCell>Reference</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {refunds.map((refund, index) => {
                const key =
                  refund.refundReference ||
                  refund.receiptNumber ||
                  `${refund.eventId}-${refund.refundedAt ?? index}`;
                return (
                  <TableRow key={key}>
                    <TableCell>
                      <Stack spacing={0.5}>
                        <Typography fontWeight={600}>{refund.eventName ?? "Event"}</Typography>
                        <Typography variant="caption" color="text.secondary">
                          {refund.eventId}
                      </Typography>
                    </Stack>
                  </TableCell>
                  <TableCell>{currencyFormatter.format(refund.amount)}</TableCell>
                  <TableCell>
                    {refund.refundedAt ? formatDateTime(refund.refundedAt) : "—"}
                  </TableCell>
                  <TableCell>
                    <Stack spacing={0.5}>
                      {refund.receiptNumber ? (
                        <Chip
                          size="small"
                          icon={<ReceiptIcon fontSize="small" />}
                          label={`Receipt ${refund.receiptNumber}`}
                        />
                      ) : null}
                      {refund.refundReference ? (
                        <Typography variant="caption" color="text.secondary">
                          Ref: {refund.refundReference}
                        </Typography>
                      ) : null}
                    </Stack>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </TableContainer>
      )}
    </Stack>
  );
}

interface SummaryCardProps {
  icon: ReactNode;
  label: string;
  value: string;
}

function SummaryCard({ icon, label, value }: SummaryCardProps) {
  return (
    <Card sx={{ borderRadius: 3, height: "100%" }}>
      <CardContent>
        <Stack spacing={1.5} direction="row" alignItems="center">
          <Stack
            sx={{
              width: 48,
              height: 48,
              borderRadius: 2,
              backgroundColor: "rgba(15,23,42,0.08)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            {icon}
          </Stack>
          <Stack spacing={0.5}>
            <Typography variant="body2" color="text.secondary">
              {label}
            </Typography>
            <Typography variant="h5" fontWeight={700}>
              {value}
            </Typography>
          </Stack>
        </Stack>
      </CardContent>
    </Card>
  );
}

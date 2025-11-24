"use client";

import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import Stack from "@mui/material/Stack";
import Grid from "@mui/material/Grid";
import Card from "@mui/material/Card";
import CardContent from "@mui/material/CardContent";
import Typography from "@mui/material/Typography";
import Alert from "@mui/material/Alert";
import Skeleton from "@mui/material/Skeleton";
import Chip from "@mui/material/Chip";
import Button from "@mui/material/Button";
import FavoriteIcon from "@mui/icons-material/FavoriteRounded";
import DiscountIcon from "@mui/icons-material/PercentRounded";
import RefreshIcon from "@mui/icons-material/RefreshRounded";
import { useAuthToken } from "@/hooks/useAuthToken";
import { useSessionUser } from "@/hooks/useSessionUser";
import { fetchLoyaltyVendors } from "@/lib/services/vendor";

export default function EventsOfficeLoyaltyPage() {
  const token = useAuthToken();
  const user = useSessionUser();

  const query = useQuery({
    queryKey: ["loyalty-vendors", "events-office", token],
    queryFn: () => fetchLoyaltyVendors(token ?? undefined),
    enabled: Boolean(token),
  });

  const partners = useMemo(() => query.data ?? [], [query.data]);

  return (
    <Stack spacing={3}>
      <Stack spacing={1}>
        <Typography variant="h4" fontWeight={700}>
          Loyalty program partners
        </Typography>
        <Typography variant="body1" color="text.secondary">
          Review every vendor participating in the GUC loyalty program with the exact promo code,
          discount, and terms students see on their portal.
        </Typography>
        <Typography variant="body2" color="text.secondary">
          Signed in as{" "}
          <strong>{user?.name ?? user?.email ?? "Events Office"}</strong>.
          Contact vendors directly if details need to be updated.
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
        <Alert
          severity="error"
          action={
            <Button
              size="small"
              startIcon={<RefreshIcon />}
              onClick={() => query.refetch()}
            >
              Retry
            </Button>
          }
        >
          We couldn&apos;t load the loyalty partner list right now.
        </Alert>
      ) : partners.length === 0 ? (
        <Alert severity="info">
          No vendors are enrolled in the loyalty program yet. Invite approved vendors to boost the catalog.
        </Alert>
      ) : (
        <Grid container spacing={3}>
          {partners.map((partner) => (
            <Grid key={partner.id} size={{ xs: 12, md: 6 }}>
              <Card
                sx={{
                  borderRadius: 3,
                  height: "100%",
                  display: "flex",
                  flexDirection: "column",
                  boxShadow: "0 18px 36px rgba(15,23,42,0.08)",
                }}
              >
                <CardContent sx={{ flexGrow: 1 }}>
                  <Stack spacing={1.5}>
                    <Stack direction="row" spacing={1} alignItems="center" flexWrap="wrap">
                      <Chip icon={<FavoriteIcon />} label="Verified partner" color="secondary" />
                      <Chip
                        icon={<DiscountIcon />}
                        label={`${partner.loyaltyProgram.discountRate.toFixed(1)}% off`}
                        color="primary"
                        variant="outlined"
                      />
                      <Chip
                        label={partner.loyaltyProgram.status}
                        size="small"
                        variant="outlined"
                        color={
                          partner.loyaltyProgram.status === "active"
                            ? "success"
                            : partner.loyaltyProgram.status === "pending"
                              ? "warning"
                              : "default"
                        }
                      />
                    </Stack>
                    <Typography variant="h6" fontWeight={700}>
                      {partner.companyName}
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      {partner.loyaltyProgram.termsAndConditions}
                    </Typography>
                    <Stack spacing={0.5}>
                      <Typography variant="subtitle2" color="text.secondary">
                        Promo code
                      </Typography>
                      <Typography variant="body1" fontWeight={600}>
                        {partner.loyaltyProgram.promoCode}
                      </Typography>
                    </Stack>
                    <Stack spacing={0.5}>
                      <Typography variant="subtitle2" color="text.secondary">
                        Contact
                      </Typography>
                      <Typography variant="body2">{partner.email}</Typography>
                    </Stack>
                  </Stack>
                </CardContent>
              </Card>
            </Grid>
          ))}
        </Grid>
      )}
    </Stack>
  );
}

"use client";

import { useEffect, useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import Stack from "@mui/material/Stack";
import Typography from "@mui/material/Typography";
import Card from "@mui/material/Card";
import CardContent from "@mui/material/CardContent";
import Grid from "@mui/material/Grid";
import TextField from "@mui/material/TextField";
import Alert from "@mui/material/Alert";
import Chip from "@mui/material/Chip";
import LoadingButton from "@mui/lab/LoadingButton";
import Skeleton from "@mui/material/Skeleton";
import PercentIcon from "@mui/icons-material/PercentRounded";
import LoyaltyIcon from "@mui/icons-material/CardGiftcardRounded";
import CancelIcon from "@mui/icons-material/CancelOutlined";
import CheckCircleIcon from "@mui/icons-material/CheckCircleRounded";
import { useSnackbar } from "notistack";
import { useAuthToken } from "@/hooks/useAuthToken";
import {
  applyToVendorLoyaltyProgram,
  cancelVendorLoyaltyProgram,
  fetchVendorLoyaltyProgram,
  type VendorLoyaltyProgram,
} from "@/lib/services/vendor";
import { formatDateTime } from "@/lib/date";

interface FormState {
  discountRate: string;
  promoCode: string;
  termsAndConditions: string;
}

interface FormErrors {
  discountRate?: string;
  promoCode?: string;
  termsAndConditions?: string;
}

const INITIAL_FORM: FormState = {
  discountRate: "",
  promoCode: "",
  termsAndConditions: "",
};

function validateForm(state: FormState): FormErrors {
  const errors: FormErrors = {};
  const discount = Number(state.discountRate);
  if (!Number.isFinite(discount) || discount < 1 || discount > 100) {
    errors.discountRate = "Enter a discount between 1% and 100%.";
  }
  if (state.promoCode.trim().length < 3) {
    errors.promoCode = "Promo code must be at least 3 characters.";
  }
  if (state.termsAndConditions.trim().length < 20) {
    errors.termsAndConditions = "Terms must be at least 20 characters.";
  }
  return errors;
}

function StatusChip({ program }: { program: VendorLoyaltyProgram | null }) {
  const status = program?.status ?? "none";
  if (status === "active") {
    return (
      <Chip
        icon={<CheckCircleIcon />}
        label="Active partner"
        color="success"
        variant="outlined"
        size="small"
      />
    );
  }
  if (status === "cancelled") {
    return (
      <Chip
        icon={<CancelIcon />}
        label="Cancelled"
        color="default"
        variant="outlined"
        size="small"
      />
    );
  }
  return (
    <Chip
      icon={<LoyaltyIcon />}
      label="Not enrolled"
      color="default"
      variant="outlined"
      size="small"
    />
  );
}

export default function VendorLoyaltyPage() {
  const token = useAuthToken();
  const queryClient = useQueryClient();
  const { enqueueSnackbar } = useSnackbar();
  const [formState, setFormState] = useState<FormState>({ ...INITIAL_FORM });
  const [formErrors, setFormErrors] = useState<FormErrors>({});

  const loyaltyQuery = useQuery({
    queryKey: ["vendor-loyalty", token],
    queryFn: () => fetchVendorLoyaltyProgram(token ?? undefined),
    enabled: Boolean(token),
  });

  useEffect(() => {
    if (loyaltyQuery.data) {
      setFormState({
        discountRate: loyaltyQuery.data.discountRate
          ? String(loyaltyQuery.data.discountRate)
          : "",
        promoCode: loyaltyQuery.data.promoCode ?? "",
        termsAndConditions: loyaltyQuery.data.termsAndConditions ?? "",
      });
    } else if (loyaltyQuery.isSuccess && !loyaltyQuery.data) {
      setFormState({ ...INITIAL_FORM });
    }
  }, [loyaltyQuery.data, loyaltyQuery.isSuccess]);

  const applyMutation = useMutation({
    mutationFn: (payload: { discountRate: number; promoCode: string; termsAndConditions: string }) =>
      applyToVendorLoyaltyProgram(payload, token ?? undefined),
    onSuccess: (response) => {
      enqueueSnackbar(response.message ?? "Application submitted.", {
        variant: "success",
      });
      setFormErrors({});
      queryClient.invalidateQueries({ queryKey: ["vendor-loyalty", token] });
    },
    onError: (error: unknown) => {
      const message =
        error instanceof Error
          ? error.message
          : "Failed to submit loyalty application.";
      enqueueSnackbar(message, { variant: "error" });
    },
  });

  const cancelMutation = useMutation({
    mutationFn: () => cancelVendorLoyaltyProgram(token ?? undefined),
    onSuccess: (response) => {
      enqueueSnackbar(response.message ?? "Participation cancelled.", {
        variant: "info",
      });
      queryClient.invalidateQueries({ queryKey: ["vendor-loyalty", token] });
    },
    onError: (error: unknown) => {
      const message =
        error instanceof Error
          ? error.message
          : "Failed to cancel loyalty participation.";
      enqueueSnackbar(message, { variant: "error" });
    },
  });

  const handleSubmit = () => {
    const validationErrors = validateForm(formState);
    setFormErrors(validationErrors);
    if (Object.keys(validationErrors).length > 0) {
      enqueueSnackbar("Please fix the highlighted fields before submitting.", {
        variant: "error",
      });
      return;
    }

    applyMutation.mutate({
      discountRate: Number(formState.discountRate),
      promoCode: formState.promoCode.trim(),
      termsAndConditions: formState.termsAndConditions.trim(),
    });
  };

  const activeProgram = loyaltyQuery.data ?? null;
  const statusLabel = activeProgram?.status ?? "none";
  const isActive = statusLabel === "active";
  const isCancelled = statusLabel === "cancelled";

  const helperText = useMemo(() => {
    if (isCancelled) {
      return "You previously opted out. Submit the form again to rejoin.";
    }
    if (isActive) {
      return "Update your offer anytime. Changes go live immediately.";
    }
    return "Share your discount and terms to join the campus-wide loyalty program.";
  }, [isActive, isCancelled]);

  return (
    <Stack spacing={3}>
      <Stack spacing={1}>
        <Typography variant="h4" fontWeight={700}>
          GUC Loyalty Program
        </Typography>
        <Typography variant="body1" color="text.secondary">
          Publish your campus offer so students and staff can redeem it with your promo code.
        </Typography>
      </Stack>

      <Grid container spacing={3}>
        <Grid size={{ xs: 12, md: 5 }}>
          <Card>
            <CardContent>
              <Stack spacing={2}>
                <Stack direction="row" spacing={1} alignItems="center">
                  <LoyaltyIcon color="primary" />
                  <Typography variant="h6" fontWeight={700}>
                    Current status
                  </Typography>
                  <StatusChip program={activeProgram} />
                </Stack>
                {loyaltyQuery.isLoading ? (
                  <Stack spacing={1}>
                    <Skeleton height={20} />
                    <Skeleton height={20} />
                    <Skeleton height={20} />
                  </Stack>
                ) : loyaltyQuery.isError ? (
                  <Alert severity="error">
                    Unable to load loyalty program details right now.
                  </Alert>
                ) : activeProgram ? (
                  <Stack spacing={1}>
                    <Stack direction="row" spacing={1}>
                      <PercentIcon color="action" fontSize="small" />
                      <Typography>
                        {activeProgram.discountRate}% off with code{" "}
                        <Typography component="span" fontWeight={700}>
                          {activeProgram.promoCode}
                        </Typography>
                      </Typography>
                    </Stack>
                    <Typography variant="body2" color="text.secondary">
                      {activeProgram.termsAndConditions}
                    </Typography>
                    <Typography variant="caption" color="text.secondary">
                      Joined {activeProgram.appliedAt ? formatDateTime(activeProgram.appliedAt) : "recently"}
                    </Typography>
                    {activeProgram.cancelledAt && (
                      <Typography variant="caption" color="text.secondary">
                        Cancelled {formatDateTime(activeProgram.cancelledAt)}
                      </Typography>
                    )}
                  </Stack>
                ) : (
                  <Alert severity="info">
                    You haven&apos;t joined the loyalty program yet. Create your offer to get started.
                  </Alert>
                )}
                <LoadingButton
                  variant="outlined"
                  color="error"
                  startIcon={<CancelIcon />}
                  disabled={!isActive}
                  loading={cancelMutation.isPending}
                  onClick={() => cancelMutation.mutate()}
                >
                  Cancel participation
                </LoadingButton>
              </Stack>
            </CardContent>
          </Card>
        </Grid>

        <Grid size={{ xs: 12, md: 7 }}>
          <Card>
            <CardContent>
              <Stack spacing={2.5}>
                <Stack spacing={0.5}>
                  <Typography variant="h6" fontWeight={700}>
                    Submit or update your offer
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    {helperText}
                  </Typography>
                </Stack>

                <TextField
                  label="Discount rate (%)"
                  type="number"
                  value={formState.discountRate}
                  onChange={(event) =>
                    setFormState((prev) => ({
                      ...prev,
                      discountRate: event.target.value,
                    }))
                  }
                  inputProps={{ min: 1, max: 100, step: "1" }}
                  error={Boolean(formErrors.discountRate)}
                  helperText={formErrors.discountRate ?? "Enter a whole number between 1 and 100."}
                  required
                  fullWidth
                />

                <TextField
                  label="Promo code"
                  value={formState.promoCode}
                  onChange={(event) =>
                    setFormState((prev) => ({
                      ...prev,
                      promoCode: event.target.value,
                    }))
                  }
                  error={Boolean(formErrors.promoCode)}
                  helperText={formErrors.promoCode ?? "This will be shared with students and staff."}
                  required
                  fullWidth
                />

                <TextField
                  label="Terms and conditions"
                  value={formState.termsAndConditions}
                  onChange={(event) =>
                    setFormState((prev) => ({
                      ...prev,
                      termsAndConditions: event.target.value,
                    }))
                  }
                  error={Boolean(formErrors.termsAndConditions)}
                  helperText={
                    formErrors.termsAndConditions ??
                    "Include any redemption rules, exclusions, or validity notes."
                  }
                  required
                  fullWidth
                  multiline
                  minRows={4}
                />

                <LoadingButton
                  variant="contained"
                  onClick={handleSubmit}
                  loading={applyMutation.isPending}
                  startIcon={<LoyaltyIcon />}
                >
                  {isActive ? "Update offer" : "Join loyalty program"}
                </LoadingButton>
              </Stack>
            </CardContent>
          </Card>
        </Grid>
      </Grid>
    </Stack>
  );
}

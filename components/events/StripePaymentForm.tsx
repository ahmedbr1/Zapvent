"use client";

import { FormEvent, useMemo, useState } from "react";
import Stack from "@mui/material/Stack";
import Button from "@mui/material/Button";
import CircularProgress from "@mui/material/CircularProgress";
import Typography from "@mui/material/Typography";
import { PaymentElement, useElements, useStripe } from "@stripe/react-stripe-js";

interface StripePaymentFormProps {
  amountLabel: string;
  disabled?: boolean;
  finalizing?: boolean;
  onSuccess: (paymentIntentId: string) => void;
  onError?: (message: string) => void;
}

export function StripePaymentForm({
  amountLabel,
  disabled = false,
  finalizing = false,
  onSuccess,
  onError,
}: StripePaymentFormProps) {
  const stripe = useStripe();
  const elements = useElements();
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!stripe || !elements || disabled || finalizing || submitting) {
      return;
    }

    setSubmitting(true);
    try {
      const result = await stripe.confirmPayment({
        elements,
        confirmParams: {
          return_url: window.location.href,
        },
        redirect: "if_required",
      });

      if (result.error) {
        onError?.(result.error.message ?? "Unable to process card payment.");
        return;
      }

      const paymentIntent = result.paymentIntent;
      if (!paymentIntent?.id) {
        onError?.("Stripe did not return a payment reference.");
        return;
      }

      if (paymentIntent.status === "requires_action" || paymentIntent.status === "requires_payment_method") {
        onError?.("Additional authentication is required to complete this payment.");
        return;
      }

      onSuccess(paymentIntent.id);
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Unable to confirm card payment.";
      onError?.(message);
    } finally {
      setSubmitting(false);
    }
  };

  const buttonDisabled =
    disabled || !stripe || !elements || submitting || finalizing;
  const buttonLabel = finalizing
    ? "Finalizing..."
    : submitting
      ? "Processing..."
      : `Pay ${amountLabel}`;
  const showSpinner = submitting || finalizing;

  const paymentElementOptions = useMemo(
    () => ({
      layout: "tabs" as const,
      paymentMethodOrder: ["card"],
      wallets: {
        link: "never" as const,
        applePay: "never" as const,
        googlePay: "never" as const,
      },
    }),
    []
  );

  return (
    <form onSubmit={handleSubmit} autoComplete="off">
      <Stack spacing={2.5}>
        <PaymentElement options={paymentElementOptions} />
        <Button
          type="submit"
          variant="contained"
          disabled={buttonDisabled}
          size="large"
        >
          {showSpinner ? (
            <CircularProgress size={20} sx={{ mr: 1 }} color="inherit" />
          ) : null}
          {buttonLabel}
        </Button>
        <Typography variant="caption" color="text.secondary">
          Secure card processing is powered by Stripe. You will see a charge only after the payment succeeds.
        </Typography>
      </Stack>
    </form>
  );
}

export default StripePaymentForm;

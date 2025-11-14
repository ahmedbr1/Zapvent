"use client";

import Dialog from "@mui/material/Dialog";
import DialogTitle from "@mui/material/DialogTitle";
import DialogContent from "@mui/material/DialogContent";
import DialogActions from "@mui/material/DialogActions";
import Stack from "@mui/material/Stack";
import Typography from "@mui/material/Typography";
import Button from "@mui/material/Button";
import Chip from "@mui/material/Chip";
import Alert from "@mui/material/Alert";
import Skeleton from "@mui/material/Skeleton";
import Divider from "@mui/material/Divider";
import PaymentIcon from "@mui/icons-material/PaymentRounded";
import AccountBalanceIcon from "@mui/icons-material/AccountBalanceWalletRounded";
import CancelIcon from "@mui/icons-material/CancelRounded";
import CreditCardIcon from "@mui/icons-material/CreditCardRounded";
import ArrowBackIcon from "@mui/icons-material/ArrowBackRounded";
import type { EventSummary } from "@/lib/types";
import { Elements } from "@stripe/react-stripe-js";
import { stripePromise } from "@/lib/stripe";
import { StripePaymentForm } from "@/components/events/StripePaymentForm";

const currencyFormatter = new Intl.NumberFormat(undefined, {
  style: "currency",
  currency: "EGP",
  minimumFractionDigits: 2,
});

type PaymentDialogStep = "method" | "card";

interface EventPaymentDialogProps {
  open: boolean;
  event: EventSummary | null;
  loading?: boolean;
  step?: PaymentDialogStep;
  cardClientSecret?: string | null;
  cardSelectionLoading?: boolean;
  cardFinalizing?: boolean;
  cardError?: string | null;
  onClose: () => void;
  onPayWithWallet: () => void;
  onStartCardFlow: () => void;
  onCardPaymentSuccess: (paymentIntentId: string) => void;
  onCardError?: (message: string) => void;
  onBackToMethods: () => void;
}

export function EventPaymentDialog({
  open,
  event,
  loading = false,
  step = "method",
  cardClientSecret,
  cardSelectionLoading = false,
  cardFinalizing = false,
  cardError,
  onClose,
  onPayWithWallet,
  onStartCardFlow,
  onCardPaymentSuccess,
  onCardError,
  onBackToMethods,
}: EventPaymentDialogProps) {
  const amount = Math.max(event?.price ?? 0, 0);
  const amountLabel = amount > 0 ? currencyFormatter.format(amount) : "Free";
  const isPaidEvent = amount > 0;
  const showCardStep = step === "card";
  const cardAvailable = Boolean(stripePromise) && isPaidEvent;
  const cardIntro = !stripePromise
    ? "Stripe is not configured. Please use wallet for now."
    : !isPaidEvent
      ? "Card payments are only required for paid events."
      : "Secure credit/debit card checkout is powered by Stripe.";
  const disableDialogClose = loading || cardSelectionLoading || cardFinalizing;

  const renderMethodSelection = () => (
    <Stack spacing={2.5}>
      <Stack spacing={0.5}>
        <Typography variant="subtitle2" color="text.secondary">
          Event
        </Typography>
        <Typography variant="h6" fontWeight={700}>
          {event?.name ?? "Select an event"}
        </Typography>
      </Stack>
      <Stack direction="row" spacing={1} alignItems="center">
        <Chip icon={<PaymentIcon />} label={`Amount due: ${amountLabel}`} color="primary" />
      </Stack>
      <Typography variant="body2" color="text.secondary">
        Choose how you would like to complete your registration.
      </Typography>
      <Stack direction={{ xs: "column", sm: "row" }} spacing={1.5}>
        <Button
          variant="contained"
          startIcon={<AccountBalanceIcon />}
          onClick={onPayWithWallet}
          disabled={loading}
          fullWidth
        >
          {amount > 0 ? "Pay with wallet" : "Confirm registration"}
        </Button>
        <Button
          variant="outlined"
          startIcon={<CreditCardIcon />}
          onClick={onStartCardFlow}
          disabled={!cardAvailable || cardSelectionLoading}
          fullWidth
        >
          {cardSelectionLoading ? "Preparing..." : "Pay with card"}
        </Button>
      </Stack>
      <Typography variant="caption" color="text.secondary">
        {cardIntro}
      </Typography>
    </Stack>
  );

  const renderCardStep = () => (
    <Stack spacing={2.5}>
      <Stack spacing={0.5}>
        <Typography variant="subtitle2" color="text.secondary">
          Paying for
        </Typography>
        <Typography variant="h6" fontWeight={700}>
          {event?.name ?? "Selected event"}
        </Typography>
        <Typography variant="body2" color="text.secondary">
          {amountLabel} will be charged once the payment succeeds.
        </Typography>
      </Stack>
      <Divider />
      {cardError ? <Alert severity="error">{cardError}</Alert> : null}
      {!stripePromise ? (
        <Alert severity="warning">Stripe is not configured. Please use wallet payments.</Alert>
      ) : !cardClientSecret ? (
        <Skeleton variant="rectangular" height={120} sx={{ borderRadius: 2 }} />
      ) : (
        <Elements
          key={cardClientSecret}
          stripe={stripePromise}
          options={{
            clientSecret: cardClientSecret,
            appearance: {
              rules: {
                ".LinkButton": { display: "none" },
                ".LinkSeparator": { display: "none" },
              },
            },
          }}
        >
          <StripePaymentForm
            amountLabel={amountLabel}
            disabled={loading || cardSelectionLoading}
            finalizing={cardFinalizing}
            onSuccess={onCardPaymentSuccess}
            onError={onCardError}
          />
        </Elements>
      )}
    </Stack>
  );

  return (
    <Dialog
      open={open}
      onClose={disableDialogClose ? undefined : onClose}
      fullWidth
      maxWidth="sm"
    >
      <DialogTitle>
        {showCardStep ? "Secure card payment" : "Complete your registration"}
      </DialogTitle>
      <DialogContent dividers>
        {showCardStep ? renderCardStep() : renderMethodSelection()}
      </DialogContent>
      <DialogActions>
        {showCardStep ? (
          <>
            <Button
              onClick={onBackToMethods}
              startIcon={<ArrowBackIcon />}
              disabled={cardSelectionLoading || cardFinalizing}
            >
              Choose another method
            </Button>
            <Button onClick={onClose} disabled={cardFinalizing} startIcon={<CancelIcon />}>
              Close
            </Button>
          </>
        ) : (
          <Button onClick={onClose} disabled={disableDialogClose} startIcon={<CancelIcon />}>
            Cancel
          </Button>
        )}
      </DialogActions>
    </Dialog>
  );
}

export default EventPaymentDialog;

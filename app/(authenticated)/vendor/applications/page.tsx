"use client";

import Image from "next/image";
import { useEffect, useState } from "react";
import {
  useMutation,
  useQuery,
  useQueryClient,
} from "@tanstack/react-query";
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
import Button from "@mui/material/Button";
import Dialog from "@mui/material/Dialog";
import DialogTitle from "@mui/material/DialogTitle";
import DialogContent from "@mui/material/DialogContent";
import DialogActions from "@mui/material/DialogActions";
import TextField from "@mui/material/TextField";
import Paper from "@mui/material/Paper";
import Grid from "@mui/material/Grid";
import IconButton from "@mui/material/IconButton";
import LoadingButton from "@mui/lab/LoadingButton";
import ChecklistIcon from "@mui/icons-material/ChecklistRounded";
import PersonIcon from "@mui/icons-material/PersonRounded";
import QrCodeIcon from "@mui/icons-material/QrCode2Rounded";
import PaymentsIcon from "@mui/icons-material/PaymentsRounded";
import CancelIcon from "@mui/icons-material/CancelOutlined";
import UploadFileIcon from "@mui/icons-material/UploadFileRounded";
import AddIcon from "@mui/icons-material/AddRounded";
import DeleteIcon from "@mui/icons-material/DeleteOutlineRounded";
import { useSnackbar } from "notistack";
import { useAuthToken } from "@/hooks/useAuthToken";
import { useSessionUser } from "@/hooks/useSessionUser";
import { formatDateTime } from "@/lib/date";
import {
  fetchVendorApplications,
  cancelVendorApplication,
  submitVendorAttendees,
  payVendorApplication,
  type VendorApplication,
  type VendorAttendeeFormEntry,
} from "@/lib/services/vendor";

const MAX_ATTENDEES = 5;

function getStatusColor(
  status: VendorApplication["status"]
): "success" | "warning" | "error" | "default" {
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
}

function mapAttendees(
  application: VendorApplication | null
): VendorAttendeeFormEntry[] {
  if (!application?.attendeeDetails?.length) {
    return [
      {
        name: "",
        email: "",
        idDocumentPath: undefined,
        file: null,
      },
    ];
  }
  return application.attendeeDetails.map((attendee) => ({
    name: attendee.name,
    email: attendee.email,
    idDocumentPath: attendee.idDocumentPath,
    file: null,
  }));
}

interface ManageAttendeesDialogProps {
  open: boolean;
  application: VendorApplication | null;
  token?: string;
  onClose: () => void;
  onUpdated: () => void;
}

function ManageAttendeesDialog({
  open,
  application,
  token,
  onClose,
  onUpdated,
}: ManageAttendeesDialogProps) {
  const { enqueueSnackbar } = useSnackbar();
  const [entries, setEntries] = useState<VendorAttendeeFormEntry[]>(
    mapAttendees(application)
  );
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (open) {
      setEntries(mapAttendees(application));
      setError(null);
    }
  }, [application, open]);

  const handleEntryChange = (
    index: number,
    field: "name" | "email",
    value: string
  ) => {
    setEntries((prev) => {
      const next = [...prev];
      next[index] = { ...next[index], [field]: value };
      return next;
    });
  };

  const handleFileChange = (index: number, file?: File | null) => {
    setEntries((prev) => {
      const next = [...prev];
      next[index] = { ...next[index], file: file ?? null };
      return next;
    });
  };

  const handleRemove = (index: number) => {
    setEntries((prev) => {
      if (prev.length === 1) return prev;
      const next = [...prev];
      next.splice(index, 1);
      return next;
    });
  };

  const handleAdd = () => {
    setEntries((prev) => {
      if (prev.length >= MAX_ATTENDEES) {
        return prev;
      }
      return [...prev, { name: "", email: "", file: null }];
    });
  };

  const validateEntries = () => {
    if (!entries.length) {
      return "At least one attendee is required.";
    }
    for (const attendee of entries) {
      if (!attendee.name.trim() || !attendee.email.trim()) {
        return "Each attendee must include a name and email.";
      }
      if (!attendee.idDocumentPath && !attendee.file) {
        return "Please upload ID documents for new attendees.";
      }
    }
    return null;
  };

  const handleSubmit = async () => {
    if (!application) return;
    const validation = validateEntries();
    if (validation) {
      setError(validation);
      enqueueSnackbar(validation, { variant: "error" });
      return;
    }

    setIsSubmitting(true);
    setError(null);

    try {
      await submitVendorAttendees({
        eventId: application.eventId,
        attendees: entries,
        token,
      });
      enqueueSnackbar("Attendees updated successfully.", {
        variant: "success",
      });
      onUpdated();
      onClose();
    } catch (submissionError) {
      const message =
        submissionError instanceof Error
          ? submissionError.message
          : "Failed to update attendees.";
      setError(message);
      enqueueSnackbar(message, { variant: "error" });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="md" fullWidth>
      <DialogTitle>Manage Attendees</DialogTitle>
      <DialogContent dividers>
        {application ? (
          <Stack spacing={3} sx={{ mt: 1 }}>
            <Alert severity="info">
              Upload government-issued IDs for every attendee. Existing entries
              already have IDs on file; you can replace them if necessary.
            </Alert>
            {entries.map((entry, index) => (
              <Paper key={`attendee-${index}`} variant="outlined" sx={{ p: 2 }}>
                <Stack spacing={2}>
                  <Stack
                    direction="row"
                    justifyContent="space-between"
                    alignItems="center"
                  >
                    <Typography variant="subtitle2">
                      Attendee {index + 1}
                    </Typography>
                    {entries.length > 1 && (
                      <IconButton
                        aria-label="Remove attendee"
                        size="small"
                        onClick={() => handleRemove(index)}
                      >
                        <DeleteIcon fontSize="small" />
                      </IconButton>
                    )}
                  </Stack>
                  <Grid container spacing={2}>
                    <Grid size={{ xs: 12, md: 6 }}>
                      <TextField
                        label="Full Name"
                        value={entry.name}
                        onChange={(event) =>
                          handleEntryChange(index, "name", event.target.value)
                        }
                        fullWidth
                        required
                      />
                    </Grid>
                    <Grid size={{ xs: 12, md: 6 }}>
                      <TextField
                        label="Email"
                        type="email"
                        value={entry.email}
                        onChange={(event) =>
                          handleEntryChange(index, "email", event.target.value)
                        }
                        fullWidth
                        required
                      />
                    </Grid>
                  </Grid>
                  {entry.idDocumentPath && (
                    <Alert severity="success">
                      ID on file:{" "}
                      <Typography
                        component="span"
                        variant="body2"
                        fontWeight={600}
                      >
                        {entry.idDocumentPath.split("/").pop()}
                      </Typography>
                    </Alert>
                  )}
                  <Stack direction="row" spacing={2} alignItems="center">
                    <Button
                      component="label"
                      variant="outlined"
                      startIcon={<UploadFileIcon />}
                    >
                      {entry.file ? "Replace ID" : "Upload ID"}
                      <input
                        type="file"
                        hidden
                        accept="image/*,application/pdf"
                        onChange={(event) =>
                          handleFileChange(index, event.target.files?.[0])
                        }
                      />
                    </Button>
                    <Typography variant="body2" color="text.secondary">
                      {entry.file ? entry.file.name : "No file selected"}
                    </Typography>
                  </Stack>
                </Stack>
              </Paper>
            ))}
            {entries.length < MAX_ATTENDEES && (
              <Button
                startIcon={<AddIcon />}
                onClick={handleAdd}
                variant="text"
              >
                Add Attendee
              </Button>
            )}
            {error && <Alert severity="error">{error}</Alert>}
          </Stack>
        ) : (
          <Typography>Pick an application to manage attendees.</Typography>
        )}
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose} disabled={isSubmitting}>
          Close
        </Button>
        <LoadingButton
          loading={isSubmitting}
          variant="contained"
          onClick={handleSubmit}
        >
          Save Attendees
        </LoadingButton>
      </DialogActions>
    </Dialog>
  );
}

interface PaymentDialogProps {
  open: boolean;
  application: VendorApplication | null;
  token?: string;
  onClose: () => void;
  onUpdated: () => void;
}

function PaymentDialog({
  open,
  application,
  token,
  onClose,
  onUpdated,
}: PaymentDialogProps) {
  const { enqueueSnackbar } = useSnackbar();
  const [amount, setAmount] = useState<string>("");
  const [reference, setReference] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (open && application?.payment?.amount) {
      setAmount(String(application.payment.amount));
    } else if (!open) {
      setAmount("");
      setReference("");
    }
  }, [application, open]);

  const handleSubmit = async () => {
    if (!application) return;
    const numericAmount = Number(amount);
    if (!Number.isFinite(numericAmount) || numericAmount <= 0) {
      enqueueSnackbar("Enter a valid payment amount.", { variant: "error" });
      return;
    }
    setIsSubmitting(true);
    try {
      await payVendorApplication({
        eventId: application.eventId,
        amountPaid: numericAmount,
        transactionReference: reference || undefined,
        token,
      });
      enqueueSnackbar("Payment recorded. Receipt emailed to you.", {
        variant: "success",
      });
      onUpdated();
      onClose();
    } catch (error) {
      const message =
        error instanceof Error
          ? error.message
          : "Failed to record payment.";
      enqueueSnackbar(message, { variant: "error" });
    } finally {
      setIsSubmitting(false);
    }
  };

  const payment = application?.payment;

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle>Pay Participation Fee</DialogTitle>
      <DialogContent dividers>
        {payment ? (
          <Stack spacing={3} sx={{ mt: 1 }}>
            <Alert severity="info">
              Receipts and visitor QR codes will be delivered via email once the
              payment is confirmed.
            </Alert>
            <Stack direction="row" spacing={2}>
              <Typography variant="body2" color="text.secondary">
                Amount Due:
              </Typography>
              <Typography fontWeight={600}>
                {payment.amount} {payment.currency}
              </Typography>
            </Stack>
            {payment.dueDate && (
              <Stack direction="row" spacing={2}>
                <Typography variant="body2" color="text.secondary">
                  Due Date:
                </Typography>
                <Typography fontWeight={600}>
                  {formatDateTime(payment.dueDate)}
                </Typography>
              </Stack>
            )}
            <TextField
              label="Amount Paid"
              type="number"
              fullWidth
              value={amount}
              onChange={(event) => setAmount(event.target.value)}
              inputProps={{ min: 0, step: "0.01" }}
            />
            <TextField
              label="Transaction Reference (optional)"
              fullWidth
              value={reference}
              onChange={(event) => setReference(event.target.value)}
            />
          </Stack>
        ) : (
          <Alert severity="warning">
            Payment details for this application are unavailable.
          </Alert>
        )}
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose} disabled={isSubmitting}>
          Close
        </Button>
        <LoadingButton
          variant="contained"
          onClick={handleSubmit}
          loading={isSubmitting}
        >
          Confirm Payment
        </LoadingButton>
      </DialogActions>
    </Dialog>
  );
}

interface QrCodesDialogProps {
  open: boolean;
  application: VendorApplication | null;
  onClose: () => void;
}

function QrCodesDialog({ open, application, onClose }: QrCodesDialogProps) {
  const qrCodes = application?.qrCodes ?? [];
  return (
    <Dialog open={open} onClose={onClose} maxWidth="md" fullWidth>
      <DialogTitle>Visitor QR Codes</DialogTitle>
      <DialogContent dividers>
        {qrCodes.length === 0 ? (
          <Alert severity="info">
            QR codes are generated once payment is received.
          </Alert>
        ) : (
          <Grid container spacing={3} sx={{ mt: 1 }}>
            {qrCodes.map((code) => (
              <Grid key={code.visitorEmail} size={{ xs: 12, sm: 6, md: 4 }}>
                <Paper
                  variant="outlined"
                  sx={{
                    p: 2,
                    display: "flex",
                    flexDirection: "column",
                    alignItems: "center",
                    textAlign: "center",
                  }}
                >
                  <Typography variant="subtitle2" gutterBottom>
                    {code.visitorEmail}
                  </Typography>
                  <Image
                    src={code.qrCodeUrl}
                    alt={`QR code for ${code.visitorEmail}`}
                    width={160}
                    height={160}
                    style={{ objectFit: "contain" }}
                  />
                  {code.issuedAt && (
                    <Typography
                      variant="caption"
                      color="text.secondary"
                      sx={{ mt: 1 }}
                    >
                      Issued {formatDateTime(code.issuedAt)}
                    </Typography>
                  )}
                </Paper>
              </Grid>
            ))}
          </Grid>
        )}
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>Close</Button>
      </DialogActions>
    </Dialog>
  );
}

export default function VendorApplicationsPage() {
  const token = useAuthToken();
  const user = useSessionUser();
  const queryClient = useQueryClient();
  const { enqueueSnackbar } = useSnackbar();
  const [attendeeDialogOpen, setAttendeeDialogOpen] = useState(false);
  const [paymentDialogOpen, setPaymentDialogOpen] = useState(false);
  const [qrDialogOpen, setQrDialogOpen] = useState(false);
  const [activeApplication, setActiveApplication] =
    useState<VendorApplication | null>(null);

  const applicationsQuery = useQuery({
    queryKey: ["vendor-applications", user?.id, token],
    queryFn: () => fetchVendorApplications(token ?? undefined),
    enabled: Boolean(token && user?.id),
  });

  const cancelMutation = useMutation({
    mutationFn: (eventId: string) =>
      cancelVendorApplication(eventId, token ?? undefined),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ["vendor-applications", user?.id, token],
      });
      enqueueSnackbar("Application canceled.", { variant: "success" });
    },
    onError: (error: unknown) => {
      const message =
        error instanceof Error ? error.message : "Failed to cancel request.";
      enqueueSnackbar(message, { variant: "error" });
    },
  });

  const openAttendeeDialog = (application: VendorApplication) => {
    setActiveApplication(application);
    setAttendeeDialogOpen(true);
  };

  const openPaymentDialog = (application: VendorApplication) => {
    setActiveApplication(application);
    setPaymentDialogOpen(true);
  };

  const openQrDialog = (application: VendorApplication) => {
    setActiveApplication(application);
    setQrDialogOpen(true);
  };

  const hasApplications = (applicationsQuery.data?.length ?? 0) > 0;

  return (
    <Stack spacing={4}>
      <Stack spacing={1}>
        <Stack direction="row" alignItems="center" spacing={2}>
          <ChecklistIcon sx={{ fontSize: 40 }} color="primary" />
          <div>
            <Typography variant="h4" fontWeight={700}>
              My Applications
            </Typography>
            <Typography variant="body1" color="text.secondary">
              Track approvals, upload attendee IDs, pay booth fees, and receive
              visitor QR codes.
            </Typography>
          </div>
        </Stack>
        <Alert severity="info">
          You will receive email notifications whenever an application is
          approved or rejected, as well as receipts and QR codes after payments.
        </Alert>
      </Stack>

      <Card>
        <CardContent>
          {applicationsQuery.isLoading ? (
            <Stack spacing={2}>
              {[1, 2, 3].map((index) => (
                <Skeleton key={index} height={64} />
              ))}
            </Stack>
          ) : applicationsQuery.isError ? (
            <Alert severity="error">
              Failed to load applications. Please try again later.
            </Alert>
          ) : !hasApplications ? (
            <Alert severity="info">
              You haven&apos;t submitted any applications yet. Apply to a bazaar
              to get started.
            </Alert>
          ) : (
            <TableContainer>
              <Table>
                <TableHead>
                  <TableRow>
                    <TableCell>Bazaar Event</TableCell>
                    <TableCell>Application Date</TableCell>
                    <TableCell>Attendees</TableCell>
                    <TableCell>Booth Size</TableCell>
                    <TableCell>Location</TableCell>
                    <TableCell>Payment</TableCell>
                    <TableCell>Status</TableCell>
                    <TableCell align="right">Actions</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {applicationsQuery.data?.map((application) => {
                    const canPay =
                      application.status === "approved" &&
                      application.payment &&
                      application.payment.status !== "paid";
                    const canCancel =
                      application.status === "pending" &&
                      application.payment?.status !== "paid";
                    const hasQrCodes = (application.qrCodes?.length ?? 0) > 0;
                    return (
                      <TableRow key={application.eventId} hover>
                        <TableCell>
                          <Typography fontWeight={600}>
                            {application.eventName}
                          </Typography>
                          {application.eventDate && (
                            <Typography variant="caption" color="text.secondary">
                              {formatDateTime(application.eventDate)}
                            </Typography>
                          )}
                        </TableCell>
                        <TableCell>
                          {application.applicationDate
                            ? formatDateTime(application.applicationDate)
                            : "—"}
                        </TableCell>
                        <TableCell>
                          {application.attendees} attendee
                          {application.attendees === 1 ? "" : "s"}
                        </TableCell>
                        <TableCell>{application.boothSize}</TableCell>
                        <TableCell>
                          {application.boothLocation || "TBD"}
                          {application.boothStartTime && application.boothEndTime && (
                            <Typography variant="caption" display="block">
                              {formatDateTime(application.boothStartTime)} –{" "}
                              {formatDateTime(application.boothEndTime)}
                            </Typography>
                          )}
                        </TableCell>
                        <TableCell>
                          {application.payment ? (
                            <Stack spacing={0.5}>
                              <Chip
                                label={application.payment.status.toUpperCase()}
                                size="small"
                                color={
                                  application.payment.status === "paid"
                                    ? "success"
                                    : application.payment.status === "overdue"
                                      ? "error"
                                      : "warning"
                                }
                              />
                              <Typography variant="caption" color="text.secondary">
                                {application.payment.amount}{" "}
                                {application.payment.currency}
                              </Typography>
                            </Stack>
                          ) : (
                            <Typography variant="body2" color="text.secondary">
                              Pending
                            </Typography>
                          )}
                        </TableCell>
                        <TableCell>
                          <Chip
                            label={application.status.toUpperCase()}
                            color={getStatusColor(application.status)}
                            size="small"
                          />
                        </TableCell>
                        <TableCell align="right">
                          <Stack direction="row" spacing={1} justifyContent="flex-end">
                            <Button
                              size="small"
                              variant="outlined"
                              startIcon={<PersonIcon />}
                              onClick={() => openAttendeeDialog(application)}
                            >
                              Attendees
                            </Button>
                            <Button
                              size="small"
                              variant="outlined"
                              startIcon={<PaymentsIcon />}
                              onClick={() => openPaymentDialog(application)}
                              disabled={!canPay}
                            >
                              Pay
                            </Button>
                            <Button
                              size="small"
                              variant="outlined"
                              startIcon={<QrCodeIcon />}
                              onClick={() => openQrDialog(application)}
                              disabled={!hasQrCodes}
                            >
                              QR Codes
                            </Button>
                            <LoadingButton
                              size="small"
                              color="error"
                              variant="text"
                              loading={
                                cancelMutation.isPending &&
                                cancelMutation.variables === application.eventId
                              }
                              startIcon={<CancelIcon />}
                              onClick={() => cancelMutation.mutate(application.eventId)}
                              disabled={!canCancel}
                            >
                              Cancel
                            </LoadingButton>
                          </Stack>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </TableContainer>
          )}
        </CardContent>
      </Card>

      <ManageAttendeesDialog
        open={attendeeDialogOpen}
        application={activeApplication}
        token={token ?? undefined}
        onClose={() => {
          setAttendeeDialogOpen(false);
          setActiveApplication(null);
        }}
        onUpdated={() =>
          queryClient.invalidateQueries({
            queryKey: ["vendor-applications", user?.id, token],
          })
        }
      />

      <PaymentDialog
        open={paymentDialogOpen}
        application={activeApplication}
        token={token ?? undefined}
        onClose={() => {
          setPaymentDialogOpen(false);
          setActiveApplication(null);
        }}
        onUpdated={() =>
          queryClient.invalidateQueries({
            queryKey: ["vendor-applications", user?.id, token],
          })
        }
      />

      <QrCodesDialog
        open={qrDialogOpen}
        application={activeApplication}
        onClose={() => {
          setQrDialogOpen(false);
          setActiveApplication(null);
        }}
      />
    </Stack>
  );
}

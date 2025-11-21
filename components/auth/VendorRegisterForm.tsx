"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import Grid from "@mui/material/Grid";
import TextField from "@mui/material/TextField";
import Alert from "@mui/material/Alert";
import Stack from "@mui/material/Stack";
import Typography from "@mui/material/Typography";
import Button from "@mui/material/Button";
import UploadFileIcon from "@mui/icons-material/UploadFileRounded";
import LoadingButton from "@mui/lab/LoadingButton";
import Box from "@mui/material/Box";
import IconButton from "@mui/material/IconButton";
import InputAdornment from "@mui/material/InputAdornment";
import Visibility from "@mui/icons-material/Visibility";
import VisibilityOff from "@mui/icons-material/VisibilityOff";
import { apiFetch } from "@/lib/api-client";
import { useSnackbar } from "notistack";

const fileSchema = z
  .instanceof(File)
  .refine((file) => file.size <= 5 * 1024 * 1024, "File must be less than 5MB")
  .refine(
    (file) =>
      ["image/png", "image/jpeg", "application/pdf"].includes(file.type),
    "Allowed formats: PNG, JPG, PDF"
  );

const relaxedUrlRegex =
  /^(https?:\/\/)?([\w-]+\.)+[A-Za-z]{2,}([/?#].*)?$/;

const vendorSchema = z
  .object({
    email: z.string().email("Enter a valid email"),
    password: z
      .string()
      .min(8, "At least 8 characters")
      .regex(/[A-Z]/, "Include an uppercase letter")
      .regex(/[a-z]/, "Include a lowercase letter")
      .regex(/[0-9]/, "Include a number")
      .regex(/[^a-zA-Z0-9]/, "Include a special character"),
    confirmPassword: z
      .string()
      .min(8, "Confirm password must be at least 8 characters")
      .regex(/[A-Z]/, "Include an uppercase letter")
      .regex(/[a-z]/, "Include a lowercase letter")
      .regex(/[0-9]/, "Include a number")
      .regex(/[^a-zA-Z0-9]/, "Include a special character"),
    companyName: z
      .string()
      .min(2, "Company name must be at least 2 characters"),
    loyaltyForum: z
      .string()
      .trim()
      .optional()
      .refine(
        (value) => !value || relaxedUrlRegex.test(value),
        "Enter a valid URL (e.g., vendor.com or https://vendor.com)"
      ),
    logo: fileSchema,
    taxCard: fileSchema,
    documents: fileSchema.optional(),
  })
  .refine((data) => data.password === data.confirmPassword, {
    path: ["confirmPassword"],
    message: "Passwords must match",
  });

type VendorFormValues = z.infer<typeof vendorSchema>;

interface VendorSignupResponse {
  success: boolean;
  message: string;
}

const fileInputs: Array<{
  name: keyof Pick<VendorFormValues, "logo" | "taxCard" | "documents">;
  label: string;
  description: string;
}> = [
  {
    name: "logo",
    label: "Company Logo",
    description: "High-resolution PNG or JPG (max 5MB)",
  },
  {
    name: "taxCard",
    label: "Tax Card",
    description: "Proof of registration (PNG, JPG, or PDF)",
  },
  {
    name: "documents",
    label: "Supporting Documents",
    description: "Portfolio or previous booth references (optional)",
  },
];

export function VendorRegisterForm() {
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
    reset,
    setValue,
    watch,
  } = useForm<VendorFormValues>({
    resolver: zodResolver(vendorSchema),
  });
  const { enqueueSnackbar } = useSnackbar();
  const [message, setMessage] = useState<string | null>(null);
  const [filePreviews, setFilePreviews] = useState<Record<string, string>>({});
  const [showPassword, setShowPassword] = useState(false);
  const password = watch("password");
  const confirmPassword = watch("confirmPassword");

  const onSubmit = handleSubmit(async (values) => {
    setMessage(null);
    const formData = new FormData();
    formData.append("email", values.email);
    formData.append("password", values.password);
    formData.append("confirmPassword", values.confirmPassword);
    formData.append("companyName", values.companyName);
    if (values.loyaltyForum)
      formData.append("loyaltyForum", values.loyaltyForum);
    if (values.logo) formData.append("logo", values.logo);
    if (values.taxCard) formData.append("taxCard", values.taxCard);
    if (values.documents) formData.append("documents", values.documents);

    try {
      const response = await apiFetch<VendorSignupResponse, FormData>(
        "/vendors/signUp",
        {
          method: "POST",
          body: formData,
        }
      );

      if (response.success) {
        enqueueSnackbar(
          "Vendor registration sent. Our team will review shortly.",
          {
            variant: "success",
          }
        );
        setMessage(response.message);
        reset();
        setFilePreviews({});
      } else {
        setMessage(response.message ?? "Unable to submit registration.");
      }
    } catch (error) {
      const message =
        error instanceof Error
          ? error.message
          : (error as { message?: string }).message;
      setMessage(message ?? "Unexpected error occurred.");
    }
  });

  const handleFileChange =
    (name: keyof VendorFormValues) =>
    (event: React.ChangeEvent<HTMLInputElement>) => {
      const file = event.target.files?.[0];
      // If user cancelled the file picker, do not clear existing previews/values
      if (!file) return;

      setValue(name, file as File, { shouldValidate: true });
      if (file.type.startsWith("image/")) {
        const reader = new FileReader();
        reader.onload = () => {
          setFilePreviews((prev) => ({
            ...prev,
            [name]: reader.result as string,
          }));
        };
        reader.readAsDataURL(file);
      } else {
        setFilePreviews((prev) => ({ ...prev, [name]: "" }));
      }
    };

  return (
    <form onSubmit={onSubmit} noValidate>
      <Grid container spacing={2.5}>
        {message && (
          <Grid size={12}>
            <Alert severity="info">{message}</Alert>
          </Grid>
        )}
        <Grid size={12}>
          <TextField
            label="Company Email"
            fullWidth
            autoComplete="email"
            {...register("email")}
            error={Boolean(errors.email)}
            helperText={errors.email?.message}
          />
        </Grid>
        <Grid size={12}>
          <TextField
            label="Create Password"
            type={showPassword ? "text" : "password"}
            fullWidth
            autoComplete="new-password"
            {...register("password")}
            error={Boolean(errors.password)}
            helperText={
              errors.password?.message ??
              "Use at least 8 characters with uppercase, lowercase, numbers, and symbols."
            }
            slotProps={{
              input: {
                endAdornment: password ? (
                  <InputAdornment position="end">
                    <IconButton
                      aria-label={
                        showPassword ? "Hide password" : "Show password"
                      }
                      onClick={() => setShowPassword((s) => !s)}
                      edge="end"
                      tabIndex={-1}
                    >
                      {showPassword ? <VisibilityOff /> : <Visibility />}
                    </IconButton>
                  </InputAdornment>
                ) : null,
              },
            }}
          />
        </Grid>
        <Grid size={12}>
          <TextField
            label="Confirm Password"
            type={showPassword ? "text" : "password"}
            fullWidth
            autoComplete="new-password"
            {...register("confirmPassword")}
            error={Boolean(errors.confirmPassword)}
            helperText={
              errors.confirmPassword?.message ?? "Re-enter your password"
            }
            slotProps={{
              input: {
                endAdornment: confirmPassword ? (
                  <InputAdornment position="end">
                    <IconButton
                      aria-label={
                        showPassword ? "Hide password" : "Show password"
                      }
                      onClick={() => setShowPassword((s) => !s)}
                      edge="end"
                      tabIndex={-1}
                    >
                      {showPassword ? <VisibilityOff /> : <Visibility />}
                    </IconButton>
                  </InputAdornment>
                ) : null,
              },
            }}
          />
        </Grid>
        <Grid size={12}>
          <TextField
            label="Company Name"
            fullWidth
            {...register("companyName")}
            error={Boolean(errors.companyName)}
            helperText={errors.companyName?.message}
          />
        </Grid>
        <Grid size={12}>
          <TextField
            label="Loyalty Forum URL"
            fullWidth
            placeholder="example.com"
            {...register("loyaltyForum")}
            error={Boolean(errors.loyaltyForum)}
            helperText={errors.loyaltyForum?.message ?? "Optional"}
          />
        </Grid>
        <Grid size={12}>
          <Typography
            variant="subtitle1"
            fontWeight={600}
            sx={{ mt: 2, mb: 1 }}
          >
            Required uploads (supporting documents optional)
          </Typography>
        </Grid>
        {fileInputs.map((input) => (
          <Grid key={input.name} size={{ xs: 12, md: 4 }}>
            <Stack
              alignItems="flex-start"
              spacing={1.5}
              sx={{
                p: 2,
                borderRadius: 2,
                border: "1px dashed rgba(15,23,42,0.16)",
                backgroundColor: "rgba(248,250,252,0.65)",
              }}
            >
              <Stack direction="row" spacing={1} alignItems="center">
                <UploadFileIcon color="primary" />
                <Typography fontWeight={600}>{input.label}</Typography>
              </Stack>
              <Typography variant="body2" color="text.secondary">
                {input.description}
              </Typography>
              <Button component="label" variant="contained" size="small">
                Upload
                <input
                  type="file"
                  hidden
                  accept=".png,.jpg,.jpeg,.pdf"
                  onChange={handleFileChange(input.name)}
                />
              </Button>
              {filePreviews[input.name] && (
                <Box
                  component="img"
                  src={filePreviews[input.name]}
                  alt={input.label}
                  sx={{ width: "100%", borderRadius: 1, mt: 1 }}
                />
              )}
              {errors[input.name] && (
                <Typography variant="caption" color="error">
                  {errors[input.name]?.message}
                </Typography>
              )}
            </Stack>
          </Grid>
        ))}
        <Grid size={12}>
          <LoadingButton
            type="submit"
            loading={isSubmitting}
            variant="contained"
            size="large"
            fullWidth
          >
            Submit vendor application
          </LoadingButton>
        </Grid>
      </Grid>
    </form>
  );
}

"use client";

import { useMemo, useState } from "react";
import { useForm, Controller } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import TextField from "@mui/material/TextField";
import MenuItem from "@mui/material/MenuItem";
import Grid from "@mui/material/Grid";
import Alert from "@mui/material/Alert";
import LoadingButton from "@mui/lab/LoadingButton";
import { apiFetch } from "@/lib/api-client";
import { useSnackbar } from "notistack";
import { UserRole } from "@/lib/types";
import InputAdornment from "@mui/material/InputAdornment";
import IconButton from "@mui/material/IconButton";
import Visibility from "@mui/icons-material/Visibility";
import VisibilityOff from "@mui/icons-material/VisibilityOff";

const registrationSchema = z
  .object({
    firstName: z.string().min(2, "First name must be at least 2 characters"),
    lastName: z.string().min(2, "Last name must be at least 2 characters"),
    email: z.string().email("Enter a valid email"),
    password: z
      .string()
      .min(8, "At least 8 characters")
      .regex(/[A-Z]/, "Include an uppercase letter")
      .regex(/[a-z]/, "Include a lowercase letter")
      .regex(/[0-9]/, "Include a number")
      .regex(/[^a-zA-Z0-9]/, "Include a special character"),
    confirmPassword: z.string(),
    role: z.nativeEnum(UserRole, { message: "Choose a role" }),
    studentId: z.string().optional(),
    staffId: z.string().optional(),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: "Passwords do not match",
    path: ["confirmPassword"],
  })
  .superRefine((data, ctx) => {
    if (data.role === UserRole.Student && !data.studentId) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Student ID is required for students.",
        path: ["studentId"],
      });
    }
    if (
      [UserRole.Staff, UserRole.Professor, UserRole.TA].includes(data.role) &&
      !data.staffId
    ) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Staff ID is required for staff, professors, and TAs.",
        path: ["staffId"],
      });
    }
  });

type UserRegistrationFields = z.infer<typeof registrationSchema>;

interface SignupResponse {
  success: boolean;
  message: string;
  data?: {
    id: string;
  };
  needsApproval?: boolean;
}

export function UserRegisterForm() {
  const {
    control,
    handleSubmit,
    register,
    formState: { errors, isSubmitting },
    watch,
    reset,
  } = useForm<UserRegistrationFields>({
    resolver: zodResolver(registrationSchema),
    defaultValues: {
      role: UserRole.Student,
    },
  });
  const { enqueueSnackbar } = useSnackbar();
  const [serverMessage, setServerMessage] = useState<string | null>(null);
  const role = watch("role");
  const password = watch("password");
  const [showPassword, setShowPassword] = useState(false);

  const showStudentId = role === UserRole.Student;
  const showStaffId = [
    UserRole.Staff,
    UserRole.Professor,
    UserRole.TA,
  ].includes(role);

  const roleOptions = useMemo(
    () => [
      { value: UserRole.Student, label: "Student" },
      { value: UserRole.Staff, label: "Staff" },
      { value: UserRole.Professor, label: "Professor" },
      { value: UserRole.TA, label: "Teaching Assistant" },
    ],
    []
  );

  const onSubmit = handleSubmit(async (values) => {
    setServerMessage(null);
    try {
      const payload = {
        firstName: values.firstName,
        lastName: values.lastName,
        email: values.email,
        password: values.password,
        role: values.role,
        studentId: values.studentId,
        staffId: values.staffId,
      };

      const response = await apiFetch<SignupResponse, typeof payload>(
        "/users/signUp",
        {
          method: "POST",
          body: payload,
        }
      );

      if (response.success) {
        setServerMessage(
          response.message ??
            "Registration received. You will receive an email when verified."
        );
        enqueueSnackbar(
          "Registration submitted. Check your email for updates.",
          {
            variant: "success",
          }
        );
        reset({
          role: values.role,
        });
      } else {
        setServerMessage(
          response.message ?? "Unable to complete registration."
        );
      }
    } catch (error) {
      const message =
        error instanceof Error
          ? error.message
          : (error as { message?: string }).message;
      setServerMessage(message ?? "An unexpected error occurred.");
    }
  });

  return (
    <form onSubmit={onSubmit} noValidate>
      <Grid container spacing={2.5}>
        {serverMessage && (
          <Grid size={12}>
            <Alert
              severity={serverMessage.includes("success") ? "success" : "info"}
            >
              {serverMessage}
            </Alert>
          </Grid>
        )}
        <Grid size={{ xs: 12, sm: 6 }}>
          <TextField
            label="First name"
            fullWidth
            autoComplete="given-name"
            {...register("firstName")}
            error={Boolean(errors.firstName)}
            helperText={errors.firstName?.message}
          />
        </Grid>
        <Grid size={{ xs: 12, sm: 6 }}>
          <TextField
            label="Last name"
            fullWidth
            autoComplete="family-name"
            {...register("lastName")}
            error={Boolean(errors.lastName)}
            helperText={errors.lastName?.message}
          />
        </Grid>
        <Grid size={12}>
          <TextField
            label="University email"
            type="email"
            fullWidth
            autoComplete="email"
            {...register("email")}
            error={Boolean(errors.email)}
            helperText={errors.email?.message}
          />
        </Grid>
        <Grid size={{ xs: 12, sm: 6 }}>
          <Controller
            control={control}
            name="role"
            render={({ field }) => (
              <TextField
                select
                label="Role"
                fullWidth
                {...field}
                error={Boolean(errors.role)}
                helperText={errors.role?.message ?? "Select your academic role"}
              >
                {roleOptions.map((option) => (
                  <MenuItem key={option.value} value={option.value}>
                    {option.label}
                  </MenuItem>
                ))}
              </TextField>
            )}
          />
        </Grid>
        {showStudentId && (
          <Grid size={{ xs: 12, sm: 6 }}>
            <TextField
              label="Student ID"
              fullWidth
              {...register("studentId")}
              error={Boolean(errors.studentId)}
              helperText={errors.studentId?.message ?? "GUC ID (e.g., 20-1234)"}
            />
          </Grid>
        )}
        {showStaffId && (
          <Grid size={{ xs: 12, sm: 6 }}>
            <TextField
              label="Staff ID"
              fullWidth
              {...register("staffId")}
              error={Boolean(errors.staffId)}
              helperText={
                errors.staffId?.message ??
                "Required for staff, professors, and TAs"
              }
            />
          </Grid>
        )}
        <Grid size={{ xs: 12, sm: 6 }}>
          <TextField
            label="Password"
            type={showPassword ? "text" : "password"}
            fullWidth
            autoComplete="new-password"
            {...register("password")}
            error={Boolean(errors.password)}
            helperText={
              errors.password?.message ??
              "Use at least 8 characters with letters, numbers & symbols."
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
        <Grid size={{ xs: 12, sm: 6 }}>
          <TextField
            label="Confirm password"
            type={showPassword ? "text" : "password"}
            fullWidth
            autoComplete="new-password"
            {...register("confirmPassword")}
            error={Boolean(errors.confirmPassword)}
            helperText={errors.confirmPassword?.message}
          />
        </Grid>
        <Grid size={12}>
          <LoadingButton
            type="submit"
            variant="contained"
            size="large"
            loading={isSubmitting}
            fullWidth
          >
            Submit registration
          </LoadingButton>
        </Grid>
      </Grid>
    </form>
  );
}

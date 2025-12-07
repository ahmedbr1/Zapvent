"use client";

import { createTheme, alpha } from "@mui/material/styles";

// Create theme once at module level to avoid recreation on every render
export const theme = createTheme({
  palette: {
    mode: "light",
    primary: {
      main: "#1E3A8A", // deep blue
      light: "#3B82F6",
      dark: "#1E40AF",
      contrastText: "#FFFFFF",
    },
    secondary: {
      main: "#F59E0B", // warm amber (slightly richer than gold)
      light: "#FBBF24",
      dark: "#D97706",
      contrastText: "#1E293B",
    },
    success: {
      main: "#10B981",
      light: "#34D399",
      dark: "#059669",
    },
    error: {
      main: "#EF4444",
      light: "#F87171",
      dark: "#DC2626",
    },
    warning: {
      main: "#F59E0B",
      light: "#FBBF24",
      dark: "#D97706",
    },
    background: {
      default: "#F8FAFC",
      paper: "#FFFFFF",
    },
    text: {
      primary: "#1E293B",
      secondary: "#64748B",
    },
  },
  typography: {
    fontFamily: [
      "Inter",
      "-apple-system",
      "BlinkMacSystemFont",
      "Segoe UI",
      "Roboto",
      "Helvetica",
      "Arial",
      "sans-serif",
    ].join(","),
    h1: { fontWeight: 700, letterSpacing: "-0.02em" },
    h2: { fontWeight: 700, letterSpacing: "-0.01em" },
    h3: { fontWeight: 600 },
    h4: { fontWeight: 600 },
    h5: { fontWeight: 600 },
    h6: { fontWeight: 600 },
    button: { textTransform: "none", fontWeight: 600 },
  },
  shape: {
    borderRadius: 12,
  },
  components: {
    MuiButton: {
      defaultProps: {
        variant: "contained",
        disableElevation: true,
      },
      styleOverrides: {
        root: {
          borderRadius: 10,
          padding: "10px 20px",
          fontSize: "0.875rem",
          fontWeight: 600,
          transition: "all 0.2s ease-in-out",
        },
        contained: {
          boxShadow: "0 1px 3px rgba(0,0,0,0.1), 0 1px 2px rgba(0,0,0,0.06)",
          "&:hover": {
            boxShadow: "0 4px 6px rgba(0,0,0,0.1), 0 2px 4px rgba(0,0,0,0.06)",
            transform: "translateY(-1px)",
          },
          "&:active": {
            transform: "translateY(0)",
          },
        },
        containedPrimary: {
          background: "linear-gradient(135deg, #1E3A8A 0%, #2563EB 100%)",
          "&:hover": {
            background: "linear-gradient(135deg, #1E40AF 0%, #3B82F6 100%)",
          },
        },
        containedSecondary: {
          background: "linear-gradient(135deg, #D97706 0%, #F59E0B 100%)",
          "&:hover": {
            background: "linear-gradient(135deg, #B45309 0%, #D97706 100%)",
          },
        },
        containedSuccess: {
          background: "linear-gradient(135deg, #059669 0%, #10B981 100%)",
          "&:hover": {
            background: "linear-gradient(135deg, #047857 0%, #059669 100%)",
          },
        },
        containedError: {
          background: "linear-gradient(135deg, #DC2626 0%, #EF4444 100%)",
          "&:hover": {
            background: "linear-gradient(135deg, #B91C1C 0%, #DC2626 100%)",
          },
        },
        outlined: {
          borderWidth: 1.5,
          "&:hover": {
            borderWidth: 1.5,
            backgroundColor: alpha("#1E3A8A", 0.04),
          },
        },
        outlinedPrimary: {
          borderColor: "#1E3A8A",
          color: "#1E3A8A",
          "&:hover": {
            borderColor: "#1E40AF",
            backgroundColor: alpha("#1E3A8A", 0.04),
          },
        },
        outlinedSecondary: {
          borderColor: "#D97706",
          color: "#D97706",
          "&:hover": {
            borderColor: "#B45309",
            backgroundColor: alpha("#F59E0B", 0.08),
          },
        },
        text: {
          "&:hover": {
            backgroundColor: alpha("#1E3A8A", 0.04),
          },
        },
        sizeSmall: {
          padding: "6px 14px",
          fontSize: "0.8125rem",
        },
        sizeLarge: {
          padding: "12px 28px",
          fontSize: "0.9375rem",
        },
      },
    },
    MuiIconButton: {
      styleOverrides: {
        root: {
          borderRadius: 10,
          transition: "all 0.2s ease-in-out",
          "&:hover": {
            backgroundColor: alpha("#1E3A8A", 0.08),
          },
        },
      },
    },
    MuiFab: {
      styleOverrides: {
        root: {
          boxShadow: "0 4px 14px rgba(30, 58, 138, 0.25)",
          "&:hover": {
            boxShadow: "0 6px 20px rgba(30, 58, 138, 0.35)",
          },
        },
      },
    },
    MuiCard: {
      styleOverrides: {
        root: {
          borderRadius: 16,
          boxShadow: "0 4px 20px rgba(15, 23, 42, 0.06)",
          border: "1px solid rgba(15, 23, 42, 0.06)",
          transition: "box-shadow 0.2s ease-in-out, transform 0.2s ease-in-out",
          "&:hover": {
            boxShadow: "0 8px 30px rgba(15, 23, 42, 0.1)",
          },
        },
      },
    },
    MuiChip: {
      styleOverrides: {
        root: {
          fontWeight: 500,
          borderRadius: 8,
        },
        outlined: {
          borderWidth: 1.5,
        },
        colorPrimary: {
          backgroundColor: alpha("#1E3A8A", 0.1),
          color: "#1E3A8A",
        },
        colorSecondary: {
          backgroundColor: alpha("#F59E0B", 0.15),
          color: "#B45309",
        },
        colorSuccess: {
          backgroundColor: alpha("#10B981", 0.1),
          color: "#059669",
        },
        colorError: {
          backgroundColor: alpha("#EF4444", 0.1),
          color: "#DC2626",
        },
      },
    },
    MuiAlert: {
      styleOverrides: {
        root: {
          borderRadius: 12,
        },
        standardSuccess: {
          backgroundColor: alpha("#10B981", 0.1),
          color: "#065F46",
        },
        standardError: {
          backgroundColor: alpha("#EF4444", 0.1),
          color: "#991B1B",
        },
        standardWarning: {
          backgroundColor: alpha("#F59E0B", 0.1),
          color: "#92400E",
        },
        standardInfo: {
          backgroundColor: alpha("#3B82F6", 0.1),
          color: "#1E40AF",
        },
      },
    },
    MuiTextField: {
      styleOverrides: {
        root: {
          "& .MuiOutlinedInput-root": {
            borderRadius: 10,
            transition: "box-shadow 0.2s ease-in-out",
            "&:hover": {
              "& .MuiOutlinedInput-notchedOutline": {
                borderColor: "#94A3B8",
              },
            },
            "&.Mui-focused": {
              boxShadow: `0 0 0 3px ${alpha("#1E3A8A", 0.1)}`,
              "& .MuiOutlinedInput-notchedOutline": {
                borderWidth: 2,
              },
            },
          },
        },
      },
    },
    MuiSelect: {
      styleOverrides: {
        root: {
          borderRadius: 10,
        },
      },
    },
    MuiDialog: {
      styleOverrides: {
        paper: {
          borderRadius: 16,
          boxShadow: "0 24px 48px rgba(15, 23, 42, 0.2)",
        },
      },
    },
    MuiDialogTitle: {
      styleOverrides: {
        root: {
          fontSize: "1.25rem",
          fontWeight: 600,
        },
      },
    },
    MuiDialogActions: {
      styleOverrides: {
        root: {
          padding: "16px 24px",
        },
      },
    },
    MuiDrawer: {
      styleOverrides: {
        paper: {
          backgroundColor: "#0F172A",
          color: "#E2E8F0",
        },
      },
    },
    MuiTooltip: {
      styleOverrides: {
        tooltip: {
          backgroundColor: "#1E293B",
          fontSize: "0.75rem",
          borderRadius: 8,
          padding: "8px 12px",
        },
        arrow: {
          color: "#1E293B",
        },
      },
    },
    MuiSkeleton: {
      styleOverrides: {
        root: {
          borderRadius: 8,
        },
      },
    },
    MuiTableCell: {
      styleOverrides: {
        head: {
          fontWeight: 600,
          backgroundColor: "#F8FAFC",
        },
      },
    },
    MuiPagination: {
      styleOverrides: {
        root: {
          "& .MuiPaginationItem-root": {
            borderRadius: 8,
          },
        },
      },
    },
  },
});

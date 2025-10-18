"use client";

import Link from "next/link";
import type { ReactNode } from "react";
import {
  Box,
  Container,
  Paper,
  Stack,
  Typography,
  Button,
  useMediaQuery,
  useTheme,
} from "@mui/material";
import ArrowBackIcon from "@mui/icons-material/ArrowBackRounded";
import { ServerStatusCheck } from "./ServerStatusCheck";

interface AuthScaffoldProps {
  title: string;
  subtitle?: string;
  children: ReactNode;
  footer?: ReactNode;
  backLink?: {
    href: string;
    label: string;
  };
  accent?: "user" | "admin" | "vendor" | "events";
}

const accentGradients = {
  user: "linear-gradient(120deg, rgba(37,99,235,0.95) 0%, rgba(14,116,144,0.85) 100%)",
  admin:
    "linear-gradient(120deg, rgba(15,23,42,0.95) 0%, rgba(67,56,202,0.85) 100%)",
  vendor:
    "linear-gradient(120deg, rgba(249,115,22,0.95) 0%, rgba(251,191,36,0.85) 100%)",
  events:
    "linear-gradient(120deg, rgba(147,51,234,0.95) 0%, rgba(236,72,153,0.85) 100%)",
} as const;

export function AuthScaffold({
  title,
  subtitle,
  children,
  footer,
  backLink,
  accent = "user",
}: AuthScaffoldProps) {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down("md"));

  return (
    <Box
      sx={{
        minHeight: "100vh",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        background:
          "radial-gradient(circle at 20% 20%, rgba(37,99,235,0.15), transparent 45%), radial-gradient(circle at 80% 0%, rgba(251,191,36,0.2), transparent 40%), #0F172A",
        py: { xs: 6, md: 10 },
      }}
    >
      <Container maxWidth="lg">
        <Stack
          direction={{ xs: "column", md: "row" }}
          spacing={4}
          alignItems="stretch"
        >
          <Paper
            elevation={8}
            sx={{
              flex: 1,
              p: { xs: 4, md: 6 },
              borderRadius: 4,
              background: "rgba(15,23,42,0.85)",
              color: "#E2E8F0",
              border: "1px solid rgba(148,163,184,0.2)",
              display: "flex",
              flexDirection: "column",
              justifyContent: "space-between",
            }}
          >
            <Box>
              <Typography
                variant="overline"
                sx={{ letterSpacing: 3, color: "#FBBF24" }}
              >
                Zapvent
              </Typography>
              <Typography variant="h4" fontWeight={800} sx={{ mt: 2 }}>
                Welcome back to campus operations.
              </Typography>
              <Typography
                variant="body1"
                sx={{ mt: 2, color: "rgba(226,232,240,0.72)" }}
              >
                Streamline approvals, registrations, and vendor workflows in one
                modern interface. Built for the tempo of university life.
              </Typography>
            </Box>
            {!isMobile && (
              <Box
                sx={{
                  mt: 6,
                  p: 3,
                  borderRadius: 3,
                  background: "rgba(30,41,59,0.75)",
                  border: "1px solid rgba(148,163,184,0.2)",
                }}
              >
                <Typography variant="subtitle2" sx={{ mb: 1 }}>
                  Quick tips
                </Typography>
                <Typography
                  variant="body2"
                  sx={{ color: "rgba(226,232,240,0.65)" }}
                >
                  Your browser will remember your last role. Keep your tasks
                  pinned to stay in flow, and switch portals from the avatar
                  menu at any time.
                </Typography>
              </Box>
            )}
          </Paper>
          <Paper
            elevation={12}
            sx={{
              flex: 1,
              p: { xs: 4, md: 6 },
              borderRadius: 4,
              position: "relative",
              overflow: "hidden",
            }}
          >
            <Box
              sx={{
                position: "absolute",
                inset: 0,
                background: accentGradients[accent],
                opacity: 0.12,
              }}
            />
            <Box sx={{ position: "relative" }}>
              {backLink && (
                <Button
                  component={Link}
                  href={backLink.href}
                  startIcon={<ArrowBackIcon />}
                  variant="text"
                  size="small"
                  sx={{ mb: 3 }}
                >
                  {backLink.label}
                </Button>
              )}
              <Typography variant="h4" fontWeight={700}>
                {title}
              </Typography>
              {subtitle && (
                <Typography
                  variant="body1"
                  color="text.secondary"
                  sx={{ mt: 1, mb: 3 }}
                >
                  {subtitle}
                </Typography>
              )}
              <Stack spacing={2.5}>{children}</Stack>
              {footer && (
                <Box
                  sx={{
                    mt: 4,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    flexWrap: "wrap",
                    gap: 2,
                  }}
                >
                  {footer}
                </Box>
              )}
            </Box>
          </Paper>
        </Stack>
      </Container>
      <ServerStatusCheck />
    </Box>
  );
}

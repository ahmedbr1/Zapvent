"use client";

import Link from "next/link";
import {
  Box,
  Button,
  Card,
  CardActions,
  CardContent,
  Container,
  Stack,
  Typography,
} from "@mui/material";
import Grid from "@mui/material/Grid";
import ArrowForwardIcon from "@mui/icons-material/ArrowForwardRounded";
import SchoolIcon from "@mui/icons-material/SchoolRounded";
import AdminPanelSettingsIcon from "@mui/icons-material/AdminPanelSettingsRounded";
import StorefrontIcon from "@mui/icons-material/StorefrontRounded";
import EventIcon from "@mui/icons-material/EventAvailableRounded";

const roles = [
  {
    title: "Students & Faculty",
    description:
      "Browse and register for workshops, trips, conferences, and gym sessions curated for the GUC community.",
    loginHref: "/login/user",
    registerHref: "/register/user",
    icon: SchoolIcon,
    accent: "linear-gradient(135deg, #1E3A8A 0%, #2563EB 100%)",
  },
  {
    title: "Vendors",
    description:
      "Apply for university bazaars, manage booth assignments, and keep your team in sync with upcoming opportunities.",
    loginHref: "/login/vendor",
    registerHref: "/register/vendor",
    icon: StorefrontIcon,
    accent: "linear-gradient(135deg, #F59E0B 0%, #FBBF24 100%)",
  },
  {
    title: "Administrators",
    description:
      "Verify users, orchestrate events, and keep operations compliant with moderation and auditing tools.",
    loginHref: "/login/admin",
    icon: AdminPanelSettingsIcon,
    accent: "linear-gradient(135deg, #0F172A 0%, #1E293B 100%)",
  },
  {
    title: "Events Office",
    description:
      "Design signature university experiences from bazaars to conferences with collaborative workflows.",
    loginHref: "/login/events-office",
    icon: EventIcon,
    accent: "linear-gradient(135deg, #7C3AED 0%, #A855F7 100%)",
  },
];

export default function LandingPage() {
  return (
    <Box
      sx={{
        minHeight: "100vh",
        background:
          "radial-gradient(circle at top left, rgba(37,99,235,0.12) 0%, transparent 55%), radial-gradient(circle at bottom right, rgba(251,191,36,0.12) 0%, transparent 55%), #F8FAFC",
        display: "flex",
        flexDirection: "column",
      }}
    >
      <Container maxWidth="lg" sx={{ py: { xs: 6, md: 10 }, flexGrow: 1 }}>
        <Stack spacing={8}>
          <Stack
            direction={{ xs: "column", md: "row" }}
            spacing={6}
            alignItems="center"
            justifyContent="space-between"
          >
            <Box maxWidth={560}>
              <Typography
                variant="overline"
                sx={{
                  letterSpacing: 3,
                  fontWeight: 700,
                  color: "primary.main",
                }}
              >
                Zapvent
              </Typography>
              <Typography
                variant="h2"
                fontWeight={800}
                sx={{
                  mt: 2,
                  fontSize: { xs: 38, sm: 48, md: 54 },
                  lineHeight: 1.12,
                  color: "primary.main",
                }}
              >
                University events without the chaos.
              </Typography>
              <Typography
                variant="body1"
                sx={{ mt: 3, color: "text.secondary" }}
              >
                The modern operating system for campus experiences. Coordinate
                events, empower the Events Office, and guide students & vendors
                with a single, accessible hub.
              </Typography>
              <Stack
                direction={{ xs: "column", sm: "row" }}
                spacing={2}
                sx={{ mt: 4 }}
              >
                <Button
                  component={Link}
                  href="/login/user"
                  size="large"
                  endIcon={<ArrowForwardIcon />}
                >
                  Explore Events
                </Button>
                <Button
                  component={Link}
                  href="/login/admin"
                  size="large"
                  variant="outlined"
                  color="secondary"
                >
                  Admin Console
                </Button>
              </Stack>
            </Box>
            <Box
              sx={{
                width: "100%",
                maxWidth: 420,
                p: 4,
                borderRadius: 4,
                background:
                  "linear-gradient(155deg, rgba(30,58,138,0.95) 0%, rgba(15,23,42,0.92) 100%)",
                color: "#F8FAFC",
                boxShadow: "0 32px 80px rgba(15,23,42,0.22)",
              }}
            >
              <Typography variant="h5" fontWeight={700}>
                What&apos;s happening this month?
              </Typography>
              <Typography variant="body2" sx={{ mt: 1.5, opacity: 0.72 }}>
                Glance at curated highlights to kickstart your journey.
              </Typography>
              <Stack spacing={3} sx={{ mt: 3 }}>
                <Box>
                  <Typography fontWeight={600}>Innovation Bazaar</Typography>
                  <Typography variant="body2" sx={{ opacity: 0.7 }}>
                    April 18 · GUC Cairo · 30+ vendors
                  </Typography>
                </Box>
                <DividerLight />
                <Box>
                  <Typography fontWeight={600}>
                    Faculty Wellness Retreat
                  </Typography>
                  <Typography variant="body2" sx={{ opacity: 0.7 }}>
                    April 21 · Soma Bay · Limited seats
                  </Typography>
                </Box>
                <DividerLight />
                <Box>
                  <Typography fontWeight={600}>
                    AI in Dentistry Workshop
                  </Typography>
                  <Typography variant="body2" sx={{ opacity: 0.7 }}>
                    April 24 · Lab 3B · Prof. Hamed
                  </Typography>
                </Box>
              </Stack>
            </Box>
          </Stack>

          <Box>
            <Typography
              variant="h5"
              fontWeight={700}
              sx={{
                mb: 3,
                color: "text.primary",
                textAlign: { xs: "center", md: "left" },
              }}
            >
              Choose your portal
            </Typography>
            <Grid container spacing={3}>
              {roles.map((role) => {
                const Icon = role.icon;
                return (
                  <Grid key={role.title} size={{ xs: 12, sm: 6 }}>
                    <Card
                      sx={{
                        height: "100%",
                        position: "relative",
                        overflow: "hidden",
                        display: "flex",
                        flexDirection: "column",
                      }}
                    >
                      <Box
                        sx={{
                          position: "absolute",
                          inset: 0,
                          bgcolor: "rgba(15,23,42,0.02)",
                          backgroundImage: role.accent,
                          opacity: 0.12,
                        }}
                      />
                      <CardContent sx={{ position: "relative", flexGrow: 1 }}>
                        <Box
                          sx={{
                            width: 52,
                            height: 52,
                            borderRadius: 2,
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                            bgcolor: "rgba(30,58,138,0.08)",
                            mb: 2,
                          }}
                        >
                          <Icon color="primary" />
                        </Box>
                        <Typography gutterBottom variant="h6" fontWeight={700}>
                          {role.title}
                        </Typography>
                        <Typography variant="body2" color="text.secondary">
                          {role.description}
                        </Typography>
                      </CardContent>
                      <CardActions sx={{ position: "relative", px: 3, pb: 3 }}>
                        <Button
                          component={Link}
                          href={role.loginHref}
                          endIcon={<ArrowForwardIcon />}
                        >
                          Log in
                        </Button>
                        {"registerHref" in role && role.registerHref ? (
                          <Button
                            component={Link}
                            href={role.registerHref}
                            variant="text"
                            color="secondary"
                          >
                            Register
                          </Button>
                        ) : null}
                      </CardActions>
                    </Card>
                  </Grid>
                );
              })}
            </Grid>
          </Box>

          <Stack spacing={2} sx={{ mb: 6 }}>
            <Typography variant="h6" fontWeight={600} textAlign="center">
              Designed for every campus team
            </Typography>
            <Stack
              direction={{ xs: "column", md: "row" }}
              spacing={3}
              justifyContent="center"
              alignItems="stretch"
            >
              <ValueCard
                title="Unified workflows"
                description="Trigger approvals, track vendors, and manage event logistics without tab overload."
              />
              <ValueCard
                title="Trustworthy data"
                description="Strong permissions, audit-ready logs, and clear visibility into every action."
              />
              <ValueCard
                title="Campus-first UX"
                description="Optimized for hectic schedules with mobile-friendly design and fast interactions."
              />
            </Stack>
          </Stack>
        </Stack>
      </Container>
      <Box
        component="footer"
        sx={{ py: 3, borderTop: "1px solid rgba(15,23,42,0.08)" }}
      >
        <Container maxWidth="lg">
          <Stack
            direction={{ xs: "column", sm: "row" }}
            spacing={2}
            alignItems={{ xs: "flex-start", sm: "center" }}
            justifyContent="space-between"
          >
            <Typography variant="body2" color="text.secondary">
              © {new Date().getFullYear()} Zapvent · Built for the German
              University in Cairo.
            </Typography>
            <Stack direction="row" spacing={2}>
              <Button component={Link} href="/login/admin" variant="text">
                Admin Login
              </Button>
              <Button component={Link} href="/register/vendor" variant="text">
                Vendor Onboarding
              </Button>
            </Stack>
          </Stack>
        </Container>
      </Box>
    </Box>
  );
}

function DividerLight() {
  return (
    <Box
      sx={{
        height: 1,
        backgroundColor: "rgba(248,250,252,0.25)",
      }}
    />
  );
}

interface ValueCardProps {
  title: string;
  description: string;
}

function ValueCard({ title, description }: ValueCardProps) {
  return (
    <Card
      sx={{
        flex: 1,
        p: 3,
        borderRadius: 3,
        background: "#FFFFFF",
        boxShadow: "0 16px 40px rgba(15,23,42,0.08)",
      }}
    >
      <Typography variant="subtitle1" fontWeight={700} gutterBottom>
        {title}
      </Typography>
      <Typography variant="body2" color="text.secondary">
        {description}
      </Typography>
    </Card>
  );
}

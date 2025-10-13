"use client";

import { Box, Container, Typography, Button, Grid } from "@mui/material";
import { useRouter } from "next/navigation";
import Navbar from "./components/Navbar";
import HeroSection from "./components/HeroSection";
import RoleCards from "./components/RoleCards";
import Footer from "./components/Footer";

export default function LandingPage() {
  const router = useRouter();

  return (
    <>
      <Navbar />
      <HeroSection />

      <Container sx={{ py: 8 }}>
        <Typography variant="h4" align="center" gutterBottom fontWeight={600}>
          Choose Your Role
        </Typography>
        <RoleCards />
      </Container>

      <Box textAlign="center" sx={{ py: 6 }}>
        <Typography variant="h6" gutterBottom>
          Ready to get started?
        </Typography>
        <Button
          variant="contained"
          color="primary"
          size="large"
          onClick={() => router.push("/register")}
        >
          Register Now
        </Button>
      </Box>

      <Footer />
    </>
  );
}

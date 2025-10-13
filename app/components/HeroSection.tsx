"use client";

import { Box, Typography, Button, Container } from "@mui/material";
import { useRouter } from "next/navigation";

export default function HeroSection() {
  const router = useRouter();

  return (
    <Box
      sx={{
        height: "70vh",
        background: "linear-gradient(to right, #1976d2, #42a5f5)",
        color: "#fff",
        display: "flex",
        alignItems: "center",
      }}
    >
      <Container>
        <Typography variant="h2" fontWeight={700} gutterBottom>
          Simplify University Events
        </Typography>
        <Typography variant="h6" sx={{ mb: 4 }}>
          Manage, organize, and participate in campus activities effortlessly.
        </Typography>
        <Button
          variant="contained"
          color="secondary"
          size="large"
          onClick={() => router.push("/register")}
        >
          Get Started
        </Button>
      </Container>
    </Box>
  );
}

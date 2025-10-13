"use client";

import { AppBar, Toolbar, Typography, Button, Box } from "@mui/material";
import { useRouter } from "next/navigation";

export default function Navbar() {
  const router = useRouter();

  return (
    <AppBar position="static" color="primary">
      <Toolbar sx={{ display: "flex", justifyContent: "space-between" }}>
        <Typography
          variant="h6"
          sx={{ cursor: "pointer" }}
          onClick={() => router.push("/landing")}
        >
          Event Management System
        </Typography>

        <Box>
          <Button color="inherit" onClick={() => router.push("/login")}>
            Login
          </Button>
          <Button color="inherit" onClick={() => router.push("/register")}>
            Register
          </Button>
        </Box>
      </Toolbar>
    </AppBar>
  );
}

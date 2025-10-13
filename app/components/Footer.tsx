"use client";

import { Box, Typography } from "@mui/material";

export default function Footer() {
  return (
    <Box
      sx={{
        py: 3,
        textAlign: "center",
        backgroundColor: "#f5f5f5",
        mt: 6,
      }}
    >
      <Typography variant="body2" color="text.secondary">
        © {new Date().getFullYear()} GIU Event Management System. All rights reserved.
      </Typography>
    </Box>
  );
}

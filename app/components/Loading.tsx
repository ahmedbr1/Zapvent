"use client";

import { Box, CircularProgress, Typography } from "@mui/material";

interface LoadingProps {
  message?: string;
}

export default function Loading({ message = "Loading..." }: LoadingProps) {
  return (
    <Box
      display="flex"
      flexDirection="column"
      alignItems="center"
      justifyContent="center"
      minHeight="400px"
      gap={2}
    >
      <CircularProgress size={60} />
      <Typography variant="h6" color="text.secondary">
        {message}
      </Typography>
    </Box>
  );
}

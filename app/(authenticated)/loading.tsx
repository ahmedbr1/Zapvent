import { Box, CircularProgress, Typography, Stack } from "@mui/material";

export default function AuthenticatedLoading() {
  return (
    <Box
      sx={{
        display: "flex",
        justifyContent: "center",
        alignItems: "center",
        minHeight: "60vh",
      }}
    >
      <Stack spacing={2} alignItems="center">
        <CircularProgress
          size={44}
          thickness={4}
          sx={{
            color: "primary.main",
          }}
        />
        <Typography
          variant="body2"
          color="text.secondary"
          sx={{ opacity: 0.7 }}
        >
          Loading...
        </Typography>
      </Stack>
    </Box>
  );
}

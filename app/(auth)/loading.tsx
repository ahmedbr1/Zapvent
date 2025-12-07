import { Box, CircularProgress, Typography, Stack } from "@mui/material";

export default function AuthLoading() {
  return (
    <Box
      sx={{
        display: "flex",
        flexDirection: "column",
        justifyContent: "center",
        alignItems: "center",
        minHeight: "100vh",
        background: "linear-gradient(180deg, #F8FAFC 0%, #F1F5F9 100%)",
        gap: 2,
      }}
    >
      <CircularProgress
        size={40}
        thickness={4}
        sx={{ color: "primary.main" }}
      />
      <Stack spacing={0.5} alignItems="center">
        <Typography variant="body2" color="text.secondary" fontWeight={500}>
          Signing you in...
        </Typography>
      </Stack>
    </Box>
  );
}

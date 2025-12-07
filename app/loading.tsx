import { Box, CircularProgress, Stack, Typography } from "@mui/material";

export default function RootLoading() {
  return (
    <Box
      sx={{
        display: "flex",
        justifyContent: "center",
        alignItems: "center",
        minHeight: "100vh",
        background: "linear-gradient(180deg, #F8FAFC 0%, #F1F5F9 100%)",
      }}
    >
      <Stack spacing={2} alignItems="center">
        <CircularProgress
          size={44}
          thickness={4}
          sx={{ color: "primary.main" }}
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

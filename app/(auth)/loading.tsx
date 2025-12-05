import { Box, CircularProgress, Typography } from "@mui/material";

export default function AuthLoading() {
  return (
    <Box
      sx={{
        display: "flex",
        flexDirection: "column",
        justifyContent: "center",
        alignItems: "center",
        minHeight: "100vh",
        backgroundColor: "#F8FAFC",
        gap: 2,
      }}
    >
      <CircularProgress size={36} />
      <Typography variant="body2" color="text.secondary">
        Signing you in...
      </Typography>
    </Box>
  );
}

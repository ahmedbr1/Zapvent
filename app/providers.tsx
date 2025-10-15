"use client";

import { ThemeProvider } from "@mui/material/styles";
import CssBaseline from "@mui/material/CssBaseline";
import theme from "@/lib/theme";
import { AuthProvider } from "./contexts/AuthContext";

export default function Providers({ children }: { children: React.ReactNode }) {
  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <AuthProvider>{children}</AuthProvider>
    </ThemeProvider>
  );
}

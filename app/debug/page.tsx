"use client";

import { useState } from "react";
import { Button, Box, Typography, Paper, Alert } from "@mui/material";

export default function DebugPage() {
  const [result, setResult] = useState<string>("");
  const [loading, setLoading] = useState(false);

  const testHealthCheck = async () => {
    setLoading(true);
    setResult("");
    try {
      const response = await fetch("http://localhost:4000/api/health", {
        method: "GET",
        credentials: "include",
      });
      const data = await response.json();
      setResult(
        `✅ SUCCESS: ${response.status}\n${JSON.stringify(data, null, 2)}`
      );
    } catch (error) {
      setResult(
        `❌ ERROR: ${error instanceof Error ? error.message : String(error)}`
      );
    } finally {
      setLoading(false);
    }
  };

  const testApiClient = async () => {
    setLoading(true);
    setResult("");
    try {
      const { apiFetch } = await import("@/lib/api-client");
      const data = await apiFetch<{ ok: boolean }>("/health");
      setResult(`✅ SUCCESS via api-client:\n${JSON.stringify(data, null, 2)}`);
    } catch (error) {
      setResult(
        `❌ ERROR: ${error instanceof Error ? error.message : String(error)}`
      );
    } finally {
      setLoading(false);
    }
  };

  const checkConfig = () => {
    setResult(
      `API_BASE_URL: ${process.env.NEXT_PUBLIC_API_BASE_URL || "http://localhost:4000/api"}\n\nOrigin: ${typeof window !== "undefined" ? window.location.origin : "SSR"}`
    );
  };

  return (
    <Box sx={{ p: 4 }}>
      <Typography variant="h4" gutterBottom>
        API Debug Page
      </Typography>

      <Alert severity="info" sx={{ mb: 2 }}>
        This page helps diagnose API connectivity issues
      </Alert>

      <Paper sx={{ p: 3, mb: 2 }}>
        <Box sx={{ display: "flex", gap: 2, mb: 2 }}>
          <Button
            variant="contained"
            onClick={testHealthCheck}
            disabled={loading}
          >
            Test Health Endpoint (Direct)
          </Button>
          <Button
            variant="contained"
            onClick={testApiClient}
            disabled={loading}
          >
            Test via API Client
          </Button>
          <Button variant="outlined" onClick={checkConfig}>
            Check Config
          </Button>
        </Box>

        {result && (
          <Paper
            sx={{
              p: 2,
              bgcolor: "grey.900",
              color: "white",
              fontFamily: "monospace",
              whiteSpace: "pre-wrap",
              wordBreak: "break-all",
            }}
          >
            {result}
          </Paper>
        )}
      </Paper>

      <Alert severity="warning">
        <Typography variant="subtitle2" gutterBottom>
          Things to check:
        </Typography>
        <ul>
          <li>Is the backend server running on port 4000?</li>
          <li>Check terminal for &quot;✅ API listening on :4000&quot;</li>
          <li>Check browser console for CORS errors</li>
          <li>
            Try opening http://localhost:4000/api/health directly in browser
          </li>
        </ul>
      </Alert>
    </Box>
  );
}

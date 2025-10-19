"use client";

import { useEffect, useState } from "react";
import Alert from "@mui/material/Alert";
import AlertTitle from "@mui/material/AlertTitle";
import Box from "@mui/material/Box";
import { API_BASE_URL } from "@/lib/config";

export function ServerStatusCheck() {
  const [isOnline, setIsOnline] = useState<boolean | null>(null);

  useEffect(() => {
    const checkServer = async () => {
      try {
        const response = await fetch(
          `${API_BASE_URL.replace("/api", "")}/api/health`,
          {
            method: "GET",
          }
        );
        setIsOnline(response.ok);
      } catch {
        setIsOnline(false);
      }
    };

    checkServer();
    const interval = setInterval(checkServer, 10000); // Check every 10 seconds

    return () => clearInterval(interval);
  }, []);

  if (isOnline === null || isOnline === true) {
    return null; // Don't show anything if server is online or still checking
  }

  return (
    <Box
      sx={{
        position: "fixed",
        bottom: 16,
        right: 16,
        zIndex: 9999,
        maxWidth: 400,
      }}
    >
      <Alert severity="error">
        <AlertTitle>Backend Server Offline</AlertTitle>
        Cannot connect to the backend server at <strong>{API_BASE_URL}</strong>.
        <br />
        Please ensure:
        <ul style={{ margin: "8px 0", paddingLeft: "20px" }}>
          <li>MongoDB is running</li>
          <li>
            Run <code>npm run dev</code> to start both servers
          </li>
          <li>
            Check the <code>.env</code> file is configured
          </li>
        </ul>
      </Alert>
    </Box>
  );
}

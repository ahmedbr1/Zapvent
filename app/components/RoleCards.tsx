"use client";

import { Grid, Card, CardContent, Typography, Button } from "@mui/material";
import { useRouter } from "next/navigation";

const roles = [
  { title: "Student", desc: "Browse and register for events and workshops." },
  { title: "Doctor", desc: "Create and manage academic events." },
  { title: "Admin", desc: "Approve events, manage users, and vendors." },
  { title: "Vendor", desc: "Join bazaars or fairs and upload documents." },
];

export default function RoleCards() {
  const router = useRouter();

  return (
    <Grid container spacing={4} sx={{ mt: 2 }}>
      {roles.map((role) => (
        <Grid item xs={12} sm={6} md={3} key={role.title}>
          <Card
            sx={{
              height: "100%",
              display: "flex",
              flexDirection: "column",
              justifyContent: "space-between",
              transition: "0.3s",
              "&:hover": { transform: "scale(1.05)" },
            }}
          >
            <CardContent>
              <Typography variant="h6" fontWeight={600}>
                {role.title}
              </Typography>
              <Typography variant="body2" sx={{ mt: 1, mb: 2 }}>
                {role.desc}
              </Typography>
              <Button
                fullWidth
                variant="outlined"
                onClick={() => router.push("/register")}
              >
                Continue as {role.title}
              </Button>
            </CardContent>
          </Card>
        </Grid>
      ))}
    </Grid>
  );
}

"use client";

import { useState } from "react";
import {
  Box,
  Typography,
  Paper,
  TextField,
  Button,
  MenuItem,
  Grid,
  Alert,
} from "@mui/material";
import {
  Dashboard as DashboardIcon,
  Event as EventIcon,
  Add,
} from "@mui/icons-material";
import { LocalizationProvider } from "@mui/x-date-pickers/LocalizationProvider";
import { DatePicker } from "@mui/x-date-pickers/DatePicker";
import { AdapterDayjs } from "@mui/x-date-pickers/AdapterDayjs";
import dayjs, { Dayjs } from "dayjs";
import DashboardLayout from "@/app/components/DashboardLayout";
import { eventsApi } from "@/lib/api";
import { EventType, Location, Faculty, FundingSource } from "@/lib/types";

export default function EventsOfficeDashboard() {
  const [success, setSuccess] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const [formData, setFormData] = useState({
    name: "",
    description: "",
    eventType: EventType.BAZAAR,
    location: Location.GUC_CAIRO,
    capacity: "",
    price: "",
    fundingSource: FundingSource.GUC,
    faculty: Faculty.IET,
    requiredBudget: "",
    websiteLink: "",
    fullAgenda: "",
  });

  const [dates, setDates] = useState({
    startDate: dayjs() as Dayjs | null,
    endDate: dayjs().add(1, "day") as Dayjs | null,
    registrationDeadline: dayjs().subtract(1, "day") as Dayjs | null,
  });

  const menuItems = [
    {
      text: "Dashboard",
      icon: <DashboardIcon />,
      path: "/events-office/dashboard",
    },
    {
      text: "My Events",
      icon: <EventIcon />,
      path: "/events-office/events",
    },
  ];

  const handleChange =
    (field: string) => (e: React.ChangeEvent<HTMLInputElement>) => {
      setFormData({ ...formData, [field]: e.target.value });
    };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setSuccess("");
    setLoading(true);

    try {
      const eventData = {
        name: formData.name,
        description: formData.description,
        eventType: formData.eventType,
        location: formData.location,
        capacity: formData.capacity ? parseInt(formData.capacity) : undefined,
        price: formData.price ? parseFloat(formData.price) : undefined,
        fundingSource: formData.fundingSource,
        faculty: formData.faculty,
        requiredBudget: formData.requiredBudget
          ? parseFloat(formData.requiredBudget)
          : undefined,
        websiteLink: formData.websiteLink || undefined,
        fullAgenda: formData.fullAgenda || undefined,
        startDate: dates.startDate?.toISOString(),
        endDate: dates.endDate?.toISOString(),
        registrationDeadline: dates.registrationDeadline?.toISOString(),
      };

      const response =
        formData.eventType === EventType.BAZAAR
          ? await eventsApi.createBazaar(eventData)
          : await eventsApi.createTrip(eventData);

      if (response.success) {
        setSuccess("Event created successfully!");
        // Reset form
        setFormData({
          name: "",
          description: "",
          eventType: EventType.BAZAAR,
          location: Location.GUC_CAIRO,
          capacity: "",
          price: "",
          fundingSource: FundingSource.GUC,
          faculty: Faculty.IET,
          requiredBudget: "",
          websiteLink: "",
          fullAgenda: "",
        });
        setDates({
          startDate: dayjs(),
          endDate: dayjs().add(1, "day"),
          registrationDeadline: dayjs().subtract(1, "day"),
        });
      } else {
        setError(response.message || "Failed to create event");
      }
    } catch (err: any) {
      setError(err.message || "Failed to create event");
    } finally {
      setLoading(false);
    }
  };

  return (
    <DashboardLayout title="Events Office Dashboard" menuItems={menuItems}>
      <Box mb={4}>
        <Typography variant="h4" gutterBottom fontWeight="bold">
          Create New Event
        </Typography>
        <Typography variant="body1" color="text.secondary">
          Create and manage university events and bazaars
        </Typography>
      </Box>

      {success && (
        <Alert severity="success" sx={{ mb: 3 }} onClose={() => setSuccess("")}>
          {success}
        </Alert>
      )}

      {error && (
        <Alert severity="error" sx={{ mb: 3 }} onClose={() => setError("")}>
          {error}
        </Alert>
      )}

      <Paper sx={{ p: 4 }}>
        <form onSubmit={handleSubmit}>
          <Grid container spacing={3}>
            <Grid size={{ xs: 12 }}>
              <TextField
                fullWidth
                label="Event Name"
                value={formData.name}
                onChange={handleChange("name")}
                required
              />
            </Grid>

            <Grid size={{ xs: 12 }}>
              <TextField
                fullWidth
                label="Description"
                value={formData.description}
                onChange={handleChange("description")}
                multiline
                rows={4}
                required
              />
            </Grid>

            <Grid size={{ xs: 12, md: 6 }}>
              <TextField
                fullWidth
                select
                label="Event Type"
                value={formData.eventType}
                onChange={handleChange("eventType")}
                required
              >
                <MenuItem value={EventType.BAZAAR}>Bazaar</MenuItem>
                <MenuItem value={EventType.TRIP}>Trip</MenuItem>
                <MenuItem value={EventType.WORKSHOP}>Workshop</MenuItem>
                <MenuItem value={EventType.SEMINAR}>Seminar</MenuItem>
                <MenuItem value={EventType.CONFERENCE}>Conference</MenuItem>
              </TextField>
            </Grid>

            <Grid size={{ xs: 12, md: 6 }}>
              <TextField
                fullWidth
                select
                label="Location"
                value={formData.location}
                onChange={handleChange("location")}
                required
              >
                <MenuItem value={Location.GUC_CAIRO}>GUC Cairo</MenuItem>
                <MenuItem value={Location.GUC_BERLIN}>GUC Berlin</MenuItem>
              </TextField>
            </Grid>

            <Grid size={{ xs: 12, md: 6 }}>
              <TextField
                fullWidth
                select
                label="Faculty"
                value={formData.faculty}
                onChange={handleChange("faculty")}
                required
              >
                <MenuItem value={Faculty.IET}>IET</MenuItem>
                <MenuItem value={Faculty.MEDIA}>Media</MenuItem>
                <MenuItem value={Faculty.PHARMACY}>Pharmacy</MenuItem>
                <MenuItem value={Faculty.BUSINESS}>Business</MenuItem>
                <MenuItem value={Faculty.BIOTECHNOLOGY}>Biotechnology</MenuItem>
              </TextField>
            </Grid>

            <Grid size={{ xs: 12, md: 6 }}>
              <TextField
                fullWidth
                select
                label="Funding Source"
                value={formData.fundingSource}
                onChange={handleChange("fundingSource")}
                required
              >
                <MenuItem value={FundingSource.GUC}>GUC</MenuItem>
                <MenuItem value={FundingSource.EXTERNAL}>External</MenuItem>
              </TextField>
            </Grid>

            <LocalizationProvider dateAdapter={AdapterDayjs}>
              <Grid size={{ xs: 12, md: 4 }}>
                <DatePicker
                  label="Start Date"
                  value={dates.startDate}
                  onChange={(newValue) =>
                    setDates({ ...dates, startDate: newValue })
                  }
                  slotProps={{ textField: { fullWidth: true, required: true } }}
                />
              </Grid>

              <Grid size={{ xs: 12, md: 4 }}>
                <DatePicker
                  label="End Date"
                  value={dates.endDate}
                  onChange={(newValue) =>
                    setDates({ ...dates, endDate: newValue })
                  }
                  slotProps={{ textField: { fullWidth: true, required: true } }}
                />
              </Grid>

              <Grid size={{ xs: 12, md: 4 }}>
                <DatePicker
                  label="Registration Deadline"
                  value={dates.registrationDeadline}
                  onChange={(newValue) =>
                    setDates({ ...dates, registrationDeadline: newValue })
                  }
                  slotProps={{ textField: { fullWidth: true, required: true } }}
                />
              </Grid>
            </LocalizationProvider>

            <Grid size={{ xs: 12, md: 4 }}>
              <TextField
                fullWidth
                label="Capacity"
                type="number"
                value={formData.capacity}
                onChange={handleChange("capacity")}
                helperText="Leave empty for unlimited"
              />
            </Grid>

            <Grid size={{ xs: 12, md: 4 }}>
              <TextField
                fullWidth
                label="Price (EGP)"
                type="number"
                value={formData.price}
                onChange={handleChange("price")}
                helperText="Leave empty for free"
              />
            </Grid>

            <Grid size={{ xs: 12, md: 4 }}>
              <TextField
                fullWidth
                label="Required Budget (EGP)"
                type="number"
                value={formData.requiredBudget}
                onChange={handleChange("requiredBudget")}
              />
            </Grid>

            <Grid size={{ xs: 12 }}>
              <TextField
                fullWidth
                label="Website Link"
                value={formData.websiteLink}
                onChange={handleChange("websiteLink")}
                placeholder="https://..."
              />
            </Grid>

            <Grid size={{ xs: 12 }}>
              <TextField
                fullWidth
                label="Full Agenda"
                value={formData.fullAgenda}
                onChange={handleChange("fullAgenda")}
                multiline
                rows={4}
              />
            </Grid>

            <Grid size={{ xs: 12 }}>
              <Button
                type="submit"
                variant="contained"
                color="secondary"
                size="large"
                startIcon={<Add />}
                disabled={loading}
              >
                {loading ? "Creating..." : "Create Event"}
              </Button>
            </Grid>
          </Grid>
        </form>
      </Paper>
    </DashboardLayout>
  );
}

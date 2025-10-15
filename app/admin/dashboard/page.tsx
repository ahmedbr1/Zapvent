"use client";

import { useEffect, useState } from "react";
import {
  Box,
  Typography,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Button,
  Tabs,
  Tab,
  IconButton,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Alert,
  CircularProgress,
  Chip,
} from "@mui/material";
import {
  Dashboard as DashboardIcon,
  People,
  Business,
  Block,
  CheckCircle,
  Delete,
} from "@mui/icons-material";
import DashboardLayout from "@/app/components/DashboardLayout";
import StatusChip from "@/app/components/StatusChip";
import { usersApi, vendorsApi } from "@/lib/api";
import { User, Vendor } from "@/lib/types";

export default function AdminDashboard() {
  const [tabValue, setTabValue] = useState(0);
  const [users, setUsers] = useState<User[]>([]);
  const [vendors, setVendors] = useState<Vendor[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [confirmDialog, setConfirmDialog] = useState<{
    open: boolean;
    title: string;
    message: string;
    action: () => void;
  }>({ open: false, title: "", message: "", action: () => {} });

  const menuItems = [
    {
      text: "Dashboard",
      icon: <DashboardIcon />,
      path: "/admin/dashboard",
    },
    {
      text: "Users",
      icon: <People />,
      path: "/admin/dashboard",
    },
    {
      text: "Vendors",
      icon: <Business />,
      path: "/admin/dashboard",
    },
  ];

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      setError("");

      const [usersResponse, vendorsResponse] = await Promise.all([
        usersApi.getAll(),
        vendorsApi.getAll(),
      ]);

      if (usersResponse.success && usersResponse.data) {
        setUsers(usersResponse.data);
      }
      if (vendorsResponse.success && vendorsResponse.data) {
        setVendors(vendorsResponse.data);
      }
    } catch (err: any) {
      setError(err.message || "Failed to load data");
    } finally {
      setLoading(false);
    }
  };

  const handleBlockUser = async (userId: string) => {
    setConfirmDialog({
      open: true,
      title: "Block User",
      message: "Are you sure you want to block this user?",
      action: async () => {
        try {
          await usersApi.blockUser(userId);
          await loadData();
          setConfirmDialog({ ...confirmDialog, open: false });
        } catch (err: any) {
          alert(err.message || "Failed to block user");
        }
      },
    });
  };

  const handleUnblockUser = async (userId: string) => {
    try {
      await usersApi.unblockUser(userId);
      await loadData();
    } catch (err: any) {
      alert(err.message || "Failed to unblock user");
    }
  };

  const handleDeleteUser = async (userId: string) => {
    setConfirmDialog({
      open: true,
      title: "Delete User",
      message:
        "Are you sure you want to delete this user? This action cannot be undone.",
      action: async () => {
        try {
          await usersApi.delete(userId);
          await loadData();
          setConfirmDialog({ ...confirmDialog, open: false });
        } catch (err: any) {
          alert(err.message || "Failed to delete user");
        }
      },
    });
  };

  const handleApproveVendor = async (vendorId: string) => {
    try {
      await vendorsApi.approve(vendorId);
      await loadData();
    } catch (err: any) {
      alert(err.message || "Failed to approve vendor");
    }
  };

  const handleRejectVendor = async (vendorId: string) => {
    setConfirmDialog({
      open: true,
      title: "Reject Vendor",
      message: "Are you sure you want to reject this vendor application?",
      action: async () => {
        try {
          await vendorsApi.reject(vendorId);
          await loadData();
          setConfirmDialog({ ...confirmDialog, open: false });
        } catch (err: any) {
          alert(err.message || "Failed to reject vendor");
        }
      },
    });
  };

  return (
    <DashboardLayout title="Admin Dashboard" menuItems={menuItems}>
      <Box mb={4}>
        <Typography variant="h4" gutterBottom fontWeight="bold">
          System Management
        </Typography>
        <Typography variant="body1" color="text.secondary">
          Manage users, vendors, and system operations
        </Typography>
      </Box>

      {error && (
        <Alert severity="error" sx={{ mb: 3 }}>
          {error}
        </Alert>
      )}

      <Paper sx={{ mb: 3 }}>
        <Tabs
          value={tabValue}
          onChange={(_, newValue) => setTabValue(newValue)}
        >
          <Tab label="Users" />
          <Tab label="Vendors" />
        </Tabs>
      </Paper>

      {loading ? (
        <Box display="flex" justifyContent="center" py={8}>
          <CircularProgress />
        </Box>
      ) : (
        <>
          {tabValue === 0 && (
            <TableContainer component={Paper}>
              <Table>
                <TableHead>
                  <TableRow>
                    <TableCell>Name</TableCell>
                    <TableCell>Email</TableCell>
                    <TableCell>Role</TableCell>
                    <TableCell>Faculty</TableCell>
                    <TableCell>Status</TableCell>
                    <TableCell align="right">Actions</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {users.map((user) => (
                    <TableRow key={user._id}>
                      <TableCell>{user.name}</TableCell>
                      <TableCell>{user.email}</TableCell>
                      <TableCell>
                        <Chip label={user.role} size="small" />
                      </TableCell>
                      <TableCell>{user.faculty}</TableCell>
                      <TableCell>
                        <StatusChip status={user.status} />
                      </TableCell>
                      <TableCell align="right">
                        {user.status === "Active" ? (
                          <IconButton
                            size="small"
                            color="error"
                            onClick={() => handleBlockUser(user._id)}
                            title="Block user"
                          >
                            <Block />
                          </IconButton>
                        ) : (
                          <IconButton
                            size="small"
                            color="success"
                            onClick={() => handleUnblockUser(user._id)}
                            title="Unblock user"
                          >
                            <CheckCircle />
                          </IconButton>
                        )}
                        <IconButton
                          size="small"
                          color="error"
                          onClick={() => handleDeleteUser(user._id)}
                          title="Delete user"
                        >
                          <Delete />
                        </IconButton>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
          )}

          {tabValue === 1 && (
            <TableContainer component={Paper}>
              <Table>
                <TableHead>
                  <TableRow>
                    <TableCell>Business Name</TableCell>
                    <TableCell>Email</TableCell>
                    <TableCell>Phone</TableCell>
                    <TableCell>Status</TableCell>
                    <TableCell align="right">Actions</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {vendors.map((vendor) => (
                    <TableRow key={vendor._id}>
                      <TableCell>{vendor.businessName}</TableCell>
                      <TableCell>{vendor.email}</TableCell>
                      <TableCell>{vendor.phoneNumber}</TableCell>
                      <TableCell>
                        <StatusChip status={vendor.status} />
                      </TableCell>
                      <TableCell align="right">
                        {vendor.status === "pending" && (
                          <>
                            <Button
                              size="small"
                              color="success"
                              onClick={() => handleApproveVendor(vendor._id)}
                              sx={{ mr: 1 }}
                            >
                              Approve
                            </Button>
                            <Button
                              size="small"
                              color="error"
                              onClick={() => handleRejectVendor(vendor._id)}
                            >
                              Reject
                            </Button>
                          </>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
          )}
        </>
      )}

      <Dialog
        open={confirmDialog.open}
        onClose={() => setConfirmDialog({ ...confirmDialog, open: false })}
      >
        <DialogTitle>{confirmDialog.title}</DialogTitle>
        <DialogContent>{confirmDialog.message}</DialogContent>
        <DialogActions>
          <Button
            onClick={() => setConfirmDialog({ ...confirmDialog, open: false })}
          >
            Cancel
          </Button>
          <Button
            onClick={confirmDialog.action}
            color="error"
            variant="contained"
          >
            Confirm
          </Button>
        </DialogActions>
      </Dialog>
    </DashboardLayout>
  );
}

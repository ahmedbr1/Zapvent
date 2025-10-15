"use client";

import { ReactNode, useState } from "react";
import {
  Box,
  AppBar,
  Toolbar,
  Typography,
  IconButton,
  Drawer,
  List,
  ListItem,
  ListItemIcon,
  ListItemText,
  ListItemButton,
  Avatar,
  Menu,
  MenuItem,
  Divider,
  useMediaQuery,
  useTheme,
} from "@mui/material";
import {
  Menu as MenuIcon,
  AccountCircle,
  Logout,
  CalendarMonth,
} from "@mui/icons-material";
import { useRouter } from "next/navigation";
import { useAuth } from "@/app/contexts/AuthContext";

interface DashboardLayoutProps {
  children: ReactNode;
  title: string;
  menuItems: {
    text: string;
    icon: ReactNode;
    path: string;
  }[];
}

export default function DashboardLayout({
  children,
  title,
  menuItems,
}: DashboardLayoutProps) {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down("md"));
  const router = useRouter();
  const { user, logout } = useAuth();

  const [drawerOpen, setDrawerOpen] = useState(!isMobile);
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);

  const drawerWidth = 240;

  const handleProfileMenuOpen = (event: React.MouseEvent<HTMLElement>) => {
    setAnchorEl(event.currentTarget);
  };

  const handleProfileMenuClose = () => {
    setAnchorEl(null);
  };

  const handleLogout = async () => {
    await logout();
    handleProfileMenuClose();
  };

  const drawer = (
    <Box>
      <Toolbar sx={{ backgroundColor: "primary.main" }}>
        <CalendarMonth sx={{ mr: 1, color: "white" }} />
        <Typography variant="h6" sx={{ color: "white", fontWeight: "bold" }}>
          Zapvent
        </Typography>
      </Toolbar>
      <Divider />
      <List>
        {menuItems.map((item) => (
          <ListItem key={item.text} disablePadding>
            <ListItemButton onClick={() => router.push(item.path)}>
              <ListItemIcon>{item.icon}</ListItemIcon>
              <ListItemText primary={item.text} />
            </ListItemButton>
          </ListItem>
        ))}
      </List>
    </Box>
  );

  return (
    <Box sx={{ display: "flex", minHeight: "100vh" }}>
      <AppBar
        position="fixed"
        sx={{
          width: { md: `calc(100% - ${drawerWidth}px)` },
          ml: { md: `${drawerWidth}px` },
        }}
      >
        <Toolbar>
          {isMobile && (
            <IconButton
              color="inherit"
              edge="start"
              onClick={() => setDrawerOpen(!drawerOpen)}
              sx={{ mr: 2 }}
            >
              <MenuIcon />
            </IconButton>
          )}

          <Typography variant="h6" component="h1" sx={{ flexGrow: 1 }}>
            {title}
          </Typography>

          <IconButton
            size="large"
            edge="end"
            onClick={handleProfileMenuOpen}
            color="inherit"
          >
            <Avatar sx={{ width: 32, height: 32, bgcolor: "secondary.main" }}>
              {user?.email?.charAt(0).toUpperCase() || "U"}
            </Avatar>
          </IconButton>
        </Toolbar>
      </AppBar>

      <Menu
        anchorEl={anchorEl}
        open={Boolean(anchorEl)}
        onClose={handleProfileMenuClose}
        anchorOrigin={{
          vertical: "bottom",
          horizontal: "right",
        }}
        transformOrigin={{
          vertical: "top",
          horizontal: "right",
        }}
      >
        <MenuItem disabled>
          <AccountCircle sx={{ mr: 2 }} />
          {user?.email}
        </MenuItem>
        <Divider />
        <MenuItem onClick={handleLogout}>
          <Logout sx={{ mr: 2 }} />
          Logout
        </MenuItem>
      </Menu>

      <Box
        component="nav"
        sx={{ width: { md: drawerWidth }, flexShrink: { md: 0 } }}
      >
        {isMobile ? (
          <Drawer
            variant="temporary"
            open={drawerOpen}
            onClose={() => setDrawerOpen(false)}
            ModalProps={{
              keepMounted: true,
            }}
            sx={{
              "& .MuiDrawer-paper": {
                boxSizing: "border-box",
                width: drawerWidth,
              },
            }}
          >
            {drawer}
          </Drawer>
        ) : (
          <Drawer
            variant="permanent"
            sx={{
              "& .MuiDrawer-paper": {
                boxSizing: "border-box",
                width: drawerWidth,
              },
            }}
            open
          >
            {drawer}
          </Drawer>
        )}
      </Box>

      <Box
        component="main"
        sx={{
          flexGrow: 1,
          p: 3,
          width: { md: `calc(100% - ${drawerWidth}px)` },
          mt: 8,
          backgroundColor: "background.default",
          minHeight: "100vh",
        }}
      >
        {children}
      </Box>
    </Box>
  );
}

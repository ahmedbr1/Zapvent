"use client";

import { useMemo, useState } from "react";
import type { ReactNode } from "react";
import {
  AppBar,
  Avatar,
  Badge,
  Box,
  Divider,
  Drawer,
  IconButton,
  List,
  ListItemButton,
  ListItemIcon,
  ListItemText,
  Menu,
  MenuItem,
  Toolbar,
  Tooltip,
  Typography,
  useMediaQuery,
} from "@mui/material";
import MenuIcon from "@mui/icons-material/MenuRounded";
import NotificationsIcon from "@mui/icons-material/NotificationsRounded";
import LogoutIcon from "@mui/icons-material/LogoutRounded";
import PersonIcon from "@mui/icons-material/PersonRounded";
import ChevronLeftIcon from "@mui/icons-material/ChevronLeftRounded";
import { useTheme } from "@mui/material/styles";
import { usePathname, useRouter } from "next/navigation";
import { useSnackbar } from "notistack";
import { useAuth } from "@/components/providers/AuthProvider";
import { AuthRole } from "@/lib/types";
import { getNavItemsForRole } from "./nav-config";
import { BreadcrumbsTrail } from "./BreadcrumbsTrail";
import { getLoginPathForRole } from "@/lib/routing";

const drawerWidth = 264;

interface AppShellProps {
  children: ReactNode;
  pageTitle?: string;
  actions?: ReactNode;
  hideNavigation?: boolean;
}

export function AppShell({
  children,
  pageTitle,
  actions,
  hideNavigation = false,
}: AppShellProps) {
  const theme = useTheme();
  const isLarge = useMediaQuery(theme.breakpoints.up("lg"));
  const [mobileOpen, setMobileOpen] = useState(false);
  const { session, clearSession } = useAuth();
  const { enqueueSnackbar } = useSnackbar();
  const router = useRouter();
  const pathname = usePathname();
  const [anchorEl, setAnchorEl] = useState<HTMLElement | null>(null);

  const navItems = useMemo(
    () => getNavItemsForRole(session?.user.role ?? null, session?.user.userRole ?? null),
    [session?.user.role, session?.user.userRole]
  );

  const roleLabel = useMemo(() => {
    if (!session?.user) {
      return "Guest";
    }

    if (session.user.role === AuthRole.User && session.user.userRole) {
      return session.user.userRole;
    }

    return session.user.role ?? "Guest";
  }, [session?.user?.role, session?.user?.userRole]);

  const currentItem = navItems.find((item) => pathname.startsWith(item.href));
  const title = pageTitle ?? currentItem?.label ?? "Overview";

  const handleDrawerToggle = () => {
    setMobileOpen((prev) => !prev);
  };

  const handleMenuOpen = (event: React.MouseEvent<HTMLButtonElement>) => {
    setAnchorEl(event.currentTarget);
  };

  const handleMenuClose = () => setAnchorEl(null);

  const handleNavigate = (href: string) => {
    handleMenuClose();
    setMobileOpen(false);
    router.push(href);
  };

  const handleLogout = async () => {
    handleMenuClose();
    try {
      await fetch("/api/logout", { method: "POST" }).catch(() => undefined);
    } finally {
      clearSession();
      enqueueSnackbar("You have been logged out.", { variant: "info" });
      const role = session?.user.role ?? null;
      if (role) {
        router.replace(getLoginPathForRole(role));
      } else {
        router.replace("/login/user");
      }
    }
  };

  const drawerContent = (
    <Box
      sx={{
        height: "100%",
        background:
          "linear-gradient(180deg, rgba(15,23,42,0.95) 0%, rgba(30,41,59,0.98) 100%)",
        color: "#E2E8F0",
      }}
    >
      <Box
        display="flex"
        alignItems="center"
        justifyContent="space-between"
        px={3}
        py={2}
      >
        <Typography variant="h6" fontWeight={700}>
          Zapvent
        </Typography>
        {!isLarge && (
          <IconButton onClick={handleDrawerToggle} sx={{ color: "#F8FAFC" }}>
            <ChevronLeftIcon />
          </IconButton>
        )}
      </Box>
      <Divider
        sx={{ borderColor: "rgba(148, 163, 184, 0.2)", mx: 2, mb: 1 }}
      />
      <Box px={3} pb={2}>
        <Typography variant="subtitle2" color="rgba(148,163,184,0.7)">
          {session?.user.name ?? session?.user.email}
        </Typography>
        <Typography variant="body2" color="rgba(148,163,184,0.5)">
          {roleLabel}
        </Typography>
      </Box>
      <List sx={{ px: 1 }}>
        {navItems.map((item) => {
          const IconComponent = item.icon;
          const active = pathname.startsWith(item.href);
          return (
            <ListItemButton
              key={item.href}
              selected={active}
              onClick={() => handleNavigate(item.href)}
              sx={{
                borderRadius: 2,
                mb: 1,
                color: active ? theme.palette.secondary.main : "inherit",
                "&.Mui-selected": {
                  backgroundColor: "rgba(251,191,36,0.12)",
                  "&:hover": {
                    backgroundColor: "rgba(251,191,36,0.16)",
                  },
                },
              }}
            >
              <ListItemIcon
                sx={{
                  color: active
                    ? theme.palette.secondary.main
                    : "rgba(148,163,184,0.85)",
                  minWidth: 36,
                }}
              >
                <IconComponent fontSize="small" />
              </ListItemIcon>
              <ListItemText primary={item.label} />
            </ListItemButton>
          );
        })}
      </List>
    </Box>
  );

  return (
    <Box sx={{ display: "flex", minHeight: "100vh", background: "#F1F5F9" }}>
      {!hideNavigation && (
        <>
          <AppBar
            position="fixed"
            color="inherit"
            sx={{
              boxShadow: "0 4px 14px rgba(15, 23, 42, 0.08)",
              borderBottom: "1px solid rgba(148, 163, 184, 0.15)",
              width: isLarge ? `calc(100% - ${drawerWidth}px)` : "100%",
              ml: isLarge ? `${drawerWidth}px` : 0,
              backgroundColor: "#fff",
            }}
          >
            <Toolbar>
              {!isLarge && (
                <IconButton
                  color="inherit"
                  edge="start"
                  onClick={handleDrawerToggle}
                  sx={{ mr: 2 }}
                  aria-label="Open navigation menu"
                >
                  <MenuIcon />
                </IconButton>
              )}
              <Box sx={{ flexGrow: 1 }}>
                <Typography variant="h5" fontWeight={600}>
                  {title}
                </Typography>
                <BreadcrumbsTrail />
              </Box>
              {actions}
              <Tooltip title="Notifications">
                <IconButton size="large" sx={{ ml: 1 }} aria-label="Notifications">
                  <Badge badgeContent={2} color="secondary">
                    <NotificationsIcon />
                  </Badge>
                </IconButton>
              </Tooltip>
              <Tooltip title="Account settings">
                <IconButton sx={{ ml: 1 }} onClick={handleMenuOpen} size="small">
                  <Avatar
                    sx={{
                      bgcolor: theme.palette.primary.main,
                      width: 36,
                      height: 36,
                    }}
                  >
                    {session?.user.name?.charAt(0)?.toUpperCase() ??
                      session?.user.email.charAt(0)?.toUpperCase() ??
                      "Z"}
                  </Avatar>
                </IconButton>
              </Tooltip>
            </Toolbar>
          </AppBar>
          <Menu
            anchorEl={anchorEl}
            open={Boolean(anchorEl)}
            onClose={handleMenuClose}
            anchorOrigin={{ horizontal: "right", vertical: "bottom" }}
            transformOrigin={{ horizontal: "right", vertical: "top" }}
          >
            <MenuItem onClick={() => handleNavigate("/profile")}>
              <ListItemIcon>
                <PersonIcon fontSize="small" />
              </ListItemIcon>
              Profile
            </MenuItem>
            <MenuItem onClick={handleLogout}>
              <ListItemIcon>
                <LogoutIcon fontSize="small" />
              </ListItemIcon>
              Logout
            </MenuItem>
          </Menu>
          <Box
            component="nav"
            sx={{ width: { lg: drawerWidth }, flexShrink: { lg: 0 } }}
            aria-label="Primary navigation"
          >
            <Drawer
              variant={isLarge ? "permanent" : "temporary"}
              open={isLarge ? true : mobileOpen}
              onClose={handleDrawerToggle}
              ModalProps={{
                keepMounted: true,
              }}
              sx={{
                "& .MuiDrawer-paper": {
                  width: drawerWidth,
                  boxSizing: "border-box",
                  borderRight: "none",
                },
              }}
            >
              {drawerContent}
            </Drawer>
          </Box>
        </>
      )}
      <Box
        component="main"
        sx={{
          flexGrow: 1,
          width: {
            xs: "100%",
            lg: hideNavigation ? "100%" : `calc(100% - ${drawerWidth}px)`,
          },
          px: { xs: 2, md: 4 },
          py: { xs: 3, md: 4 },
        }}
      >
        {!hideNavigation && (
          <Toolbar
            sx={{
              mb: { xs: 2, md: 3 },
            }}
          />
        )}
        {children}
      </Box>
    </Box>
  );
}

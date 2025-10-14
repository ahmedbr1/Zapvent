import type { SvgIconComponent } from "@mui/icons-material";
import DashboardIcon from "@mui/icons-material/SpaceDashboardRounded";
import EventIcon from "@mui/icons-material/EventAvailableRounded";
import AssignmentIcon from "@mui/icons-material/AssignmentTurnedInRounded";
import FitnessCenterIcon from "@mui/icons-material/FitnessCenterRounded";
import GroupIcon from "@mui/icons-material/GroupsRounded";
import AdminPanelSettingsIcon from "@mui/icons-material/AdminPanelSettingsRounded";
import BusinessIcon from "@mui/icons-material/BusinessCenterRounded";
import CommentIcon from "@mui/icons-material/ModeCommentRounded";
import StorefrontIcon from "@mui/icons-material/StorefrontRounded";
import WorkIcon from "@mui/icons-material/WorkRounded";
import FlightIcon from "@mui/icons-material/FlightTakeoffRounded";
import SchoolIcon from "@mui/icons-material/SchoolRounded";
import ConferenceIcon from "@mui/icons-material/CampaignRounded";
import ChecklistIcon from "@mui/icons-material/ChecklistRtlRounded";
import { AuthRole } from "@/lib/types";

export interface NavItem {
  label: string;
  href: string;
  icon: SvgIconComponent;
  roles: AuthRole[];
}

export const navItems: NavItem[] = [
  {
    label: "Dashboard",
    href: "/user/dashboard",
    icon: DashboardIcon,
    roles: [AuthRole.User],
  },
  {
    label: "Events Browser",
    href: "/user/events",
    icon: EventIcon,
    roles: [AuthRole.User],
  },
  {
    label: "My Registrations",
    href: "/user/registrations",
    icon: AssignmentIcon,
    roles: [AuthRole.User],
  },
  {
    label: "Courts & Gym",
    href: "/user/fitness",
    icon: FitnessCenterIcon,
    roles: [AuthRole.User],
  },
  {
    label: "User Management",
    href: "/admin/users",
    icon: GroupIcon,
    roles: [AuthRole.Admin],
  },
  {
    label: "Admin Management",
    href: "/admin/admins",
    icon: AdminPanelSettingsIcon,
    roles: [AuthRole.Admin],
  },
  {
    label: "Events Office Accounts",
    href: "/admin/events-office",
    icon: BusinessIcon,
    roles: [AuthRole.Admin],
  },
  {
    label: "Vendor Applications",
    href: "/admin/vendors",
    icon: StorefrontIcon,
    roles: [AuthRole.Admin],
  },
  {
    label: "Comment Moderation",
    href: "/admin/comments",
    icon: CommentIcon,
    roles: [AuthRole.Admin],
  },
  {
    label: "Bazaar Management",
    href: "/events-office/bazaars",
    icon: StorefrontIcon,
    roles: [AuthRole.EventsOffice],
  },
  {
    label: "Trip Management",
    href: "/events-office/trips",
    icon: FlightIcon,
    roles: [AuthRole.EventsOffice],
  },
  {
    label: "Workshop Management",
    href: "/events-office/workshops",
    icon: SchoolIcon,
    roles: [AuthRole.EventsOffice],
  },
  {
    label: "Conference Management",
    href: "/events-office/conferences",
    icon: ConferenceIcon,
    roles: [AuthRole.EventsOffice],
  },
  {
    label: "Gym Sessions",
    href: "/events-office/gym-sessions",
    icon: FitnessCenterIcon,
    roles: [AuthRole.EventsOffice],
  },
  {
    label: "Vendor Dashboard",
    href: "/vendor/dashboard",
    icon: DashboardIcon,
    roles: [AuthRole.Vendor],
  },
  {
    label: "Browse Bazaars",
    href: "/vendor/bazaars",
    icon: StorefrontIcon,
    roles: [AuthRole.Vendor],
  },
  {
    label: "My Applications",
    href: "/vendor/applications",
    icon: ChecklistIcon,
    roles: [AuthRole.Vendor],
  },
  {
    label: "Booth Setup",
    href: "/vendor/booth-setup",
    icon: WorkIcon,
    roles: [AuthRole.Vendor],
  },
];

export function getNavItemsForRole(role: AuthRole | null) {
  if (!role) return [];
  return navItems.filter((item) => item.roles.includes(role));
}

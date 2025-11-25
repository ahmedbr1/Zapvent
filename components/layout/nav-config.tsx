import type { SvgIconComponent } from "@mui/icons-material";
import DashboardIcon from "@mui/icons-material/SpaceDashboardRounded";
import EventIcon from "@mui/icons-material/EventAvailableRounded";
import AssignmentIcon from "@mui/icons-material/AssignmentTurnedInRounded";
import FavoriteIcon from "@mui/icons-material/FavoriteRounded";
import WalletIcon from "@mui/icons-material/AccountBalanceWalletRounded";
import LoyaltyIcon from "@mui/icons-material/CardGiftcardRounded";
import PollIcon from "@mui/icons-material/HowToVoteRounded";
import FitnessCenterIcon from "@mui/icons-material/FitnessCenterRounded";
import GroupIcon from "@mui/icons-material/GroupsRounded";
import AdminPanelSettingsIcon from "@mui/icons-material/AdminPanelSettingsRounded";
import BusinessIcon from "@mui/icons-material/BusinessCenterRounded";
import StorefrontIcon from "@mui/icons-material/StorefrontRounded";
import WorkIcon from "@mui/icons-material/WorkRounded";
import FlightIcon from "@mui/icons-material/FlightTakeoffRounded";
import SchoolIcon from "@mui/icons-material/SchoolRounded";
import ConferenceIcon from "@mui/icons-material/CampaignRounded";
import ChecklistIcon from "@mui/icons-material/ChecklistRtlRounded";
import RateReviewIcon from "@mui/icons-material/RateReviewRounded";
import RevenueIcon from "@mui/icons-material/MonetizationOnRounded";
import { AuthRole, UserRole } from "@/lib/types";

export interface NavItem {
  label: string;
  href: string;
  icon: SvgIconComponent;
  roles: AuthRole[];
  userRoles?: UserRole[];
  labelOverrides?: Partial<Record<UserRole, string>>;
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
    label: "Event Feedback",
    href: "/user/event-feedback",
    icon: PollIcon,
    roles: [AuthRole.User],
  },
  {
    label: "My Registrations",
    href: "/user/registrations",
    icon: AssignmentIcon,
    roles: [AuthRole.User],
  },
  {
    label: "Favorites",
    href: "/user/favorites",
    icon: FavoriteIcon,
    roles: [AuthRole.User],
  },
  {
    label: "Wallet",
    href: "/user/wallet",
    icon: WalletIcon,
    roles: [AuthRole.User],
  },
  {
    label: "Loyalty Partners",
    href: "/user/loyalty",
    icon: LoyaltyIcon,
    roles: [AuthRole.User],
  },
  {
    label: "Vendor Polls",
    href: "/user/polls",
    icon: PollIcon,
    roles: [AuthRole.User],
  },
  {
    label: "My Workshops",
    href: "/user/workshops",
    icon: SchoolIcon,
    roles: [AuthRole.User],
    userRoles: [UserRole.Professor],
  },
  {
    label: "Courts & Gym",
    href: "/user/gym",
    icon: FitnessCenterIcon,
    roles: [AuthRole.User],
    labelOverrides: {
      [UserRole.Professor]: "Gym Sessions",
      [UserRole.Staff]: "Gym Sessions",
      [UserRole.TA]: "Gym Sessions",
    },
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
    label: "Attendance Report",
    href: "/admin/reports/attendance",
    icon: ChecklistIcon,
    roles: [AuthRole.Admin],
  },
  {
    label: "Sales Report",
    href: "/admin/reports/sales",
    icon: WalletIcon,
    roles: [AuthRole.Admin],
  },
  {
    label: "Event Feedback",
    href: "/admin/event-feedback",
    icon: PollIcon,
    roles: [AuthRole.Admin],
  },
  {
    label: "Vendor Applications",
    href: "/events-office/vendors",
    icon: StorefrontIcon,
    roles: [AuthRole.EventOffice],
  },
  {
    label: "Loyalty Partners",
    href: "/events-office/loyalty",
    icon: LoyaltyIcon,
    roles: [AuthRole.EventOffice],
  },
  {
    label: "Event Feedback",
    href: "/events-office/event-feedback",
    icon: PollIcon,
    roles: [AuthRole.EventOffice],
  },
  {
    label: "Attendance Report",
    href: "/events-office/reports/attendance",
    icon: ChecklistIcon,
    roles: [AuthRole.EventOffice],
  },
  {
    label: "Sales Report",
    href: "/events-office/reports/sales",
    icon: WalletIcon,
    roles: [AuthRole.EventOffice],
  },
  {
    label: "Vendor Polls",
    href: "/events-office/polls",
    icon: PollIcon,
    roles: [AuthRole.EventOffice],
  },
  {
    label: "Vendor Events",
    href: "/events-office/bazaars",
    icon: StorefrontIcon,
    roles: [AuthRole.EventOffice],
  },
  {
    label: "Vendor Events",
    href: "/admin/bazaars",
    icon: StorefrontIcon,
    roles: [AuthRole.Admin],
  },
  {
    label: "Trip Management",
    href: "/events-office/trips",
    icon: FlightIcon,
    roles: [AuthRole.EventOffice],
  },
  {
    label: "Trip Management",
    href: "/admin/trips",
    icon: FlightIcon,
    roles: [AuthRole.Admin],
  },
  {
    label: "Workshop Management",
    href: "/events-office/workshops",
    icon: SchoolIcon,
    roles: [AuthRole.EventOffice],
  },
  {
    label: "Event Feedback",
    href: "/events-office/feedback",
    icon: RateReviewIcon,
    roles: [AuthRole.EventOffice],
  },
  {
    label: "Attendance Report",
    href: "/events-office/reports/attendance",
    icon: ChecklistIcon,
    roles: [AuthRole.EventOffice],
  },
  {
    label: "Attendance Report",
    href: "/admin/reports/attendance",
    icon: ChecklistIcon,
    roles: [AuthRole.Admin],
  },
  {
    label: "Sales Report",
    href: "/events-office/reports/sales",
    icon: RevenueIcon,
    roles: [AuthRole.EventOffice],
  },
  {
    label: "Sales Report",
    href: "/admin/reports/sales",
    icon: RevenueIcon,
    roles: [AuthRole.Admin],
  },
  {
    label: "Workshop Management",
    href: "/admin/workshops",
    icon: SchoolIcon,
    roles: [AuthRole.Admin],
  },
  {
    label: "Conference Management",
    href: "/events-office/conferences",
    icon: ConferenceIcon,
    roles: [AuthRole.EventOffice],
  },
  {
    label: "Conference Management",
    href: "/admin/conferences",
    icon: ConferenceIcon,
    roles: [AuthRole.Admin],
  },
  {
    label: "Gym Sessions",
    href: "/events-office/gym-sessions",
    icon: FitnessCenterIcon,
    roles: [AuthRole.EventOffice],
  },
  {
    label: "Gym Sessions",
    href: "/admin/gym-sessions",
    icon: FitnessCenterIcon,
    roles: [AuthRole.Admin],
  },
  {
    label: "Vendor Dashboard",
    href: "/vendor/dashboard",
    icon: DashboardIcon,
    roles: [AuthRole.Vendor],
  },
  {
    label: "Bazaars & Booths",
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
    label: "GUC Loyalty",
    href: "/vendor/loyalty",
    icon: LoyaltyIcon,
    roles: [AuthRole.Vendor],
  },
  {
    label: "Booth Setup",
    href: "/vendor/booth-setup",
    icon: WorkIcon,
    roles: [AuthRole.Vendor],
  },
];

export function getNavItemsForRole(
  role: AuthRole | null,
  userRole: UserRole | null
) {
  if (!role) return [];
  return navItems
    .filter((item) => {
      if (!item.roles.includes(role)) {
        return false;
      }
      if (!item.userRoles) {
        return true;
      }
      if (!userRole) {
        return false;
      }
      return item.userRoles.includes(userRole);
    })
    .map((item) => {
      const override = userRole ? item.labelOverrides?.[userRole] : undefined;
      return override ? { ...item, label: override } : item;
    });
}

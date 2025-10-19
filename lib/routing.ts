import { AuthRole } from "./types";

export function getLoginPathForRole(role: AuthRole): string {
  switch (role) {
    case AuthRole.Admin:
      return "/login/admin";
    case AuthRole.EventOffice:
      return "/login/events-office";
    case AuthRole.Vendor:
      return "/login/vendor";
    case AuthRole.User:
    default:
      return "/login/user";
  }
}

export function getDefaultDashboardRoute(role: AuthRole): string {
  switch (role) {
    case AuthRole.Admin:
      return "/admin/users";
    case AuthRole.EventOffice:
      return "/events-office/bazaars";
    case AuthRole.Vendor:
      return "/vendor/dashboard";
    case AuthRole.User:
    default:
      return "/user/dashboard";
  }
}

export function getProfileRoute(role: AuthRole): string {
  switch (role) {
    case AuthRole.Admin:
      return "/admin/profile"; // Admin's own profile page
    case AuthRole.EventOffice:
      return "/events-office/bazaars"; // Events office dashboard (no profile page yet)
    case AuthRole.Vendor:
      return "/vendor/dashboard"; // Vendor dashboard (no profile page yet)
    case AuthRole.User:
    default:
      return "/user/dashboard"; // User dashboard (no profile page yet)
  }
}

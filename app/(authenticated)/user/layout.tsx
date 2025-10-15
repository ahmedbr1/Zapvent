import type { ReactNode } from "react";
import { redirect } from "next/navigation";
import { getServerSession } from "@/lib/get-server-session";
import { AuthRole } from "@/lib/types";
import { getDefaultDashboardRoute } from "@/lib/routing";

export default async function UserLayout({ children }: { children: ReactNode }) {
  const session = await getServerSession();

  if (!session) {
    redirect("/login/user");
  }

  if (session.user.role !== AuthRole.User) {
    redirect(getDefaultDashboardRoute(session.user.role));
  }

  return children;
}

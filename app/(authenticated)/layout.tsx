import type { Metadata } from "next";
import type { ReactNode } from "react";
import { redirect } from "next/navigation";
import { AppShell } from "@/components/layout/AppShell";
import { getServerSession } from "@/lib/get-server-session";

export const metadata: Metadata = {
  title: "Zapvent · Control Center",
};

export default async function AuthenticatedLayout({ children }: { children: ReactNode }) {
  const session = await getServerSession();

  if (!session) {
    redirect("/login/user");
  }

  return <AppShell>{children}</AppShell>;
}

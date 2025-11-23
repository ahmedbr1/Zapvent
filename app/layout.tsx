import type { Metadata } from "next";
import type { ReactNode } from "react";
import { AppProviders } from "@/components/providers/AppProviders";
import { AuthProvider } from "@/components/providers/AuthProvider";
import { getServerSession } from "@/lib/get-server-session";
import "./globals.css";

export const metadata: Metadata = {
  title: "Zapvent | University Event Management",
  description:
    "Plan, manage, and experience university events with an experience-first portal for students, admins, vendors, and the events office.",
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: ReactNode;
}>) {
  const session = await getServerSession();

  return (
    <html lang="en">
      <body className="antialiased">
        <AppProviders>
          <AuthProvider initialSession={session}>{children}</AuthProvider>
        </AppProviders>
      </body>
    </html>
  );
}

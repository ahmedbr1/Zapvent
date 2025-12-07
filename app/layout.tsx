import type { Metadata, Viewport } from "next";
import type { ReactNode } from "react";
import { AppProviders } from "@/components/providers/AppProviders";
import { AuthProvider } from "@/components/providers/AuthProvider";
import { getServerSession } from "@/lib/get-server-session";
import "./globals.css";

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: "#1E3A8A",
};

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
      <head>
        <link
          rel="preconnect"
          href="https://fonts.googleapis.com"
          crossOrigin="anonymous"
        />
        <link
          rel="preconnect"
          href="https://fonts.gstatic.com"
          crossOrigin="anonymous"
        />
        <link rel="dns-prefetch" href="https://fonts.googleapis.com" />
      </head>
      <body className="antialiased">
        <AppProviders>
          <AuthProvider initialSession={session}>{children}</AuthProvider>
        </AppProviders>
      </body>
    </html>
  );
}

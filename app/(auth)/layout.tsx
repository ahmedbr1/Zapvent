import type { Metadata } from "next";
import type { ReactNode } from "react";

export const metadata: Metadata = {
  title: "Zapvent · Access your portal",
  description: "Secure entry points for students, vendors, administrators, and the Events Office.",
};

export default function AuthLayout({ children }: { children: ReactNode }) {
  return children;
}

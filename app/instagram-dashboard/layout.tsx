import type { Metadata } from "next";
import { DashboardShell } from "@/components/sections/supervisor-dashboard/DashboardShell";

export const metadata: Metadata = {
  title: "Instagram dashboard",
  description: "Instagram inbox monitor overview and queues.",
};

export default function InstagramDashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <DashboardShell>{children}</DashboardShell>;
}

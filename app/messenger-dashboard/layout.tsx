import type { Metadata } from "next";
import { DashboardShell } from "@/components/sections/supervisor-dashboard/DashboardShell";

export const metadata: Metadata = {
  title: "Messenger dashboard",
  description: "Messenger inbox monitor overview and queues (sample data).",
};

export default function MessengerDashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <DashboardShell>{children}</DashboardShell>;
}

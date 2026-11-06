import type { Metadata } from "next";
import { DashboardShell } from "@/components/sections/supervisor-dashboard/DashboardShell";

export const metadata: Metadata = {
  title: "Omnichannel dashboard",
  description: "Cross-channel messaging operations overview.",
};

export default function OmnichannelDashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <DashboardShell>{children}</DashboardShell>;
}

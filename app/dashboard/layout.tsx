import type { Metadata } from "next";
import { DashboardShell } from "@/components/sections/supervisor-dashboard/DashboardShell";

export const metadata: Metadata = {
  title: "Operations dashboard",
  description: "Chat operations overview and queues (MVP).",
};

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <DashboardShell>{children}</DashboardShell>;
}

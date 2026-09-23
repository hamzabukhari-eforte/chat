"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

type NavKey = "dashboard" | "queue" | "assigned";
type DashboardKind = "whatsapp" | "messenger";

function resolveKind(pathname: string): DashboardKind {
  if (pathname.startsWith("/messenger-dashboard")) return "messenger";
  return "whatsapp";
}

function pathToActive(pathname: string, kind: DashboardKind): NavKey {
  const base = kind === "messenger" ? "/messenger-dashboard" : "/dashboard";
  if (pathname.startsWith(`${base}/queue`)) return "queue";
  if (pathname.startsWith(`${base}/assigned`)) return "assigned";
  return "dashboard";
}

const TITLES: Record<
  DashboardKind,
  Record<NavKey, string>
> = {
  whatsapp: {
    dashboard: "Dashboard",
    queue: "Queue chats",
    assigned: "Assigned chats",
  },
  messenger: {
    dashboard: "Messenger dashboard",
    queue: "Messenger queue",
    assigned: "Messenger assigned",
  },
};

export function DashboardShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname() ?? "/dashboard";
  const kind = resolveKind(pathname);
  const active = pathToActive(pathname, kind);
  const agentHref =
    kind === "messenger" ? "/whatsapp?messenger" : "/whatsapp";

  return (
    <div className="flex h-screen w-full overflow-hidden bg-surface text-gray-800 antialiased">
      <div className="flex min-w-0 flex-1 flex-col overflow-hidden">
        <header className="flex shrink-0 flex-wrap items-center justify-between gap-3 border-b border-gray-200 bg-white/90 px-6 py-4 backdrop-blur-sm">
          <h1 className="text-base font-semibold text-gray-900">
            {TITLES[kind][active]}
          </h1> 
        </header>
        <main className="min-h-0 flex-1 overflow-y-auto p-6">{children}</main>
      </div>
    </div>
  );
}

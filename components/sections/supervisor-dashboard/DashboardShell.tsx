"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

type NavKey = "dashboard" | "queue" | "assigned";

function pathToActive(pathname: string): NavKey {
  if (pathname.startsWith("/dashboard/queue")) return "queue";
  if (pathname.startsWith("/dashboard/assigned")) return "assigned";
  return "dashboard";
}

export function DashboardShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname() ?? "/dashboard";
  const active = pathToActive(pathname);

  return (
    <div className="flex h-screen w-full overflow-hidden bg-surface text-gray-800 antialiased">
      <div className="flex min-w-0 flex-1 flex-col overflow-hidden">
        <header className="flex shrink-0 flex-wrap items-center justify-between gap-3 border-b border-gray-200 bg-white/90 px-6 py-4 backdrop-blur-sm">
          <h1 className="text-base font-semibold text-gray-900">
            {active === "dashboard" && "Dashboard"}
            {active === "queue" && "Queue chats"}
            {active === "assigned" && "Assigned chats"}
          </h1>
          <Link
            href="/whatsapp"
            className="text-sm font-medium text-brand-600 transition-colors hover:text-brand-700 cursor-pointer"
          >
            Open agent inbox
          </Link>
        </header>
        <main className="min-h-0 flex-1 overflow-y-auto p-6">{children}</main>
      </div>
    </div>
  );
}

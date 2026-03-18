import type { ReactNode } from "react";

export default function WebLayout({ children }: { children: ReactNode }) {
  return (
    <div className="h-screen w-full overflow-hidden bg-surface text-gray-800 antialiased">
      <main className="flex h-full w-full overflow-hidden bg-surface">
        {children}
      </main>
    </div>
  );
}


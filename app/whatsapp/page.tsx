"use client";

import { AgentDashboard } from "../../components/sections/AgentDashboard";

export default function WhatsappPage() {
  return (
    <div className="h-screen w-full overflow-hidden bg-surface text-gray-800 antialiased">
      <main className="flex h-full w-full overflow-hidden bg-surface">
        <AgentDashboard />
      </main>
    </div>
  );
}


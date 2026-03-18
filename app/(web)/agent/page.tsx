"use client";

import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { useAuth } from "../../../hooks/useAuth";
import { AgentDashboard } from "../../../components/sections/AgentDashboard";

export default function AgentPage() {
  const { user, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (loading) return;
    if (!user || user.role !== "agent") {
      router.replace("/login");
    }
  }, [loading, user, router]);

  if (loading || !user || user.role !== "agent") {
    return (
      <div className="flex h-full w-full items-center justify-center text-sm text-gray-500">
        Loading agent dashboard...
      </div>
    );
  }

  return <AgentDashboard />;
}


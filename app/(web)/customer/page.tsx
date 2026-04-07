"use client";

import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { useAuth } from "../../../hooks/useAuth";
import { CustomerChat } from "../../../components/sections/CustomerChat";

export default function CustomerPage() {
  const { user, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (loading) return;
    if (!user || user.role !== "customer") {
      router.replace("/login");
    }
  }, [loading, user, router]);

  if (loading || !user || user.role !== "customer") {
    return (
      <div className="flex h-full w-full items-center justify-center text-sm text-gray-500">
        Loading customer chat...
      </div>
    );
  }

  return <CustomerChat />;
}


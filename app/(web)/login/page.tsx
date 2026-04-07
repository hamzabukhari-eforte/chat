"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import { Role, useAuth } from "../../../hooks/useAuth";

export default function LoginPage() {
  const router = useRouter();
  const { user, login } = useAuth();
  const [name, setName] = useState(user?.name ?? "");
  const [role, setRole] = useState<Role>(user?.role ?? "agent");

  const handleSubmit = (event: FormEvent) => {
    event.preventDefault();
    const trimmed = name.trim();
    if (!trimmed) return;
    login(trimmed, role);
    router.push(role === "agent" ? "/agent" : "/customer");
  };

  return (
    <div className="flex w-full min-h-screen items-center justify-center bg-surface px-4">
      <div className="w-full max-w-md rounded-2xl bg-white p-8 shadow-sm border border-gray-100">
        <h1 className="text-xl font-semibold text-gray-900 mb-2">
           Login
        </h1>
        <p className="text-sm text-gray-500 mb-6">
          Enter a display name and choose whether you are an agent or a
          customer.
        </p>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Display name
            </label>
            <input
              type="text"
              className="w-full rounded-md border border-gray-200 bg-gray-50 px-3 py-2 text-sm focus:border-brand-500 focus:ring-1 focus:ring-brand-500 outline-none"
              placeholder="e.g. John Doe"
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Role
            </label>
            <div className="flex gap-3">
              <button
                type="button"
                onClick={() => setRole("agent")}
                className={`flex-1 rounded-md border px-3 py-2 text-sm font-medium transition-colors cursor-pointer ${
                  role === "agent"
                    ? "border-brand-500 bg-brand-50 text-brand-700"
                    : "border-gray-200 bg-white text-gray-700 hover:bg-gray-50"
                }`}
              >
                Agent
              </button>
              <button
                type="button"
                onClick={() => setRole("customer")}
                className={`flex-1 rounded-md border px-3 py-2 text-sm font-medium transition-colors cursor-pointer ${
                  role === "customer"
                    ? "border-brand-500 bg-brand-50 text-brand-700"
                    : "border-gray-200 bg-white text-gray-700 hover:bg-gray-50"
                }`}
              >
                Customer
              </button>
            </div>
          </div>

          <button
            type="submit"
            className="mt-2 inline-flex w-full items-center justify-center rounded-lg bg-brand-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-brand-700 disabled:opacity-50 disabled:cursor-not-allowed"
            disabled={!name.trim()}
          >
            Continue
          </button>
        </form>
      </div>
    </div>
  );
}


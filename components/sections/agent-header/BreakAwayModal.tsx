"use client";

import { Button } from "@/components/ui/button";
import { Field, FieldLabel } from "@/components/ui/field";

interface BreakAwayModalProps {
  reasonLabel: string;
  password: string;
  submitting: boolean;
  onPasswordChange: (value: string) => void;
  onSubmit: () => void;
}

export function BreakAwayModal({
  reasonLabel,
  password,
  submitting,
  onPasswordChange,
  onSubmit,
}: BreakAwayModalProps) {
  return (
    <div
      className="fixed inset-0 z-9999 flex items-center justify-center bg-black/45 backdrop-blur-sm p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="break-away-title"
      aria-describedby="break-away-desc"
    >
      <div
        className="w-full max-w-md rounded-xl border border-gray-200 bg-white p-6 shadow-xl"
        onMouseDown={(e) => e.stopPropagation()}
      >
        <h2 id="break-away-title" className="text-lg font-semibold text-gray-900">
          {reasonLabel}
        </h2>
        <p id="break-away-desc" className="mt-1 text-sm text-gray-600">
          You are on a break. Enter your password to unlock the app.
        </p>

        <Field className="mt-6">
          <FieldLabel htmlFor="break-return-password">Password</FieldLabel>
          <input
            id="break-return-password"
            type="password"
            autoComplete="current-password"
            value={password}
            onChange={(e) => onPasswordChange(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") onSubmit();
            }}
            className="mt-1 w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm text-gray-900 placeholder:text-gray-400 focus:border-brand-400 focus:outline-none focus:ring-1 focus:ring-brand-400"
            placeholder="Password"
            disabled={submitting}
          />
        </Field>

        <div className="mt-6 flex justify-end">
          <Button
            type="button"
            className="bg-brand-600 text-white hover:bg-brand-700"
            disabled={submitting}
            onClick={onSubmit}
          >
            {submitting ? "Checking…" : "I'm back"}
          </Button>
        </div>
      </div>
    </div>
  );
}

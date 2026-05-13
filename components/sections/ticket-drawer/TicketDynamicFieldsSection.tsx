"use client";

import { SearchableSelect } from "@/components/atoms/SearchableSelect";
import type { RegisterComplaintDynamicField } from "@/lib/chat/registerComplaint";

interface TicketDynamicFieldsSectionProps {
  additionalFieldsLoading: boolean;
  additionalFields: RegisterComplaintDynamicField[];
  dynamicFieldValues: Record<string, string>;
  onValueChange: (key: string, value: string) => void;
}

export function TicketDynamicFieldsSection({
  additionalFieldsLoading,
  additionalFields,
  dynamicFieldValues,
  onValueChange,
}: TicketDynamicFieldsSectionProps) {
  if (!additionalFieldsLoading && additionalFields.length === 0) return null;

  return (
    <div className="space-y-3 my-5 py-3 border-y border-gray-200">
      <div>
        <h3 className="text-base font-semibold text-blue-700 pb-2">
          Additional Information
        </h3>
      </div>
      {additionalFieldsLoading && additionalFields.length === 0 ? (
        <p className="text-xs text-gray-500">Loading additional fields…</p>
      ) : null}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        {additionalFields.map((field) => {
          const inputId = `ticket-dyn-${field.key.replace(/[^a-zA-Z0-9_-]/g, "-")}`;
          const value = dynamicFieldValues[field.key] ?? "";
          const setValue = (nextValue: string) => onValueChange(field.key, nextValue);
          const selectLike =
            field.options.length > 0 ||
            field.type === "select" ||
            field.type === "dropdown";

          if (selectLike && field.options.length > 0) {
            return (
              <div key={field.key} className="min-w-0">
                <SearchableSelect
                  id={inputId}
                  label={field.name}
                  value={value}
                  onValueChange={setValue}
                  options={field.options}
                  searchPlaceholder={`Search ${field.name.toLowerCase()}...`}
                  emptyMessage="No options."
                />
              </div>
            );
          }

          if (field.type === "textarea") {
            return (
              <div key={field.key} className="min-w-0 sm:col-span-3">
                <label
                  htmlFor={inputId}
                  className="block text-xs font-medium text-gray-700"
                >
                  {field.name}
                </label>
                <textarea
                  id={inputId}
                  rows={4}
                  value={value}
                  onChange={(e) => setValue(e.target.value)}
                  placeholder={field.name}
                  className="mt-1 w-full resize-y rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm text-gray-900 outline-none transition-colors placeholder:text-gray-400 focus:border-brand-500 focus:ring-1 focus:ring-brand-500"
                />
              </div>
            );
          }

          return (
            <div key={field.key} className="min-w-0 flex flex-col justify-between">
              <label
                htmlFor={inputId}
                className="block text-xs font-medium text-gray-700"
              >
                {field.name}
              </label>
              <input
                id={inputId}
                type={
                  field.type === "number" || field.type === "numeric"
                    ? "number"
                    : "text"
                }
                value={value}
                onChange={(e) => setValue(e.target.value)}
                placeholder={field.name}
                className="mt-1 w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm text-gray-900 outline-none transition-colors placeholder:text-gray-400 focus:border-brand-500 focus:ring-1 focus:ring-brand-500"
              />
            </div>
          );
        })}
      </div>
    </div>
  );
}

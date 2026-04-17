"use client";

import * as React from "react";
import { CalendarDays, Clock2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Card, CardContent, CardFooter } from "@/components/ui/card";
import { Field, FieldGroup, FieldLabel } from "@/components/ui/field";
import {
  InputGroup,
  InputGroupAddon,
  InputGroupInput,
} from "@/components/ui/input-group";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { cn } from "@/lib/utils";

function pad2(n: number) {
  return String(n).padStart(2, "0");
}

/** `dd-MM-yyyy HH:mm:ss` (local), aligned with ticket “Reported” text field. */
export function formatTicketDateTimeLocal(d: Date) {
  return `${pad2(d.getDate())}-${pad2(d.getMonth() + 1)}-${d.getFullYear()} ${pad2(d.getHours())}:${pad2(d.getMinutes())}:${pad2(d.getSeconds())}`;
}

export function parseTicketDateTimeLocal(s: string): Date | undefined {
  const m = /^(\d{2})-(\d{2})-(\d{4})\s+(\d{2}):(\d{2}):(\d{2})$/.exec(s.trim());
  if (!m) return undefined;
  const d = new Date(
    Number(m[3]),
    Number(m[2]) - 1,
    Number(m[1]),
    Number(m[4]),
    Number(m[5]),
    Number(m[6]),
  );
  return Number.isNaN(d.getTime()) ? undefined : d;
}

function timeValueForInput(d: Date): string {
  return `${pad2(d.getHours())}:${pad2(d.getMinutes())}:${pad2(d.getSeconds())}`;
}

function mergeTimeOntoDate(base: Date, timeStr: string): Date {
  const parts = timeStr.split(":").map((x) => Number(x));
  const h = parts[0] ?? 0;
  const min = parts[1] ?? 0;
  const s = parts[2] ?? 0;
  const out = new Date(base);
  out.setHours(h, min, s, 0);
  return out;
}

type Props = {
  id: string;
  label: string;
  required?: boolean;
  value: string;
  onChange: (formatted: string) => void;
  className?: string;
};

/**
 * Single date + time (not a range): shadcn-style {@link Calendar} + one time field
 * in a {@link Card}, opened from a {@link Popover} trigger.
 */
export function DateTimePickerField({
  id,
  label,
  required,
  value,
  onChange,
  className,
}: Props) {
  const [open, setOpen] = React.useState(false);
  const [draft, setDraft] = React.useState<Date>(
    () => parseTicketDateTimeLocal(value) ?? new Date(),
  );

  const handleOpenChange = (next: boolean) => {
    setOpen(next);
    if (next) {
      setDraft(parseTicketDateTimeLocal(value) ?? new Date());
    }
  };

  const commit = React.useCallback(
    (next: Date) => {
      setDraft(next);
      onChange(formatTicketDateTimeLocal(next));
    },
    [onChange],
  );

  const display = value.trim() ? value.trim() : "Pick date & time";

  return (
    <div className={cn("min-w-0", className)}>
      <span className="block text-xs font-medium text-gray-700">
        {label}
        {required ? (
          <span className="text-red-500" aria-hidden>
            {" "}
            *
          </span>
        ) : null}
      </span>
      <Popover modal={false} open={open} onOpenChange={handleOpenChange}>
        <PopoverTrigger asChild>
          <Button
            id={id}
            type="button"
            variant="outline"
            className={cn(
              "mt-1 h-auto min-h-10 w-full justify-start gap-2 px-3 py-2 text-left font-normal",
              !value.trim() && "text-gray-500",
            )}
          >
            <CalendarDays className="size-4 shrink-0 opacity-60" aria-hidden />
            <span className="min-w-0 flex-1 truncate">{display}</span>
          </Button>
        </PopoverTrigger>
        <PopoverContent
          className="max-h-[min(85dvh,28rem)] w-auto max-w-[min(100vw-2rem,22rem)] overflow-y-auto overflow-x-hidden p-0"
          align="start"
          side="bottom"
          sideOffset={6}
        >
          <Card size="sm" className="border-0 shadow-none">
            <CardContent className="p-2 sm:p-3">
              <Calendar
                mode="single"
                selected={draft}
                onSelect={(d) => {
                  if (!d) return;
                  const next = mergeTimeOntoDate(d, timeValueForInput(draft));
                  commit(next);
                }}
                className="mx-auto [--rdp-accent-color:#4338ca] [--rdp-accent-background-color:#eef2ff]"
              />
            </CardContent>
            <CardFooter className="flex-col items-stretch gap-3 border-t border-gray-100 bg-gray-50/90 p-3">
              <FieldGroup className="w-full">
                <Field>
                  <FieldLabel htmlFor={`${id}-time`}>Time</FieldLabel>
                  <InputGroup>
                    <InputGroupInput
                      id={`${id}-time`}
                      type="time"
                      step="1"
                      value={timeValueForInput(draft)}
                      onChange={(e) => {
                        commit(mergeTimeOntoDate(draft, e.target.value));
                      }}
                      className="appearance-none [&::-webkit-calendar-picker-indicator]:hidden [&::-webkit-calendar-picker-indicator]:appearance-none"
                    />
                    <InputGroupAddon>
                      <Clock2 className="size-4 text-gray-500" aria-hidden />
                    </InputGroupAddon>
                  </InputGroup>
                </Field>
              </FieldGroup>
              <Button
                type="button"
                size="sm"
                className="w-full"
                onClick={() => {
                  commit(draft);
                  setOpen(false);
                }}
              >
                Done
              </Button>
            </CardFooter>
          </Card>
        </PopoverContent>
      </Popover>
    </div>
  );
}

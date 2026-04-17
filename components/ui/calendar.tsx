"use client";

import * as React from "react";
import { DayPicker, type DayPickerProps } from "react-day-picker";

import { cn } from "@/lib/utils";

import "react-day-picker/style.css";

export type CalendarProps = DayPickerProps;

/**
 * shadcn-style wrapper around {@link DayPicker} (react-day-picker v9).
 * Default styles come from `react-day-picker/style.css`; `className` tweaks spacing.
 */
function Calendar({ className, ...props }: CalendarProps) {
  return (
    <DayPicker
      className={cn(
        "p-0 [--rdp-accent-color:theme(colors.brand.600)] [--rdp-background-color:theme(colors.brand.50)]",
        className,
      )}
      {...props}
    />
  );
}
Calendar.displayName = "Calendar";

export { Calendar };

"use client";

import * as React from "react";
import { Check, ChevronsUpDown, Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { cn } from "@/lib/utils";

export type SearchableSelectOption = { id: string; name: string };

type Props = {
  id: string;
  label: string;
  required?: boolean;
  value: string;
  onValueChange: (id: string) => void;
  options: SearchableSelectOption[];
  placeholder?: string;
  searchPlaceholder?: string;
  emptyMessage?: string;
  disabled?: boolean;
  className?: string;
  /** When true, first row clears selection (same as empty value). */
  allowClear?: boolean;
};

export function SearchableSelect({
  id,
  label,
  required,
  value,
  onValueChange,
  options,
  placeholder = "Choose...",
  searchPlaceholder = "Search...",
  emptyMessage = "No matches.",
  disabled,
  className,
  allowClear = true,
}: Props) {
  const [open, setOpen] = React.useState(false);
  const selected = options.find((o) => o.id === value);

  return (
    <div className={cn("min-w-0", className)}>
      <label
        htmlFor={id}
        className="block text-xs font-medium text-gray-700"
      >
        {label}
        {required ? (
          <span className="text-red-500" aria-hidden>
            {" "}
            *
          </span>
        ) : null}
      </label>
      <Popover modal={false} open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button
            id={id}
            type="button"
            variant="outline"
            role="combobox"
            aria-expanded={open}
            disabled={disabled}
            className={cn(
              "mt-1 h-auto min-h-10 w-full justify-between px-3 py-2 text-left font-normal",
              !selected && "text-gray-500",
            )}
          >
            <span
              className="line-clamp-2 flex-1 text-left"
              title={selected ? selected.name : placeholder}
            >
              {selected ? selected.name : placeholder}
            </span>
            <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
          </Button>
        </PopoverTrigger>
        <PopoverContent
          className="w-[var(--radix-popover-trigger-width)] p-0"
          align="start"
          sideOffset={4}
          collisionPadding={8}
        >
          <Command shouldFilter label={`${label} options`}>
            <div className="flex items-center gap-1 border-b border-gray-100 px-2">
              <Search className="h-4 w-4 shrink-0 text-gray-400" aria-hidden />
              <CommandInput
                placeholder={searchPlaceholder}
                className="h-9 border-0 focus:ring-0"
              />
            </div>
            <CommandList>
              <CommandEmpty>{emptyMessage}</CommandEmpty>
              <CommandGroup>
                {allowClear && value ? (
                  <CommandItem
                    value="__clear__ reset"
                    keywords={["clear", "reset", "choose"]}
                    onSelect={() => {
                      onValueChange("");
                      setOpen(false);
                    }}
                    className="text-gray-500"
                  >
                    {placeholder}
                  </CommandItem>
                ) : null}
                {options.map((o) => (
                  <CommandItem
                    key={o.id}
                    value={o.id}
                    keywords={[o.name, o.id]}
                    onSelect={() => {
                      onValueChange(o.id);
                      setOpen(false);
                    }}
                  >
                    <Check
                      className={cn(
                        "mr-2 h-4 w-4 shrink-0",
                        value === o.id ? "opacity-100" : "opacity-0",
                      )}
                    />
                    <span className="min-w-0 flex-1 truncate" title={o.name}>
                      {o.name}
                    </span>
                  </CommandItem>
                ))}
              </CommandGroup>
            </CommandList>
          </Command>
        </PopoverContent>
      </Popover>
    </div>
  );
}

"use client";

import * as React from "react";
import { Command as CmdkCommand } from "cmdk";
import { cn } from "@/lib/utils";

const Command = React.forwardRef<
  React.ElementRef<typeof CmdkCommand>,
  React.ComponentPropsWithoutRef<typeof CmdkCommand>
>(({ className, label = "Command menu", ...props }, ref) => (
  <CmdkCommand
    ref={ref}
    label={label}
    className={cn(
      "flex h-full w-full flex-col overflow-hidden rounded-md bg-white text-gray-950",
      className,
    )}
    {...props}
  />
));
Command.displayName = "Command";

const CommandInput = React.forwardRef<
  React.ElementRef<typeof CmdkCommand.Input>,
  React.ComponentPropsWithoutRef<typeof CmdkCommand.Input>
>(({ className, ...props }, ref) => (
  <CmdkCommand.Input
    ref={ref}
    className={cn(
      "flex h-9 w-full min-w-0 rounded-md border-0 bg-transparent px-2 py-2 text-sm outline-none ring-0 placeholder:text-gray-400 focus:ring-0 disabled:cursor-not-allowed disabled:opacity-50",
      className,
    )}
    {...props}
  />
));
CommandInput.displayName = "CommandInput";

const CommandList = React.forwardRef<
  React.ElementRef<typeof CmdkCommand.List>,
  React.ComponentPropsWithoutRef<typeof CmdkCommand.List>
>(({ className, ...props }, ref) => (
  <CmdkCommand.List
    ref={ref}
    className={cn(
      "max-h-[min(280px,40vh)] overflow-y-auto overflow-x-hidden p-1",
      className,
    )}
    {...props}
  />
));
CommandList.displayName = "CommandList";

const CommandEmpty = React.forwardRef<
  React.ElementRef<typeof CmdkCommand.Empty>,
  React.ComponentPropsWithoutRef<typeof CmdkCommand.Empty>
>(({ className, ...props }, ref) => (
  <CmdkCommand.Empty
    ref={ref}
    className={cn("py-4 text-center text-sm text-gray-500", className)}
    {...props}
  />
));
CommandEmpty.displayName = "CommandEmpty";

const CommandGroup = React.forwardRef<
  React.ElementRef<typeof CmdkCommand.Group>,
  React.ComponentPropsWithoutRef<typeof CmdkCommand.Group>
>(({ className, ...props }, ref) => (
  <CmdkCommand.Group
    ref={ref}
    className={cn(
      "overflow-hidden p-1 text-gray-950 [&_[cmdk-group-heading]]:px-2 [&_[cmdk-group-heading]]:py-1.5 [&_[cmdk-group-heading]]:text-xs [&_[cmdk-group-heading]]:font-medium [&_[cmdk-group-heading]]:text-gray-500",
      className,
    )}
    {...props}
  />
));
CommandGroup.displayName = "CommandGroup";

const CommandItem = React.forwardRef<
  React.ElementRef<typeof CmdkCommand.Item>,
  React.ComponentPropsWithoutRef<typeof CmdkCommand.Item>
>(({ className, ...props }, ref) => (
  <CmdkCommand.Item
    ref={ref}
    className={cn(
      "relative flex cursor-pointer select-none items-center rounded-md px-2 py-1.5 text-sm outline-none",
      "data-[disabled=true]:pointer-events-none data-[disabled=true]:opacity-50",
      "data-[selected=true]:bg-brand-50 data-[selected=true]:text-brand-900",
      className,
    )}
    {...props}
  />
));
CommandItem.displayName = "CommandItem";

export {
  Command,
  CommandInput,
  CommandList,
  CommandEmpty,
  CommandGroup,
  CommandItem,
};

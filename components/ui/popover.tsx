"use client";

import * as React from "react";
import * as PopoverPrimitive from "@radix-ui/react-popover";
import { cn } from "@/lib/utils";

const Popover = PopoverPrimitive.Root;

const PopoverTrigger = PopoverPrimitive.Trigger;

const PopoverAnchor = PopoverPrimitive.Anchor;

const PopoverContent = React.forwardRef<
  React.ElementRef<typeof PopoverPrimitive.Content>,
  React.ComponentPropsWithoutRef<typeof PopoverPrimitive.Content>
>(
  (
    {
      className,
      align = "center",
      sideOffset = 4,
      collisionBoundary: collisionBoundaryProp,
      collisionPadding: collisionPaddingProp,
      ...props
    },
    ref,
  ) => {
    /** Use viewport for flip/shift when ancestors use `overflow: hidden|auto` (e.g. ticket drawer), so the menu is not placed off-screen. */
    const collisionBoundary =
      collisionBoundaryProp !== undefined
        ? collisionBoundaryProp
        : typeof document !== "undefined"
          ? document.documentElement
          : undefined;

    const collisionPadding =
      collisionPaddingProp !== undefined
        ? collisionPaddingProp
        : { top: 12, right: 12, bottom: 12, left: 12 };

    return (
      <PopoverPrimitive.Portal>
        <PopoverPrimitive.Content
          ref={ref}
          align={align}
          sideOffset={sideOffset}
          collisionBoundary={collisionBoundary}
          collisionPadding={collisionPadding}
          className={cn(
            "z-[110] rounded-lg border border-gray-200 bg-white p-0 text-gray-950 shadow-lg outline-none",
            className,
          )}
          {...props}
        />
      </PopoverPrimitive.Portal>
    );
  },
);
PopoverContent.displayName = PopoverPrimitive.Content.displayName;

export { Popover, PopoverTrigger, PopoverAnchor, PopoverContent };

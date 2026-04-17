"use client";

import { HiOutlineTicket } from "react-icons/hi2";
import { FiX } from "react-icons/fi";
import {
  Drawer,
  DrawerContent,
  DrawerDescription,
  DrawerHeader,
  DrawerTitle,
} from "@/components/ui/drawer";
import { cn } from "@/lib/utils";

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
};

/**
 * Left-side ticket panel (vaul/shadcn Drawer). `modal={false}` keeps the chat column interactive.
 * Width matches {@link ChatSidebarSection} so the panel aligns with the queue / my-chats column.
 */
export function TicketDrawerSection({ open, onOpenChange }: Props) {
  return (
    <Drawer
      open={open}
      onOpenChange={onOpenChange}
      direction="left"
      modal={false}
      shouldScaleBackground={false}
      noBodyStyles
      disablePreventScroll
      dismissible
    >
      <DrawerContent
        hideOverlay
        className={cn(
          "left-0 right-auto top-0 mt-0 flex h-[100dvh] max-h-[100dvh] w-[92vw] max-w-[720px] flex-col rounded-none border-0 border-r border-gray-200 p-0 shadow-none sm:w-[560px] md:w-[640px] lg:w-[720px]",
          "pointer-events-auto",
        )}
      >
        <DrawerHeader className="flex shrink-0 flex-row items-center justify-between gap-3 border-b border-gray-100 p-4">
          <div className="flex min-w-0 items-center gap-2">
            <HiOutlineTicket
              className="h-5 w-5 shrink-0 text-brand-600"
              aria-hidden
            />
            <div className="min-w-0">
              <DrawerTitle>Ticket</DrawerTitle>
              <DrawerDescription className="mt-1">
                Link or edit ticket details for this conversation.
              </DrawerDescription>
            </div>
          </div>
          <button
            type="button"
            onClick={() => onOpenChange(false)}
            aria-label="Close ticket panel"
            className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border border-gray-200 text-gray-500 transition-colors hover:border-brand-300 hover:bg-brand-50 hover:text-brand-600 cursor-pointer"
          >
            <FiX className="h-4 w-4" />
          </button>
        </DrawerHeader>
        <div className="min-h-0 flex-1 overflow-y-auto p-4 text-sm text-gray-600">
          <p>
            Ticket content will appear here. You can keep this drawer open while
            messaging in the chat window.
          </p>
        </div>
      </DrawerContent>
    </Drawer>
  );
}

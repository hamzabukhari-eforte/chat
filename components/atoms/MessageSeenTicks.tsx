import { IoCheckmarkDoneOutline } from "react-icons/io5";

interface Props {
  /** SES `CHAT_SEEN`: `4` = seen (blue ticks), `3` or unset = gray. */
  status?: 3 | 4;
}

function isSeenStatus(status: unknown): boolean {
  return Number(status) === 4;
}

/** Blue double-check only when socket says seen (`4`); everything else gray. */
export function MessageSeenTicks({ status }: Props) {
  const seen = isSeenStatus(status);
  const title = seen ? "Seen" : Number(status) === 3 ? "Delivered" : "Sent";
  return (
    <IoCheckmarkDoneOutline
      className={
        seen
          ? "h-3.5 w-3.5 shrink-0 text-sky-500"
          : "h-3.5 w-3.5 shrink-0 text-gray-400"
      }
      aria-hidden
      title={title}
    />
  );
}

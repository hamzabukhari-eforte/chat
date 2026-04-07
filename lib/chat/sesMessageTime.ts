/**
 * SES chat rows often send a day bucket in `messageHeader` ("Today", "Yesterday", or a date)
 * and clock time in `messageTime` ("9:24 AM" or "9:24:15 AM" with seconds for ordering).
 * Combine them for sortable `createdAt`.
 */

function startOfLocalDay(d: Date): Date {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate());
}

/**
 * Backend sometimes sends `"Today, 9:36 AM"` in `messageHeader` and sometimes
 * `"Today"` + `messageTime` separately — normalize so day/time parsing matches.
 */
export function splitSesMessageHeader(header: string): {
  dayPart: string;
  embeddedTime: string;
} {
  const t = header.trim();
  const m = /^(today|yesterday)\s*,\s*(.+)$/i.exec(t);
  if (m) {
    return {
      dayPart: m[1].charAt(0).toUpperCase() + m[1].slice(1).toLowerCase(),
      embeddedTime: m[2].trim(),
    };
  }
  return { dayPart: t, embeddedTime: "" };
}

function parseMessageHeaderToLocalDay(header: string): Date | null {
  const h = header.trim();
  if (!h) return null;
  const lower = h.toLowerCase();
  const now = new Date();
  if (lower === "today") return startOfLocalDay(now);
  if (lower === "yesterday") {
    const y = new Date(now);
    y.setDate(y.getDate() - 1);
    return startOfLocalDay(y);
  }
  const direct = Date.parse(h);
  if (!Number.isNaN(direct)) {
    const d = new Date(direct);
    if (!Number.isNaN(d.getTime())) return startOfLocalDay(d);
  }
  const mdy = /^(\d{1,2})\/(\d{1,2})\/(\d{2,4})$/.exec(h);
  if (mdy) {
    const month = Number(mdy[1]) - 1;
    const day = Number(mdy[2]);
    let year = Number(mdy[3]);
    if (year < 100) year += 2000;
    const dt = new Date(year, month, day);
    if (!Number.isNaN(dt.getTime())) return startOfLocalDay(dt);
  }
  return null;
}

function parseClockToHms(raw: string): { h: number; m: number; s: number } | null {
  const trimmed = raw.trim();
  if (!trimmed) return null;
  const ampm = /^(\d{1,2}):(\d{2})(?::(\d{2}))?\s*(AM|PM)$/i.exec(trimmed);
  if (ampm) {
    let hour = Number(ampm[1]);
    const min = Number(ampm[2]);
    const sec = ampm[3] !== undefined ? Number(ampm[3]) : 0;
    const ap = ampm[4].toUpperCase();
    if (ap === "PM" && hour !== 12) hour += 12;
    if (ap === "AM" && hour === 12) hour = 0;
    if (sec < 0 || sec > 59) return null;
    if (hour >= 0 && hour <= 23 && min >= 0 && min <= 59)
      return { h: hour, m: min, s: sec };
    return null;
  }
  const hm24 = /^(\d{1,2}):(\d{2})(?::(\d{2}))?$/.exec(trimmed);
  if (hm24) {
    const hour = Number(hm24[1]);
    const min = Number(hm24[2]);
    const sec = hm24[3] !== undefined ? Number(hm24[3]) : 0;
    if (hour >= 0 && hour <= 23 && min >= 0 && min <= 59 && sec >= 0 && sec <= 59)
      return { h: hour, m: min, s: sec };
  }
  return null;
}

/**
 * Returns ISO string for ordering. Prefer both header + time; otherwise best effort.
 */
export function createdAtFromMessageHeaderAndTime(
  messageHeaderRaw: string,
  messageTimeRaw: string,
): string {
  const { dayPart, embeddedTime } = splitSesMessageHeader(messageHeaderRaw);
  const timeCombined = messageTimeRaw.trim() || embeddedTime;
  const day = parseMessageHeaderToLocalDay(dayPart);
  const hms = parseClockToHms(timeCombined);

  if (day && hms) {
    const d = new Date(day);
    d.setHours(hms.h, hms.m, hms.s, 0);
    return d.toISOString();
  }
  if (day) {
    return day.toISOString();
  }
  if (hms) {
    const d = new Date();
    d.setHours(hms.h, hms.m, hms.s, 0);
    return d.toISOString();
  }
  return new Date().toISOString();
}

function localYmd(d: Date): string {
  const y = d.getFullYear();
  const m = d.getMonth() + 1;
  const day = d.getDate();
  return `${y}-${String(m).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
}

/**
 * One group per calendar day (local). API vs WebSocket may use different
 * `messageHeader` strings ("Today" vs "Today, 09:36 AM"); this key stays stable.
 */
export function messageGroupKeyFromHeader(
  messageHeader: string | undefined,
  createdAtIso: string,
): string {
  const raw = messageHeader?.trim() ?? "";
  const { dayPart } = raw ? splitSesMessageHeader(raw) : { dayPart: "" };
  const anchor =
    parseMessageHeaderToLocalDay(dayPart) ??
    (raw ? parseMessageHeaderToLocalDay(raw) : null);
  if (anchor) return localYmd(anchor);
  const created = new Date(createdAtIso);
  if (!Number.isNaN(created.getTime()))
    return localYmd(startOfLocalDay(created));
  return raw || createdAtIso;
}

/** Single style for the date separator pill (avoids "09:36" vs "9:36" splits). */
export function formatChatDateSeparatorLabel(createdAtIso: string): string {
  const d = new Date(createdAtIso);
  if (Number.isNaN(d.getTime())) return "";
  const now = new Date();
  const sod = (x: Date) =>
    new Date(x.getFullYear(), x.getMonth(), x.getDate()).getTime();
  const t0 = sod(now);
  const t1 = sod(d);
  const dayMs = 86400000;
  const timePart = d.toLocaleTimeString([], {
    hour: "numeric",
    minute: "2-digit",
  });
  if (t1 === t0) return `Today, ${timePart}`;
  if (t1 === t0 - dayMs) return `Yesterday, ${timePart}`;
  const datePart = d.toLocaleDateString([], {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
  return `${datePart}, ${timePart}`;
}

function sesTwelveHourWithSeconds(
  hour12: number,
  minute: number,
  second: number,
  ap: string,
): string {
  const hh = String(hour12).padStart(2, "0");
  const mm = String(minute).padStart(2, "0");
  const ss = String(second).padStart(2, "0");
  return `${hh}:${mm}:${ss} ${ap}`;
}

/**
 * Local clock for WebSocket / SES payloads: `HH:MM:SS AM` or `HH:MM:SS PM`
 * (e.g. `09:36:06 AM`). Fixed width so the server can sort reliably.
 * Uses `Intl` when available so seconds match the live wall clock (some stacks
 * had issues relying only on `Date#getSeconds` for outbound payloads).
 */
export function formatSesLocalMessageTime(date: Date = new Date()): string {
  if (typeof Intl !== "undefined" && typeof Intl.DateTimeFormat === "function") {
    try {
      const parts = new Intl.DateTimeFormat("en-US", {
        hour: "numeric",
        minute: "numeric",
        second: "numeric",
        hour12: true,
      }).formatToParts(date);
      let hour12 = 12;
      let minute = 0;
      let second = 0;
      let dayPeriod = "AM";
      let hasSecondPart = false;
      for (const p of parts) {
        if (p.type === "hour") hour12 = Number(p.value);
        if (p.type === "minute") minute = Number(p.value);
        if (p.type === "second") {
          hasSecondPart = true;
          second = Number(p.value);
        }
        if (p.type === "dayPeriod") dayPeriod = p.value.toUpperCase();
      }
      if (!hasSecondPart) second = date.getSeconds();
      return sesTwelveHourWithSeconds(hour12, minute, second, dayPeriod);
    } catch {
      // fall through to numeric fields
    }
  }
  const h24 = date.getHours();
  const min = date.getMinutes();
  const sec = date.getSeconds();
  const ap = h24 >= 12 ? "PM" : "AM";
  let h12 = h24 % 12;
  if (h12 === 0) h12 = 12;
  return sesTwelveHourWithSeconds(h12, min, sec, ap);
}

/**
 * SES often sends minute-rounded clocks (`HH:MM:00 AM`). For live `NEW_MESSAGE` handling,
 * substitute the current local second when the wire time has `:00` seconds so ordering
 * and display reflect real receive time (backend still omits sub-minute precision).
 */
export function enrichSesWireTimeIfSecondsWereZero(wire: string): string {
  const t = wire.trim();
  const m = /^(\d{1,2}):(\d{2}):(\d{2})\s*(AM|PM)$/i.exec(t);
  if (!m) return wire;
  if (Number(m[3]) !== 0) return wire;
  return sesTwelveHourWithSeconds(
    Number(m[1]),
    Number(m[2]),
    new Date().getSeconds(),
    m[4].toUpperCase(),
  );
}

/**
 * Strip seconds from a clock string for UI (e.g. "09:50:15 AM" → "09:50 AM"; "10:17 AM" unchanged).
 * For outbound sockets use {@link formatMessageTimeForSesWire} (always includes seconds).
 */
export function formatMessageTimeForDisplay(raw: string): string {
  const t = raw.trim();
  if (!t) return t;
  const ampm = t.replace(/^(\d{1,2}:\d{2}):\d{2}(\s*[AP]M)$/i, "$1$2");
  if (ampm !== t) return ampm;
  return t.replace(/^(\d{1,2}:\d{2}):\d{2}$/, "$1");
}

/** If `raw` is a 12h clock (with or without seconds), returns fixed `HH:MM:SS AM`; else `null`. */
export function tryFormatMessageTimeForSesWire(raw: string): string | null {
  const t = raw.trim();
  if (!t) return null;

  const withSec = /^(\d{1,2}):(\d{2}):(\d{2})\s*(AM|PM)$/i.exec(t);
  if (withSec) {
    return sesTwelveHourWithSeconds(
      Number(withSec[1]),
      Number(withSec[2]),
      Number(withSec[3]),
      withSec[4].toUpperCase(),
    );
  }

  const noSec = /^(\d{1,2}):(\d{2})\s*(AM|PM)$/i.exec(t);
  if (noSec) {
    return sesTwelveHourWithSeconds(
      Number(noSec[1]),
      Number(noSec[2]),
      0,
      noSec[3].toUpperCase(),
    );
  }

  return null;
}

/**
 * SES / WebSocket clock with seconds (`HH:MM:SS AM`). Lives next to {@link formatMessageTimeForDisplay}
 * (display strips seconds; this never does).
 *
 * - No arg / empty string → current local time with seconds.
 * - `"10:27 AM"` → `"10:27:00 AM"` (pads second to `:00`).
 * - `"09:36:06 AM"` → normalized fixed width.
 * - Unparseable → current local time (use {@link tryFormatMessageTimeForSesWire} when you must not invent a time).
 */
export function formatMessageTimeForSesWire(raw?: string): string {
  const t = (raw ?? "").trim();
  if (!t) return formatSesLocalMessageTime();
  return tryFormatMessageTimeForSesWire(t) ?? formatSesLocalMessageTime();
}

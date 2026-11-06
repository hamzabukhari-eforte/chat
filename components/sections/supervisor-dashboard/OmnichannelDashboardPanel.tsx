"use client";

import { useState } from "react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import {
  FaFacebookMessenger,
  FaInstagram,
  FaWhatsapp,
} from "react-icons/fa";
import { FiActivity, FiCalendar, FiMessageSquare } from "react-icons/fi";
import { cn } from "@/lib/utils";
import {
  CHANNEL_COLORS,
  omnichannelChannelKpis,
  omnichannelChannelShare,
  omnichannelConversationTrend,
  omnichannelDateRanges,
  omnichannelKeyMetrics,
  omnichannelLiveActivity,
  omnichannelRecentConversations,
  type OmnichannelChannelKey,
  type OmnichannelConversationStatus,
} from "@/lib/dashboard/omnichannelDummyData";

/** Admin Dashboards theme (ExecutiveDashboard tokens). */
const ESD = {
  primary: "#095CBC",
  text: "#1e293b",
  muted: "#64748b",
  border: "#dde6ef",
  card: "#ffffff",
  bg: "#edf2f9",
  green: "#22c55e",
  red: "#ef4444",
  radius: "10px",
} as const;

const cardClass =
  "rounded-[10px] border border-[#dde6ef] bg-white shadow-[0_1px_3px_rgba(100,130,160,0.06)]";

type AdminTooltipEntry = {
  name?: string;
  value?: number | string;
  color?: string;
  dataKey?: string | number;
  payload?: {
    name?: string;
    key?: OmnichannelChannelKey;
  };
};

/** Matches Admin Dashboards `.trend-tooltip` (black text + color swatch). */
function AdminChartTooltip({
  active,
  payload,
  label,
  valueSuffix = "",
}: {
  active?: boolean;
  payload?: AdminTooltipEntry[];
  label?: string | number;
  valueSuffix?: string;
}) {
  if (!active || !payload?.length) return null;

  return (
    <div
      className="pointer-events-none z-50 min-w-[140px] rounded-lg border border-[#dde6ef] bg-white px-2.5 py-2 text-[0.72rem] font-semibold leading-snug text-black shadow-[0_6px_18px_rgba(30,50,80,0.12)]"
    >
      {label != null && String(label).trim() !== "" ? (
        <p className="mb-1.5 text-[0.74rem] font-bold text-black">{label}</p>
      ) : null}
      <ul className="space-y-1">
        {payload.map((entry, i) => {
          const name =
            entry.payload?.name ??
            entry.name ??
            (entry.dataKey != null ? String(entry.dataKey) : "");
          const key = entry.payload?.key;
          const color =
            (key ? CHANNEL_COLORS[key] : undefined) ||
            entry.color ||
            ESD.primary;
          const raw = entry.value;
          const display =
            typeof raw === "number"
              ? `${raw.toLocaleString()}${valueSuffix}`
              : `${raw ?? ""}${valueSuffix}`;
          return (
            <li key={`${name}-${i}`} className="flex items-center gap-1.5 text-black">
              <span
                className="h-2.5 w-2.5 shrink-0 rounded-sm"
                style={{ background: color }}
                aria-hidden
              />
              <span className="min-w-0 flex-1 truncate">{name}</span>
              <span className="ml-auto font-bold tabular-nums">{display}</span>
            </li>
          );
        })}
      </ul>
    </div>
  );
}

const STATUS_STYLES: Record<
  OmnichannelConversationStatus,
  string
> = {
  in_progress: "bg-emerald-50 text-emerald-700 border-emerald-200",
  resolved: "bg-violet-50 text-violet-700 border-violet-200",
  in_queue: "bg-sky-50 text-sky-700 border-sky-200",
};

const STATUS_LABELS: Record<OmnichannelConversationStatus, string> = {
  in_progress: "In Progress",
  resolved: "Resolved",
  in_queue: "In Queue",
};

function ChannelIcon({
  channel,
  className,
}: {
  channel: OmnichannelChannelKey;
  className?: string;
}) {
  const color = CHANNEL_COLORS[channel];
  if (channel === "whatsapp") {
    return <FaWhatsapp className={className} style={{ color }} aria-hidden />;
  }
  if (channel === "messenger") {
    return (
      <FaFacebookMessenger className={className} style={{ color }} aria-hidden />
    );
  }
  if (channel === "instagram") {
    return <FaInstagram className={className} style={{ color }} aria-hidden />;
  }
  return <FiMessageSquare className={className} style={{ color }} aria-hidden />;
}

function initials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "?";
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return `${parts[0][0] ?? ""}${parts[1][0] ?? ""}`.toUpperCase();
}

/** Omnichannel ops overview — Admin Dashboards visual language. */
export function OmnichannelDashboardPanel({
  agentName = "Dr. Fizza",
}: {
  agentName?: string;
} = {}) {
  const [periodId, setPeriodId] = useState<string>("4");
  const totalMessages = omnichannelChannelShare.reduce((s, r) => s + r.value, 0);

  return (
    <div className="space-y-5" style={{ color: ESD.text }}>
      {/* Header — title/desc, then Admin-style DATE filter below on the left */}
      <div>
        <h2 className="text-2xl font-semibold tracking-tight text-[#1e293b]">
          Welcome back, {agentName}!
        </h2>
        <p className="mt-1 text-base text-[#64748b]">
          Here&apos;s what&apos;s happening across your channels today.
        </p>

        <div className="mt-4 flex flex-wrap items-center gap-x-4 gap-y-2">
          <div className="inline-flex min-w-0 flex-wrap items-center gap-2.5">
            <label
              htmlFor="omni-period"
              className="inline-flex items-center gap-1.5 text-[0.72rem] font-bold uppercase tracking-[0.06em] text-[#64748b]"
            >
              <FiCalendar className="h-3.5 w-3.5 shrink-0" aria-hidden />
              Date
            </label>
            <select
              id="omni-period"
              value={periodId}
              onChange={(e) => setPeriodId(e.target.value)}
              className={cn(
                "h-9 w-40 max-w-40 min-w-0 cursor-pointer appearance-none rounded-[0.55rem]",
                "border border-[#dde6ef] py-1.5 pl-3 pr-8",
                "text-[0.8rem] font-semibold text-[#344050] outline-none",
                "hover:border-[#c5d4e6] focus:border-[#095CBC] focus:ring-2 focus:ring-[#095CBC]/20",
              )}
              style={{
                backgroundColor: "#ffffff",
                backgroundImage:
                  "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='8' viewBox='0 0 12 8'%3E%3Cpath fill='%235e6e82' d='M1 1.2l5 5 5-5'/%3E%3C/svg%3E\")",
                backgroundRepeat: "no-repeat",
                backgroundPosition: "right 0.75rem center",
                backgroundSize: "10px 7px",
              }}
            >
              {omnichannelDateRanges.map((r) => (
                <option key={r.id} value={r.id}>
                  {r.label}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Channel KPI cards */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {omnichannelChannelKpis.map((kpi) => {
          const color = CHANNEL_COLORS[kpi.key];
          return (
            <div key={kpi.key} className={cn(cardClass, "p-4")}>
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="text-sm font-medium text-[#64748b]">{kpi.label}</p>
                  <p className="mt-1 text-3xl font-semibold tabular-nums tracking-tight text-[#1e293b]">
                    {kpi.value.toLocaleString()}
                  </p>
                  <p className="mt-0.5 text-sm text-[#64748b]">{kpi.hint}</p>
                </div>
                <div
                  className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg"
                  style={{ background: `${color}18` }}
                >
                  <ChannelIcon channel={kpi.key} className="h-5 w-5" />
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Middle: donut + trend + key metrics */}
      <div className="grid grid-cols-1 gap-4 xl:grid-cols-12">
        <div className={cn(cardClass, "flex flex-col p-5 xl:col-span-4")}>
          <h3 className="text-base font-semibold text-[#1e293b]">
            Channel Performance
          </h3>
          <p className="mt-0.5 text-sm text-[#64748b]">Share of messages by channel</p>
          <div className="relative mx-auto mt-2 h-52 w-full max-w-[240px]">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={[...omnichannelChannelShare]}
                  dataKey="value"
                  nameKey="name"
                  innerRadius={58}
                  outerRadius={82}
                  paddingAngle={2}
                  stroke="none"
                >
                  {omnichannelChannelShare.map((row) => (
                    <Cell key={row.key} fill={CHANNEL_COLORS[row.key]} />
                  ))}
                </Pie>
                <Tooltip
                  content={<AdminChartTooltip />}
                  wrapperStyle={{ zIndex: 50, outline: "none" }}
                />
              </PieChart>
            </ResponsiveContainer>
            <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
              <p className="text-xl font-semibold tabular-nums text-[#1e293b]">
                {totalMessages.toLocaleString()}
              </p>
              <p className="text-xs font-medium text-[#64748b]">Total Messages</p>
            </div>
          </div>
          <ul className="mt-1 space-y-1.5">
            {omnichannelChannelShare.map((row) => (
              <li
                key={row.key}
                className="flex items-center justify-between gap-2 text-sm"
              >
                <span className="flex min-w-0 items-center gap-2 text-[#64748b]">
                  <span
                    className="h-2.5 w-2.5 shrink-0 rounded-full"
                    style={{ background: CHANNEL_COLORS[row.key] }}
                  />
                  <span className="truncate">{row.name}</span>
                </span>
                <span className="font-semibold tabular-nums text-[#1e293b]">
                  {row.pct}%
                </span>
              </li>
            ))}
          </ul>
        </div>

        <div className={cn(cardClass, "flex flex-col p-5 xl:col-span-5")}>
          <h3 className="text-base font-semibold text-[#1e293b]">
            Conversation Volume
          </h3>
          <p className="mt-0.5 text-sm text-[#64748b]">Messages by hour across channels</p>
          <div className="mt-3 h-64 min-h-0 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={[...omnichannelConversationTrend]}
                margin={{ top: 8, right: 8, left: -12, bottom: 0 }}
              >
                <CartesianGrid
                  strokeDasharray="3 3"
                  stroke={ESD.border}
                  vertical={false}
                />
                <XAxis
                  dataKey="hour"
                  tick={{ fill: ESD.muted, fontSize: 12 }}
                  axisLine={{ stroke: ESD.border }}
                  tickLine={false}
                />
                <YAxis
                  tick={{ fill: ESD.muted, fontSize: 12 }}
                  axisLine={false}
                  tickLine={false}
                />
                <Tooltip
                  content={<AdminChartTooltip />}
                  wrapperStyle={{ zIndex: 50, outline: "none" }}
                />
                <Legend
                  wrapperStyle={{ fontSize: 12, color: ESD.muted }}
                  iconType="circle"
                  iconSize={8}
                />
                <Bar
                  dataKey="whatsapp"
                  name="WhatsApp"
                  stackId="volume"
                  fill={CHANNEL_COLORS.whatsapp}
                  radius={[0, 0, 0, 0]}
                  maxBarSize={28}
                />
                <Bar
                  dataKey="messenger"
                  name="Messenger"
                  stackId="volume"
                  fill={CHANNEL_COLORS.messenger}
                  maxBarSize={28}
                />
                <Bar
                  dataKey="instagram"
                  name="Instagram"
                  stackId="volume"
                  fill={CHANNEL_COLORS.instagram}
                  radius={[4, 4, 0, 0]}
                  maxBarSize={28}
                />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className={cn(cardClass, "flex min-h-0 flex-col p-5 xl:col-span-3")}>
          <h3 className="shrink-0 text-base font-semibold text-[#1e293b]">
            Key Metrics
          </h3>
          <p className="mt-0.5 shrink-0 text-sm text-[#64748b]">
            Performance snapshot
          </p>
          <ul className="mt-3 flex min-h-0 flex-1 flex-col divide-y divide-[#dde6ef]">
            {omnichannelKeyMetrics.map((m) => (
              <li
                key={m.label}
                className="flex flex-1 items-center justify-between gap-3 py-2"
              >
                <p className="min-w-0 text-sm font-medium text-[#64748b]">
                  {m.label}
                </p>
                <p className="shrink-0 text-lg font-semibold tabular-nums text-[#1e293b]">
                  {m.value}
                </p>
              </li>
            ))}
          </ul>
        </div>
      </div>

      {/* Bottom: recent + distribution + live */}
      <div className="grid grid-cols-1 gap-4 xl:grid-cols-12">
        <div className={cn(cardClass, "flex flex-col p-5 xl:col-span-5")}>
          <h3 className="text-base font-semibold text-[#1e293b]">
            Recent Conversations
          </h3>
          <p className="mt-0.5 text-sm text-[#64748b]">Latest activity across channels</p>
          <ul className="mt-3 divide-y divide-[#dde6ef]">
            {omnichannelRecentConversations.map((row) => (
              <li
                key={row.id}
                className="flex items-center gap-3 py-3 first:pt-0 last:pb-0"
              >
                <div className="relative shrink-0 self-center">
                  <div
                    className="flex h-10 w-10 items-center justify-center rounded-full text-xs font-semibold text-[#095CBC]"
                    style={{ background: "#e8f1fc" }}
                  >
                    {initials(row.customer)}
                  </div>
                  <span className="absolute -bottom-0.5 -right-0.5 flex h-5 w-5 items-center justify-center rounded-full bg-white shadow-sm">
                    <ChannelIcon channel={row.channel} className="h-3 w-3" />
                  </span>
                </div>
                <div className="flex min-w-0 flex-1 flex-col justify-center gap-0.5">
                  <p className="truncate text-base font-medium leading-snug text-[#1e293b]">
                    {row.customer}
                  </p>
                  <p className="truncate text-sm leading-snug text-[#64748b]">
                    {row.preview}
                  </p>
                </div>
                <div className="flex shrink-0 flex-col items-end justify-center gap-1.5 self-center">
                  <span
                    className={cn(
                      "rounded-full border px-2.5 py-0.5 text-xs font-semibold leading-none",
                      STATUS_STYLES[row.status],
                    )}
                  >
                    {STATUS_LABELS[row.status]}
                  </span>
                  <span className="text-xs leading-none text-[#64748b]">
                    {row.time}
                  </span>
                </div>
              </li>
            ))}
          </ul>
        </div>

        <div className={cn(cardClass, "flex flex-col p-5 xl:col-span-3")}>
          <h3 className="text-base font-semibold text-[#1e293b]">
            Channel Distribution
          </h3>
          <p className="mt-0.5 text-sm text-[#64748b]">Message share</p>
          <div className="mt-3 h-56 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={[...omnichannelChannelShare]}
                margin={{ top: 8, right: 4, left: -16, bottom: 0 }}
              >
                <CartesianGrid strokeDasharray="3 3" stroke={ESD.border} vertical={false} />
                <XAxis
                  dataKey="pct"
                  tickFormatter={(v) => `${v}%`}
                  tick={{ fill: ESD.muted, fontSize: 12 }}
                  axisLine={{ stroke: ESD.border }}
                  tickLine={false}
                />
                <YAxis hide />
                <Tooltip
                  content={<AdminChartTooltip valueSuffix="%" />}
                  wrapperStyle={{ zIndex: 50, outline: "none" }}
                />
                <Bar
                  dataKey="pct"
                  name="Share"
                  radius={[6, 6, 0, 0]}
                  maxBarSize={36}
                >
                  {omnichannelChannelShare.map((row) => (
                    <Cell key={row.key} fill={CHANNEL_COLORS[row.key]} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
          <ul className="mt-1 space-y-1.5">
            {omnichannelChannelShare.map((row) => (
              <li
                key={row.key}
                className="flex items-center justify-between text-sm text-[#64748b]"
              >
                <span className="flex items-center gap-1.5">
                  <span
                    className="h-2 w-2 rounded-full"
                    style={{ background: CHANNEL_COLORS[row.key] }}
                  />
                  {row.name}
                </span>
                <span className="font-semibold text-[#1e293b]">{row.pct}%</span>
              </li>
            ))}
          </ul>
        </div>

        <div className={cn(cardClass, "flex flex-col p-5 xl:col-span-4")}>
          <div className="flex items-center gap-2">
            <FiActivity className="h-5 w-5 text-[#095CBC]" aria-hidden />
            <h3 className="text-base font-semibold text-[#1e293b]">Live Activity</h3>
          </div>
          <p className="mt-0.5 text-sm text-[#64748b]">Real-time event feed</p>
          <ul className="mt-3 flex-1 space-y-0 divide-y divide-[#dde6ef]">
            {omnichannelLiveActivity.map((ev) => (
              <li
                key={ev.id}
                className="flex items-center gap-3 py-3 first:pt-0 last:pb-0"
              >
                <div
                  className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg"
                  style={{ background: `${CHANNEL_COLORS[ev.channel]}18` }}
                >
                  <ChannelIcon channel={ev.channel} className="h-4 w-4" />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-base font-medium text-[#1e293b]">{ev.text}</p>
                  <p className="mt-0.5 text-xs text-[#64748b]">{ev.channelLabel}</p>
                </div>
                <span className="shrink-0 self-start text-xs text-[#64748b]">
                  {ev.time}
                </span>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </div>
  );
}

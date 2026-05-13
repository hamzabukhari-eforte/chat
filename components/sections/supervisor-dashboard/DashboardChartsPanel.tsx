"use client";

import { useEffect } from "react";
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Legend,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { toast } from "sonner";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useWhatsappDashboardKpis } from "@/hooks/useWhatsappDashboardKpis";
import { cn } from "@/lib/utils";
import { chatsByAgent, chatsPerDay, volumeLast24Hours } from "@/lib/dashboard/dummyData";
import { STATIC_SUPERVISOR } from "@/lib/supervisor/staticSupervisor";

type StatAccent =
  | "slate"
  | "sky"
  | "violet"
  | "emerald"
  | "amber"
  | "teal"
  | "rose"
  | "orange";

/** Flat surface + neutral chrome; color only on the left edge (common supervisor-dashboard pattern). */
const statLeftAccent: Record<StatAccent, string> = {
  slate: "border-l-slate-600",
  sky: "border-l-sky-600",
  violet: "border-l-violet-600",
  emerald: "border-l-emerald-600",
  amber: "border-l-amber-600",
  teal: "border-l-teal-600",
  rose: "border-l-rose-600",
  orange: "border-l-orange-600",
};

function formatMinutesKpi(minutes: number): string {
  if (!Number.isFinite(minutes) || minutes < 0) return "—";
  if (minutes === 0) return "0 min";
  return Number.isInteger(minutes) ? `${minutes} min` : `${minutes.toFixed(1)} min`;
}

const chartCardClass = "border border-gray-200 bg-white shadow-sm";

const BRAND = "#4f46e5";
const BRAND_MUTED = "#818cf8";
const GRID = "#e5e7eb";
const AXIS = "#6b7280";

const tooltipProps = {
  contentStyle: {
    borderRadius: "10px",
    border: "1px solid #e5e7eb",
    fontSize: "12px",
  },
} as const;

export function DashboardChartsPanel({
  supervisorUserId = STATIC_SUPERVISOR.id,
}: {
  /** Dev: forwarded as `Userid` query param when `NODE_ENV === "development"`; default {@link STATIC_SUPERVISOR.id}. */
  supervisorUserId?: string;
}) {
  const { data: kpi, loading: kpiLoading, error: kpiError } =
    useWhatsappDashboardKpis(supervisorUserId);

  useEffect(() => {
    if (!kpiError) return;
    toast.error(`KPIs could not be loaded: ${kpiError}`);
  }, [kpiError]);

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          accent="slate"
          label="Total chats"
          value={kpi?.totalChats ?? null}
          hint="Last 24 hours"
          isLoading={kpiLoading}
        />
        <StatCard
          accent="sky"
          label="In queue"
          value={kpi?.chatsInQueue ?? null}
          hint={
            kpi && !kpiLoading
              ? `Avg wait ~${Number.isInteger(kpi.avgWaitMinutes) ? kpi.avgWaitMinutes : kpi.avgWaitMinutes.toFixed(1)} min`
              : "Waiting for an agent"
          }
          isLoading={kpiLoading}
        />
        <StatCard
          accent="violet"
          label="In progress"
          value={kpi?.chatsAssignedToAgents ?? null}
          hint="Active ownership"
          isLoading={kpiLoading}
        />
        <StatCard
          accent="emerald"
          label="Closed by agents"
          value={kpi?.closedByAgents ?? null}
          hint="Chats closed while owned by an agent"
          isLoading={kpiLoading}
        />
        <StatCard
          accent="amber"
          label="Tickets registered"
          value={kpi?.ticketsRegisteredLast24Hours ?? null}
          hint="Last 24 hours"
          isLoading={kpiLoading}
        />
        <StatCard
          accent="teal"
          label="Messages sent"
          value={kpi?.messagesSent ?? null}
          hint="Outbound agent & system messages"
          isLoading={kpiLoading}
        />
        <StatCard
          accent="rose"
          label="Avg response time"
          value={kpi?.avgResponseTimeMinutes ?? null}
          formatValue={formatMinutesKpi}
          hint="First meaningful reply (minutes)"
          isLoading={kpiLoading}
        />
        <StatCard
          accent="orange"
          label="Avg resolution time"
          value={kpi?.avgResolutionTimeMinutes ?? null}
          formatValue={formatMinutesKpi}
          hint="Open to closed (minutes)"
          isLoading={kpiLoading}
        />
      </div>

      <Card className={cn(chartCardClass, "w-full")}>
        <CardHeader>
          <CardTitle className="text-base text-gray-900">Volume · last 24 hours</CardTitle>
          <CardDescription className="text-gray-500">
            Total, queued, and assigned by hour
          </CardDescription>
        </CardHeader>
        <CardContent className="h-[300px] w-full pt-0">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart
              data={[...volumeLast24Hours]}
              margin={{ top: 8, right: 12, left: 4, bottom: 0 }}
            >
              <defs>
                <linearGradient id="fillVolume24h" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor={BRAND} stopOpacity={0.32} />
                  <stop offset="100%" stopColor={BRAND} stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke={GRID} vertical={false} />
              <XAxis
                dataKey="hour"
                tick={{ fill: AXIS, fontSize: 10 }}
                axisLine={false}
                tickLine={false}
                interval={2}
                tickFormatter={(h) => `${h}:00`}
              />
              <YAxis tick={{ fill: AXIS, fontSize: 11 }} axisLine={false} tickLine={false} width={40} />
              <Tooltip {...tooltipProps} />
              <Legend wrapperStyle={{ fontSize: "12px" }} />
              <Area
                type="monotone"
                dataKey="total"
                name="Total"
                stroke={BRAND}
                fill="url(#fillVolume24h)"
                strokeWidth={2}
              />
              <Area
                type="monotone"
                dataKey="queued"
                name="Queued"
                stroke="#94a3b8"
                fill="none"
                strokeWidth={1.5}
                strokeDasharray="4 4"
              />
              <Area
                type="monotone"
                dataKey="assigned"
                name="Assigned"
                stroke={BRAND_MUTED}
                fill="none"
                strokeWidth={1.5}
              />
            </AreaChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card className={chartCardClass}>
          <CardHeader>
            <CardTitle className="text-base text-gray-900">Volume this week</CardTitle>
            <CardDescription className="text-gray-500">
              Total, queued, and assigned by day
            </CardDescription>
          </CardHeader>
          <CardContent className="h-[280px] pt-0">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={[...chatsPerDay]} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
                <defs>
                  <linearGradient id="fillTotal" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor={BRAND} stopOpacity={0.35} />
                    <stop offset="100%" stopColor={BRAND} stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke={GRID} vertical={false} />
                <XAxis dataKey="day" tick={{ fill: AXIS, fontSize: 11 }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fill: AXIS, fontSize: 11 }} axisLine={false} tickLine={false} width={36} />
                <Tooltip {...tooltipProps} />
                <Legend wrapperStyle={{ fontSize: "12px" }} />
                <Area
                  type="monotone"
                  dataKey="total"
                  name="Total"
                  stroke={BRAND}
                  fill="url(#fillTotal)"
                  strokeWidth={2}
                />
                <Area
                  type="monotone"
                  dataKey="queued"
                  name="Queued"
                  stroke="#94a3b8"
                  fill="none"
                  strokeWidth={1.5}
                  strokeDasharray="4 4"
                />
                <Area
                  type="monotone"
                  dataKey="assigned"
                  name="Assigned"
                  stroke={BRAND_MUTED}
                  fill="none"
                  strokeWidth={1.5}
                />
              </AreaChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card className={chartCardClass}>
          <CardHeader>
            <CardTitle className="text-base text-gray-900">Load by agent</CardTitle>
            <CardDescription className="text-gray-500">
              Assigned vs resolved (sample)
            </CardDescription>
          </CardHeader>
          <CardContent className="h-[280px] pt-0">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={[...chatsByAgent]}
                layout="vertical"
                margin={{ top: 8, right: 16, left: 8, bottom: 0 }}
              >
                <CartesianGrid strokeDasharray="3 3" stroke={GRID} horizontal={false} />
                <XAxis type="number" tick={{ fill: AXIS, fontSize: 11 }} axisLine={false} tickLine={false} />
                <YAxis
                  type="category"
                  dataKey="agent"
                  width={88}
                  tick={{ fill: AXIS, fontSize: 11 }}
                  axisLine={false}
                  tickLine={false}
                />
                <Tooltip {...tooltipProps} />
                <Legend wrapperStyle={{ fontSize: "12px" }} />
                <Bar dataKey="assigned" name="Assigned" fill={BRAND} radius={[0, 4, 4, 0]} maxBarSize={28} />
                <Bar dataKey="resolved" name="Resolved" fill="#c7d2fe" radius={[0, 4, 4, 0]} maxBarSize={28} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

function StatCard({
  accent,
  label,
  value,
  hint,
  formatValue,
  isLoading = false,
}: {
  accent: StatAccent;
  label: string;
  value: number | null;
  hint: string;
  /** When set, used instead of `toLocaleString()` for the main figure (e.g. minutes). */
  formatValue?: (value: number) => string;
  isLoading?: boolean;
}) {
  const displayMain =
    value === null || isLoading
      ? null
      : formatValue
        ? formatValue(value)
        : value.toLocaleString();

  return (
    <Card
      className={cn(
        "border border-gray-200 bg-white shadow-sm border-l-4",
        statLeftAccent[accent],
      )}
    >
      <CardHeader className="pb-2">
        <CardDescription className="text-xs font-medium text-gray-600">{label}</CardDescription>
        <CardTitle
          className={cn(
            "font-semibold tabular-nums tracking-tight text-gray-900",
            formatValue ? "text-2xl sm:text-3xl" : "text-3xl",
          )}
        >
          {isLoading ? (
            <span
              className="inline-block h-9 w-[5.5rem] max-w-full animate-pulse rounded-md bg-gray-200"
              aria-hidden
            />
          ) : value === null ? (
            "—"
          ) : (
            displayMain
          )}
        </CardTitle>
      </CardHeader>
      <CardContent>
        <p className="text-xs leading-relaxed text-gray-500">{hint}</p>
      </CardContent>
    </Card>
  );
}

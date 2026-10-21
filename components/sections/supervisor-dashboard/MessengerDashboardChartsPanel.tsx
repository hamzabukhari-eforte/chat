"use client";

import { useEffect, useMemo, useState } from "react";
import {
  CartesianGrid,
  Legend,
  Line,
  LineChart,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { FiAlertCircle } from "react-icons/fi";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { ChatWindowModals } from "@/components/sections/chat-window/ChatWindowModals";
import { useMessengerDashboardKpis } from "@/hooks/useMessengerDashboardKpis";
import { useMessengerTransferContext } from "@/hooks/useMessengerTransferContext";
import { transferChannelChat } from "@/lib/agent/transferChannelChat";
import { cn } from "@/lib/utils";
import {
  MESSENGER_TIME_LIMIT_MINUTES,
  messengerChatsThroughDay,
} from "@/lib/dashboard/messengerDummyData";

type WaitingRow = {
  id: string;
  customer: string;
  agentName: string;
  customerWaitingTime: string | null;
};

const chartCardClass = "border border-gray-200 bg-white shadow-sm";

type StatAccent =
  | "slate"
  | "sky"
  | "violet"
  | "emerald"
  | "amber"
  | "teal"
  | "rose"
  | "orange";

/** Flat surface + neutral chrome; color only on the left edge (same as ops dashboard). */
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

const BRAND = "#4f46e5";
const BRAND_MUTED = "#818cf8";
const GRID = "#e5e7eb";
const AXIS = "#6b7280";
const LIMIT_COLOR = "#e11d48";

const tooltipProps = {
  contentStyle: {
    borderRadius: "10px",
    border: "1px solid #e5e7eb",
    fontSize: "12px",
  },
} as const;

function formatMinutesKpi(minutes: number): string {
  if (!Number.isFinite(minutes) || minutes < 0) return "—";
  if (minutes === 0) return "0 min";
  return Number.isInteger(minutes)
    ? `${minutes} min`
    : `${minutes.toFixed(1)} min`;
}

function initials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "?";
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return `${parts[0][0] ?? ""}${parts[1][0] ?? ""}`.toUpperCase();
}

const AVATAR_COLORS = [
  "bg-sky-100 text-sky-800",
  "bg-violet-100 text-violet-800",
  "bg-amber-100 text-amber-800",
  "bg-emerald-100 text-emerald-800",
  "bg-rose-100 text-rose-800",
  "bg-teal-100 text-teal-800",
];

function avatarClass(seed: string): string {
  let hash = 0;
  for (let i = 0; i < seed.length; i++) hash = (hash + seed.charCodeAt(i) * 17) % AVATAR_COLORS.length;
  return AVATAR_COLORS[hash] ?? AVATAR_COLORS[0];
}

type ChartMode = "volume" | "response";

function mapWaitingRows(
  chats: {
    conversationId: number;
    assignedTo: string;
    customer: string;
    customerWaitingTime: string | null;
  }[],
): WaitingRow[] {
  return chats.map((c) => ({
    id: String(c.conversationId),
    customer: c.customer.trim() || `Chat ${c.conversationId}`,
    agentName: c.assignedTo.trim() || "Unassigned",
    customerWaitingTime: c.customerWaitingTime,
  }));
}

/** Messenger inbox monitor — KPIs from POST `/SES/SocialMedia/messenger/dashboard`. */
export function MessengerDashboardChartsPanel({
  supervisorUserId,
}: {
  supervisorUserId?: string;
} = {}) {
  const {
    data: kpi,
    waitingChats,
    loading: kpiLoading,
    error: kpiError,
    refetch: refetchKpis,
  } = useMessengerDashboardKpis(supervisorUserId);
  const {
    apiUrls,
    transferAgents,
    domainIndex,
    chatFrom,
    error: transferContextError,
  } = useMessengerTransferContext();
  const [chartMode, setChartMode] = useState<ChartMode>("response");
  const [agentFilter, setAgentFilter] = useState<string>("all");
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [noReplySource, setNoReplySource] = useState<WaitingRow[]>([]);
  const [transferBusy, setTransferBusy] = useState(false);

  const [transferQueueConfirmOpen, setTransferQueueConfirmOpen] = useState(false);
  const [transferAgentModalOpen, setTransferAgentModalOpen] = useState(false);
  const [transferTargetRowId, setTransferTargetRowId] = useState<string | null>(
    null,
  );
  const [selectedTransferAgentId, setSelectedTransferAgentId] = useState<
    string | null
  >(null);
  const [transferAgentSearch, setTransferAgentSearch] = useState("");

  useEffect(() => {
    if (!kpiError) return;
    toast.error(`KPIs could not be loaded: ${kpiError}`);
  }, [kpiError]);

  useEffect(() => {
    if (!transferContextError) return;
    toast.error(`Transfer agents could not be loaded: ${transferContextError}`);
  }, [transferContextError]);

  useEffect(() => {
    setNoReplySource(mapWaitingRows(waitingChats));
    setSelectedIds(new Set());
    setAgentFilter("all");
  }, [waitingChats]);

  useEffect(() => {
    if (!transferAgentModalOpen) setTransferAgentSearch("");
  }, [transferAgentModalOpen]);

  const agentNames = useMemo(() => {
    const names = new Set(noReplySource.map((r) => r.agentName));
    return [...names].sort((a, b) => a.localeCompare(b));
  }, [noReplySource]);

  const noReplyRows = useMemo(() => {
    if (agentFilter === "all") return noReplySource;
    return noReplySource.filter((r) => r.agentName === agentFilter);
  }, [agentFilter, noReplySource]);

  const transferTargetRow = useMemo(
    () => noReplySource.find((r) => r.id === transferTargetRowId) ?? null,
    [noReplySource, transferTargetRowId],
  );

  const filteredTransferAgents = useMemo(() => {
    const q = transferAgentSearch.trim().toLowerCase();
    const excludeName = transferTargetRow?.agentName.trim().toLowerCase();
    const base = excludeName
      ? transferAgents.filter(
          (a) => a.name.trim().toLowerCase() !== excludeName,
        )
      : transferAgents;
    if (!q) return base;
    return base.filter(
      (a) =>
        a.name.toLowerCase().includes(q) || a.id.toLowerCase().includes(q),
    );
  }, [transferAgentSearch, transferAgents, transferTargetRow?.agentName]);

  useEffect(() => {
    if (!transferAgentModalOpen || !selectedTransferAgentId) return;
    if (!filteredTransferAgents.some((a) => a.id === selectedTransferAgentId)) {
      setSelectedTransferAgentId(null);
    }
  }, [
    filteredTransferAgents,
    selectedTransferAgentId,
    transferAgentModalOpen,
  ]);

  const allVisibleSelected =
    noReplyRows.length > 0 && noReplyRows.every((r) => selectedIds.has(r.id));

  function toggleSelectAll() {
    setSelectedIds((prev) => {
      if (allVisibleSelected) {
        const next = new Set(prev);
        noReplyRows.forEach((r) => next.delete(r.id));
        return next;
      }
      const next = new Set(prev);
      noReplyRows.forEach((r) => next.add(r.id));
      return next;
    });
  }

  function toggleRow(id: string) {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function removeTransferredRow(rowId: string) {
    setNoReplySource((prev) => prev.filter((r) => r.id !== rowId));
    setSelectedIds((prev) => {
      const next = new Set(prev);
      next.delete(rowId);
      return next;
    });
  }

  function openTransferQueueConfirm(rowId: string) {
    setTransferTargetRowId(rowId);
    setTransferQueueConfirmOpen(true);
  }

  function openTransferAgentModal(rowId: string) {
    setTransferTargetRowId(rowId);
    setSelectedTransferAgentId(null);
    setTransferAgentSearch("");
    setTransferAgentModalOpen(true);
  }

  function confirmTransferQueue() {
    const row = transferTargetRow;
    setTransferQueueConfirmOpen(false);
    if (!row) {
      setTransferTargetRowId(null);
      return;
    }
    if (domainIndex === null || chatFrom === null) {
      toast.error("Unable to transfer this chat right now.");
      setTransferTargetRowId(null);
      return;
    }
    if (transferBusy) return;
    setTransferBusy(true);
    void (async () => {
      try {
        const status = await transferChannelChat(
          apiUrls,
          row.id,
          domainIndex,
          chatFrom,
          0,
          false,
        );
        if (status === 1) {
          toast.success("Chat transferred to queue.");
          removeTransferredRow(row.id);
          refetchKpis();
          return;
        }
        if (status === 2) {
          toast.info("This chat is already closed.");
          removeTransferredRow(row.id);
          refetchKpis();
          return;
        }
        toast.error("Unable to transfer this chat right now.");
      } catch {
        toast.error("Unable to transfer this chat right now.");
      } finally {
        setTransferBusy(false);
        setTransferTargetRowId(null);
      }
    })();
  }

  function confirmTransferAgent() {
    if (!selectedTransferAgentId || !transferTargetRow) return;
    const agent = transferAgents.find((a) => a.id === selectedTransferAgentId);
    if (!agent) return;
    if (domainIndex === null || chatFrom === null) {
      toast.error("Unable to transfer this chat right now.");
      return;
    }
    const agentIndex = Number(String(agent.id).trim());
    if (!Number.isFinite(agentIndex)) {
      toast.error("Invalid agent selected.");
      return;
    }
    if (transferBusy) return;

    const row = transferTargetRow;
    setTransferAgentModalOpen(false);
    setSelectedTransferAgentId(null);
    setTransferBusy(true);
    void (async () => {
      try {
        const status = await transferChannelChat(
          apiUrls,
          row.id,
          domainIndex,
          chatFrom,
          agentIndex,
          true,
        );
        if (status === 1) {
          toast.success(`Chat transferred to ${agent.name}.`);
          removeTransferredRow(row.id);
          refetchKpis();
          return;
        }
        if (status === 2) {
          toast.info("This chat is already closed.");
          removeTransferredRow(row.id);
          refetchKpis();
          return;
        }
        if (status === 3) {
          toast.info("Self-assignment isn't allowed - pick another agent.");
          return;
        }
        toast.error("Unable to transfer this chat right now.");
      } catch {
        toast.error("Unable to transfer this chat right now.");
      } finally {
        setTransferBusy(false);
        setTransferTargetRowId(null);
      }
    })();
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-lg font-semibold text-gray-900">Messenger inbox monitor</h2>
        <p className="mt-0.5 text-sm text-gray-500">
          Last 12 hours of Facebook Messenger chats, with live queue and transfer controls.
        </p>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          accent="slate"
          label="Total chats"
          value={kpi?.totalChats ?? null}
          hint="Last 12 hours"
          isLoading={kpiLoading}
        />
        <StatCard
          accent="sky"
          label="In queue"
          value={kpi?.chatsInQueue ?? null}
          hint="Waiting for an agent"
          isLoading={kpiLoading}
        />
        <StatCard
          accent="violet"
          label="In progress"
          value={kpi?.chatsAssignedToAgents ?? null}
          hint={
            kpi?.activeCount != null && !kpiLoading
              ? `${kpi.activeCount} active overall`
              : "Active ownership"
          }
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
          hint="Last 12 hours"
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

      <Card className={cn(chartCardClass, "flex h-[500px] min-h-0 w-full flex-col")}>
        <CardHeader className="flex shrink-0 flex-row flex-wrap items-start justify-between gap-3 space-y-0">
          <div>
            <CardTitle className="text-base text-gray-900">Chats through the day</CardTitle>
            <CardDescription className="text-gray-500">
              How fast agents answer, hour by hour. Lower is better.
            </CardDescription>
          </div>
          <div className="flex flex-wrap gap-1.5">
            <TabPill
              active={chartMode === "volume"}
              onClick={() => setChartMode("volume")}
            >
              Volume
            </TabPill>
            <TabPill
              active={chartMode === "response"}
              onClick={() => setChartMode("response")}
            >
              Response time
            </TabPill>
          </div>
        </CardHeader>
        <CardContent className="min-h-0 flex-1 pt-0">
          <div className="h-full w-full">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart
                data={[...messengerChatsThroughDay]}
                margin={{ top: 8, right: 12, left: 0, bottom: 0 }}
              >
                <CartesianGrid strokeDasharray="3 3" stroke={GRID} vertical={false} />
                <XAxis
                  dataKey="hour"
                  tick={{ fill: AXIS, fontSize: 10 }}
                  axisLine={false}
                  tickLine={false}
                  interval={2}
                  minTickGap={8}
                />
                <YAxis
                  tick={{ fill: AXIS, fontSize: 11 }}
                  axisLine={false}
                  tickLine={false}
                  width={36}
                  tickFormatter={(v) =>
                    chartMode === "volume" ? String(v) : `${v}m`
                  }
                />
                <Tooltip {...tooltipProps} />
                <Legend wrapperStyle={{ fontSize: "12px" }} />
                {chartMode === "volume" ? (
                  <Line
                    type="monotone"
                    dataKey="volume"
                    name="Chats"
                    stroke={BRAND}
                    strokeWidth={2}
                    dot={false}
                  />
                ) : (
                  <>
                    <ReferenceLine
                      y={MESSENGER_TIME_LIMIT_MINUTES}
                      stroke={LIMIT_COLOR}
                      strokeDasharray="4 4"
                      label={{
                        value: `Time limit (${MESSENGER_TIME_LIMIT_MINUTES} min)`,
                        fill: LIMIT_COLOR,
                        fontSize: 11,
                        position: "insideTopRight",
                      }}
                    />
                    <Line
                      type="monotone"
                      dataKey="firstReplyMin"
                      name="First response time"
                      stroke={BRAND}
                      strokeWidth={2}
                      dot={false}
                    />
                    <Line
                      type="monotone"
                      dataKey="avgReplyMin"
                      name="Average response time"
                      stroke={BRAND_MUTED}
                      strokeWidth={2}
                      dot={false}
                    />
                  </>
                )}
              </LineChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>

      <Card className={cn(chartCardClass, "flex h-[700px] min-h-0 w-full flex-col")}>
        <CardHeader className="shrink-0 space-y-3">
          <div>
            <CardTitle className="flex items-center gap-2 text-base text-gray-900">
              Assigned, but no reply yet
              <FiAlertCircle className="h-4 w-4 text-rose-600" aria-hidden />
            </CardTitle>
            <CardDescription className="text-gray-500">
              The customer is waiting on an agent who hasn&apos;t answered. Move these chats
              to someone who can.
            </CardDescription>
          </div>
          <div className="flex flex-wrap gap-1.5">
            <TabPill
              active={agentFilter === "all"}
              onClick={() => setAgentFilter("all")}
            >
              {`All (${noReplySource.length})`}
            </TabPill>
            {agentNames.map((name) => {
              const count = noReplySource.filter((r) => r.agentName === name).length;
              return (
                <TabPill
                  key={name}
                  active={agentFilter === name}
                  onClick={() => setAgentFilter(name)}
                >
                  {`${name} (${count})`}
                </TabPill>
              );
            })}
          </div>
        </CardHeader>
        <CardContent className="min-h-0 flex-1 overflow-auto p-0">
          <NoReplyTable
            rows={noReplyRows}
            selectedIds={selectedIds}
            allSelected={allVisibleSelected}
            onToggleAll={toggleSelectAll}
            onToggleRow={toggleRow}
            onTransferToQueue={openTransferQueueConfirm}
            onTransferToAgent={openTransferAgentModal}
            isLoading={kpiLoading}
          />
        </CardContent>
      </Card>

      <ChatWindowModals
        imagePreview={null}
        transferQueueConfirmOpen={transferQueueConfirmOpen}
        closeChatConfirmOpen={false}
        transferAgentModalOpen={transferAgentModalOpen}
        transferAgentSearch={transferAgentSearch}
        transferAgents={transferAgents}
        filteredTransferAgents={filteredTransferAgents}
        selectedTransferAgentId={selectedTransferAgentId}
        onCloseImagePreview={() => {}}
        onCloseTransferQueueConfirm={() => {
          setTransferQueueConfirmOpen(false);
          setTransferTargetRowId(null);
        }}
        onConfirmTransferQueue={confirmTransferQueue}
        onCloseCloseChatConfirm={() => {}}
        onConfirmCloseChat={() => {}}
        onCloseTransferAgentModal={() => {
          setTransferAgentModalOpen(false);
          setSelectedTransferAgentId(null);
          setTransferTargetRowId(null);
        }}
        onTransferAgentSearchChange={setTransferAgentSearch}
        onSelectTransferAgent={setSelectedTransferAgentId}
        onConfirmTransferAgent={confirmTransferAgent}
      />
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
        <CardDescription className="text-xs font-medium text-gray-600">
          {label}
        </CardDescription>
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

function TabPill({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "cursor-pointer rounded-full border px-2.5 py-1 text-xs font-medium transition-colors",
        active
          ? "border-gray-900 bg-gray-900 text-white"
          : "border-gray-200 bg-white text-gray-700 hover:bg-gray-50",
      )}
    >
      {children}
    </button>
  );
}

function NoReplyTable({
  rows,
  selectedIds,
  allSelected,
  onToggleAll,
  onToggleRow,
  onTransferToQueue,
  onTransferToAgent,
  isLoading = false,
}: {
  rows: WaitingRow[];
  selectedIds: Set<string>;
  allSelected: boolean;
  onToggleAll: () => void;
  onToggleRow: (id: string) => void;
  onTransferToQueue: (rowId: string) => void;
  onTransferToAgent: (rowId: string) => void;
  isLoading?: boolean;
}) {
  if (isLoading) {
    return (
      <p className="px-6 py-10 text-center text-sm text-gray-500">
        Loading waiting chats…
      </p>
    );
  }

  if (rows.length === 0) {
    return (
      <p className="px-6 py-10 text-center text-sm text-gray-500">
        No chats match this filter.
      </p>
    );
  }

  return (
    <table className="w-full min-w-180 table-fixed text-left text-sm">
      <colgroup>
        <col className="w-12" />
        <col />
        <col />
        <col />
        <col className="w-72" />
      </colgroup>
      <thead className="sticky top-0 z-10 border-b border-gray-200 bg-gray-50 text-xs font-medium uppercase tracking-wide text-gray-500 shadow-[0_1px_0_0_rgba(0,0,0,0.04)]">
        <tr>
          <th className="bg-gray-50 px-4 py-3">
            <input
              type="checkbox"
              checked={allSelected}
              onChange={onToggleAll}
              className="cursor-pointer"
              aria-label="Select all"
            />
          </th>
          <th className="bg-gray-50 px-3 py-3">Customer</th>
          <th className="bg-gray-50 px-3 py-3">Assigned to</th>
          <th className="bg-gray-50 px-3 py-3">Customer waiting</th>
          <th className="bg-gray-50 px-4 py-3 text-left">Actions</th>
        </tr>
      </thead>
      <tbody className="divide-y divide-gray-100">
        {rows.map((row) => (
          <tr key={row.id} className="hover:bg-gray-50/80">
            <td className="px-4 py-3">
              <input
                type="checkbox"
                checked={selectedIds.has(row.id)}
                onChange={() => onToggleRow(row.id)}
                className="cursor-pointer"
                aria-label={`Select ${row.customer}`}
              />
            </td>
            <td className="px-3 py-3">
              <div className="flex min-w-0 items-center gap-2.5">
                <div
                  className={cn(
                    "flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-[11px] font-semibold",
                    avatarClass(row.customer),
                  )}
                >
                  {initials(row.customer)}
                </div>
                <p className="min-w-0 truncate font-medium text-gray-900">
                  {row.customer}
                </p>
              </div>
            </td>
            <td className="px-3 py-3">
              <p className="truncate font-medium text-gray-800">{row.agentName}</p>
            </td>
            <td className="px-3 py-3 font-semibold tabular-nums text-rose-600">
              {row.customerWaitingTime ?? "—"}
            </td>
            <td className="px-4 py-3 text-left">
              <div className="flex flex-wrap items-center gap-1.5">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="h-8 cursor-pointer whitespace-nowrap px-2.5 text-xs"
                  onClick={() => onTransferToQueue(row.id)}
                >
                  Transfer to Queue
                </Button>
                <Button
                  type="button"
                  size="sm"
                  className="h-8 cursor-pointer whitespace-nowrap px-2.5 text-xs"
                  onClick={() => onTransferToAgent(row.id)}
                >
                  Transfer to Agent
                </Button>
              </div>
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}

function LegendItem({ title, body }: { title: string; body: string }) {
  return (
    <div>
      <p className="text-xs font-semibold text-gray-900">{title}</p>
      <p className="mt-1 text-xs leading-relaxed text-gray-500">{body}</p>
    </div>
  );
}

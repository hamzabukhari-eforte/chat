import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { AssignedChatRow, QueueChatRow } from "@/lib/dashboard/dummyData";

export function QueueChatsTable({ rows }: { rows: readonly QueueChatRow[] }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Waiting customers</CardTitle>
      </CardHeader>
      <CardContent className="overflow-x-auto p-0">
        <table className="w-full min-w-[480px] text-left text-sm">
          <thead className="border-y border-gray-100 bg-gray-50/80 text-xs font-medium uppercase tracking-wide text-gray-500">
            <tr>
              <th className="px-6 py-3">Customer</th>
              <th className="px-6 py-3">Channel</th>
              <th className="px-6 py-3 text-right">Wait (min)</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {rows.map((r) => (
              <tr key={r.id} className="hover:bg-gray-50/80">
                <td className="px-6 py-3 font-medium text-gray-900">{r.customer}</td>
                <td className="px-6 py-3 text-gray-600">{r.channel}</td>
                <td className="px-6 py-3 text-right tabular-nums text-gray-700">
                  {r.waitingMinutes}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </CardContent>
    </Card>
  );
}

export function AssignedChatsTable({ rows }: { rows: readonly AssignedChatRow[] }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Agent ownership</CardTitle>
      </CardHeader>
      <CardContent className="overflow-x-auto p-0">
        <table className="w-full min-w-[520px] text-left text-sm">
          <thead className="border-y border-gray-100 bg-gray-50/80 text-xs font-medium uppercase tracking-wide text-gray-500">
            <tr>
              <th className="px-6 py-3">Customer</th>
              <th className="px-6 py-3">Agent</th>
              <th className="px-6 py-3">Channel</th>
              <th className="px-6 py-3">Status</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {rows.map((r) => (
              <tr key={r.id} className="hover:bg-gray-50/80">
                <td className="px-6 py-3 font-medium text-gray-900">{r.customer}</td>
                <td className="px-6 py-3 text-gray-700">{r.agent}</td>
                <td className="px-6 py-3 text-gray-600">{r.channel}</td>
                <td className="px-6 py-3">
                  <span
                    className={
                      r.status === "active"
                        ? "inline-flex rounded-full bg-brand-100 px-2 py-0.5 text-xs font-medium text-brand-700"
                        : "inline-flex rounded-full bg-amber-100 px-2 py-0.5 text-xs font-medium text-amber-800"
                    }
                  >
                    {r.status}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </CardContent>
    </Card>
  );
}

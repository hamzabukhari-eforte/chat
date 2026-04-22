import type {
  CustomerChatTicket,
  TicketAssignmentHistoryEntry,
  TicketAttachmentHistoryEntry,
  TicketFollowupEntry,
} from "./types";

function pickTrimmed(o: Record<string, unknown>, keys: string[]): string {
  for (const k of keys) {
    const v = o[k];
    if (v === null || v === undefined) continue;
    const s = String(v).trim();
    if (s) return s;
  }
  return "";
}

function parseStringRecord(raw: unknown): Record<string, string> | undefined {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) return undefined;
  const src = raw as Record<string, unknown>;
  const out: Record<string, string> = {};
  for (const [k, v] of Object.entries(src)) {
    if (v === null || v === undefined) continue;
    out[String(k)] =
      typeof v === "object" ? JSON.stringify(v) : String(v).trim();
  }
  return Object.keys(out).length ? out : undefined;
}

function parseDynamicFields(raw: unknown): Record<string, string> | undefined {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) return undefined;
  const src = raw as Record<string, unknown>;
  const out: Record<string, string> = {};
  for (const [k, v] of Object.entries(src)) {
    if (v === null || v === undefined) continue;
    out[String(k)] =
      typeof v === "object" && !Array.isArray(v)
        ? JSON.stringify(v)
        : String(v).trim();
  }
  return Object.keys(out).length ? out : undefined;
}

function parseFollowupHistory(raw: unknown): TicketFollowupEntry[] {
  if (!Array.isArray(raw)) return [];
  const out: TicketFollowupEntry[] = [];
  for (const item of raw) {
    if (!item || typeof item !== "object") continue;
    const o = item as Record<string, unknown>;
    out.push({
      statusColor: pickTrimmed(o, ["statusColor", "StatusColor"]) || undefined,
      statusText: pickTrimmed(o, ["statusText", "StatusText"]) || undefined,
      index:
        typeof o.index === "number"
          ? o.index
          : typeof o.Index === "number"
            ? o.Index
            : undefined,
      remarks: pickTrimmed(o, ["remarks", "Remarks"]) || undefined,
      followupBy: pickTrimmed(o, ["followupBy", "FollowupBy"]) || undefined,
      followupDate:
        pickTrimmed(o, ["followupDate", "FollowupDate"]) || undefined,
    });
  }
  return out;
}

function parseAttachmentHistory(
  raw: unknown,
): TicketAttachmentHistoryEntry[] {
  if (!Array.isArray(raw)) return [];
  const out: TicketAttachmentHistoryEntry[] = [];
  for (const item of raw) {
    if (!item || typeof item !== "object") continue;
    const o = item as Record<string, unknown>;
    out.push({
      actual: pickTrimmed(o, ["actual", "Actual"]) || undefined,
      filename: pickTrimmed(o, ["filename", "Filename"]) || undefined,
      created: pickTrimmed(o, ["created", "Created"]) || undefined,
    });
  }
  return out;
}

function parseAssignmentHistory(
  raw: unknown,
): TicketAssignmentHistoryEntry[] {
  if (!Array.isArray(raw)) return [];
  const out: TicketAssignmentHistoryEntry[] = [];
  for (const item of raw) {
    if (!item || typeof item !== "object") continue;
    const o = item as Record<string, unknown>;
    out.push({
      teamName: pickTrimmed(o, ["teamName", "TeamName"]) || undefined,
      assignDate: pickTrimmed(o, ["assignDate", "AssignDate"]) || undefined,
      index:
        typeof o.index === "number"
          ? o.index
          : typeof o.Index === "number"
            ? o.Index
            : undefined,
      engineerName:
        pickTrimmed(o, ["engineerName", "EngineerName"]) || undefined,
    });
  }
  return out;
}

function lastFollowupStatus(
  followupHistory: TicketFollowupEntry[],
): string {
  if (followupHistory.length === 0) return "";
  const sorted = [...followupHistory].sort((a, b) => {
    const ia = a.index ?? 0;
    const ib = b.index ?? 0;
    if (ia !== ib) return ia - ib;
    return String(a.followupDate ?? "").localeCompare(
      String(b.followupDate ?? ""),
    );
  });
  const last = sorted[sorted.length - 1];
  return (last?.statusText ?? "").trim();
}

function lastFollowupStatusColor(
  followupHistory: TicketFollowupEntry[],
): string {
  if (followupHistory.length === 0) return "";
  const sorted = [...followupHistory].sort((a, b) => {
    const ia = a.index ?? 0;
    const ib = b.index ?? 0;
    if (ia !== ib) return ia - ib;
    return String(a.followupDate ?? "").localeCompare(
      String(b.followupDate ?? ""),
    );
  });
  const last = sorted[sorted.length - 1];
  return (last?.statusColor ?? "").trim();
}

/**
 * Normalizes one ticket row from SES list payloads (mixed key casing).
 */
export function parseTicketListRow(item: unknown): CustomerChatTicket | null {
  if (!item || typeof item !== "object") return null;
  const o = item as Record<string, unknown>;

  const ticketNo = pickTrimmed(o, [
    "ticketNo",
    "TicketNo",
    "ticketno",
    "TicketNO",
  ]);
  const ticketStatusRaw = pickTrimmed(o, [
    "ticketStatus",
    "TicketStatus",
    "status",
    "Status",
  ]);
  const ticketRegisteredAt = pickTrimmed(o, [
    "ticketRegisteredAt",
    "ticket_registered_at",
    "TicketRegisteredAt",
    "reportedDate",
    "ReportedDate",
  ]);
  const complaintType = pickTrimmed(o, ["complaintType", "ComplaintType"]);
  const complaintSubType = pickTrimmed(o, [
    "complaintSubType",
    "ComplaintSubType",
  ]);

  const followupHistory = parseFollowupHistory(o.followupHistory);
  const ticketStatus =
    ticketStatusRaw ||
    lastFollowupStatus(followupHistory) ||
    (followupHistory.length ? "—" : "");
  const statusColor =
    pickTrimmed(o, [
      "statusColor",
      "StatusColor",
      "statusColorCode",
      "StatusColorCode",
    ]) ||
    lastFollowupStatusColor(followupHistory);
  const indexPtrRaw =
    o.indexptr ??
    o.indexPtr ??
    o.ticketIndex ??
    o.ticketindex ??
    o.TicketIndex ??
    o.emailindexptr ??
    o.emailIndexPtr ??
    null;
  const ticketIndexPtr =
    typeof indexPtrRaw === "number" || typeof indexPtrRaw === "string"
      ? indexPtrRaw
      : undefined;

  if (!ticketNo && !ticketStatus && !complaintType && !complaintSubType) {
    return null;
  }

  const actionTakenList =
    parseStringRecord(o.actionTakenList) ??
    parseStringRecord(o.ActionTakenList);

  return {
    ticketNo: ticketNo || "—",
    ticketStatus: ticketStatus || "—",
    statusColor: statusColor || undefined,
    ticketRegisteredAt,
    ticketIndexPtr,
    complaintType,
    complaintSubType,
    reportedBy: pickTrimmed(o, ["reportedBy", "ReportedBy"]) || undefined,
    priority: pickTrimmed(o, ["priority", "Priority"]) || undefined,
    priorityLevel:
      pickTrimmed(o, ["Prioritylevel", "priorityLevel", "PriorityLevel"]) ||
      undefined,
    nature: pickTrimmed(o, ["nature", "Nature"]) || undefined,
    domain: pickTrimmed(o, ["domain", "Domain"]) || undefined,
    briefDescription:
      pickTrimmed(o, ["briefDescription", "BriefDescription"]) || undefined,
    detailedDescription:
      pickTrimmed(o, ["detailedDescription", "DetailedDescription"]) ||
      undefined,
    reportedDate:
      pickTrimmed(o, ["reportedDate", "ReportedDate"]) || undefined,
    problemOccuredDate:
      pickTrimmed(o, [
        "problemOccuredDate",
        "problemOccurredDate",
        "ProblemOccuredDate",
      ]) || undefined,
    location: pickTrimmed(o, ["location", "Location"]) || undefined,
    source:
      "source" in o && o.source === null
        ? null
        : (() => {
            const s = pickTrimmed(o, ["source", "Source"]);
            return s || undefined;
          })(),
    emailBody:
      "emailBody" in o && o.emailBody === null
        ? null
        : (() => {
            const s = pickTrimmed(o, ["emailBody", "EmailBody"]);
            return s || undefined;
          })(),
    actionTakenList,
    dynamicFields: parseDynamicFields(o.dynamicFields),
    followupHistory: followupHistory.length ? followupHistory : undefined,
    attachmentHistory: (() => {
      const a = parseAttachmentHistory(o.attachmentHistory);
      return a.length ? a : undefined;
    })(),
    assignmentHistory: (() => {
      const a = parseAssignmentHistory(o.assignmentHistory);
      return a.length ? a : undefined;
    })(),
    solutionHistory: Array.isArray(o.solutionHistory)
      ? o.solutionHistory
      : undefined,
    agentRemarks: Array.isArray(o.agentRemarks) ? o.agentRemarks : undefined,
    analysisHistory: Array.isArray(o.analysisHistory)
      ? o.analysisHistory
      : undefined,
  };
}

export function parseTicketListRows(raw: unknown[]): CustomerChatTicket[] {
  const out: CustomerChatTicket[] = [];
  for (const item of raw) {
    const row = parseTicketListRow(item);
    if (row) out.push(row);
  }
  return out;
}

/**
 * SES register-complaint view API (`/SES/registercomplaint/view`).
 * Used for cascading ticket dropdowns (domain → complaint type, etc.).
 */

const DEFAULT_HTTP_API_ORIGIN = "http://10.0.10.53:8080";
const DEFAULT_REGISTER_COMPLAINT_VIEW_PATH = "/SES/registercomplaint/view";
const DEFAULT_GENERATE_COMPLAINT_VIEW_PATH = "/SES/generatecomplaint/view";

function getDefaultApiOrigin(): string {
  if (typeof window === "undefined") return DEFAULT_HTTP_API_ORIGIN;
  return window.location.protocol === "https:"
    ? window.location.origin
    : DEFAULT_HTTP_API_ORIGIN;
}

export function getRegisterComplaintViewUrl(): string {
  const fromEnv =
    typeof process !== "undefined" &&
    process.env.NEXT_PUBLIC_REGISTER_COMPLAINT_VIEW_URL?.trim()
      ? process.env.NEXT_PUBLIC_REGISTER_COMPLAINT_VIEW_URL.trim()
      : undefined;
  return (
    fromEnv ?? `${getDefaultApiOrigin()}${DEFAULT_REGISTER_COMPLAINT_VIEW_PATH}`
  ).replace(/\/$/, "");
}

export function getGenerateComplaintViewUrl(): string {
  const fromEnv =
    typeof process !== "undefined" &&
    process.env.NEXT_PUBLIC_GENERATE_COMPLAINT_VIEW_URL?.trim()
      ? process.env.NEXT_PUBLIC_GENERATE_COMPLAINT_VIEW_URL.trim()
      : undefined;
  return (
    fromEnv ?? `${getDefaultApiOrigin()}${DEFAULT_GENERATE_COMPLAINT_VIEW_PATH}`
  ).replace(/\/$/, "");
}

function shouldSendUserIdInParams(): boolean {
  return (
    typeof process !== "undefined" && process.env.NODE_ENV === "development"
  );
}

function getApiFetchCredentials(): RequestCredentials {
  return shouldSendUserIdInParams() ? "omit" : "include";
}

export type RegisterComplaintOption = { id: string; name: string };

function parseJsonResponseBody(text: string, status: number): unknown {
  const trimmed = text.trim();
  if (!trimmed) {
    if (status >= 200 && status < 300) return null;
    throw new Error(`registercomplaint/view failed: ${status} (empty body)`);
  }
  try {
    return JSON.parse(trimmed) as unknown;
  } catch {
    throw new Error(
      `registercomplaint/view: response is not JSON (${trimmed.slice(0, 160)}${trimmed.length > 160 ? "…" : ""})`,
    );
  }
}

export async function postRegisterComplaintView(body: {
  action: string;
  domainId?: string | number;
  complainttypeId?: string | number;
  /** Some actions expect this name instead of `complainttypeId`. */
  ComplaintType?: string | number;
  complaintSubType?: string | number;
  ComplaintSubType?: string | number;
  complaintSubTypeId?: string | number;
  priorityId?: string | number;
}): Promise<unknown> {
  const url = new URL(getRegisterComplaintViewUrl());
  url.searchParams.set("action", body.action);
  if (body.domainId != null) {
    url.searchParams.set("domainId", String(body.domainId));
  }
  if (body.complainttypeId != null) {
    url.searchParams.set("complainttypeId", String(body.complainttypeId));
  }
  if (body.ComplaintType != null) {
    url.searchParams.set("ComplaintType", String(body.ComplaintType));
  }
  if (body.complaintSubType != null) {
    url.searchParams.set("complaintSubType", String(body.complaintSubType));
  }
  if (body.ComplaintSubType != null) {
    url.searchParams.set("ComplaintSubType", String(body.ComplaintSubType));
  }
  if (body.complaintSubTypeId != null) {
    url.searchParams.set("complaintSubTypeId", String(body.complaintSubTypeId));
  }
  if (body.priorityId != null) {
    url.searchParams.set("priorityId", String(body.priorityId));
  }

  const res = await fetch(url.toString(), {
    method: "POST",
    credentials: getApiFetchCredentials(),
  });
  const text = await res.text();
  if (!res.ok) {
    const hint = text.trim() ? ` — ${text.trim().slice(0, 200)}` : "";
    throw new Error(`registercomplaint/view failed: ${res.status}${hint}`);
  }
  return parseJsonResponseBody(text, res.status);
}

export async function postGenerateComplaintViewSavedata(
  data: Record<string, unknown>,
  files?: File[],
): Promise<unknown> {
  const url = new URL(getGenerateComplaintViewUrl());
  url.searchParams.set("action", "savedata");
  const form = new FormData();
  form.append("jsonData", JSON.stringify(data));
  for (const file of files ?? []) {
    form.append("files", file, file.name);
  }
  const res = await fetch(url.toString(), {
    method: "POST",
    credentials: getApiFetchCredentials(),
    body: form,
  });
  const text = await res.text();
  if (!res.ok) {
    const hint = text.trim() ? ` — ${text.trim().slice(0, 200)}` : "";
    throw new Error(`generatecomplaint/view failed: ${res.status}${hint}`);
  }
  return parseJsonResponseBody(text, res.status);
}

function parseItemRow(x: unknown): RegisterComplaintOption | null {
  if (!x || typeof x !== "object" || Array.isArray(x)) return null;
  const r = x as Record<string, unknown>;
  const id =
    r.id ??
    r.complaintTypeId ??
    r.typeId ??
    r.complaintTypeIndex ??
    r.key;
  const name =
    r.name ??
    r.complaintTypeName ??
    r.typeName ??
    r.label ??
    r.title ??
    r.description;
  if (id == null || name == null) return null;
  const idStr = String(id).trim();
  const nameStr = String(name).trim();
  if (!idStr || !nameStr) return null;
  return { id: idStr, name: nameStr };
}

function parseNumericIdMap(map: Record<string, unknown>): RegisterComplaintOption[] {
  const out: RegisterComplaintOption[] = [];
  for (const [k, v] of Object.entries(map)) {
    if (!/^\d+$/.test(k)) continue;
    if (typeof v === "string" || typeof v === "number") {
      const name = String(v).trim();
      if (name) out.push({ id: k, name });
    }
  }
  out.sort((a, b) => Number(a.id) - Number(b.id));
  return out;
}

/**
 * Best-effort parse of `getComplaintTypeByDomain` (and similar) responses:
 * arrays of objects, `{ "4": "Label", ... }` maps, or common wrapper keys.
 */
export function parseRegisterComplaintIdNameOptions(data: unknown): RegisterComplaintOption[] {
  if (!data || typeof data !== "object") return [];
  const o = data as Record<string, unknown>;

  const tryArray = (arr: unknown): RegisterComplaintOption[] => {
    if (!Array.isArray(arr)) return [];
    const rows = arr
      .map(parseItemRow)
      .filter((x): x is RegisterComplaintOption => x != null);
    return rows;
  };

  const arrayKeys = [
    "complaintTypes",
    "complaintTypeList",
    "data",
    "list",
    "items",
    "result",
    "rows",
  ];
  for (const key of arrayKeys) {
    const parsed = tryArray(o[key]);
    if (parsed.length > 0) return parsed;
  }

  const mapCandidates = [
    o.complaintTypes,
    o.complaintTypeMap,
    o.domainList,
    o.data,
  ];
  for (const c of mapCandidates) {
    if (c && typeof c === "object" && !Array.isArray(c)) {
      const parsed = parseNumericIdMap(c as Record<string, unknown>);
      if (parsed.length > 0) return parsed;
    }
  }

  return parseNumericIdMap(o);
}

export type RegisterComplaintDynamicField = {
  key: string;
  name: string;
  type: string;
  options: RegisterComplaintOption[];
};

function parseDynamicFieldOption(x: unknown): RegisterComplaintOption | null {
  if (typeof x === "string") {
    const t = x.trim();
    return t ? { id: t, name: t } : null;
  }
  if (!x || typeof x !== "object" || Array.isArray(x)) return null;
  const o = x as Record<string, unknown>;
  const id = o.id ?? o.value ?? o.key;
  const name = o.name ?? o.label ?? o.text ?? id;
  if (id == null) return null;
  const idStr = String(id).trim();
  const nameStr = String(name ?? id).trim();
  if (!idStr) return null;
  return { id: idStr, name: nameStr || idStr };
}

/**
 * Parses `getDynamicFieldsByDomain` style payloads: `{ fields: [...], formName, ... }`.
 */
export function parseGetDynamicFieldsByDomainResponse(data: unknown): {
  formName: string | null;
  formId: string | null;
  domain: string | null;
  fields: RegisterComplaintDynamicField[];
} {
  if (!data || typeof data !== "object" || Array.isArray(data)) {
    return { formName: null, formId: null, domain: null, fields: [] };
  }
  const o = data as Record<string, unknown>;
  const formName =
    o.formName != null && String(o.formName).trim()
      ? String(o.formName).trim()
      : null;
  const formId =
    o.formId != null && String(o.formId).trim()
      ? String(o.formId).trim()
      : null;
  const domain =
    o.domain != null && String(o.domain).trim()
      ? String(o.domain).trim()
      : null;
  const rawFields = o.fields;
  if (!Array.isArray(rawFields)) {
    return { formName, formId, domain, fields: [] };
  }
  const fields: RegisterComplaintDynamicField[] = [];
  for (const item of rawFields) {
    if (!item || typeof item !== "object" || Array.isArray(item)) continue;
    const f = item as Record<string, unknown>;
    const key = f.key != null ? String(f.key).trim() : "";
    const name = f.name != null ? String(f.name).trim() : "";
    const typeRaw = f.type != null ? String(f.type).trim() : "text";
    const type = typeRaw.toLowerCase();
    if (!key || !name) continue;
    const rawOpts = Array.isArray(f.options) ? f.options : [];
    const options = rawOpts
      .map(parseDynamicFieldOption)
      .filter((x): x is RegisterComplaintOption => x != null);
    fields.push({ key, name, type, options });
  }
  return { formName, formId, domain, fields };
}

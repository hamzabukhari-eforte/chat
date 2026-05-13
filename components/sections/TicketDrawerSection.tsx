"use client";

import Image from "next/image";
import {
  useCallback,
  useEffect,
  useId,
  useRef,
  useState,
} from "react";
import { useDropzone } from "react-dropzone";
import { AnimatePresence, motion } from "framer-motion";
import { FiX } from "react-icons/fi";
import { toast } from "sonner";
import { DateTimePickerField } from "@/components/atoms/DateTimePickerField";
import { SearchableSelect } from "@/components/atoms/SearchableSelect";
import type { RegisterComplaintDynamicField } from "@/lib/chat/registerComplaint";
import {
  parseGetDynamicFieldsByDomainResponse,
  parseRegisterComplaintIdNameOptions,
  messageFromComplaintSavedataResponse,
  postGenerateComplaintViewSavedata,
  postRegisterComplaintView,
} from "@/lib/chat/registerComplaint";
import type { CustomerChatTicket } from "@/lib/chat/types";
import { AGENT_APP_HEADER_HEIGHT_VAR } from "@/lib/layout/agentAppLayout";
import { cn } from "@/lib/utils";
import { TicketDrawerTicketsList } from "./TicketDrawerTicketsList";
import { TicketDrawerPanelHeader } from "./ticket-drawer/TicketDrawerPanelHeader";
import { TicketDynamicFieldsSection } from "./ticket-drawer/TicketDynamicFieldsSection";

export type TicketSelectOption = { id: string; name: string };

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Logged-in agent id — sent to SES `registercomplaint/view` with domain lookups. */
  agentUserId: string;
  /** SES context for ticket review submit payload. */
  domainIndex?: number | null;
  /** SES context for ticket review submit payload. */
  moduleIndex?: number | null;
  /** Phone number of the currently selected chat/customer. */
  customerPhone?: string;
  /** From `getQueueNAssignedChats` → `domainList`. */
  domainOptions: TicketSelectOption[];
  /** From `getQueueNAssignedChats` → `emailTemplates`. */
  emailTemplateOptions: TicketSelectOption[];
  /** From `getQueueNAssignedChats` → `smsTemplates`. */
  smsTemplateOptions: TicketSelectOption[];
  /** Active chat index for ticket save payload. */
  chatIndex?: string | number | null;
  /** Tickets for the active chat (from conversation load or refresh). */
  ticketList?: CustomerChatTicket[];
  /** True while tickets are being fetched for the drawer. */
  ticketsLoading?: boolean;
  /** Called when the ticket drawer opens so the parent can refresh the list. */
  onTicketDrawerOpen?: () => void;
};

function emptyTicketFields() {
  return {
    domainId: "",
    complaintType: "",
    ComplaintSubType: "",
    priority: "",
    priorityLevel: "",
    complaintNature: "",
    source: "",
    reportedById: "0",
    problemOccurred: "",
    briefDescription: "",
    detailedDescription: "",
    customerEmailTemplate: "",
    customerEmail: "",
    internalEmailTemplate: "",
    customerSmsTemplate: "",
    customerContact: "",
    internalSmsTemplate: "",
  };
}

/** Placeholder lists until SES exposes lookups for these fields. */
const STATIC_SOURCES: TicketSelectOption[] = [
  { id: "whatsapp", name: "WhatsApp" }
];

function formatTicketDateTime(d: Date): string {
  const pad2 = (n: number) => String(n).padStart(2, "0");
  return [
    pad2(d.getDate()),
    pad2(d.getMonth() + 1),
    d.getFullYear(),
  ].join("-") + ` ${pad2(d.getHours())}:${pad2(d.getMinutes())}:${pad2(d.getSeconds())}`;
}

function formatProblemOccurredForApi(raw: string): string {
  const value = raw.trim();
  if (!value) return value;
  const m = /^(\d{1,2})[-/](\d{1,2})[-/](\d{2,4})\s+(\d{1,2}):(\d{2})(?::(\d{2}))?$/.exec(
    value,
  );
  if (!m) return value;
  const pad2 = (n: number) => String(n).padStart(2, "0");
  const day = pad2(Number(m[1]));
  const month = pad2(Number(m[2]));
  const yy = pad2(Number(m[3]) % 100);
  const hh = pad2(Number(m[4]));
  const mm = pad2(Number(m[5]));
  const ss = pad2(Number(m[6] ?? "0"));
  return `${day}/${month}/${yy} ${hh}:${mm}:${ss}`;
}

/**
 * Left-side ticket panel. Implemented without Vaul/Radix dialog: Vaul 1.1.x omits
 * forwarding `modal` to Radix Dialog.Root, so `modal={false}` never applied and the
 * page (including the chat composer) received `pointer-events: none` on the body.
 *
 * Width matches {@link ChatSidebarSection} so the panel aligns with the queue / my-chats column.
 */
/** Mounts only while the drawer is open so form state resets without a sync effect. */
function TicketDrawerFormBody({
  agentUserId,
  customerPhone,
  domainOptions,
  emailTemplateOptions,
  smsTemplateOptions,
  chatIndex,
  onOpenChange,
}: Pick<
  Props,
  | "agentUserId"
  | "customerPhone"
  | "domainOptions"
  | "emailTemplateOptions"
  | "smsTemplateOptions"
  | "chatIndex"
  | "onOpenChange"
>) {
  const [fields, setFields] = useState(emptyTicketFields);
  const [attachments, setAttachments] = useState<Array<{
    file: File;
    previewUrl: string | null;
  }>>([]);
  const attachmentsRef = useRef(attachments);
  attachmentsRef.current = attachments;

  const [complaintTypeOptions, setComplaintTypeOptions] = useState<
    TicketSelectOption[]
  >([]);
  const [complaintTypesLoading, setComplaintTypesLoading] = useState(false);
  const [complaintSubTypeOptions, setComplaintSubTypeOptions] = useState<
    TicketSelectOption[]
  >([]);
  const [complaintSubTypesLoading, setComplaintSubTypesLoading] =
    useState(false);
  const [priorityOptions, setPriorityOptions] = useState<TicketSelectOption[]>(
    [],
  );
  const [priorityLoading, setPriorityLoading] = useState(false);
  const [priorityLevelOptions, setPriorityLevelOptions] = useState<
    TicketSelectOption[]
  >([]);
  const [priorityLevelLoading, setPriorityLevelLoading] = useState(false);
  const [complaintNatureOptions, setComplaintNatureOptions] = useState<
    TicketSelectOption[]
  >([]);
  const [complaintNatureLoading, setComplaintNatureLoading] = useState(false);

  const [additionalFields, setAdditionalFields] = useState<
    RegisterComplaintDynamicField[]
  >([]);
  const [additionalFormName, setAdditionalFormName] = useState<string | null>(
    null,
  );
  const [additionalFieldsLoading, setAdditionalFieldsLoading] =
    useState(false);
  const [dynamicFieldValues, setDynamicFieldValues] = useState<
    Record<string, string>
  >({});

  const setField = <K extends keyof ReturnType<typeof emptyTicketFields>>(
    key: K,
    value: ReturnType<typeof emptyTicketFields>[K],
  ) => {
    setFields((prev) => ({ ...prev, [key]: value }));
  };

  useEffect(() => {
    return () => {
      for (const item of attachmentsRef.current) {
        if (item.previewUrl?.startsWith("blob:")) {
          URL.revokeObjectURL(item.previewUrl);
        }
      }
    };
  }, []);

  const clearAttachments = useCallback(() => {
    setAttachments((prev) => {
      for (const item of prev) {
        if (item.previewUrl?.startsWith("blob:")) {
          URL.revokeObjectURL(item.previewUrl);
        }
      }
      return [];
    });
  }, []);

  const removeAttachmentAt = useCallback((index: number) => {
    setAttachments((prev) => {
      const target = prev[index];
      if (target?.previewUrl?.startsWith("blob:")) {
        URL.revokeObjectURL(target.previewUrl);
      }
      return prev.filter((_, i) => i !== index);
    });
  }, []);

  const onAttachmentDrop = useCallback((acceptedFiles: File[]) => {
    if (acceptedFiles.length === 0) return;
    setAttachments((prev) => [
      ...prev,
      ...acceptedFiles.map((file) => ({
        file,
        previewUrl: file.type.startsWith("image/")
          ? URL.createObjectURL(file)
          : null,
      })),
    ]);
  }, []);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop: onAttachmentDrop,
    multiple: true,
  });

  useEffect(() => {
    const domainId = fields.domainId;
    const complaintType = fields.complaintType;
    const complaintSubTypeId = fields.ComplaintSubType;
    if (!domainId || !complaintType || !complaintSubTypeId) {
      setAdditionalFields([]);
      setAdditionalFormName(null);
      setDynamicFieldValues({});
      setAdditionalFieldsLoading(false);
      return;
    }

    let cancelled = false;
    setAdditionalFieldsLoading(true);

    void (async () => {
      try {
        const json = await postRegisterComplaintView({
          action: "getDynamicFieldsByDomain",
          domainId,
          ComplaintType: complaintType,
          complaintSubTypeId,
        });
        if (cancelled) return;
        const parsed = parseGetDynamicFieldsByDomainResponse(json);
        setAdditionalFields(parsed.fields);
        setAdditionalFormName(parsed.formName);
        setDynamicFieldValues((prev) => {
          const next: Record<string, string> = {};
          for (const f of parsed.fields) {
            next[f.key] = prev[f.key] ?? "";
          }
          return next;
        });
      } catch (e) {
        if (!cancelled) {
          toast.error(
            e instanceof Error
              ? e.message
              : "Could not load additional information fields.",
          );
          setAdditionalFields([]);
          setAdditionalFormName(null);
          setDynamicFieldValues({});
        }
      } finally {
        if (!cancelled) setAdditionalFieldsLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [fields.domainId, fields.complaintType, fields.ComplaintSubType]);

  const onDomainChange = (domainId: string) => {
    setField("domainId", domainId);
    setField("complaintType", "");
    setField("ComplaintSubType", "");
    setField("priority", "");
    setField("priorityLevel", "");
    setField("complaintNature", "");
    setComplaintTypeOptions([]);
    setComplaintSubTypeOptions([]);
    setPriorityOptions([]);
    setPriorityLevelOptions([]);
    setComplaintNatureOptions([]);
    if (!domainId) return;
    if (!agentUserId.trim()) {
      toast.error("Missing agent user id; cannot load complaint types.");
      return;
    }

    void (async () => {
      setComplaintTypesLoading(true);
      try {
        const json = await postRegisterComplaintView({
          action: "getComplaintTypeByDomain",
          domainId,
        });
        const opts = parseRegisterComplaintIdNameOptions(json).map((o) => ({
          id: o.id,
          name: o.name,
        }));
        setComplaintTypeOptions(opts);
        if (opts.length === 0) {
          toast.info("No complaint types returned for this domain.");
        }
      } catch (e) {
        toast.error(
          e instanceof Error
            ? e.message
            : "Could not load complaint types for this domain.",
        );
        setComplaintTypeOptions([]);
      } finally {
        setComplaintTypesLoading(false);
      }
    })();
  };

  const onComplaintTypeChange = (complainttypeId: string) => {
    setField("complaintType", complainttypeId);
    setField("ComplaintSubType", "");
    setField("priority", "");
    setField("priorityLevel", "");
    setField("complaintNature", "");
    setComplaintSubTypeOptions([]);
    setPriorityOptions([]);
    setPriorityLevelOptions([]);
    setComplaintNatureOptions([]);
    if (!complainttypeId) return;

    void (async () => {
      setComplaintSubTypesLoading(true);
      try {
        const json = await postRegisterComplaintView({
          action: "getComplaintSubTypeByComplaintType",
          complainttypeId,
        });
        const opts = parseRegisterComplaintIdNameOptions(json).map((o) => ({
          id: o.id,
          name: o.name,
        }));
        setComplaintSubTypeOptions(opts);
        if (opts.length === 0) {
          toast.info("No complaint sub-types returned for this complaint type.");
        }
      } catch (e) {
        toast.error(
          e instanceof Error
            ? e.message
            : "Could not load complaint sub-types for this complaint type.",
        );
        setComplaintSubTypeOptions([]);
      } finally {
        setComplaintSubTypesLoading(false);
      }
    })();
  };

  const onComplaintSubTypeChange = (complaintSubType: string) => {
    setField("ComplaintSubType", complaintSubType);
    setField("priority", "");
    setField("priorityLevel", "");
    setField("complaintNature", "");
    setPriorityOptions([]);
    setPriorityLevelOptions([]);
    setComplaintNatureOptions([]);
    if (!complaintSubType) return;

    void (async () => {
      setPriorityLoading(true);
      try {
        const json = await postRegisterComplaintView({
          action: "getPriorityByComplaintSubType",
          ComplaintSubType: complaintSubType,
        });
        const opts = parseRegisterComplaintIdNameOptions(json).map((o) => ({
          id: o.id,
          name: o.name,
        }));
        setPriorityOptions(opts);
        if (opts.length === 0) {
          toast.info("No priorities returned for this complaint sub-type.");
        }
      } catch (e) {
        toast.error(
          e instanceof Error
            ? e.message
            : "Could not load priorities for this complaint sub-type.",
        );
        setPriorityOptions([]);
      } finally {
        setPriorityLoading(false);
      }
    })();
  };

  const onPriorityChange = (priorityId: string) => {
    setField("priority", priorityId);
    setField("priorityLevel", "");
    setField("complaintNature", "");
    setPriorityLevelOptions([]);
    setComplaintNatureOptions([]);
    if (!priorityId || !fields.ComplaintSubType) return;

    void (async () => {
      setPriorityLevelLoading(true);
      try {
        const json = await postRegisterComplaintView({
          action: "getPriorityLevelBySubType",
          complaintSubTypeId: fields.ComplaintSubType,
          priorityId,
        });
        const opts = parseRegisterComplaintIdNameOptions(json).map((o) => ({
          id: o.id,
          name: o.name,
        }));
        setPriorityLevelOptions(opts);
        if (opts.length === 0) {
          toast.info("No priority levels returned for this selection.");
        }
      } catch (e) {
        toast.error(
          e instanceof Error
            ? e.message
            : "Could not load priority levels for this selection.",
        );
        setPriorityLevelOptions([]);
      } finally {
        setPriorityLevelLoading(false);
      }
    })();

    void (async () => {
      setComplaintNatureLoading(true);
      try {
        const json = await postRegisterComplaintView({
          action: "getNatureBySubType",
          complaintSubTypeId: fields.ComplaintSubType,
          priorityId,
        });
        const opts = parseRegisterComplaintIdNameOptions(json).map((o) => ({
          id: o.id,
          name: o.name,
        }));
        setComplaintNatureOptions(opts);
        if (opts.length === 0) {
          toast.info("No complaint nature returned for this selection.");
        }
      } catch (e) {
        toast.error(
          e instanceof Error
            ? e.message
            : "Could not load complaint nature for this selection.",
        );
        setComplaintNatureOptions([]);
      } finally {
        setComplaintNatureLoading(false);
      }
    })();
  };

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    const missing: string[] = [];
    if (!fields.domainId) missing.push("Domain");
    if (!fields.complaintType) missing.push("Complaint type");
    if (!fields.ComplaintSubType) missing.push("Complaint sub-type");
    if (!fields.priority) missing.push("Priority");
    if (!fields.complaintNature) missing.push("Complaint nature");
    if (!fields.source) missing.push("Source");
    if (!fields.problemOccurred.trim()) missing.push("Problem occurred");
    if (!fields.briefDescription.trim()) missing.push("Brief description");
    if (!fields.detailedDescription.trim()) missing.push("Detailed description");
    if (missing.length) {
      toast.error(`Please complete: ${missing.join(", ")}.`);
      return;
    }

    const toInt = (value: string): number => {
      const n = Number.parseInt(String(value).trim(), 10);
      return Number.isFinite(n) ? n : 0;
    };
    const reportedDate = formatTicketDateTime(new Date());
    const selectedSource = STATIC_SOURCES.find((s) => s.id === fields.source);
    const phoneForUserId = String(customerPhone ?? "").trim();
    const payload: Record<string, unknown> = {
      domain: toInt(fields.domainId),
      Nature: toInt(fields.complaintNature),
      users: 0,
      cli: phoneForUserId,
      ComplaintType: toInt(fields.complaintType),
      ComplaintSubType: toInt(fields.ComplaintSubType),
      Priority: toInt(fields.priority),
      reporteddate: reportedDate,
      problemoccureddate: formatProblemOccurredForApi(fields.problemOccurred),
      briefdescription: fields.briefDescription,
      detaileddescription: fields.detailedDescription,
      sourceid: toInt(fields.source),
      prioritylevel_display: toInt(fields.priorityLevel),
      source: selectedSource?.name ?? fields.source,
      customeremail: fields.customerEmail,
      customercontact: fields.customerContact,
      customeremailid: toInt(fields.customerEmailTemplate),
      customersmsid: toInt(fields.customerSmsTemplate),
      internalemailid: toInt(fields.internalEmailTemplate),
      internalsmsid: toInt(fields.internalSmsTemplate),
      chatIndex: chatIndex != null ? String(chatIndex) : "",
      ...dynamicFieldValues,
    };

    void (async () => {
      try {
        const savedataResponse = await postGenerateComplaintViewSavedata(
          payload,
          attachments.map((a) => a.file),
        );
        clearAttachments();
        const apiMessage =
          messageFromComplaintSavedataResponse(savedataResponse);
        toast.success(
          apiMessage || "Complaint registered successfully.",
        );
        onOpenChange(false);
      } catch (err) {
        toast.error(
          err instanceof Error ? err.message : "Failed to register complaint.",
        );
      }
    })();
  };

  return (
    <form
      onSubmit={handleSave}
      className="flex min-h-0 flex-1 flex-col overflow-hidden"
    >
            <div className="min-h-0 flex-1 space-y-4 overflow-y-auto p-4 text-sm">
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
                <SearchableSelect
                  id="ticket-domain"
                  label="Domain"
                  required
                  value={fields.domainId}
                  onValueChange={onDomainChange}
                  options={domainOptions}
                  disabled={domainOptions.length === 0}
                  searchPlaceholder="Search domains..."
                  emptyMessage="No domains from API yet."
                />
                <SearchableSelect
                  id="ticket-complaint-type"
                  label="ComplaintType"
                  required
                  value={fields.complaintType}
                  onValueChange={onComplaintTypeChange}
                  options={complaintTypeOptions}
                  disabled={
                    !fields.domainId ||
                    complaintTypesLoading ||
                    complaintTypeOptions.length === 0
                  }
                  searchPlaceholder={
                    complaintTypesLoading
                      ? "Loading types…"
                      : "Search types..."
                  }
                  emptyMessage={
                    !fields.domainId
                      ? "Select a domain first."
                      : "No complaint types for this domain."
                  }
                />
                <SearchableSelect
                  id="ticket-complaint-subtype"
                  label="ComplaintSubType"
                  required
                  value={fields.ComplaintSubType}
                  onValueChange={onComplaintSubTypeChange}
                  options={complaintSubTypeOptions}
                  disabled={
                    !fields.complaintType ||
                    complaintSubTypesLoading ||
                    complaintSubTypeOptions.length === 0
                  }
                  searchPlaceholder={
                    complaintSubTypesLoading
                      ? "Loading sub-types…"
                      : "Search sub-types..."
                  }
                  emptyMessage={
                    !fields.complaintType
                      ? "Select a complaint type first."
                      : "No complaint sub-types for this complaint type."
                  }
                />
              </div>

              <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
                <SearchableSelect
                  id="ticket-priority"
                  label="Priority"
                  required
                  value={fields.priority}
                  onValueChange={onPriorityChange}
                  options={priorityOptions}
                  disabled={
                    !fields.ComplaintSubType ||
                    priorityLoading ||
                    priorityOptions.length === 0
                  }
                  searchPlaceholder={
                    priorityLoading ? "Loading priorities..." : "Search priority..."
                  }
                  emptyMessage={
                    !fields.ComplaintSubType
                      ? "Select a complaint sub-type first."
                      : "No priorities for this complaint sub-type."
                  }
                />
                <SearchableSelect
                  id="ticket-priority-level"
                  label="Priority Level"
                  value={fields.priorityLevel}
                  onValueChange={(v) => setField("priorityLevel", v)}
                  options={priorityLevelOptions}
                  disabled={
                    !fields.priority ||
                    priorityLevelLoading ||
                    priorityLevelOptions.length === 0
                  }
                  searchPlaceholder={
                    priorityLevelLoading ? "Loading levels..." : "Search level..."
                  }
                  emptyMessage={
                    !fields.priority
                      ? "Select a priority first."
                      : "No priority levels for this priority."
                  }
                />
                <SearchableSelect
                  id="ticket-complaint-nature"
                  label="Complaint Nature"
                  required
                  value={fields.complaintNature}
                  onValueChange={(v) => setField("complaintNature", v)}
                  options={complaintNatureOptions}
                  disabled={
                    !fields.priority ||
                    complaintNatureLoading ||
                    complaintNatureOptions.length === 0
                  }
                  searchPlaceholder={
                    complaintNatureLoading ? "Loading nature..." : "Search nature..."
                  }
                  emptyMessage={
                    !fields.priority
                      ? "Select a priority first."
                      : "No complaint nature for this selection."
                  }
                />
              </div>

              <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
                <SearchableSelect
                  id="ticket-source"
                  label="Source"
                  required
                  value={fields.source}
                  onValueChange={(v) => setField("source", v)}
                  options={STATIC_SOURCES}
                  searchPlaceholder="Search source..."
                />
                <DateTimePickerField
                  id="ticket-problem-occurred"
                  label="Problem Occurred"
                  required
                  disableFuture
                  value={fields.problemOccurred}
                  onChange={(v) => setField("problemOccurred", v)}
                />
              </div>

              <div>
                <label
                  htmlFor="ticket-brief"
                  className="block text-xs font-medium text-gray-700"
                >
                  Brief Description
                  <span className="text-red-500" aria-hidden>
                    {" "}
                    *
                  </span>
                </label>
                <input
                  id="ticket-brief"
                  type="text"
                  required
                  value={fields.briefDescription}
                  onChange={(e) =>
                    setField("briefDescription", e.target.value)
                  }
                  placeholder="Brief Description"
                  className="mt-1 w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm text-gray-900 outline-none transition-colors placeholder:text-gray-400 focus:border-brand-500 focus:ring-1 focus:ring-brand-500"
                />
              </div>

              <div>
                <label
                  htmlFor="ticket-detailed"
                  className="block text-xs font-medium text-gray-700"
                >
                  Detailed Description
                  <span className="text-red-500" aria-hidden>
                    {" "}
                    *
                  </span>
                </label>
                <textarea
                  id="ticket-detailed"
                  rows={4}
                  required
                  value={fields.detailedDescription}
                  onChange={(e) =>
                    setField("detailedDescription", e.target.value)
                  }
                  placeholder="Detailed Description"
                  className="mt-1 w-full resize-y rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm text-gray-900 outline-none transition-colors placeholder:text-gray-400 focus:border-brand-500 focus:ring-1 focus:ring-brand-500"
                />
              </div>

              <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
                <SearchableSelect
                  id="ticket-customer-email-template"
                  label="Customer Email Template"
                  value={fields.customerEmailTemplate}
                  onValueChange={(v) => setField("customerEmailTemplate", v)}
                  options={emailTemplateOptions}
                  disabled={emailTemplateOptions.length === 0}
                  searchPlaceholder="Search templates..."
                  emptyMessage="No email templates available."
                />
                <div>
                  <label
                    htmlFor="ticket-customer-email"
                    className="block text-xs font-medium text-gray-700"
                  >
                    Customer Email
                  </label>
                  <input
                    id="ticket-customer-email"
                    type="email"
                    autoComplete="email"
                    value={fields.customerEmail}
                    onChange={(e) =>
                      setField("customerEmail", e.target.value)
                    }
                    placeholder="Enter Customer Email"
                    className="mt-1 w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm text-gray-900 outline-none transition-colors placeholder:text-gray-400 focus:border-brand-500 focus:ring-1 focus:ring-brand-500"
                  />
                </div>
                <SearchableSelect
                  id="ticket-internal-email-template"
                  label="Internal Email Template"
                  value={fields.internalEmailTemplate}
                  onValueChange={(v) => setField("internalEmailTemplate", v)}
                  options={emailTemplateOptions}
                  disabled={emailTemplateOptions.length === 0}
                  searchPlaceholder="Search templates..."
                  emptyMessage="No email templates available."
                />
              </div>

              <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
                <SearchableSelect
                  id="ticket-customer-sms-template"
                  label="Customer SMS Template"
                  value={fields.customerSmsTemplate}
                  onValueChange={(v) => setField("customerSmsTemplate", v)}
                  options={smsTemplateOptions}
                  disabled={smsTemplateOptions.length === 0}
                  searchPlaceholder="Search templates..."
                  emptyMessage="No SMS templates available."
                />
                <div>
                  <label
                    htmlFor="ticket-customer-contact"
                    className="block text-xs font-medium text-gray-700"
                  >
                    Customer Contact
                  </label>
                  <input
                    id="ticket-customer-contact"
                    type="text"
                    value={fields.customerContact}
                    onChange={(e) =>
                      setField("customerContact", e.target.value)
                    }
                    placeholder="Enter Customer Contact"
                    className="mt-1 w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm text-gray-900 outline-none transition-colors placeholder:text-gray-400 focus:border-brand-500 focus:ring-1 focus:ring-brand-500"
                  />
                </div>
                <SearchableSelect
                  id="ticket-internal-sms-template"
                  label="Internal SMS Template"
                  value={fields.internalSmsTemplate}
                  onValueChange={(v) => setField("internalSmsTemplate", v)}
                  options={smsTemplateOptions}
                  disabled={smsTemplateOptions.length === 0}
                  searchPlaceholder="Search templates..."
                  emptyMessage="No SMS templates available."
                />
              </div>

              <TicketDynamicFieldsSection
                additionalFieldsLoading={additionalFieldsLoading}
                additionalFields={additionalFields}
                dynamicFieldValues={dynamicFieldValues}
                onValueChange={(key, value) =>
                  setDynamicFieldValues((prev) => ({
                    ...prev,
                    [key]: value,
                  }))
                }
              />

              <div>
                <span className="block text-xs font-medium text-gray-700">
                  Attachment
                </span>
                <div
                  {...getRootProps({
                    className: cn(
                      "relative mt-1 flex min-h-[9rem] cursor-pointer flex-col items-center justify-center overflow-hidden rounded-lg border border-dashed p-3 text-center transition-colors outline-none",
                      isDragActive
                        ? "border-brand-500 bg-brand-50/90 ring-1 ring-brand-500"
                        : "border-gray-200 bg-gray-50/60 hover:border-brand-300 hover:bg-brand-50/40",
                      attachments.length > 0 && "border-solid bg-white",
                    ),
                  })}
                >
                  <input {...getInputProps()} />
                  {attachments.length > 0 ? (
                    <div className="grid w-full grid-cols-1 gap-2 sm:grid-cols-2">
                      {attachments.map((item, index) => (
                        <div
                          key={`${item.file.name}-${item.file.size}-${index}`}
                          className="relative rounded-md border border-gray-200 bg-white p-2 text-left"
                        >
                          {item.previewUrl ? (
                            <div className="relative h-24 w-full flex items-center justify-center">
                              <Image
                                src={item.previewUrl}
                                alt={item.file.name}
                                fill
                                unoptimized
                                className="rounded object-contain"
                                sizes="(max-width: 720px) 90vw, 320px"
                              />
                            </div>
                          ) : (
                            <p
                              className="truncate pr-8 text-sm text-gray-700"
                              title={item.file.name}
                            >
                              {item.file.name}
                            </p>
                          )}
                          <p
                            className="mt-1 truncate pr-8 text-xs text-gray-500"
                            title={item.file.name}
                          >
                            {item.file.name}
                          </p>
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              removeAttachmentAt(index);
                            }}
                            aria-label={`Remove attachment ${item.file.name}`}
                            className="absolute right-1 top-1 flex h-7 w-7 items-center justify-center rounded-md border border-gray-200 bg-white/95 text-gray-600 shadow-sm transition-colors hover:border-brand-300 hover:bg-brand-50 hover:text-brand-600 cursor-pointer"
                          >
                            <FiX className="h-4 w-4" />
                          </button>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="space-y-1 px-2">
                      <p className="text-sm text-gray-600">
                        Drag and drop files here, or click to browse
                      </p>
                      <p className="text-xs text-gray-400">
                        Images show a preview inside this area
                      </p>
                    </div>
                  )}
                  {attachments.length > 0 ? (
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        clearAttachments();
                      }}
                      aria-label="Remove all attachments"
                      className="absolute right-2 top-2 rounded-md border border-gray-200 bg-white/95 px-2 py-1 text-xs text-gray-600 shadow-sm transition-colors hover:border-brand-300 hover:bg-brand-50 hover:text-brand-600 cursor-pointer"
                    >
                      Clear all
                    </button>
                  ) : null}
                </div>
              </div>
            </div>

      <div className="shrink-0 border-t border-gray-100 p-4">
        <button
          type="submit"
          className="rounded-lg border border-brand-600 px-4 py-2 text-sm font-medium text-brand-600 transition-colors hover:bg-brand-50 cursor-pointer"
        >
          Save
        </button>
      </div>
    </form>
  );
}

export function TicketDrawerSection({
  open,
  onOpenChange,
  agentUserId,
  domainIndex,
  moduleIndex,
  customerPhone,
  domainOptions,
  emailTemplateOptions,
  smsTemplateOptions,
  chatIndex,
  ticketList = [],
  ticketsLoading = false,
  onTicketDrawerOpen,
}: Props) {
  const titleId = useId();
  const descriptionId = useId();
  const [drawerView, setDrawerView] = useState<"list" | "form">("list");

  useEffect(() => {
    if (!open) return;
    queueMicrotask(() => {
      onTicketDrawerOpen?.();
    });
  }, [open, onTicketDrawerOpen]);

  useEffect(() => {
    if (!open) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") onOpenChange(false);
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [open, onOpenChange]);

  return (
    <AnimatePresence>
      {open ? (
        <>
          <motion.div
            key="ticket-panel-backdrop"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2, ease: "easeInOut" }}
            style={{
              top: `var(${AGENT_APP_HEADER_HEIGHT_VAR}, 56px)`,
              height: `calc(100dvh - var(${AGENT_APP_HEADER_HEIGHT_VAR}, 56px))`,
            }}
            className="pointer-events-none fixed inset-x-0 z-30 bg-black/20 backdrop-blur-sm"
            aria-hidden
          />
          <motion.aside
            key="ticket-panel"
            role="dialog"
            aria-modal="false"
            aria-labelledby={titleId}
            aria-describedby={descriptionId}
            initial={{ x: "-100%" }}
            animate={{ x: 0 }}
            exit={{ x: "-100%" }}
            transition={{ type: "spring", damping: 32, stiffness: 360 }}
            style={{
              top: `var(${AGENT_APP_HEADER_HEIGHT_VAR}, 56px)`,
              height: `calc(100dvh - var(${AGENT_APP_HEADER_HEIGHT_VAR}, 56px))`,
              maxHeight: `calc(100dvh - var(${AGENT_APP_HEADER_HEIGHT_VAR}, 56px))`,
            }}
            className={cn(
              "fixed left-0 z-40 flex w-[92vw] max-w-[720px] flex-col bg-white sm:w-[560px] md:w-[640px] lg:w-[720px]",
              "border-0 border-r border-gray-200 shadow-none",
            )}
          >
            <TicketDrawerPanelHeader
              titleId={titleId}
              descriptionId={descriptionId}
              drawerView={drawerView}
              onToggleView={() =>
                setDrawerView((prev) => (prev === "list" ? "form" : "list"))
              }
              onClose={() => onOpenChange(false)}
            />

            {drawerView === "list" ? (
              <TicketDrawerTicketsList
                agentUserId={agentUserId}
                domainIndex={domainIndex}
                moduleIndex={moduleIndex}
                chatIndex={chatIndex}
                cli={customerPhone}
                tickets={ticketList}
                loading={ticketsLoading}
              />
            ) : (
              <TicketDrawerFormBody
                agentUserId={agentUserId}
                customerPhone={customerPhone}
                domainOptions={domainOptions}
                emailTemplateOptions={emailTemplateOptions}
                smsTemplateOptions={smsTemplateOptions}
                chatIndex={chatIndex}
                onOpenChange={onOpenChange}
              />
            )}
          </motion.aside>
        </>
      ) : null}
    </AnimatePresence>
  );
}

import { useState, useEffect } from "react";
import { FiPlusCircle, FiAlertTriangle } from "react-icons/fi";
import { TableData } from "../../data/TableData";
import NewInquiriesform from "./NewInquiriesform";
import Table from "../../components/Table";
import { useNavigate } from "react-router-dom";
import { getBadgeClass } from "../../data/LeadStatusConfig";
import { resolveServiceTrack, SERVICE_TRACKS } from "../../data/serviceTrack";

const MAIN_TABS = ["Inquiries"];

const SUB_TABS = {
  0: ["New Inquiries", "Nurturing Inquiries", "Won Deals", "Dropped Inquiries"],
  1: ["Tab A", "Tab B", "Tab C"],
};

// Sub-tab → status mapping. Mirrors the standard pipeline: raw inquiries,
// active deals being worked, closed-won (client created), and lost/dropped.
const MOCK_STATUSES = {
  "0-0": ["Inquiry"],
  "0-1": ["Qualified", "Proposal", "Negotiation", "On Hold"],
  "0-2": ["Won"],
  "0-3": ["Lost"],
};

/**
 * Build the full leads list by merging:
 *   1. localStorage "newLeadsData" (added / edited leads) — prepended first
 *   2. Static TableData — only items NOT overridden in localStorage
 * Then remove any IDs found in "deletedLeads".
 */
function getMergedLeads() {
  let newLeads = [];
  try {
    const raw = localStorage.getItem("newLeadsData");
    if (raw) newLeads = JSON.parse(raw);
  } catch (e) {
    console.error(e);
  }

  let deletedLeads = [];
  try {
    const raw = localStorage.getItem("deletedLeads");
    if (raw) deletedLeads = JSON.parse(raw);
  } catch (e) {
    console.error(e);
  }

  // Build a Set of proposalIds already present in localStorage leads
  const overriddenIds = new Set(newLeads.map((l) => l.proposalId));

  // Merge: localStorage leads first, then remaining static data
  const merged = [
    ...newLeads,
    ...TableData.filter((item) => !overriddenIds.has(item.proposalId)),
  ];

  // Remove deleted leads
  return merged.filter((item) => !deletedLeads.includes(item.proposalId));
}

async function fetchTabData(mainTab, subTab) {
  // ── Real API call goes here ──────────────────────────────────────────────────
  // const res = await fetch(`/api/leads?main=${mainTab}&sub=${subTab}`);
  // if (!res.ok) throw new Error(res.statusText);
  // return res.json();
  // ────────────────────────────────────────────────────────────────────────────

  // Mock: filter merged data by tab statuses
  const statuses = MOCK_STATUSES[`${mainTab}-${subTab}`] ?? [];
  const allLeads = getMergedLeads();

  return allLeads
    .filter((item) =>
      statuses.some((s) => item.status?.toLowerCase() === s.toLowerCase()),
    )
    // Normalize the service track onto every row so legacy leads (no field)
    // still filter correctly as Interiors/Architecture.
    .map((item, i) => ({
      ...item,
      serviceTrack: resolveServiceTrack(item),
      sno: String(i + 1).padStart(2, "0"),
    }));
}
// ─────────────────────────────────────────────────────────────────────────────

const Leads = () => {
  const navigate = useNavigate();
  const [showForm, setShowForm] = useState(false);
  const [activeMainTab, setActiveMainTab] = useState(0);
  const [activeSubTab, setActiveSubTab] = useState(0);
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(false);

  const loadData = async () => {
    setLoading(true);
    try {
      const result = await fetchTabData(activeMainTab, activeSubTab);
      setData(result);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const controller = new AbortController();

    const load = async () => {
      setLoading(true);
      try {
        const result = await fetchTabData(activeMainTab, activeSubTab);
        if (!controller.signal.aborted) setData(result);
      } catch (err) {
        if (err.name !== "AbortError") console.error(err);
      } finally {
        if (!controller.signal.aborted) setLoading(false);
      }
    };

    load();
    return () => controller.abort();
  }, [activeMainTab, activeSubTab]);

  // Re-load data when returning to the page (e.g. after edit/delete on profile)
  useEffect(() => {
    const handleFocus = () => {
      loadData();
    };
    window.addEventListener("focus", handleFocus);
    return () => window.removeEventListener("focus", handleFocus);
  }, [activeMainTab, activeSubTab]);

  // Listen for custom events dispatched from the profile page
  useEffect(() => {
    const handleLeadUpdate = () => {
      loadData();
    };
    window.addEventListener("leadDataChanged", handleLeadUpdate);
    return () =>
      window.removeEventListener("leadDataChanged", handleLeadUpdate);
  }, [activeMainTab, activeSubTab]);

  // When a new lead is added, POST to API then re-fetch the current tab
  // AFTER
  const handleAddLead = async (formData) => {
    const nextNum =
      TableData.length +
      JSON.parse(localStorage.getItem("newLeadsData") || "[]").length +
      1;
    const proposalId = `BL-${new Date().getFullYear()}-${String(nextNum).padStart(3, "0")}`;

    // Architecture has no package preset — don't let the form's interiors
    // defaults leak onto the lead.
    const isArch = (formData.serviceTrack || "Interiors") === "Architecture";

    const newLead = {
      proposalId,
      clientName: formData.fullName,
      phone: formData.phoneNumber,
      email: formData.email,
      // "scope" is what the table column key reads — must match
      scope: formData.projectScope,
      location: formData.location?.trim() || "",
      locationSecondary: formData.locationSecondary?.trim() || "",
      status: formData.inquiryStatus || "Inquiry",
      investment: formData.investmentRange,
      possessionDate: formData.processionDate
        ? formData.processionDate.split("-").reverse().join(".")
        : "",
      // Flagged at creation when the possession date is tighter than the
      // preset's estimated delivery — surfaced in the list below.
      timelineTight: !!formData.timelineTight,
      // Top-level branch — drives the delivery pipeline (Interiors/Architecture)
      serviceTrack: formData.serviceTrack || "Interiors",
      // Architecture-only intake (empty for Interiors)
      projectIntent: formData.projectIntent || "",
      plotArea: formData.plotArea || "",
      plotNumber: formData.plotNumber || "",
      landOwnership: formData.landOwnership || "",
      targetCompletion: formData.targetCompletion || "",
      indicativeBudget: formData.indicativeBudget || "",
      // Interiors-only preset fields — blank for Architecture.
      propertyType: isArch ? "" : formData.propertyType,
      architecturalNotes: formData.architecturalNotes,
      inquirySource: formData.inquirySource,
      // Referral details — only meaningful when inquirySource is 'Referral'
      referralPersonName: formData.referralPersonName || "",
      referralPersonEmail: formData.referralPersonEmail || "",
      // Property preset captured at inquiry — used as the starting
      // template when the Send Proposal flow opens later.
      quotePreset: isArch ? "" : formData.quotePreset,
      quoteSizeRange: isArch ? "" : formData.quoteSizeRange,
    };

    const saved = JSON.parse(localStorage.getItem("newLeadsData") || "[]");
    localStorage.setItem("newLeadsData", JSON.stringify([newLead, ...saved]));

    const result = await fetchTabData(activeMainTab, activeSubTab);
    setData(result);
  };

  const columns = [
    { key: "sno", label: "Sno" },
    {
      key: "proposalId",
      label: "Proposal ID",
      render: (_, item) => (
        <span
          className=" cursor-pointer hover:underline"
          onClick={(e) => {
            e.stopPropagation();
            navigate(`/leads/${item.proposalId}`);
          }}
        >
          {item.proposalId}
        </span>
      ),
    },
    {
      key: "clientName",
      label: "Client Name",
      render: (_, item) => (
        <span
          className="cursor-pointer hover:underline"
          onClick={(e) => {
            e.stopPropagation();
            navigate(`/leads/${item.proposalId}`);
          }}
        >
          {item.clientName}
        </span>
      ),
    },
    { key: "phone", label: "Phone" },
    {
      key: "scope",
      label: "Scope",
      render: (_, item) => {
        const presetKey = item.quotePreset || "";
        const propType = item.propertyType || "";
        if (!presetKey) return item.scope || "—";
        const formattedPresetKey = presetKey.replace(/^(\d+)(BHK)$/i, "$1 BHK");
        return `${formattedPresetKey} / ${propType}`;
      },
    },
    {
      key: "location",
      label: "Location",
      render: (_, item) => {
        const parts = item.location?.includes(",")
          ? item.location.split(",")
          : [item.location || "", item.locationSecondary || ""];
        const primary = parts[0]?.trim() || "—";
        const secondary = parts.slice(1).join(",").trim() || "";
        return (
          <div className="flex flex-col text-left">
            <span className="text-gray-900 leading-normal">{primary}</span>
            {secondary && (
              <span className="text-select-blue text-xs leading-tight mt-0.5">
                {secondary}
              </span>
            )}
          </div>
        );
      },
    },
    {
      key: "status",
      label: "Status",
      render: (_, item) => (
        <span
          className={`px-3 py-1 rounded-full text-[11px] font-semibold tracking-wider uppercase ${getBadgeClass(item.status)}`}
        >
          {item.status}
        </span>
      ),
    },
    { key: "investment", label: "Investment" },
    {
      key: "possessionDate",
      label: "Possession Date",
      render: (_, item) =>
        item.timelineTight ? (
          <span
            className="inline-flex items-center gap-1.5 text-red-600 font-semibold"
            title="Possession date is tighter than our estimated delivery — at-risk timeline"
          >
            <FiAlertTriangle size={13} className="shrink-0" />
            {item.possessionDate || "—"}
          </span>
        ) : (
          item.possessionDate || "—"
        ),
    },
  ];

  const isInquiries = activeMainTab === 0;

  const subtitle = isInquiries
    ? `${MAIN_TABS[0]} - ${SUB_TABS[0][activeSubTab]}`
    : `${MAIN_TABS[activeMainTab]}`;

  return (
    <div className="h-full flex flex-col overflow-hidden">
      <Table
        title="Leads"
        subtitle={subtitle}
        mainTabs={MAIN_TABS}
        onMainTabChange={(idx) => {
          setActiveMainTab(idx);
          setActiveSubTab(0);
        }}
        actions={
          isInquiries && (
            <button
              onClick={() => setShowForm(true)}
              className="flex items-center gap-2 bg-linear-to-r from-select-blue to-dark-blue text-white rounded-lg px-8 py-2.5 text-sm font-medium"
            >
              <FiPlusCircle />
              Add Inquiry
            </button>
          )
        }
        columns={isInquiries ? columns : []}
        data={isInquiries ? data : []}
        emptyMessage={
          isInquiries
            ? loading
              ? "Loading..."
              : "No records found."
            : "Project Caliber view — replace this with your component"
        }
        rowsPerPage={8}
        activeRowKey="proposalId"
        subTabs={isInquiries ? SUB_TABS[0] : undefined}
        onSubTabChange={setActiveSubTab}
        sortFields={
          isInquiries
            ? [
                { key: "proposalId", label: "Proposal ID" },
                { key: "clientName", label: "Client Name" },
                { key: "investment", label: "Investment" },
                { key: "possessionDate", label: "Possession Date" },
              ]
            : undefined
        }
        filterFields={
          isInquiries
            ? [
                {
                  key: "status",
                  label: "Status",
                  options: [
                    "Inquiry",
                    "Qualified",
                    "Proposal",
                    "Negotiation",
                    "Won",
                    "On Hold",
                    "Lost",
                  ],
                },
                {
                  key: "serviceTrack",
                  label: "Service Track",
                  options: SERVICE_TRACKS,
                },
              ]
            : undefined
        }
        dateRangeField={
          isInquiries
            ? {
                key: "possessionDate",
                parse: (value) => {
                  const parts = value?.split(".");
                  if (parts?.length === 3)
                    return new Date(`${parts[2]}-${parts[1]}-${parts[0]}`);
                  return null;
                },
              }
            : undefined
        }
        exportConfig={
          isInquiries
            ? {
                filename: "leads_export",
                columns: [
                  { label: "Sno", key: "sno" },
                  { label: "Proposal ID", key: "proposalId" },
                  { label: "Client Name", key: "clientName" },
                  { label: "Phone", key: "phone" },
                  { label: "Scope", key: "scope" },
                  {
                    label: "Location",
                    render: (item) =>
                      `${item.location} - ${item.locationSecondary}`,
                  },
                  { label: "Status", key: "status" },
                  { label: "Investment", key: "investment" },
                  { label: "Possession Date", key: "possessionDate" },
                ],
              }
            : undefined
        }
      />

      {showForm && (
        <NewInquiriesform
          onClose={() => setShowForm(false)}
          onAddLead={handleAddLead}
        />
      )}
    </div>
  );
};

export default Leads;

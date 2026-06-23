// Preset templates and helpers for the Quick Quote / Send Proposal flows.
// The hardcoded DEFAULT_PRESETS below are the factory baseline — actual reads
// go through getMaster()/getPresets() which honour user overrides saved in
// localStorage from the Settings → Proposal Master page.

import { getRoomDefaultDays } from "./scheduleConfig";
import { cleanSizeRange } from "../utils/sizeRangeValidation";
import { normalizeScopeItem } from "../utils/scopeNaming";

export const GST_RATE = 18;

const COMMON_INCLUSIONS = [];

const COMMON_EXCLUSIONS = [];

// Material-spec sets reused across multiple presets. Each entry is shown
// inline under its scope row in the rendered quote (Plywood: BWP 19mm…).
const MAT_LIVING = [
  { name: "Plywood", spec: "MR 18mm" },
  { name: "Laminate", spec: "Greenply / Century" },
  { name: "Lighting", spec: "Philips / Wipro LED" },
];
const MAT_KITCHEN = [
  { name: "Plywood", spec: "BWP 19mm" },
  { name: "Hardware", spec: "Hettich / Hafele" },
  { name: "Counter", spec: "Granite slab" },
];
const MAT_BEDROOM = [
  { name: "Plywood", spec: "MR 16mm" },
  { name: "Laminate", spec: "Century / Greenply" },
  { name: "Hardware", spec: "Hafele soft-close" },
];
const MAT_BATHROOM = [
  { name: "Vanity", spec: "Marine ply + laminate" },
  { name: "Mirror", spec: "Saint-Gobain 5mm" },
  { name: "Hardware", spec: "Jaquar / Hindware" },
];
const MAT_FOYER = [
  { name: "Plywood", spec: "MR 16mm" },
  { name: "Laminate", spec: "Greenply" },
];

export const DEFAULT_PRESETS = {
  "1BHK": {
    label: "1 BHK ${propertyTypes[0]}",
    propertyType: "Apartment",
    propertyTypes: ["Apartment", "Studio Apartment"],
    sizeRange: "450-600",
    scopeItems: [
      { area: "Living Room", description: "False ceiling, accent wall, TV unit, lighting", amount: 80000, days: 20, materials: MAT_LIVING },
      { area: "Kitchen", description: "Modular kitchen — base + wall units, granite, chimney, hob", amount: 150000, days: 15, materials: MAT_KITCHEN },
      { area: "Master Bedroom", description: "Wardrobe, bed back panel, study unit, lighting", amount: 90000, days: 12, materials: MAT_BEDROOM },
      { area: "Bathrooms", description: "Vanity, mirror, shower partition, accessories", amount: 30000, days: 6, materials: MAT_BATHROOM },
    ],
    inclusions: COMMON_INCLUSIONS,
    exclusions: COMMON_EXCLUSIONS,
  },
  "2BHK": {
    label: "2 BHK Apartment",
    propertyType: "Apartment",
    propertyTypes: ["Apartment", "Penthouse", "Duplex"],
    sizeRange: "800-1100",
    scopeItems: [
      { area: "Living Room", description: "Living + dining — false ceiling, TV unit, crockery unit, lighting", amount: 130000, days: 20, materials: MAT_LIVING },
      { area: "Kitchen", description: "L-shaped modular kitchen, granite, chimney, hob, water purifier provision", amount: 180000, days: 15, materials: MAT_KITCHEN },
      { area: "Master Bedroom", description: "Wardrobe, bed back panel, dresser, lighting", amount: 110000, days: 12, materials: MAT_BEDROOM },
      { area: "Bedroom 2", description: "Wardrobe, study unit, lighting", amount: 95000, days: 10, materials: MAT_BEDROOM },
      { area: "Bathrooms", description: "Vanity, mirror, shower partition, accessories (×2)", amount: 55000, days: 6, materials: MAT_BATHROOM },
      { area: "Foyer", description: "Foyer & passage — shoe rack, console, accent paint, lighting", amount: 30000, days: 5, materials: MAT_FOYER },
    ],
    inclusions: COMMON_INCLUSIONS,
    exclusions: COMMON_EXCLUSIONS,
  },
  "3BHK": {
    label: "3 BHK Apartment",
    propertyType: "Apartment",
    propertyTypes: ["Apartment", "Penthouse", "Duplex", "Independent House"],
    sizeRange: "1200-1600",
    scopeItems: [
      { area: "Living Room", description: "Living + dining — designer false ceiling, TV unit, bar/crockery unit, accent wall, lighting", amount: 180000, days: 20, materials: MAT_LIVING },
      { area: "Kitchen", description: "U-shaped modular kitchen, premium granite, chimney, hob, tall units", amount: 220000, days: 15, materials: MAT_KITCHEN },
      { area: "Master Bedroom", description: "Wardrobe with loft, bed back panel, dresser, study, lighting", amount: 140000, days: 12, materials: MAT_BEDROOM },
      { area: "Bedroom 2", description: "Wardrobe, bed back panel, study unit, lighting", amount: 105000, days: 10, materials: MAT_BEDROOM },
      { area: "Bedroom 3", description: "Kids room — wardrobe, bunk/study unit, lighting", amount: 95000, days: 10, materials: MAT_BEDROOM },
      { area: "Bathrooms", description: "Vanity, mirror, shower partition, accessories (×3)", amount: 75000, days: 6, materials: MAT_BATHROOM },
      { area: "Foyer", description: "Foyer & passage — shoe rack, console, accent paint, lighting", amount: 35000, days: 5, materials: MAT_FOYER },
    ],
    inclusions: COMMON_INCLUSIONS,
    exclusions: COMMON_EXCLUSIONS,
  },
  "Villa": {
    label: "Villa / Independent House",
    propertyType: "Independent House",
    propertyTypes: [
      "Luxury Villa",
      "Independent House",
      "Farm House",
      "Beach House",
    ],
    sizeRange: "2400+",
    scopeItems: [
      { area: "Living Room", description: "Foyer & living — double-height ceiling treatment, TV unit, accent walls, designer lighting", amount: 280000, days: 20, materials: MAT_LIVING },
      { area: "Dining", description: "Formal & family dining — crockery unit, accent wall, statement lighting", amount: 150000, days: 10, materials: MAT_LIVING },
      { area: "Kitchen", description: "Premium modular kitchen, island, tall units, utility cabinetry", amount: 320000, days: 15, materials: MAT_KITCHEN },
      { area: "Master Bedroom", description: "Suite — walk-in wardrobe, bed back panel, dresser, lounge unit, lighting", amount: 220000, days: 12, materials: MAT_BEDROOM },
      { area: "Bedroom 2", description: "Wardrobes, bed back panels, study units, lighting (×2)", amount: 240000, days: 10, materials: MAT_BEDROOM },
      { area: "Study", description: "Home office — built-in desk, storage, lighting", amount: 90000, days: 8, materials: MAT_BEDROOM },
      { area: "Bathrooms", description: "Vanity, mirror, shower partition, accessories (×4)", amount: 120000, days: 6, materials: MAT_BATHROOM },
      { area: "Staircase", description: "Staircase & common areas — railing finishing, accent walls, lighting", amount: 80000, days: 6, materials: MAT_FOYER },
    ],
    inclusions: COMMON_INCLUSIONS,
    exclusions: COMMON_EXCLUSIONS,
  },
};

// ── Master read/write ─────────────────────────────────────────────────────
// Settings → Proposal Master writes here. Every consumer (QuoteModal, inquiry
// forms, etc.) reads through getPresets()/getPreset() so master edits flow
// into new proposals immediately, while existing saved quotes keep their
// own snapshot.

const MASTER_KEY = "quoteMaster";

// ── Configurations-based normalisation ────────────────────────────────────
// Each preset now stores a `configurations` array. Each entry in that array
// represents one property-type-specific configuration with its own scope,
// inclusions, exclusions and sizeRange.
//
// Old flat format (pre-migration):
//   { propertyType, propertyTypes, propertyTypeMultipliers, sizeRange,
//     scopeItems, inclusions, exclusions }
//
// New format:
//   { label, configurations: [
//       { propertyType, sizeRange, scopeItems, inclusions, exclusions },
//       ...
//     ]
//   }
//
// `normalizePreset` auto-migrates old flat presets into the new shape so
// existing localStorage data keeps working seamlessly.

// Legacy scope `area` names → canonical Master → Schedule categories. Lets old
// saved presets self-heal to the controlled vocabulary on read, without losing
// any custom presets or quote wording.
const LEGACY_AREA_MAP = {
  "Living + Dining": "Living Room",
  "Foyer & Living": "Living Room",
  "Formal & Family Dining": "Dining",
  "Kitchen + Utility": "Kitchen",
  "Second Bedroom": "Bedroom 2",
  "Third Bedroom / Kids": "Bedroom 3",
  "Bedrooms (×2)": "Bedroom 2",
  "Master Bedroom Suite": "Master Bedroom",
  "Home Office / Study": "Study",
  Bathroom: "Bathrooms",
  "Bathrooms (×2)": "Bathrooms",
  "Bathrooms (×3)": "Bathrooms",
  "Bathrooms (×4)": "Bathrooms",
  "Foyer & Passage": "Foyer",
  "Staircase & Common Areas": "Staircase",
};

// Remap a scope item to the canonical category, clone materials, and backfill
// `days` from the category allotment only when the field was never set.
const mapScopeItem = (s) => {
  if (!s) return s;
  const area = LEGACY_AREA_MAP[s.area] || s.area;
  const next = {
    ...s,
    area,
    materials: s.materials ? s.materials.map((m) => ({ ...m })) : [],
  };
  if (next.days === undefined) next.days = getRoomDefaultDays(area);
  return normalizeScopeItem(next);
};

const normalizePreset = (p) => {
  if (!p) return p;
  let next = { ...p };

  // Already migrated — just ensure every config has all fields.
  if (Array.isArray(next.configurations) && next.configurations.length > 0) {
    next.configurations = next.configurations.map((c) => ({
      ...c,
      propertyType: c.propertyType || "",
      sizeRange: cleanSizeRange(c.sizeRange ?? next.sizeRange ?? ""),
      scopeItems: (c.scopeItems || []).map(mapScopeItem),
      inclusions: c.inclusions || [],
      exclusions: c.exclusions || [],
    }));
    // Remove legacy top-level fields after migration
    delete next.propertyType;
    delete next.propertyTypes;
    delete next.propertyTypeMultipliers;
    // Keep label at preset level
    next.label = next.label || "";
    return next;
  }

  // ── Migrate old flat format → configurations[] ──────────────────────
  const types = Array.isArray(next.propertyTypes) && next.propertyTypes.length > 0
    ? next.propertyTypes
    : next.propertyType
      ? [next.propertyType]
      : ["Apartment"];

  const sharedScope = next.scopeItems || [];
  const sharedInclusions = next.inclusions || [];
  const sharedExclusions = next.exclusions || [];
  const sharedSize = next.sizeRange || "";

  next.configurations = types.map((t) => ({
    propertyType: t,
    grade: next.grade || "economy",
    enableFormulaEstimator: next.enableFormulaEstimator ?? false,
    totalArea: next.totalArea,
    roomAllocations: next.roomAllocations || {},
    sizeRange: cleanSizeRange(sharedSize),
    scopeItems: sharedScope.map(mapScopeItem),
    inclusions: [...sharedInclusions],
    exclusions: [...sharedExclusions],
  }));

  // Clean up legacy top-level fields
  delete next.propertyType;
  delete next.propertyTypes;
  delete next.propertyTypeMultipliers;
  delete next.sizeRange;
  delete next.scopeItems;
  delete next.inclusions;
  delete next.exclusions;
  next.label = next.label || "";
  return next;
};

const normalizeMaster = (master) => {
  const out = {};
  for (const k of Object.keys(master || {})) {
    out[k] = normalizePreset(master[k]);
  }
  return out;
};

export const getMaster = () => {
  try {
    const raw = localStorage.getItem(MASTER_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (parsed && typeof parsed === "object") {
        const normalized = normalizeMaster(parsed);
        localStorage.setItem(MASTER_KEY, JSON.stringify(normalized));
        return normalized;
      }
    }
  } catch {
    // fall through to defaults
  }
  const normalizedDefault = normalizeMaster(DEFAULT_PRESETS);
  localStorage.setItem(MASTER_KEY, JSON.stringify(normalizedDefault));
  return normalizedDefault;
};

export const saveMaster = (master) => {
  localStorage.setItem(MASTER_KEY, JSON.stringify(master));
};

export const resetMaster = () => {
  localStorage.removeItem(MASTER_KEY);
};

export const getPresets = () => getMaster();
export const getPresetKeys = () => Object.keys(getMaster());
export const getPreset = (key) => getMaster()[key];

// ── Configuration helpers ─────────────────────────────────────────────────
// Return the list of property types available under a given preset key.
export const getPropertyTypesForPreset = (key) => {
  const preset = getPreset(key);
  if (!preset) return [];
  return (preset.configurations || []).map((c) => c.propertyType);
};

// Return the specific configuration for a preset + property type combo.
// Falls back to the first configuration if the type isn't found.
export const getConfigForType = (key, propertyType) => {
  const preset = getPreset(key);
  if (!preset) return null;
  const configs = preset.configurations || [];
  return configs.find((c) => c.propertyType === propertyType) || configs[0] || null;
};

// Total scope duration (working days) for a preset + property type — the sum
// of every room's `days`. Used to seed a default possession/completion date.
export const getPresetTotalDays = (key, propertyType) => {
  const cfg = getConfigForType(key, propertyType);
  return (cfg?.scopeItems || []).reduce((s, it) => s + (Number(it.days) || 0), 0);
};

// Backwards-compat alias — some callers import QUOTE_PRESETS directly. New
// code should prefer getPresets()/getPreset().
export const QUOTE_PRESETS = DEFAULT_PRESETS;
export const PRESET_KEYS = Object.keys(DEFAULT_PRESETS);

export const sumScope = (items) =>
  items.reduce((s, it) => s + (Number(it.amount) || 0), 0);

export const computeTotals = (items, gstRate = GST_RATE) => {
  const subtotal = sumScope(items);
  const gst = Math.round((subtotal * gstRate) / 100);
  return { subtotal, gst, grandTotal: subtotal + gst };
};

// Derive a tiered list of investment ranges from a preset's baseline
// (in rupees). Bands move outward from the baseline so the user can
// place themselves on the Budget → Bespoke continuum without typing
// any numbers. Returned strings are stable so they survive as the
// saved value on the lead record.
const fmtLakhs = (lakhs) => {
  if (lakhs >= 100) return `₹${(lakhs / 100).toFixed(2)}Cr`;
  if (lakhs >= 1) return `₹${Number.isInteger(lakhs) ? lakhs : lakhs.toFixed(1)}L`;
  // Below ₹1 lakh — show thousands / rupees instead of rounding to "₹0L".
  const rupees = Math.round(lakhs * 100000);
  return rupees >= 1000
    ? `₹${Math.round(rupees / 1000)}K`
    : `₹${rupees.toLocaleString("en-IN")}`;
};

export const generateInvestmentBands = (baselineRupees) => {
  if (!baselineRupees || baselineRupees <= 0) return [];
  const B = baselineRupees / 100000;
  return [
    `${fmtLakhs(B * 0.8)} – ${fmtLakhs(B * 1.0)}`,
    `${fmtLakhs(B * 1.0)} – ${fmtLakhs(B * 1.3)}`,
    `${fmtLakhs(B * 1.3)} – ${fmtLakhs(B * 1.7)}`,
    `${fmtLakhs(B * 1.7)} – ${fmtLakhs(B * 2.2)}`,
    `${fmtLakhs(B * 2.2)}+`,
  ];
};

// All quote IDs across all parents share the same yearly counter so the IDs
// stay globally unique. The counter is the count of `quotes_*` localStorage
// records that already exist.
const countAllQuotes = () => {
  let n = 0;
  for (let i = 0; i < localStorage.length; i++) {
    const key = localStorage.key(i);
    if (!key?.startsWith("quotes_")) continue;
    try {
      n += JSON.parse(localStorage.getItem(key) || "[]").length;
    } catch {
      // ignore corrupt entries
    }
  }
  return n;
};

export const generateQuoteId = () =>
  `QT-${new Date().getFullYear()}-${String(countAllQuotes() + 1).padStart(3, "0")}`;

const storageKey = (parentId) => `quotes_${parentId}`;

// Every Send/Resend writes a brand-new full quote snapshot (own scope items,
// materials, recipes…). Without a cap these histories grow without bound and
// eventually blow the browser's ~5MB localStorage quota, which surfaces to
// the user as "Could not send the quote" on a perfectly valid send. Keep
// only the most recent entries per parent/lead.
const MAX_QUOTES_PER_PARENT = 15;
const MAX_DOCUMENTS_PER_LEAD = 15;

// If a write fails because storage is already full (most likely from
// previously-unbounded quote/document history), prune every quotes_*/
// leadDocuments_* key down to a handful of entries and retry once instead of
// failing the send outright.
const setItemWithQuotaGuard = (key, value) => {
  try {
    localStorage.setItem(key, value);
  } catch (err) {
    if (err?.name !== "QuotaExceededError") throw err;
    for (let i = localStorage.length - 1; i >= 0; i--) {
      const k = localStorage.key(i);
      if (!k || !(k.startsWith("quotes_") || k.startsWith("leadDocuments_"))) continue;
      try {
        const list = JSON.parse(localStorage.getItem(k) || "[]");
        if (Array.isArray(list) && list.length > 3) {
          localStorage.setItem(k, JSON.stringify(list.slice(0, 3)));
        }
      } catch {
        localStorage.removeItem(k);
      }
    }
    localStorage.setItem(key, value);
  }
};

export const getQuotesForParent = (parentId) => {
  if (!parentId) return [];
  try {
    return JSON.parse(localStorage.getItem(storageKey(parentId)) || "[]");
  } catch {
    return [];
  }
};

export const saveQuote = (parentId, quote) => {
  const list = getQuotesForParent(parentId);
  const next = [
    quote,
    ...list.filter((q) => q.quoteId !== quote.quoteId),
  ].slice(0, MAX_QUOTES_PER_PARENT);
  setItemWithQuotaGuard(storageKey(parentId), JSON.stringify(next));
  return next;
};

// Documents are auto-saved snapshots of any quote that gets emailed. They
// power the "Documents" card on the Lead detail view so the user has a
// permanent record of what was sent.
const documentsKey = (leadId) => `leadDocuments_${leadId}`;

export const getDocumentsForLead = (leadId) => {
  if (!leadId) return [];
  try {
    return JSON.parse(localStorage.getItem(documentsKey(leadId)) || "[]");
  } catch {
    return [];
  }
};

export const saveQuoteDocument = (leadId, quote) => {
  if (!leadId) return [];
  const list = getDocumentsForLead(leadId);
  const entry = {
    docId: `${quote.quoteId}-${Date.now()}`,
    quoteId: quote.quoteId,
    fileName: `${quote.quoteId}_${(quote.recipientName || "Quote")
      .replace(/\s+/g, "_")}.pdf`,
    sentTo: quote.recipientEmail,
    sentAt: quote.sentAt || new Date().toISOString(),
    grandTotal: quote.grandTotal,
    snapshot: quote,
  };
  const next = [entry, ...list].slice(0, MAX_DOCUMENTS_PER_LEAD);
  setItemWithQuotaGuard(documentsKey(leadId), JSON.stringify(next));
  return next;
};

// Find the most recent quote for a lead — used to pre-fill the Resend flow.
export const getLatestQuoteForParent = (parentId) => {
  const list = getQuotesForParent(parentId);
  return list[0] || null;
};

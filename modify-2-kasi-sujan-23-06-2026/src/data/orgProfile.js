// Firm-wide org profile — the "who is issuing this document" data that
// BOQPreview (and eventually quotes/invoices) stamp onto client-facing
// documents. Single record, mirrors the read/write style of clientStorage.js
// but for one object instead of a list.

const STORAGE_KEY = "org_profile";

export const DEFAULT_ORG_PROFILE = {
  name: "Digital Atelier",
  tagline: "Interior Architecture & Design",
  addressLine: "",
  city: "Bengaluru",
  state: "Karnataka",
  // 2-digit GST state code for the firm's registered state (e.g. "29"
  // Karnataka, "33" Tamil Nadu) — used to resolve IGST vs CGST+SGST when the
  // org's GSTIN itself is missing or malformed.
  stateCode: "29",
  phone: "+91 80 4000 0000",
  email: "hello@digitalatelier.in",
  website: "",
  gstin: "29AAAAA0000A1Z5",
  pan: "",
  logoDataUrl: "",
  bankName: "",
  bankAccount: "",
  bankIfsc: "",
  bankBranch: "",
  upi: "",
  defaultValidity: "30 days from issue",
  defaultWarranty: "",
  defaultNotes: "",
};

export const getOrgProfile = () => {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) return { ...DEFAULT_ORG_PROFILE, ...JSON.parse(raw) };
  } catch {
    // fall through to default
  }
  return { ...DEFAULT_ORG_PROFILE };
};

export const saveOrgProfile = (profile) => {
  const next = { ...DEFAULT_ORG_PROFILE, ...profile };
  localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
  return next;
};

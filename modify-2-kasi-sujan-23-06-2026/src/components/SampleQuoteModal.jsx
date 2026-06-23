import { useMemo, useState, useEffect, useRef } from "react";
import {
  Trash2,
  Printer,
  Check,
  Pipette,
  ListPlus,
  ChevronDown,
  ChevronRight,
  Scale,
  Truck,
  CreditCard,
  Wrench,
  FileText,
  Plus,
  X,
  Mail,
  CheckCircle2,
  AlertTriangle,
  Info,
  FileCheck,
} from "lucide-react";
import Modal from "./Modal";
import InputField from "./InputField";
import {
  getDefaultTermStrings,
  getGlobalTerms,
  getTermsCategories,
} from "../data/termsStorage";
import CategoryTermsModal from "./CategoryTermsModal";
import QuotePreview from "./QuotePreview";
import MasterNavLink from "./MasterNavLink";
import {
  getPresetKeys,
  computeTotals,
  generateQuoteId,
  getConfigForType,
} from "../data/QuotePresets";
import {
  computeLibraryItemAmount,
  computeLibraryItemArea,
  listLibrary,
} from "../data/itemLibrary";
import { mapScopeItemsToGrade } from "../data/gradeMapping";
import { collectGrades, gradeLabel } from "../data/rateBuildup";
import DestinationPromptModal from "./DestinationPromptModal";
import { formatAmount } from "../utils/formatAmount";
import { formatSizeRange } from "../utils/sizeRangeValidation";
import {
  assignCategoryNames,
  normalizeScopeItem,
  getDetailedDescription,
  addScopeItemsWithDuplicateCheck,
  refreshScopeItemsFromMaster,
  getCategoryKey,
  getCategoryFromItemName,
  getHeadingCategoryKey,
} from "../utils/scopeNaming";
import { roomColor } from "../data/categoryColors";
import CategorySelect from "./CategorySelect";
import LibraryPickerModal from "./LibraryPickerModal";
import { getRoomDefaultDays, getRoomCategoryPresets } from "../data/scheduleConfig";

// ── Section Header ──────────────────────────────────────────────────────────
const SectionHeader = ({ children }) => (
  <h2 className="flex items-center gap-2 text-[11px] font-semibold uppercase tracking-widest text-select-blue mb-3">
    <span className="w-0.5 h-3.5 bg-select-blue rounded-full shrink-0" />
    {children}
  </h2>
);

// ── Custom Checkbox ─────────────────────────────────────────────────────────
const SQCheckbox = ({
  checked,
  onChange,
  accent = "green",
  size = "normal",
}) => {
  const isGreen = accent === "green";
  const sizeClasses = size === "small" ? "h-3.5 w-3.5" : "h-4 w-4";
  const checkSize = size === "small" ? 9 : 11;
  const strokeW = size === "small" ? 3.5 : 3;
  return (
    <div className="relative inline-flex items-center">
      <input
        type="checkbox"
        className="sr-only"
        checked={checked}
        onChange={onChange}
      />
      <div
        className={`shrink-0 rounded flex items-center justify-center border transition-all duration-200 cursor-pointer ${sizeClasses} ${
          checked
            ? isGreen
              ? "bg-emerald-600 border-emerald-600 hover:bg-emerald-700/90 text-white shadow-sm"
              : "bg-red-500/80 hover:bg-red-500 border-red-500/50 text-white shadow-sm"
            : "bg-white border-slate-300 text-transparent hover:border-slate-400"
        }`}
      >
        <Check size={checkSize} strokeWidth={strokeW} className="shrink-0" />
      </div>
    </div>
  );
};

// ── Helpers ──────────────────────────────────────────────────────────────────
// assignCategoryNames is now imported from ../utils/scopeNaming

const getCategoriesMeta = () => {
  return getTermsCategories().map((c) => ({
    id: c.id,
    label: c.label,
    icon: FileCheck,
  }));
};

const getCategoriesList = () => getTermsCategories().map((c) => c.id);

// ── Build initial data ──────────────────────────────────────────────────────
const buildSampleQuoteData = ({
  presetKey,
  recipient,
  defaultPropertyType,
  presetData,
}) => {
  const presetKeys = getPresetKeys();
  const defaultTerms = getDefaultTermStrings();
  const activePresetKey =
    presetKey ||
    (presetData?.presetKey && presetKeys.includes(presetData.presetKey)
      ? presetData.presetKey
      : presetKeys[0] || "2BHK");
  const activePropertyType =
    presetData?.propertyType || defaultPropertyType || "";
  const cfg = getConfigForType(activePresetKey, activePropertyType) || {};
  const quoteId = generateQuoteId();
  const createdAt = new Date().toISOString();
  let scopeItems = presetData?.scopeItems
    ? presetData.scopeItems.map((s) => normalizeScopeItem({
        ...s,
        materials: s.materials ? s.materials.map((m) => ({ ...m })) : [],
      }))
    : (cfg.scopeItems || []).map((s) => normalizeScopeItem({
        ...s,
        materials: s.materials ? s.materials.map((m) => ({ ...m })) : [],
      }));

  scopeItems = refreshScopeItemsFromMaster(scopeItems, activePresetKey, activePropertyType);
  const activeGrade = presetData?.grade || cfg.grade || "premium";
  scopeItems = mapScopeItemsToGrade(scopeItems, activeGrade);
  // Load inclusions/exclusions per category with legacy support
  const categoryInclusions = {};
  const categoryExclusions = {};
  const addedInclusions = {};
  const addedExclusions = {};
  const categoriesList = getCategoriesList();

  categoriesList.forEach((cat) => {
    const global = getGlobalTerms(cat);
    const defaultIn = global.inclusions
      .filter((t) => t.isDefault)
      .map((t) => t.text);
    const defaultEx = global.exclusions
      .filter((t) => t.isDefault)
      .map((t) => t.text);

    if (presetData?.categoryInclusions?.[cat]) {
      categoryInclusions[cat] = [...presetData.categoryInclusions[cat]];
    } else if (presetData?.inclusions) {
      const catGlobalIntexts = global.inclusions.map((t) => t.text);
      categoryInclusions[cat] = presetData.inclusions.filter((text) =>
        catGlobalIntexts.includes(text),
      );
    } else {
      categoryInclusions[cat] = defaultIn;
    }

    if (presetData?.categoryExclusions?.[cat]) {
      categoryExclusions[cat] = [...presetData.categoryExclusions[cat]];
    } else if (presetData?.exclusions) {
      const catGlobalExtexts = global.exclusions.map((t) => t.text);
      categoryExclusions[cat] = presetData.exclusions.filter((text) =>
        catGlobalExtexts.includes(text),
      );
    } else {
      categoryExclusions[cat] = defaultEx;
    }

    // Initialize addedInclusions / addedExclusions
    if (presetData?.addedInclusions?.[cat]) {
      addedInclusions[cat] = [...presetData.addedInclusions[cat]];
    } else {
      const currentIn = categoryInclusions[cat] || [];
      addedInclusions[cat] = currentIn.filter((item) => !defaultIn.includes(item));
    }

    if (presetData?.addedExclusions?.[cat]) {
      addedExclusions[cat] = [...presetData.addedExclusions[cat]];
    } else {
      const currentEx = categoryExclusions[cat] || [];
      addedExclusions[cat] = currentEx.filter((item) => !defaultEx.includes(item));
    }
  });

  const flatIn = [];
  const flatEx = [];
  categoriesList.forEach((cat) => {
    flatIn.push(...(categoryInclusions[cat] || []));
    flatEx.push(...(categoryExclusions[cat] || []));
  });

  return {
    quoteId,
    createdAt,
    recipientName: recipient?.name || "",
    recipientEmail: recipient?.email || "",
    recipientPhone: recipient?.phone || "",
    propertyType: activePropertyType,
    grade: activeGrade,
    sizeRange: presetData?.sizeRange || cfg.sizeRange || "",
    validityDays: presetData?.validityDays || 30,
    scopeItems,
    inclusions: flatIn,
    exclusions: flatEx,
    categoryInclusions,
    categoryExclusions,
    addedInclusions,
    addedExclusions,
    notes: presetData?.notes || "",
  };
};

const EditableItemNameInput = ({ initialValue, onSave, className }) => {
  const [localValue, setLocalValue] = useState(initialValue);

  useEffect(() => {
    setLocalValue(initialValue);
  }, [initialValue]);

  const handleBlur = () => {
    if (localValue !== initialValue) {
      onSave(localValue);
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === "Enter") {
      e.target.blur();
    }
  };

  return (
    <input
      type="text"
      value={localValue || ""}
      onChange={(e) => setLocalValue(e.target.value)}
      onBlur={handleBlur}
      onKeyDown={handleKeyDown}
      placeholder="Item Name…"
      className={className}
    />
  );
};

const inferSQPresetKey = (presetData) => {
  const keys = getPresetKeys();
  if (presetData?.presetKey && keys.includes(presetData.presetKey))
    return presetData.presetKey;
  return keys.includes("2BHK") ? "2BHK" : keys[0];
};

// ════════════════════════════════════════════════════════════════════════════
// SampleQuoteModal — fully independent from QuoteModal / Proposal Form
// ════════════════════════════════════════════════════════════════════════════
const SampleQuoteModal = ({
  recipient,
  defaultPropertyType,
  presetData,
  onClose,
  onSave,
  onSentEmail,
}) => {
  const [presetKey] = useState(() =>
    inferSQPresetKey(presetData),
  );
  const [formData, setFormData] = useState(() =>
    buildSampleQuoteData({
      presetKey: inferSQPresetKey(presetData),
      recipient,
      defaultPropertyType,
      presetData,
    }),
  );

  // Email modal state
  const [showEmailForm, setShowEmailForm] = useState(false);
  const [emailTo, setEmailTo] = useState(recipient?.email || "");
  const [emailCC, setEmailCC] = useState("");
  const [emailSubject, setEmailSubject] = useState(`Quotation - ${recipient?.projectName || defaultPropertyType || "Project"}`);
  const [emailBody, setEmailBody] = useState(`Dear Customer,

Please find the attached quotation for your project.

Kindly review the quotation and let us know if you have any questions.

Thank you.

Regards,
Digital Atelier`);
  const [isSendingEmail, setIsSendingEmail] = useState(false);
  const [toast, setToast] = useState(null);

  const showToast = (message, type = "success") => {
    setToast({ message, type, id: Date.now() });
  };

  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(null), 2800);
    return () => clearTimeout(t);
  }, [toast]);

  const [deleteGroupConfirm, setDeleteGroupConfirm] = useState(null);
  const handleDeleteGroup = (roomName) => {
    setFormData((p) => ({
      ...p,
      scopeItems: p.scopeItems.filter((s) => (s.area || "").trim().toUpperCase() !== roomName.trim().toUpperCase()),
    }));
    setDeleteGroupConfirm(null);
    showToast(`Deleted "${roomName}" group`, "info");
  };

  const [destPrompt, setDestPrompt] = useState({
    isOpen: false,
    itemName: "",
    existingHeadings: [],
    headingsWithItem: [],
    onSelect: null,
    onCreateNew: null,
    onCancel: null,
  });

  const getDestinationHeading = (itemName, scopeItems, category) => {
    return new Promise((resolve, reject) => {
      const resolvedCategory = category || getCategoryFromItemName(itemName);

      // Get ALL headings from Schedule Master (all room/category presets)
      const scheduleHeadingNames = getRoomCategoryPresets().map((r) => r.name.trim().toUpperCase());

      // Collect ALL existing headings from scope items (not filtered by category)
      const existingHeadings = Array.from(
        new Set(scopeItems.map((item) => (item.area || item.heading || "Unassigned").trim().toUpperCase()))
      );

      // Combine and deduplicate
      const allHeadings = Array.from(new Set([...scheduleHeadingNames, ...existingHeadings]));

      // Informational only — not used to hide headings
      const headingsWithItem = scopeItems
        .filter((item) => (item.itemName || "").trim().toLowerCase() === itemName.trim().toLowerCase())
        .map((item) => (item.area || item.heading || "Unassigned").trim().toUpperCase());


      setDestPrompt({
        isOpen: true,
        itemName,
        category: resolvedCategory,
        existingHeadings: allHeadings,
        headingsWithItem,
        onSelect: (selectedHeading) => {
          setDestPrompt((prev) => ({ ...prev, isOpen: false }));
          resolve(selectedHeading);
        },
        onCreateNew: (newHeading) => {
          setDestPrompt((prev) => ({ ...prev, isOpen: false }));
          resolve(newHeading);
        },
        onCancel: () => {
          setDestPrompt((prev) => ({ ...prev, isOpen: false }));
          reject(new Error("Cancelled by user"));
        },
      });
    });
  };

  const onSaveRef = useRef(onSave);
  useEffect(() => {
    onSaveRef.current = onSave;
  }, [onSave]);

  const isFirstRender = useRef(true);
  useEffect(() => {
    if (isFirstRender.current) {
      isFirstRender.current = false;
      return;
    }
    onSaveRef.current?.({
      quotePreset: presetKey,
      quoteGrade: formData.grade || "premium",
      quoteSizeRange: formData.sizeRange,
      quoteScopeItems: formData.scopeItems,
      quoteInclusions: formData.inclusions,
      quoteExclusions: formData.exclusions,
      quoteCategoryInclusions: formData.categoryInclusions,
      quoteCategoryExclusions: formData.categoryExclusions,
      quoteAddedInclusions: formData.addedInclusions,
      quoteAddedExclusions: formData.addedExclusions,
      quoteNotes: formData.notes,
    });
  }, [formData, presetKey]);

  // Terms
  const [termOptions, setTermOptions] = useState(() => {
    const defaults = getDefaultTermStrings();
    return {
      inclusions: Array.from(
        new Set([
          ...(defaults.inclusions || []),
          ...(formData.inclusions || []),
        ]),
      ),
      exclusions: Array.from(
        new Set([
          ...(defaults.exclusions || []),
          ...(formData.exclusions || []),
        ]),
      ),
    };
  });

  // Library picker + Add Conditions modal state
  const [libraryPickerOpen, setLibraryPickerOpen] = useState(false);
  const [activeCategoryModal, setActiveCategoryModal] = useState(null);
  const [termsParentModalOpen, setTermsParentModalOpen] = useState(false);

  const [expandedCategories, setExpandedCategories] = useState(() => {
    const cats = getTermsCategories();
    const initial = {};
    cats.forEach((c) => {
      initial[c.id] = false;
    });
    return initial;
  });

  const totals = useMemo(
    () => computeTotals(formData.scopeItems),
    [formData.scopeItems],
  );
  const gradeOptions = useMemo(() => collectGrades(listLibrary()), []);

  const handleGradeChange = (grade) => {
    setFormData((prev) => ({
      ...prev,
      grade,
      scopeItems: mapScopeItemsToGrade(prev.scopeItems, grade),
    }));
  };

  const [openGroups, setOpenGroups] = useState({});
  const toggleGroup = (room) => {
    setOpenGroups((prev) => ({ ...prev, [room]: !prev[room] }));
  };
  const isGroupOpen = (room) => openGroups[room] !== false;

  const groupedScope = useMemo(() => {
    const groups = [];
    const byRoom = new Map();
    const namedItems = assignCategoryNames(formData.scopeItems || []);
    namedItems.forEach((item, idx) => {
      const room = item.area || "Unassigned";
      if (!byRoom.has(room)) {
        const g = { room, rows: [], total: 0 };
        byRoom.set(room, g);
        groups.push(g);
      }
      const g = byRoom.get(room);
      g.rows.push({ item, idx });
      g.total += Number(item.amount) || 0;
    });
    return groups;
  }, [formData.scopeItems]);

  const getActiveCatCount = (cat) => {
    const incs = formData.categoryInclusions?.[cat] || [];
    const excs = formData.categoryExclusions?.[cat] || [];
    return incs.length + excs.length;
  };

  const updateField = (name, value) => {
    setFormData((p) => ({ ...p, [name]: value }));
  };

  const toggleInclusion = (item, forcedCat = null) => {
    const categoriesList = getCategoriesList();
    let foundCat = forcedCat;
    if (!foundCat) {
      foundCat = "GENERAL";
      for (const cat of categoriesList) {
        const global = getGlobalTerms(cat);
        if (global.inclusions.some((t) => t.text === item)) {
          foundCat = cat;
          break;
        }
      }
    }

    setFormData((prev) => {
      const prevCatIn = prev.categoryInclusions?.[foundCat] || [];
      const nextCatIn = prevCatIn.includes(item)
        ? prevCatIn.filter((i) => i !== item)
        : [...prevCatIn, item];

      const updatedCatIn = {
        ...prev.categoryInclusions,
        [foundCat]: nextCatIn,
      };

      const flatIn = [];
      categoriesList.forEach((cat) => {
        flatIn.push(...(updatedCatIn[cat] || []));
      });

      return {
        ...prev,
        inclusions: flatIn,
        categoryInclusions: updatedCatIn,
      };
    });
  };

  const toggleExclusion = (item, forcedCat = null) => {
    const categoriesList = getCategoriesList();
    let foundCat = forcedCat;
    if (!foundCat) {
      foundCat = "GENERAL";
      for (const cat of categoriesList) {
        const global = getGlobalTerms(cat);
        if (global.exclusions.some((t) => t.text === item)) {
          foundCat = cat;
          break;
        }
      }
    }

    setFormData((prev) => {
      const prevCatEx = prev.categoryExclusions?.[foundCat] || [];
      const nextCatEx = prevCatEx.includes(item)
        ? prevCatEx.filter((e) => e !== item)
        : [...prevCatEx, item];

      const updatedCatEx = {
        ...prev.categoryExclusions,
        [foundCat]: nextCatEx,
      };

      const flatEx = [];
      categoriesList.forEach((cat) => {
        flatEx.push(...(updatedCatEx[cat] || []));
      });

      return {
        ...prev,
        exclusions: flatEx,
        categoryExclusions: updatedCatEx,
      };
    });
  };

  const updateScope = (idx, key, value) => {
    setFormData((p) => {
      // Check for duplicate heading if changing the area/heading field
      if (key === "area") {
        const item = p.scopeItems[idx];
        const newHeading = value.trim().toUpperCase();
        const duplicateExists = p.scopeItems.some((s, i) => {
          if (i === idx) return false;
          return (
            (s.area || s.heading || "").trim().toUpperCase() === newHeading &&
            (s.itemName || "").trim().toLowerCase() === (item.itemName || "").trim().toLowerCase()
          );
        });

        if (duplicateExists) {
          showToast(`"${item.itemName}" already exists under heading "${newHeading}".`, "error");
          return p;
        }
      }

      return {
        ...p,
        scopeItems: p.scopeItems.map((s, i) => {
          if (i !== idx) return s;
          const target = { ...s, [key]: value };
          if (key === "description") {
            target.isDescriptionCustom = true;
          }
          if (key === "area") {
            target.isAreaCustom = true;
          }
          if (key === "itemName") {
            target.isItemNameCustom = true;
          }
          return target;
        }),
      };
    });
  };

  // Pick from Library — maps library item to scope row shape (same as QuoteModal)
  const handleLibraryPick = async (lib) => {
    try {
      const itemName = lib.description || "";
      const heading = await getDestinationHeading(itemName, formData.scopeItems, lib.category);

      const days =
        lib.days != null && lib.days !== ""
          ? lib.days
          : getRoomDefaultDays(lib.category);
      const matSummary = (lib.materials || [])
        .map((m) => m.name)
        .filter(Boolean)
        .join(", ");
      const norm = normalizeScopeItem({
        area: heading,
        itemName: lib.description || "",
        description: lib.spec || matSummary || "",
        isDescriptionCustom: true,
      });
      const newRow = {
        ...norm,
        length: lib.length != null ? Number(lib.length) : "",
        breadth: lib.breadth != null ? Number(lib.breadth) : "",
        height: lib.height != null ? Number(lib.height) : "",
        calculatedArea: computeLibraryItemArea ? (computeLibraryItemArea(lib) || 0) : 0,
        qty: lib.qty != null ? Number(lib.qty) : "",
        rate: lib.rate != null ? Number(lib.rate) : "",
        // Library works are priced per unit with no default qty, so the computed
        // amount is 0 — fall back to the unit rate so the price shows.
        amount: computeLibraryItemAmount(lib) || Number(lib.rate) || 0,
        unit: lib.unit || "sqft",
        days,
        materials: lib.materials ? lib.materials.map((m) => ({ ...m })) : [],
      };
      setFormData((p) => ({
        ...p,
        scopeItems: addScopeItemsWithDuplicateCheck(p.scopeItems, [newRow]),
      }));
      setLibraryPickerOpen(false);
    } catch (err) {
      setLibraryPickerOpen(false);
    }
  };

  const removeScopeRow = (idx) => {
    setFormData((p) => ({
      ...p,
      scopeItems: p.scopeItems.filter((_, i) => i !== idx),
    }));
  };

  // Build preview quote object
  const buildPreviewQuote = () => ({
    quoteId: formData.quoteId,
    presetKey,
    recipientName: formData.recipientName,
    recipientEmail: formData.recipientEmail,
    recipientPhone: formData.recipientPhone,
    propertyType: formData.propertyType,
    grade: formData.grade || "premium",
    sizeRange: formData.sizeRange,
    validityDays: Number(formData.validityDays) || 30,
    scopeItems: formData.scopeItems,
    inclusions: formData.inclusions,
    exclusions: formData.exclusions,
    categoryInclusions: formData.categoryInclusions,
    categoryExclusions: formData.categoryExclusions,
    addedInclusions: formData.addedInclusions,
    addedExclusions: formData.addedExclusions,
    notes: formData.notes,
    createdAt: formData.createdAt,
    subtotal: totals.subtotal,
    gst: totals.gst,
    grandTotal: totals.grandTotal,
    isSampleQuote: true,
  });

  const handlePrint = async () => {
    try {
      const quote = buildPreviewQuote();
      const { createRoot } = await import("react-dom/client");
      const { flushSync } = await import("react-dom");

      // 1. Create a temporary container directly on body
      let printContainer = document.getElementById("quote-print-temp-container");
      if (!printContainer) {
        printContainer = document.createElement("div");
        printContainer.id = "quote-print-temp-container";
        document.body.appendChild(printContainer);
      }

      // 2. Render QuotePreview into the temporary container
      const root = createRoot(printContainer);
      flushSync(() => {
        root.render(<QuotePreview quote={quote} />);
      });

      // 3. Set printing class on body to isolate the container and hide the rest
      document.body.classList.add("printing-quote-mode");

      // 4. Set up safe, once-callable cleanup after print dialog closes
      let cleaned = false;
      const cleanup = () => {
        if (cleaned) return;
        cleaned = true;
        
        try {
          document.body.classList.remove("printing-quote-mode");
        } catch (e) {}
        try {
          window.removeEventListener("afterprint", cleanup);
        } catch (e) {}
        try {
          root.unmount();
        } catch (e) {}
        try {
          printContainer.remove();
        } catch (e) {}
      };

      // Register listener BEFORE triggering print dialog to avoid race conditions
      window.addEventListener("afterprint", cleanup);

      // 5. Trigger print
      window.print();

      // 6. Synchronous fallback: run cleanup immediately after print dialog returns (blocking call)
      cleanup();
    } catch (err) {
      console.error("[SampleQuoteModal] print failed, falling back to basic print:", err);
      window.print();
    }
  };

  const previewQuote = buildPreviewQuote();

  const handleSendEmailSubmit = async (e) => {
    e.preventDefault();
    const to = emailTo.trim();
    const cc = emailCC.trim();
    const subject = emailSubject.trim();
    const body = emailBody.trim();
    const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

    if (!to || !subject || !body) {
      showToast("To Email, Subject, and Message Body are required", "error");
      return;
    }
    if (!emailPattern.test(to) || (cc && !emailPattern.test(cc))) {
      showToast("Enter a valid email address.", "error");
      return;
    }
    
    setIsSendingEmail(true);
    try {
      await new Promise((resolve) => setTimeout(resolve, 1200));

      const sentQuote = {
        ...buildPreviewQuote(),
        recipientEmail: to,
        sentAt: new Date().toISOString(),
      };

      try {
        onSentEmail?.({
        to,
        cc,
        subject,
        body,
        total: totals.grandTotal,
        quoteId: formData.quoteId,
        quote: sentQuote,
        });
      } catch (callbackErr) {
        console.error("[SampleQuoteModal] post-send callback failed:", callbackErr);
      }

      showToast("Quotation emailed successfully.", "success");
      setShowEmailForm(false);
    } catch (err) {
      showToast("Failed to send email. Please try again.", "error");
    } finally {
      setIsSendingEmail(false);
    }
  };

  const footer = (
    <div className="flex flex-wrap justify-between items-center gap-3 modal-no-print">
      <button
        type="button"
        onClick={onClose}
        className="px-5 py-2.5 rounded-lg border border-border text-sm font-medium text-text-muted hover:bg-bg-soft transition-all"
      >
        Close
      </button>
      <div className="flex flex-wrap items-center gap-3">
        <button
          type="button"
          onClick={handlePrint}
          className="flex items-center gap-2 px-5 py-2.5 rounded-lg border border-border text-sm font-medium text-text hover:bg-bg-soft transition-all"
        >
          <Printer size={14} /> Print / Save PDF
        </button>
        <button
          type="button"
          onClick={() => setShowEmailForm(true)}
          className="flex items-center gap-2 px-5 py-2.5 rounded-lg bg-select-blue hover:bg-select-blue/90 text-sm font-semibold text-white shadow-sm transition-all cursor-pointer"
        >
          <Mail size={14} /> Send Email
        </button>
      </div>
    </div>
  );

  return (
    <Modal
      title="Sample Quote"
      subtitle="Preview quote with scope from Proposal Master. Edit scope, preview, then print."
      onClose={onClose}
      footer={footer}
      maxWidth="max-w-[1300px]"
      maxHeight="h-[90vh]"
      bodyScrollable={false}
    >
      <div className="grid grid-cols-1 lg:grid-cols-[1fr_1fr] gap-6 h-full min-h-0">
        {/* ── Form pane ── */}
        <div className="modal-no-print overflow-y-auto h-full pr-2 scroll-hidden-bar">
          {/* Property Preset (read-only display) */}
          <div className="mb-5">
            <SectionHeader>Property Preset</SectionHeader>
            <div className="rounded-xl border border-border bg-bg-soft px-4 py-3 flex items-center justify-between">
              <div>
                <p className="text-[14px] font-bold text-text">
                  {presetKey.replace(/^(\d+)(BHK)$/i, "$1 BHK")}
                  {formData.propertyType ? ` / ${formData.propertyType}` : ""}
                </p>
                <p className="text-[11px] text-text-muted mt-0.5">
                  {formatSizeRange(formData.sizeRange)}
                </p>
              </div>
              <span className="text-[10px] font-bold uppercase tracking-wider text-text-subtle">
                Sample Quote
              </span>
            </div>
          </div>

          <div className="mb-5">
            <SectionHeader>Quality Grade</SectionHeader>
            <div className="flex flex-wrap items-center gap-1.5">
              {gradeOptions.map((grade) => {
                const active = (formData.grade || "premium") === grade.key;
                return (
                  <button
                    key={grade.key}
                    type="button"
                    onClick={() => handleGradeChange(grade.key)}
                    className={`px-3 py-1.5 rounded-lg text-[12px] font-semibold border transition-all cursor-pointer ${
                      active
                        ? "bg-select-blue text-white border-select-blue shadow-sm"
                        : "bg-white text-text-muted border-bordergray hover:border-select-blue/40 hover:text-select-blue"
                    }`}
                  >
                    {grade.label}
                  </button>
                );
              })}
            </div>
            <p className="mt-2 text-[10px] text-text-muted">
              {gradeLabel(formData.grade || "premium")} pricing is mapped from
              configured Item Master rate build-ups; the sample quote updates automatically.
            </p>
          </div>

          <div className="border-t border-border my-5" />

          {/* Recipient info (read-only) */}
          <div className="mb-5">
            <SectionHeader>Client Details</SectionHeader>
            <div className="grid grid-cols-2 gap-3">
              <div className="rounded-lg border border-bordergray bg-bg-soft px-3 py-2">
                <p className="text-[9px] font-bold uppercase text-text-subtle tracking-wider mb-0.5">
                  Name
                </p>
                <p className="text-[12px] font-semibold text-textcolor">
                  {formData.recipientName || "—"}
                </p>
              </div>
              <div className="rounded-lg border border-bordergray bg-bg-soft px-3 py-2">
                <p className="text-[9px] font-bold uppercase text-text-subtle tracking-wider mb-0.5">
                  Phone
                </p>
                <p className="text-[12px] font-semibold text-textcolor">
                  {formData.recipientPhone || "—"}
                </p>
              </div>
            </div>
            <div className="mt-2 rounded-lg border border-bordergray bg-bg-soft px-3 py-2">
              <p className="text-[9px] font-bold uppercase text-text-subtle tracking-wider mb-0.5">
                Email
              </p>
              <p className="text-[12px] font-semibold text-textcolor">
                {formData.recipientEmail || "—"}
              </p>
            </div>
          </div>

          <div className="border-t border-border my-5" />

          {/* ── Scope of Work (editable — matches Proposal Form exactly) ── */}
          <div className="mb-5">
            <div className="flex justify-between items-center mb-3">
              <SectionHeader>Scope of Work</SectionHeader>
              <button
                type="button"
                onClick={() => setLibraryPickerOpen(true)}
                className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border border-select-blue/30 bg-active-bg/40 text-select-blue text-[11px] font-semibold hover:bg-active-bg transition-all -mt-3"
              >
                <Pipette size={12} /> Pick from Library
              </button>
            </div>
            <div className="space-y-4">
              {groupedScope.map((group) => {
                const roomColorObj = roomColor(group.room.split(" ")[0]);
                const groupOpen = isGroupOpen(group.room);
                return (
                  <div
                    key={group.room}
                    className="border border-bordergray rounded-xl bg-white overflow-hidden shadow-sm"
                  >
                    {/* Accordion Header */}
                    <div className="w-full flex items-center justify-between px-3.5 py-2.5 bg-bg-soft/40 hover:bg-bg-soft/70 transition-colors border-b border-bordergray">
                      <button
                        type="button"
                        onClick={() => toggleGroup(group.room)}
                        className="flex-1 flex items-center gap-2 min-w-0 text-left cursor-pointer focus:outline-none"
                      >
                        {groupOpen ? (
                          <ChevronDown
                            size={13}
                            className="text-text-muted shrink-0"
                          />
                        ) : (
                          <ChevronRight
                            size={13}
                            className="text-text-muted shrink-0"
                          />
                        )}
                        <span
                          className={`h-2.5 w-2.5 rounded-full shrink-0 ${roomColorObj.dot}`}
                        />
                        <h4 className="text-[12px] font-bold text-textcolor uppercase tracking-wide truncate">
                          {group.room}
                        </h4>
                        <span className="text-[10px] font-semibold text-text-muted bg-bg-soft px-1.5 py-0.5 rounded-md border border-bordergray">
                          {group.rows.length}
                        </span>
                      </button>
                      <div className="flex items-center gap-3 shrink-0">
                        <span className="text-[11px] font-bold text-textcolor tabular-nums">
                          {formatAmount(group.total)}
                        </span>
                        <button
                          type="button"
                          onClick={() => setDeleteGroupConfirm(group.room)}
                          className="p-1 rounded-md text-text-subtle hover:text-red-500 hover:bg-red-50 transition-all cursor-pointer"
                          title={`Delete ${group.room} and all its items`}
                        >
                          <Trash2 size={13} />
                        </button>
                      </div>
                    </div>

                    {/* Accordion Content */}
                    {groupOpen && (
                      <div className="p-3 space-y-3 bg-white">
                        {group.rows.map(({ item, idx }) => (
                          <div
                            key={idx}
                            className="rounded-lg border border-border bg-bg-soft/30 p-2 space-y-2"
                          >
                            <div className="grid grid-cols-[1fr_1.5fr_110px_28px] gap-2 items-start">
                              <input
                                type="text"
                                value={item.itemName || ""}
                                readOnly={true}
                                className="bg-bg-soft border border-bordergray text-[11px] text-text-muted rounded-md px-2 py-2 w-full cursor-not-allowed focus:outline-none"
                              />
                              <input
                                type="text"
                                value={item.description || ""}
                                readOnly={true}
                                placeholder="Description"
                                className="bg-bg-soft border border-bordergray text-[11px] text-text-muted rounded-md px-2 py-2 w-full cursor-not-allowed focus:outline-none"
                              />
                              <input
                                type="number"
                                value={item.amount}
                                readOnly={true}
                                placeholder="₹"
                                className="bg-bg-soft border border-bordergray text-[11px] text-text-muted rounded-md px-2 py-2 w-full cursor-not-allowed focus:outline-none text-right"
                              />
                              <button
                                type="button"
                                onClick={() => removeScopeRow(idx)}
                                className="h-8 w-7 flex items-center justify-center rounded-md text-text-subtle hover:text-red-500 hover:bg-red-50 transition-colors"
                                title="Remove row"
                              >
                                <Trash2 size={13} />
                              </button>
                            </div>

                            {/* Unit · rate · days meta */}
                            <div className="flex items-center gap-3 px-0.5 text-[10px] text-text-muted">
                              <span className="font-semibold">{item.unit}</span>
                              <span>
                                ₹{Number(item.rate || 0).toLocaleString("en-IN")}/
                                {item.unit}
                              </span>
                              {(item.days ?? "") !== "" && <span>{item.days}d</span>}
                            </div>

                            {/* Material specs — read-only in Sample Quote */}
                            {(item.materials || []).length > 0 && (
                              <div className="pl-3 border-l-2 border-select-blue/30 space-y-1.5">
                                {item.materials.map((m, mIdx) => (
                                  <div
                                    key={mIdx}
                                    className="grid grid-cols-[100px_1fr] gap-2 items-center"
                                  >
                                    <input
                                      type="text"
                                      value={m.name}
                                      readOnly={true}
                                      placeholder="Plywood"
                                      className="bg-bg-soft border border-bordergray text-[10px] text-text-muted rounded-md px-2 py-1.5 w-full cursor-not-allowed focus:outline-none"
                                    />
                                    <input
                                      type="text"
                                      value={m.spec}
                                      readOnly={true}
                                      placeholder="BWP 19mm"
                                      className="bg-bg-soft border border-bordergray text-[10px] text-text-muted rounded-md px-2 py-1.5 w-full cursor-not-allowed focus:outline-none"
                                    />
                                  </div>
                                ))}
                              </div>
                            )}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
            <div className="mt-3 flex justify-end gap-4 text-[12px]">
              <span className="text-text-muted">
                Subtotal:{" "}
                <span className="font-bold text-text">
                  {formatAmount(totals.subtotal)}
                </span>
              </span>
              <span className="text-text-muted">
                GST:{" "}
                <span className="font-bold text-orange-500">
                  {formatAmount(totals.gst)}
                </span>
              </span>
              <span className="text-text-muted">
                Total:{" "}
                <span className="font-bold text-primary">
                  {formatAmount(totals.grandTotal)}
                </span>
              </span>
            </div>
          </div>

          <div className="border-t border-border my-5" />

          {/* ── Terms & Conditions (matches Proposal Form) ── */}
          <div className="mb-5">
            <div className="flex justify-between gap-3 mb-4">
              <div className="flex justify-between items-center">
                <SectionHeader>Terms & Conditions</SectionHeader>
              </div>
              <div className="flex flex-wrap gap-2 -mt-1.5">
                <button
                  type="button"
                  onClick={() => setTermsParentModalOpen(true)}
                  className="flex items-center gap-1.5 px-4 py-2 rounded-xl border border-select-blue bg-select-blue/5 text-select-blue text-[11.5px] font-bold hover:bg-select-blue/10 hover:shadow-sm transition-all cursor-pointer group"
                >
                  <Plus
                    size={14}
                    className="text-select-blue group-hover:scale-110 transition-transform"
                  />
                  <span>Add Conditions</span>
                </button>
              </div>
            </div>
            <div className="space-y-3">
              {getCategoriesMeta().map((cat) => {
                const Icon = cat.icon;
                const activeIncs = formData.categoryInclusions?.[cat.id] || [];
                const activeExcs = formData.categoryExclusions?.[cat.id] || [];
                const totalCount = activeIncs.length + activeExcs.length;
                const isExpanded = !!expandedCategories[cat.id];

                return (
                  <div
                    key={cat.id}
                    className="border border-bordergray rounded-xl overflow-hidden bg-white shadow-xs"
                  >
                    <button
                      type="button"
                      onClick={() =>
                        setExpandedCategories((prev) => ({
                          ...prev,
                          [cat.id]: !prev[cat.id],
                        }))
                      }
                      className="w-full flex items-center justify-between px-4 py-3 bg-bg-soft/40 hover:bg-bg-soft transition-all cursor-pointer"
                    >
                      <div className="flex items-center gap-2">
                        <Icon size={14} className="text-select-blue" />
                        <span className="text-[12px] font-bold text-textcolor">
                          {cat.label}
                        </span>
                        <span className="text-[9.5px] text-text-muted bg-white border border-bordergray px-1.5 py-0.5 rounded-md font-medium">
                          {totalCount} selected
                        </span>
                      </div>
                      <div className="text-text-muted">
                        {isExpanded ? (
                          <ChevronDown
                            size={14}
                            className="text-textcolor/60"
                          />
                        ) : (
                          <ChevronRight
                            size={14}
                            className="text-textcolor/60"
                          />
                        )}
                      </div>
                    </button>

                    {isExpanded && (
                      <div className="p-4 border-t border-bordergray/50 grid grid-cols-1 md:grid-cols-2 gap-5 bg-white">
                        {/* Included Column (always left) */}
                        <div>
                          <h4 className="text-[10px] font-bold text-emerald-700 tracking-wider uppercase mb-2">
                            Included
                          </h4>
                          <div className="space-y-2">
                            {(() => {
                              const global = getGlobalTerms(cat.id);
                              const defaultIn = global.inclusions.filter((t) => t.isDefault).map((t) => t.text);
                              const addedIn = formData.addedInclusions?.[cat.id] || [];
                              const visibleIn = Array.from(new Set([...defaultIn, ...addedIn]));

                              if (visibleIn.length === 0) {
                                  return (
                                    <div className="text-[11.5px] text-text-muted py-2 leading-relaxed">
                                      No Included Items available.
                                    </div>
                                  );
                              }

                              return (
                                <div
                                  style={{ maxHeight: '152px', scrollBehavior: 'smooth' }}
                                  className="space-y-2 overflow-y-auto scroll-hidden-bar scroll-smooth"
                                >
                                  {visibleIn.map((item, idx) => {
                                    const isChecked = activeIncs.includes(item);
                                    return (
                                      <div
                                        key={idx}
                                        onClick={() => toggleInclusion(item, cat.id)}
                                        className="flex items-start gap-2.5 cursor-pointer group py-1 px-1.5 rounded hover:bg-bg-soft transition-all select-none text-left"
                                      >
                                        <div className="pt-0.5 shrink-0">
                                          <SQCheckbox
                                            accent="green"
                                            checked={isChecked}
                                            onChange={() => {}}
                                          />
                                        </div>
                                        <span className="text-[11.5px] text-text-muted group-hover:text-textcolor transition-colors leading-tight font-medium">
                                          {item}
                                        </span>
                                      </div>
                                    );
                                  })}
                                </div>
                              );
                            })()}
                          </div>
                        </div>

                        {/* Not Included Column (always right) */}
                        <div>
                          <h4 className="text-[10px] font-bold text-red-500 tracking-wider uppercase mb-2">
                            Not Included
                          </h4>
                          <div className="space-y-2">
                            {(() => {
                              const global = getGlobalTerms(cat.id);
                              const defaultEx = global.exclusions.filter((t) => t.isDefault).map((t) => t.text);
                              const addedEx = formData.addedExclusions?.[cat.id] || [];
                              const visibleEx = Array.from(new Set([...defaultEx, ...addedEx]));

                              if (visibleEx.length === 0) {
                                return (
                                  <div className="text-[11.5px] text-text-muted py-2 leading-relaxed">
                                    No Not Included Items available.
                                  </div>
                                );
                              }

                              return (
                                <div
                                  style={{ maxHeight: '152px', scrollBehavior: 'smooth' }}
                                  className="space-y-2 overflow-y-auto scroll-hidden-bar scroll-smooth"
                                >
                                  {visibleEx.map((item, idx) => {
                                    const isChecked = activeExcs.includes(item);
                                    return (
                                      <div
                                        key={idx}
                                        onClick={() => toggleExclusion(item, cat.id)}
                                        className="flex items-start gap-2.5 cursor-pointer group py-1 px-1.5 rounded hover:bg-bg-soft transition-all select-none text-left"
                                      >
                                        <div className="pt-0.5 shrink-0">
                                          <SQCheckbox
                                            accent="red"
                                            checked={isChecked}
                                            onChange={() => {}}
                                          />
                                        </div>
                                        <span className="text-[11.5px] text-text-muted group-hover:text-textcolor transition-colors leading-tight font-medium">
                                          {item}
                                        </span>
                                      </div>
                                    );
                                  })}
                                </div>
                              );
                            })()}
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          <div className="border-t border-border my-5" />

          <div>
            <SectionHeader>Notes / Terms</SectionHeader>
            <InputField
              name="sq_notes"
              label=""
              type="textarea"
              rows={3}
              value={formData.notes}
              onChange={(e) => updateField("notes", e.target.value)}
              placeholder="Optional notes for the client (payment terms, timelines, etc.)"
            />
          </div>
        </div>

        {/* ── Preview pane ── */}
        <div className="overflow-y-auto h-full pl-2 scroll-hidden-bar">
          <p className="text-[10px] uppercase tracking-widest text-gray-400 font-bold mb-2 modal-no-print">
            Live Preview
          </p>
          <div className="quote-print-area rounded-xl border border-border bg-white p-6 shadow-sm">
            <QuotePreview quote={previewQuote} />
          </div>
        </div>
      </div>

      {/* Library Picker — same as Proposal Form */}
      {libraryPickerOpen && (
        <LibraryPickerModal
          onClose={() => setLibraryPickerOpen(false)}
          onPick={handleLibraryPick}
        />
      )}

      {/* Add Conditions Parent Modal */}
      {termsParentModalOpen && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-xs flex items-center justify-center z-[9999] animate-fade-in p-4">
          <div className="bg-white rounded-2xl w-full max-w-md shadow-2xl overflow-hidden border border-bordergray transform scale-100 transition-all duration-300">
            {/* Modal Header */}
            <div className="flex items-center justify-between px-6 py-4 bg-bg-soft border-b border-bordergray">
              <div>
                <h3 className="text-[14px] font-bold text-textcolor">
                  Add Conditions
                </h3>
                <p className="text-[10px] text-text-muted mt-0.5">
                  Select a category to customize Terms & Conditions
                </p>
              </div>
              <button
                type="button"
                onClick={() => setTermsParentModalOpen(false)}
                className="text-gray-400 hover:text-red-600 p-1.5 rounded-lg hover:bg-red-50 transition-colors cursor-pointer"
              >
                <X size={16} />
              </button>
            </div>

            {/* Categories List */}
            <div className="p-5 space-y-2.5">
              {getCategoriesMeta().map((cat) => {
                const Icon = cat.icon;
                const count = getActiveCatCount(cat.id);

                return (
                  <button
                    key={cat.id}
                    type="button"
                    onClick={() => {
                      setActiveCategoryModal(cat.id);
                      setTermsParentModalOpen(false);
                    }}
                    className="w-full flex items-center justify-between p-3.5 rounded-xl border border-bordergray bg-white hover:border-select-blue/30 hover:bg-bg-soft/40 transition-colors shadow-xs cursor-pointer group text-left"
                  >
                    <div className="flex items-center gap-3">
                      <div className="p-2 rounded-lg bg-select-blue/5 text-select-blue group-hover:bg-select-blue group-hover:text-white transition-colors">
                        <Icon size={16} />
                      </div>
                      <div>
                        <p className="text-[12px] font-bold text-textcolor group-hover:text-select-blue transition-colors">
                          {cat.label}
                        </p>
                        <p className="text-[10px] text-text-muted mt-0.5">
                          Customize {cat.label.toLowerCase()} clauses
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      {count > 0 && (
                        <span className="bg-emerald-50 text-emerald-700 text-[10px] font-bold px-2 py-0.5 rounded-md border border-emerald-150">
                          {count} selected
                        </span>
                      )}
                      <ChevronRight
                        size={14}
                        className="text-text-muted group-hover:text-textcolor transition-colors"
                      />
                    </div>
                  </button>
                );
              })}
            </div>

            {/* Modal Footer */}
            <div className="flex justify-end px-6 py-4 bg-bg-soft border-t border-bordergray">
              <button
                type="button"
                onClick={() => setTermsParentModalOpen(false)}
                className="px-4 py-2 bg-white border border-bordergray rounded-xl text-textcolor hover:bg-bg-soft text-[11px] font-bold transition-all shadow-xs cursor-pointer"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Dedicated category Terms & Conditions modal */}
      {activeCategoryModal && (
        <CategoryTermsModal
          category={activeCategoryModal}
          categoryLabel={
            getCategoriesMeta().find((c) => c.id === activeCategoryModal)?.label || ""
          }
          initialInclusions={
            formData.categoryInclusions?.[activeCategoryModal] || []
          }
          initialExclusions={
            formData.categoryExclusions?.[activeCategoryModal] || []
          }
          addedInclusions={
            formData.addedInclusions?.[activeCategoryModal] || []
          }
          addedExclusions={
            formData.addedExclusions?.[activeCategoryModal] || []
          }
          onApply={(newInclusions, newExclusions) => {
            const global = getGlobalTerms(activeCategoryModal);
            const defaultInTexts = global.inclusions.filter((t) => t.isDefault).map((t) => t.text);
            const defaultExTexts = global.exclusions.filter((t) => t.isDefault).map((t) => t.text);

            const prevCatIn = formData.categoryInclusions?.[activeCategoryModal] || [];
            const prevCatEx = formData.categoryExclusions?.[activeCategoryModal] || [];

            const currentSelectedDefaultsIn = prevCatIn.filter((t) => defaultInTexts.includes(t));
            const currentSelectedDefaultsEx = prevCatEx.filter((t) => defaultExTexts.includes(t));

            const updatedCatIn = Array.from(new Set([...currentSelectedDefaultsIn, ...newInclusions]));
            const updatedCatEx = Array.from(new Set([...currentSelectedDefaultsEx, ...newExclusions]));

            const updatedAddedIn = newInclusions;
            const updatedAddedEx = newExclusions;

            // Reconstruct flat arrays
            const flatIn = [];
            const flatEx = [];
            const categoriesList = getCategoriesList();
            categoriesList.forEach((cat) => {
              if (cat === activeCategoryModal) {
                flatIn.push(...updatedCatIn);
                flatEx.push(...updatedCatEx);
              } else {
                flatIn.push(...(formData.categoryInclusions?.[cat] || []));
                flatEx.push(...(formData.categoryExclusions?.[cat] || []));
              }
            });

            const finalFlatIn = Array.from(new Set(flatIn));
            const finalFlatEx = Array.from(new Set(flatEx));

            setFormData((prev) => ({
              ...prev,
              inclusions: finalFlatIn,
              exclusions: finalFlatEx,
              categoryInclusions: {
                ...prev.categoryInclusions,
                [activeCategoryModal]: updatedCatIn,
              },
              categoryExclusions: {
                ...prev.categoryExclusions,
                [activeCategoryModal]: updatedCatEx,
              },
              addedInclusions: {
                ...prev.addedInclusions,
                [activeCategoryModal]: updatedAddedIn,
              },
              addedExclusions: {
                ...prev.addedExclusions,
                [activeCategoryModal]: updatedAddedEx,
              },
            }));

            // Sync termOptions so they display on the main form
            setTermOptions({
              inclusions: finalFlatIn,
              exclusions: finalFlatEx,
            });

            setActiveCategoryModal(null);
            setTermsParentModalOpen(true);
          }}
          onClose={() => {
            setActiveCategoryModal(null);
            setTermsParentModalOpen(true);
          }}
        />
      )}

      {showEmailForm && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-xs flex items-center justify-center z-[9999] animate-fade-in p-4 modal-no-print">
          <div className="bg-white rounded-2xl w-full max-w-lg shadow-2xl overflow-hidden border border-bordergray transform scale-100 transition-all duration-300">
            {/* Modal Header */}
            <div className="flex items-center justify-between px-6 py-4 bg-bg-soft border-b border-bordergray">
              <div>
                <h3 className="text-[14px] font-bold text-textcolor">Send Quotation Email</h3>
                <p className="text-[10px] text-text-muted mt-0.5">Directly email the generated quotation PDF</p>
              </div>
              <button
                type="button"
                onClick={() => setShowEmailForm(false)}
                className="text-gray-400 hover:text-red-600 p-1.5 rounded-lg hover:bg-red-50 transition-colors cursor-pointer"
              >
                <X size={16} />
              </button>
            </div>

            {/* Modal Form */}
            <form onSubmit={handleSendEmailSubmit} noValidate>
              <div className="p-6 space-y-4">
                <InputField
                  name="emailTo"
                  label="To Email *"
                  type="email"
                  required
                  value={emailTo}
                  onChange={(e) => setEmailTo(e.target.value)}
                  placeholder="recipient@example.com"
                />
                <InputField
                  name="emailCC"
                  label="CC Email (optional)"
                  type="email"
                  value={emailCC}
                  onChange={(e) => setEmailCC(e.target.value)}
                  placeholder="cc@example.com"
                />
                <InputField
                  name="emailSubject"
                  label="Subject *"
                  type="text"
                  required
                  value={emailSubject}
                  onChange={(e) => setEmailSubject(e.target.value)}
                  placeholder="Email subject line"
                />
                <div>
                  <label className="block text-[11px] font-bold text-text-muted uppercase tracking-wider mb-1.5">
                    Message Body *
                  </label>
                  <textarea
                    required
                    rows={6}
                    value={emailBody}
                    onChange={(e) => setEmailBody(e.target.value)}
                    className="w-full rounded-xl border border-bordergray px-3.5 py-2.5 text-[12.5px] text-textcolor placeholder:text-text-subtle focus:outline-none focus:border-select-blue focus:ring-1 focus:ring-select-blue/20 transition-all resize-none"
                    placeholder="Enter email content..."
                  />
                </div>
                {/* Attached PDF Display */}
                <div>
                  <label className="block text-[11px] font-bold text-text-muted uppercase tracking-wider mb-1.5">
                    Attachment
                  </label>
                  <div className="flex items-center gap-2.5 p-3 rounded-xl border border-bordergray bg-bg-soft">
                    <div className="w-8 h-8 rounded-lg bg-red-50 text-red-500 flex items-center justify-center shrink-0">
                      <FileText size={16} />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-[12px] font-bold text-textcolor truncate">Quotation.pdf</p>
                      <p className="text-[10px] text-text-muted">PDF Document · auto-generated</p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Modal Footer */}
              <div className="flex justify-end gap-3 px-6 py-4 bg-bg-soft border-t border-bordergray">
                <button
                  type="button"
                  onClick={() => setShowEmailForm(false)}
                  disabled={isSendingEmail}
                  className="px-4 py-2 bg-white border border-bordergray rounded-xl text-textcolor hover:bg-bg-soft text-[11px] font-bold transition-all shadow-xs cursor-pointer disabled:opacity-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSendingEmail}
                  className="flex items-center gap-1.5 px-5 py-2 bg-select-blue hover:bg-select-blue/90 rounded-xl text-white text-[11px] font-bold transition-all shadow-xs cursor-pointer disabled:opacity-50"
                >
                  {isSendingEmail ? "Sending..." : "Send Email"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      <DestinationPromptModal
        isOpen={destPrompt.isOpen}
        onClose={destPrompt.onCancel}
        itemName={destPrompt.itemName}
        itemCategory={destPrompt.category}
        existingHeadings={destPrompt.existingHeadings}
        headingsWithItem={destPrompt.headingsWithItem}
        onSelect={destPrompt.onSelect}
        onCreateNew={destPrompt.onCreateNew}
      />

      {deleteGroupConfirm && (
        <Modal
          title={`Delete ${deleteGroupConfirm}?`}
          onClose={() => setDeleteGroupConfirm(null)}
          footer={
            <div className="flex justify-end gap-3">
              <button
                type="button"
                onClick={() => setDeleteGroupConfirm(null)}
                className="px-4 py-2 border border-bordergray rounded-xl text-textcolor hover:bg-bg-soft text-[11px] font-bold transition-all shadow-xs cursor-pointer bg-white"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => handleDeleteGroup(deleteGroupConfirm)}
                className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-xl text-[11px] font-bold transition-all shadow-xs cursor-pointer"
              >
                Confirm Delete
              </button>
            </div>
          }
          maxWidth="max-w-[400px]"
        >
          <p className="text-[12.5px] text-text-muted leading-relaxed">
            Are you sure you want to delete the category <strong>{deleteGroupConfirm}</strong> and all its associated items? This action cannot be undone.
          </p>
        </Modal>
      )}

      {toast && (
        <Toast key={toast.id} toast={toast} onClose={() => setToast(null)} />
      )}
    </Modal>
  );
};

const Toast = ({ toast, onClose }) => {
  const variants = {
    success: { bg: "bg-emerald-500", icon: <CheckCircle2 size={14} /> },
    error: { bg: "bg-red-500", icon: <AlertTriangle size={14} /> },
    info: { bg: "bg-select-blue", icon: <Info size={14} /> },
  };
  const v = variants[toast.type] || variants.info;
  return (
    <div className="fixed top-6 right-6 z-[10000] animate-[slideIn_0.2s_ease-out]">
      <div
        className={`${v.bg} text-white rounded-xl shadow-xl px-4 py-3 flex items-center gap-2.5 min-w-[260px] max-w-md`}
      >
        <span className="shrink-0">{v.icon}</span>
        <p className="text-[12px] font-medium flex-1">{toast.message}</p>
        <button
          type="button"
          onClick={onClose}
          className="text-white/80 hover:text-white shrink-0"
          title="Dismiss"
        >
          <X size={13} />
        </button>
      </div>
    </div>
  );
};

export default SampleQuoteModal;

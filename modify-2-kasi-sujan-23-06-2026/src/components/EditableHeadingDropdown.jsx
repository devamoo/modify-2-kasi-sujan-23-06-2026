import { useState, useRef, useEffect, useMemo } from "react";
import { ChevronDown, Plus, Lock, Folder, Home } from "lucide-react";
import {
  getScheduleHeadings,
  getCategoryFromHeading,
  getRoomCategoryPresets,
} from "../data/scheduleConfig";

/**
 * Editable searchable dropdown for selecting/extending headings.
 *
 * Features:
 * - Primary categories come from Schedule Master → Room / Category Presets
 *   (single source of truth — no hardcoded values).
 * - Sub-headings come from Schedule Master headings filtered by category.
 * - User can select a category or sub-heading.
 * - User can extend a heading name (e.g. "Kitchen - Island Area").
 * - The category prefix is locked/read-only — only the suffix is editable.
 * - Dropdown remains fully editable until Save is clicked.
 * - Includes "Create New Heading" option.
 */
const EditableHeadingDropdown = ({
  value = "",
  category = "",
  onChange,
  existingScopeItems = [],
  excludeHeadingsWithItem = null,
  error = "",
  placeholder = "Select or type a heading…",
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [isTyping, setIsTyping] = useState(false);
  const [typedValue, setTypedValue] = useState("");
  const [isCustom, setIsCustom] = useState(false);
  const [customSuffix, setCustomSuffix] = useState("");
  // Phase: "category" shows room/category presets first, "heading" shows
  // sub-headings after a category is chosen.
  const [phase, setPhase] = useState("category");
  const [selectedCategory, setSelectedCategory] = useState(category || "");
  const dropdownRef = useRef(null);
  const customInputRef = useRef(null);

  // Get all room/category presets from Schedule Master (single source of truth)
  const roomCategories = useMemo(() => getRoomCategoryPresets(), []);

  // Get all headings from Schedule Master, filtered by the resolved category
  const resolvedCategory = selectedCategory || category;
  const allHeadings = useMemo(() => {
    if (!resolvedCategory) return getScheduleHeadings();
    return getScheduleHeadings(resolvedCategory);
  }, [resolvedCategory]);

  // Also include headings from existing scope items that match the category
  const existingHeadingsInScope = useMemo(() => {
    if (!resolvedCategory) return [];
    const catUpper = resolvedCategory.toUpperCase();
    const scopeHeadings = new Set();
    (existingScopeItems || []).forEach((item) => {
      const heading = (item.area || item.heading || "").trim().toUpperCase();
      if (heading) {
        const headingCat = getCategoryFromHeading(heading).toUpperCase();
        if (headingCat === catUpper || heading.startsWith(catUpper)) {
          scopeHeadings.add(heading);
        }
      }
    });
    return Array.from(scopeHeadings);
  }, [resolvedCategory, existingScopeItems]);

  // Combine Schedule Master headings with scope headings (deduplicated)
  const combinedHeadings = useMemo(() => {
    const headingSet = new Set();
    const result = [];
    allHeadings.forEach((h) => {
      const upper = h.name.trim().toUpperCase();
      if (!headingSet.has(upper)) {
        headingSet.add(upper);
        result.push(h.name.trim());
      }
    });
    existingHeadingsInScope.forEach((h) => {
      if (!headingSet.has(h)) {
        headingSet.add(h);
        result.push(h);
      }
    });
    return result;
  }, [allHeadings, existingHeadingsInScope]);

  // Filter headings that already contain the excluded item
  const filteredHeadings = useMemo(() => {
    let headings = combinedHeadings;
    if (excludeHeadingsWithItem) {
      const excludeSet = new Set(
        (excludeHeadingsWithItem || []).map((h) => h.trim().toUpperCase()),
      );
      headings = headings.filter((h) => !excludeSet.has(h.toUpperCase()));
    }
    if (isTyping && typedValue.trim()) {
      const q = typedValue.trim().toUpperCase();
      headings = headings.filter((h) => h.toUpperCase().includes(q));
    }
    return headings;
  }, [combinedHeadings, excludeHeadingsWithItem, typedValue, isTyping]);

  // Filter room categories by search
  const filteredCategories = useMemo(() => {
    if (!isTyping || !typedValue.trim()) return roomCategories;
    const q = typedValue.trim().toUpperCase();
    return roomCategories.filter((r) => r.name.toUpperCase().includes(q));
  }, [roomCategories, typedValue, isTyping]);

  // Category prefix for locking
  const categoryPrefix = useMemo(() => {
    if (!resolvedCategory) return "";
    return resolvedCategory.trim();
  }, [resolvedCategory]);

  // Sync typedValue with value prop when not open
  useEffect(() => {
    if (!isOpen) {
      setTypedValue(value);
    }
  }, [value, isOpen]);

  // Close dropdown on outside click
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
        setIsOpen(false);
        setIsTyping(false);
        if (isCustom && !customSuffix.trim()) {
          setIsCustom(false);
        }
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [isCustom, customSuffix]);

  // Auto-focus custom input when entering custom mode
  useEffect(() => {
    if (isCustom && customInputRef.current) {
      customInputRef.current.focus();
    }
  }, [isCustom]);

  // When dropdown opens, decide phase based on current value
  useEffect(() => {
    if (isOpen) {
      if (value && resolvedCategory) {
        setPhase("heading");
      } else {
        setPhase("category");
      }
    }
  }, [isOpen]);

  const handleSelectCategory = (catName) => {
    setSelectedCategory(catName);
    setPhase("heading");
    setTypedValue("");
    setIsTyping(false);
  };

  const handleSelect = (heading) => {
    onChange(heading);
    setIsOpen(false);
    setIsTyping(false);
    setIsCustom(false);
    setCustomSuffix("");
    setPhase("category");
  };

  const handleCreateNew = () => {
    setIsCustom(true);
    setCustomSuffix("");
    setIsOpen(false);
  };

  const handleCustomSubmit = () => {
    const suffix = customSuffix.trim();
    if (!suffix) return;
    const newHeading = `${categoryPrefix} - ${suffix}`;
    onChange(newHeading);
    setIsCustom(false);
    setCustomSuffix("");
  };

  const handleCustomKeyDown = (e) => {
    if (e.key === "Enter") {
      e.preventDefault();
      handleCustomSubmit();
    }
    if (e.key === "Escape") {
      setIsCustom(false);
      setCustomSuffix("");
    }
  };

  const handleBackToCategories = () => {
    setPhase("category");
    setTypedValue("");
    setIsTyping(false);
    setSelectedCategory("");
  };

  const handleFocus = () => {
    setIsOpen(true);
    setIsTyping(false);
  };

  const handleInputChange = (e) => {
    setTypedValue(e.target.value);
    setIsTyping(true);
  };

  return (
    <div ref={dropdownRef} className="relative">
      {isCustom ? (
        /* ── Custom heading input with locked prefix ─────────────── */
        <div className="flex items-center gap-0 border border-select-blue rounded-lg overflow-hidden bg-white focus-within:ring-2 focus-within:ring-select-blue/15">
          {/* Locked prefix */}
          <div className="flex items-center gap-1 bg-bg-soft border-r border-bordergray px-2.5 py-2 shrink-0 select-none">
            <Lock size={10} className="text-text-subtle" />
            <span className="text-[12px] font-bold text-textcolor uppercase whitespace-nowrap">
              {categoryPrefix}
            </span>
            <span className="text-[12px] text-text-muted font-medium"> - </span>
          </div>
          {/* Editable suffix */}
          <input
            ref={customInputRef}
            type="text"
            value={customSuffix}
            onChange={(e) => setCustomSuffix(e.target.value)}
            onKeyDown={handleCustomKeyDown}
            placeholder="e.g. Island Area, Utility Space"
            className="flex-1 px-2.5 py-2 text-[12px] text-textcolor uppercase font-semibold placeholder:text-text-subtle placeholder:font-normal placeholder:normal-case focus:outline-none bg-transparent"
          />
          <button
            type="button"
            onClick={handleCustomSubmit}
            disabled={!customSuffix.trim()}
            className="px-3 py-2 text-[11px] font-semibold text-select-blue hover:bg-active-bg disabled:opacity-40 disabled:cursor-not-allowed shrink-0"
          >
            Apply
          </button>
        </div>
      ) : (
        /* ── Main dropdown trigger (Input acting as both Search & Select) ── */
        <div className="relative flex items-center">
          <input
            type="text"
            value={typedValue}
            onChange={handleInputChange}
            onFocus={handleFocus}
            placeholder={placeholder}
            className={`flex-1 bg-white border uppercase font-semibold ${
              error
                ? "border-red-500 focus:border-red-500 focus:ring-red-500/15"
                : isOpen
                  ? "border-select-blue"
                  : "border-bordergray"
            } text-[12px] text-textcolor rounded-lg px-3 py-2 pr-8 transition-all placeholder:text-text-subtle placeholder:font-normal placeholder:normal-case focus:outline-none focus:border-select-blue focus:ring-2 focus:ring-select-blue/15`}
          />
          <button
            type="button"
            onClick={() => {
              if (isOpen) {
                setIsOpen(false);
              } else {
                handleFocus();
              }
            }}
            className="absolute right-1 top-1/2 -translate-y-1/2 p-1.5 text-text-muted hover:text-textcolor"
            tabIndex={-1}
          >
            <ChevronDown
              size={13}
              className={`transition-transform ${isOpen ? "rotate-180" : ""}`}
            />
          </button>
        </div>
      )}

      {error && (
        <p className="text-red-500 text-[10px] mt-1 font-semibold">{error}</p>
      )}

      {/* ── Dropdown panel ────────────────────────────────────── */}
      {isOpen && (
        <div className="absolute z-50 top-full mt-1 w-full bg-white rounded-xl border border-bordergray shadow-xl max-h-[320px] flex flex-col overflow-hidden animate-fade-in">
          {phase === "category" ? (
            /* ── Room / Category Presets list ────────────────── */
            <>
              <div className="px-3 py-1.5 border-b border-bordergray bg-bg-soft/50">
                <span className="text-[9.5px] font-bold uppercase tracking-wider text-text-subtle">
                  Room / Category Presets
                </span>
              </div>
              <div className="flex-1 overflow-y-auto p-1.5 space-y-0.5 scrollbar-thin">
                {filteredCategories.length === 0 && (
                  <p className="text-[11px] text-text-subtle text-center py-3 italic">
                    {typedValue.trim() ? `No categories match "${typedValue}"` : "No categories available."}
                  </p>
                )}
                {filteredCategories.map((room) => {
                  const isSelected =
                    room.name.toUpperCase() === (value || "").toUpperCase() ||
                    (value || "").toUpperCase().startsWith(room.name.toUpperCase());
                  return (
                    <button
                      key={room.name}
                      type="button"
                      onClick={() => handleSelectCategory(room.name)}
                      className={`w-full flex items-center justify-between gap-2 px-2.5 py-2 rounded-lg text-left transition-all ${
                        isSelected
                          ? "bg-active-bg border border-select-blue/30 text-select-blue"
                          : "hover:bg-bg-soft border border-transparent text-textcolor"
                      }`}
                    >
                      <div className="flex items-center gap-2 min-w-0">
                        <Home
                          size={12}
                          className={
                            isSelected ? "text-select-blue" : "text-text-subtle"
                          }
                        />
                        <span className="text-[11.5px] font-semibold truncate">
                          {room.name}
                        </span>
                      </div>
                      {room.days && (
                        <span className="text-[9.5px] text-text-subtle shrink-0">
                          {room.days}d
                        </span>
                      )}
                    </button>
                  );
                })}
              </div>
            </>
          ) : (
            /* ── Sub-headings list for selected category ────── */
            <>
              <div className="px-3 py-1.5 border-b border-bordergray bg-bg-soft/50 flex items-center justify-between">
                <div className="flex items-center gap-1.5">
                  <button
                    type="button"
                    onClick={handleBackToCategories}
                    className="text-[10px] font-semibold text-select-blue hover:text-primary transition-colors"
                  >
                    ← Categories
                  </button>
                  <span className="text-[9.5px] text-text-muted">·</span>
                  <span className="text-[10px] font-bold text-textcolor uppercase">
                    {resolvedCategory}
                  </span>
                </div>
                <span className="text-[9px] font-semibold text-text-subtle">
                  {filteredHeadings.length} heading{filteredHeadings.length === 1 ? "" : "s"}
                </span>
              </div>
              <div className="flex-1 overflow-y-auto p-1.5 space-y-0.5 scrollbar-thin">
                {filteredHeadings.length === 0 && !typedValue.trim() && (
                  <p className="text-[11px] text-text-subtle text-center py-3 italic">
                    No headings available for this category.
                  </p>
                )}
                {filteredHeadings.length === 0 && typedValue.trim() && (
                  <p className="text-[11px] text-text-subtle text-center py-3 italic">
                    No headings match "{typedValue}"
                  </p>
                )}
                {filteredHeadings.map((heading) => {
                  const isSelected =
                    heading.toUpperCase() === (value || "").toUpperCase();
                  return (
                    <button
                      key={heading}
                      type="button"
                      onClick={() => handleSelect(heading)}
                      className={`w-full flex items-center gap-2 px-2.5 py-2 rounded-lg text-left transition-all ${
                        isSelected
                          ? "bg-active-bg border border-select-blue/30 text-select-blue"
                          : "hover:bg-bg-soft border border-transparent text-textcolor"
                      }`}
                    >
                      <Folder
                        size={12}
                        className={
                          isSelected ? "text-select-blue" : "text-text-subtle"
                        }
                      />
                      <span className="text-[11.5px] font-semibold truncate uppercase">
                        {heading}
                      </span>
                    </button>
                  );
                })}
              </div>

              {/* Create New Heading */}
              {categoryPrefix && (
                <div className="p-2 border-t border-bordergray shrink-0">
                  <button
                    type="button"
                    onClick={handleCreateNew}
                    className="w-full flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg border border-dashed border-select-blue/40 text-select-blue text-[11px] font-semibold hover:bg-active-bg/40 transition-all"
                  >
                    <Plus size={12} />
                    Create New Heading
                  </button>
                </div>
              )}
            </>
          )}
        </div>
      )}
    </div>
  );
};

export default EditableHeadingDropdown;

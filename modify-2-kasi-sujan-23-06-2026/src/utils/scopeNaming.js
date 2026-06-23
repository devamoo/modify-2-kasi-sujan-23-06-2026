import { listLibrary } from "../data/itemLibrary";

/**
 * Fetch Detailed Description from item library by Item Name.
 * Mapped: Item Name -> Detailed Description
 */
export const getDetailedDescription = (itemName) => {
  if (!itemName) return "";
  try {
    const libItems = listLibrary();
    const matched = libItems.find(
      (it) => it.description.toLowerCase().trim() === itemName.toLowerCase().trim()
    );
    if (matched) {
      if (matched.spec) return matched.spec;
    }
  } catch {
    // fall through
  }
  return "";
};

/**
 * Normalizes a scope item to guarantee the presence of heading, itemName, and description.
 */
export const normalizeScopeItem = (item) => {
  if (!item) return item;

  // Assign stable unique ID if not present
  const id = item.id || `scope_${Math.random().toString(36).substring(2, 9)}`;

  // 1. heading / area
  let area = item.area || item.heading || "Unassigned";
  let heading = item.heading || item.area || "Unassigned";
  heading = heading.trim().toUpperCase();
  area = area.trim().toUpperCase();

  // 2. itemName
  let itemName = item.itemName || "";
  if (!itemName) {
    // Fallback: under the old system, item.area was category name and item.description was the item name
    itemName = item.description || item.area || "Untitled Item";
  }

  // 3. description (Detailed Description)
  // Only populate when actual data exists — don't auto-fill placeholder values
  // or copy values from other fields (Req 6)
  let description = item.description || "";
  if (!item.isDescriptionCustom) {
    const syncDesc = getDetailedDescription(itemName);
    if (syncDesc && syncDesc !== itemName) {
      description = syncDesc;
    } else {
      if (description === itemName) {
        description = "";
      }
    }
  }

  return {
    ...item,
    id,
    heading,
    area,
    itemName,
    description,
  };
};

/**
 * Add scope items to an existing list with duplicate check logic.
 * The duplicate validation / heading assignment prompt is handled in the UI layer.
 * This function simply ensures headings are normalized to uppercase.
 */
export const addScopeItemsWithDuplicateCheck = (existingItems, newItemsToAdd) => {
  const result = [...(existingItems || [])];

  (newItemsToAdd || []).forEach((newItem) => {
    const normItem = normalizeScopeItem(newItem);
    const targetHeading = (normItem.heading || normItem.area || "Unassigned").trim().toUpperCase();
    normItem.heading = targetHeading;
    normItem.area = targetHeading;
    result.push(normItem);
  });

  return result;
};

export function getCategoryKey(str) {
  if (!str) return "gray";
  const s = str.toLowerCase();
  if (s.includes("kitchen")) return "kitchen";
  if (s.includes("living") || s.includes("lounge") || s.includes("tv")) return "living";
  if (s.includes("dining")) return "living";
  if (s.includes("bedroom") || s.includes("bed") || s.includes("wardrobe")) return "bedroom";
  if (s.includes("bath") || s.includes("toilet") || s.includes("wash") || s.includes("vanity") || s.includes("restroom")) return "bath";
  if (s.includes("foyer") || s.includes("passage") || s.includes("lobby") || s.includes("entrance")) return "foyer";
  if (s.includes("study") || s.includes("office") || s.includes("desk") || s.includes("work")) return "study";
  if (s.includes("stair")) return "stair";
  if (s.includes("utility") || s.includes("service")) return "utility";
  return "gray";
}

export const getCategoryFromItemName = (itemName) => {
  if (!itemName) return "";
  try {
    const libItems = listLibrary();
    const matched = libItems.find(
      (it) => it.description.toLowerCase().trim() === itemName.toLowerCase().trim()
    );
    if (matched && matched.category) {
      return matched.category;
    }
  } catch {
    // Optional Item Master lookup; use the empty category fallback.
  }
  return "";
};

export const getHeadingCategoryKey = (headingName, allItems) => {
  const keyByName = getCategoryKey(headingName);
  if (keyByName !== "gray") return keyByName;

  const itemsInHeading = (allItems || []).filter(
    (item) => (item.area || item.heading || "").trim().toUpperCase() === headingName.trim().toUpperCase()
  );
  
  for (const item of itemsInHeading) {
    const cat = item.category || getCategoryFromItemName(item.itemName || item.description);
    if (cat) {
      const keyByItem = getCategoryKey(cat);
      if (keyByItem !== "gray") return keyByItem;
    }
  }
  
  return "gray";
};

/**
 * Refresh scope items from Master Configuration, updating heading, item name,
 * and description unless customized.
 */
export const refreshScopeItemsFromMaster = (scopeItems, presetKey, propertyType) => {
  if (!Array.isArray(scopeItems)) return scopeItems;
  if (!presetKey) return scopeItems;

  try {
    const raw = localStorage.getItem("quoteMaster");
    if (!raw) return scopeItems;
    const master = JSON.parse(raw);
    if (!master || !master[presetKey]) return scopeItems;

    const preset = master[presetKey];
    const configs = preset.configurations || [];
    const cfg = configs.find((c) => c.propertyType === propertyType) || configs[0];
    if (!cfg || !Array.isArray(cfg.scopeItems)) return scopeItems;

    return scopeItems.map((item) => {
      let masterItem = null;
      if (item.id) {
        masterItem = cfg.scopeItems.find((m) => m.id === item.id);
      }
      if (!masterItem && item.itemName) {
        // 1. Try to match by both itemName and area/heading first
        masterItem = cfg.scopeItems.find(
          (m) =>
            (m.itemName || "").toLowerCase().trim() === (item.itemName || "").toLowerCase().trim() &&
            (m.area || m.heading || "").toLowerCase().trim() === (item.area || item.heading || "").toLowerCase().trim()
        );

        // 2. Try to match by itemName and category key
        if (!masterItem) {
          const itemCatKey = getCategoryKey(item.area || item.heading);
          masterItem = cfg.scopeItems.find(
            (m) =>
              (m.itemName || "").toLowerCase().trim() === (item.itemName || "").toLowerCase().trim() &&
              getCategoryKey(m.area || m.heading) === itemCatKey
          );
        }

        // 3. Fallback to matching only itemName
        if (!masterItem) {
          masterItem = cfg.scopeItems.find(
            (m) => (m.itemName || "").toLowerCase().trim() === (item.itemName || "").toLowerCase().trim()
          );
        }
      }

      if (!masterItem) return item;

      const id = item.id || masterItem.id;

      // 1. Heading Name propagation
      let area = item.area;
      if (!item.isAreaCustom) {
        area = masterItem.heading || masterItem.area || area;
      }

      // 2. Item Name propagation
      let itemName = item.itemName;
      if (!item.isItemNameCustom) {
        itemName = masterItem.itemName || itemName;
      }

      // 3. Detailed Description propagation
      let description = item.description;
      if (!item.isDescriptionCustom) {
        description = masterItem.description || masterItem.spec || description;
      }

      return {
        ...item,
        id,
        masterId: item.masterId || masterItem.masterId || masterItem.itemId || null,
        recipes: item.recipes || masterItem.recipes,
        defaultGrade: item.defaultGrade || masterItem.defaultGrade,
        area,
        heading: area,
        itemName,
        description,
      };
    });
  } catch (e) {
    console.error("Error refreshing scope items from master:", e);
    return scopeItems;
  }
};

/**
 * Assign sequential display names per category.
 * Updated to match the new rules: no auto numbering, uses itemName as the object/display name.
 */
export const assignCategoryNames = (scopeItems) => {
  if (!Array.isArray(scopeItems)) return [];
  return scopeItems.map((item) => {
    const norm = normalizeScopeItem(item);
    return {
      ...norm,
      _displayCategory: norm.itemName,
    };
  });
};

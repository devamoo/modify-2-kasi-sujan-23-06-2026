import {
  computeLibraryItemAmount,
  listLibrary,
} from "./itemLibrary";
import { listMaterials } from "./materialLibrary";
import { computeRecipe, materialsById, recipeToMaterials } from "./rateBuildup";

const normalized = (value) => (value || "").trim().toLowerCase();

const findLibraryItem = (scope, library) => {
  const masterId = scope.masterId || scope.itemId;
  if (masterId) {
    const byId = library.find((item) => item.id === masterId);
    if (byId) return byId;
  }

  const scopeName = normalized(scope.itemName || scope.name);
  if (!scopeName) return null;
  return (
    library.find((item) => normalized(item.description) === scopeName) || null
  );
};

// Apply an Item Master's composite grade rate to proposal rows without
// changing their room, description, dimensions, assumed quantity, or identity.
export const mapScopeItemsToGrade = (scopeItems = [], grade = "premium") => {
  const library = listLibrary();
  const materialLookup = materialsById(listMaterials());

  return scopeItems.map((scope) => {
    const libraryItem = findLibraryItem(scope, library);
    const recipes = libraryItem?.recipes || scope.recipes;
    const recipe = recipes?.[grade];
    if (!recipe) {
      return { ...scope, grade };
    }

    const calculation = computeRecipe(recipe, materialLookup);
    const rate = Math.round(calculation.rate || 0);
    if (rate <= 0) return { ...scope, grade };

    const mappedMaterials = recipeToMaterials(recipe, materialLookup);
    const updated = {
      ...scope,
      masterId: scope.masterId || libraryItem?.id || null,
      recipes,
      grade,
      rate,
      materials: mappedMaterials,
    };

    return {
      ...updated,
      amount: computeLibraryItemAmount(updated),
    };
  });
};

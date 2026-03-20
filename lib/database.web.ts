import { SEED_RECIPES, toDbFormat } from './data/recipes';
import { parseImportJson, type ImportResult } from './data/importRecipes';

export type { ImportResult };

// ─── Re-exports des types ──────────────────────────────────────
export type { StepType, RecipeStep, Recipe, ShoppingItem, MealSlot, MealPlan } from './types';

// ─── Init ─────────────────────────────────────────────────────

import type { Recipe, ShoppingItem, MealPlan, MealSlot } from './types';

const STORAGE_KEY = 'cuisinator_recipes';
const MEAL_PLANS_KEY = 'cuisinator_meal_plans';
const SHOPPING_KEY = 'cuisinator_shopping';

export function initDatabase() {
  const existing = loadRecipes();
  if (existing.length === 0) {
    const seeded = SEED_RECIPES.map((r, i) => ({ ...toDbFormat(r), id: i + 1 }));
    saveRecipes(seeded);
  } else {
    // Migrer les recettes existantes sans ingrédients/steps
    const updated = existing.map((r) => {
      const seed = SEED_RECIPES.find((s) => s.title === r.title);
      if (!seed) return r;
      const seedDb = toDbFormat(seed);
      return {
        ...r,
        ingredients: r.ingredients || seedDb.ingredients,
        steps: r.steps || seedDb.steps,
        cook_time: r.cook_time || seedDb.cook_time,
      };
    });
    saveRecipes(updated);
  }
}

// ─── Recettes ─────────────────────────────────────────────────

function loadRecipes(): Recipe[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    const items: Recipe[] = raw ? JSON.parse(raw) : [];
    return items.map((r) => ({ cook_time: 0, steps: '', ingredients: '', ...r }));
  } catch {
    return [];
  }
}

function saveRecipes(recipes: Recipe[]) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(recipes));
}

function nextId(recipes: Recipe[]): number {
  return recipes.length === 0 ? 1 : Math.max(...recipes.map((r) => r.id)) + 1;
}

export function importRecipes(json: string): ImportResult {
  const { recipes, errors } = parseImportJson(json);
  const current = loadRecipes();
  for (const recipe of recipes) {
    const r = toDbFormat(recipe);
    current.push({ ...r, id: nextId(current) });
  }
  saveRecipes(current);
  return { imported: recipes.length, errors };
}

export function getAllRecipes(): Recipe[] {
  return loadRecipes().sort((a, b) => a.title.localeCompare(b.title));
}

export function getRecipeById(id: number): Recipe | null {
  return loadRecipes().find((r) => r.id === id) ?? null;
}

export function addRecipe(recipe: Omit<Recipe, 'id'>): void {
  const recipes = loadRecipes();
  recipes.push({ cook_time: 0, steps: '', ...recipe, id: nextId(recipes) });
  saveRecipes(recipes);
}

export function deleteRecipe(id: number): void {
  saveRecipes(loadRecipes().filter((r) => r.id !== id));
}

// ─── Meal Plan ────────────────────────────────────────────────

type MealPlansStore = Record<string, { lunch: number | null; dinner: number | null }>;

function loadMealPlans(): MealPlansStore {
  try {
    const raw = localStorage.getItem(MEAL_PLANS_KEY);
    return raw ? JSON.parse(raw) : {};
  } catch {
    return {};
  }
}

function saveMealPlans(plans: MealPlansStore): void {
  localStorage.setItem(MEAL_PLANS_KEY, JSON.stringify(plans));
}

export function getMealPlan(date: string): MealPlan {
  const plans = loadMealPlans();
  const plan = plans[date];
  return { date, lunch: plan?.lunch ?? null, dinner: plan?.dinner ?? null };
}

export function setMeal(date: string, slot: MealSlot, recipeId: number | null): void {
  const plans = loadMealPlans();
  const current = plans[date] ?? { lunch: null, dinner: null };
  plans[date] = { ...current, [slot]: recipeId };
  saveMealPlans(plans);
}

// ─── Liste de courses ─────────────────────────────────────────

function loadShopping(): ShoppingItem[] {
  try {
    const raw = localStorage.getItem(SHOPPING_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

function saveShopping(items: ShoppingItem[]): void {
  localStorage.setItem(SHOPPING_KEY, JSON.stringify(items));
}

function nextShoppingId(items: ShoppingItem[]): number {
  return items.length === 0 ? 1 : Math.max(...items.map((i) => i.id)) + 1;
}

export function getShoppingList(): ShoppingItem[] {
  return loadShopping().sort((a, b) => a.recipe_name.localeCompare(b.recipe_name) || a.id - b.id);
}

export function addToShoppingList(items: { name: string; recipe_name: string }[]): void {
  const current = loadShopping();
  for (const item of items) {
    current.push({ id: nextShoppingId(current), name: item.name, recipe_name: item.recipe_name, done: 0 });
  }
  saveShopping(current);
}

export function toggleShoppingItem(id: number): void {
  saveShopping(
    loadShopping().map((item) =>
      item.id === id ? { ...item, done: item.done === 1 ? 0 : 1 } : item
    )
  );
}

export function clearShoppingList(): void {
  saveShopping([]);
}

export function deleteShoppingItemsByIds(ids: number[]): void {
  if (ids.length === 0) return;
  const idSet = new Set(ids);
  saveShopping(loadShopping().filter((item) => !idSet.has(item.id)));
}

export function updateShoppingItemName(id: number, name: string): void {
  saveShopping(
    loadShopping().map((item) =>
      item.id === id ? { ...item, name } : item
    )
  );
}

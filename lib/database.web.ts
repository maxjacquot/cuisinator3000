export type Recipe = {
  id: number;
  title: string;
  category: string;
  prep_time: number;
  description: string;
  ingredients: string; // un ingrédient par ligne
};

export type ShoppingItem = {
  id: number;
  name: string;
  recipe_name: string;
  done: number; // 0 | 1
};

export type MealSlot = 'lunch' | 'dinner';

export type MealPlan = {
  date: string;
  lunch: number | null;
  dinner: number | null;
};

// ─── Recettes ─────────────────────────────────────────────────

const STORAGE_KEY = 'cuisinator_recipes';

const SEED_RECIPES: Omit<Recipe, 'id'>[] = [
  {
    title: 'Pâtes carbonara',
    category: 'Plat',
    prep_time: 20,
    description: 'Des pâtes crémeuses à la guanciale, oeufs et pecorino.',
    ingredients: 'Pâtes (400g)\nGuanciale (150g)\n4 jaunes d\'œufs\nPecorino romano\nPoivre noir\nSel',
  },
  {
    title: 'Tarte aux pommes',
    category: 'Dessert',
    prep_time: 60,
    description: 'Une tarte maison avec une pâte brisée et des pommes caramélisées.',
    ingredients: 'Farine (250g)\nBeurre (125g)\nSucre (80g)\n4 pommes\n1 œuf\nSel\nCanelle',
  },
  {
    title: 'Soupe à l\'oignon',
    category: 'Entrée',
    prep_time: 45,
    description: 'La classique soupe à l\'oignon gratinée au gruyère.',
    ingredients: '4 oignons\nBouillon de bœuf (1L)\nBeurre (30g)\nFarine (1 c.s.)\nGruyère râpé\nBaguette\nVin blanc sec\nThym',
  },
  {
    title: 'Poulet rôti',
    category: 'Plat',
    prep_time: 90,
    description: 'Poulet entier rôti avec herbes de provence, ail et beurre.',
    ingredients: '1 poulet entier\nBeurre (50g)\n4 gousses d\'ail\nHerbes de Provence\nSel\nPoivre\nHuile d\'olive',
  },
  {
    title: 'Salade niçoise',
    category: 'Entrée',
    prep_time: 15,
    description: 'Salade fraîche avec thon, œufs durs, tomates et olives.',
    ingredients: 'Thon en boîte\n4 œufs\nTomates cerises\nOlives noires\nSalade verte\nHaricots verts\nAnchois\nVinaigre',
  },
  {
    title: 'Crème brûlée',
    category: 'Dessert',
    prep_time: 40,
    description: 'Crème vanillée avec une croûte de sucre caramélisé croustillante.',
    ingredients: 'Crème liquide (500ml)\n6 jaunes d\'œufs\nSucre (100g)\n1 gousse de vanille\nCassonade',
  },
];

function load(): Recipe[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    const items: Recipe[] = raw ? JSON.parse(raw) : [];
    // Migration : ajoute ingredients si absent
    return items.map((r) => ({ ingredients: '', ...r }));
  } catch {
    return [];
  }
}

function save(recipes: Recipe[]) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(recipes));
}

function nextId(recipes: Recipe[]): number {
  return recipes.length === 0 ? 1 : Math.max(...recipes.map((r) => r.id)) + 1;
}

const INGREDIENT_MAP: Record<string, string> = {
  'Pâtes carbonara': 'Pâtes (400g)\nGuanciale (150g)\n4 jaunes d\'œufs\nPecorino romano\nPoivre noir\nSel',
  'Tarte aux pommes': 'Farine (250g)\nBeurre (125g)\nSucre (80g)\n4 pommes\n1 œuf\nSel\nCanelle',
  'Soupe à l\'oignon': '4 oignons\nBouillon de bœuf (1L)\nBeurre (30g)\nFarine (1 c.s.)\nGruyère râpé\nBaguette\nVin blanc sec\nThym',
  'Poulet rôti': '1 poulet entier\nBeurre (50g)\n4 gousses d\'ail\nHerbes de Provence\nSel\nPoivre\nHuile d\'olive',
  'Salade niçoise': 'Thon en boîte\n4 œufs\nTomates cerises\nOlives noires\nSalade verte\nHaricots verts\nAnchois\nVinaigre',
  'Crème brûlée': 'Crème liquide (500ml)\n6 jaunes d\'œufs\nSucre (100g)\n1 gousse de vanille\nCassonade',
};

export function initDatabase() {
  const existing = load();
  if (existing.length === 0) {
    const seeded = SEED_RECIPES.map((r, i) => ({ ...r, id: i + 1 }));
    save(seeded);
  } else {
    // Migration : remplit les ingrédients manquants
    const updated = existing.map((r) =>
      !r.ingredients && INGREDIENT_MAP[r.title]
        ? { ...r, ingredients: INGREDIENT_MAP[r.title] }
        : r
    );
    save(updated);
  }
}

export function getAllRecipes(): Recipe[] {
  return load().sort((a, b) => a.title.localeCompare(b.title));
}

export function getRecipeById(id: number): Recipe | null {
  return load().find((r) => r.id === id) ?? null;
}

export function addRecipe(recipe: Omit<Recipe, 'id'>): void {
  const recipes = load();
  recipes.push({ ...recipe, id: nextId(recipes) });
  save(recipes);
}

export function deleteRecipe(id: number): void {
  save(load().filter((r) => r.id !== id));
}

// ─── Meal Plan ────────────────────────────────────────────────

const MEAL_PLANS_KEY = 'cuisinator_meal_plans';
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

const SHOPPING_KEY = 'cuisinator_shopping';

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
  const items = loadShopping().map((item) =>
    item.id === id ? { ...item, done: item.done === 1 ? 0 : 1 } : item
  );
  saveShopping(items);
}

export function clearShoppingList(): void {
  saveShopping([]);
}

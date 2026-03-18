import * as SQLite from 'expo-sqlite';

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

const db = SQLite.openDatabaseSync('cuisinator.db');

export function initDatabase() {
  db.execSync(`
    CREATE TABLE IF NOT EXISTS recipes (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      title TEXT NOT NULL,
      category TEXT NOT NULL,
      prep_time INTEGER NOT NULL,
      description TEXT NOT NULL,
      ingredients TEXT NOT NULL DEFAULT ''
    );
  `);

  // Migration : ajoute la colonne ingredients si elle n'existe pas encore
  try {
    db.execSync(`ALTER TABLE recipes ADD COLUMN ingredients TEXT NOT NULL DEFAULT '';`);
  } catch {
    // Colonne déjà présente, on ignore
  }

  db.execSync(`
    CREATE TABLE IF NOT EXISTS meal_plans (
      date TEXT PRIMARY KEY,
      lunch_id INTEGER,
      dinner_id INTEGER
    );
  `);

  db.execSync(`
    CREATE TABLE IF NOT EXISTS shopping_list (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      recipe_name TEXT NOT NULL DEFAULT '',
      done INTEGER NOT NULL DEFAULT 0
    );
  `);

  const count = db.getFirstSync<{ count: number }>('SELECT COUNT(*) as count FROM recipes;');
  if (count?.count === 0) {
    seedDatabase();
  } else {
    migrateIngredients();
  }
}

// Remplit les ingrédients manquants sur les recettes existantes
function migrateIngredients() {
  const updates: Record<string, string> = {
    'Pâtes carbonara': 'Pâtes (400g)\nGuanciale (150g)\n4 jaunes d\'œufs\nPecorino romano\nPoivre noir\nSel',
    'Tarte aux pommes': 'Farine (250g)\nBeurre (125g)\nSucre (80g)\n4 pommes\n1 œuf\nSel\nCanelle',
    'Soupe à l\'oignon': '4 oignons\nBouillon de bœuf (1L)\nBeurre (30g)\nFarine (1 c.s.)\nGruyère râpé\nBaguette\nVin blanc sec\nThym',
    'Poulet rôti': '1 poulet entier\nBeurre (50g)\n4 gousses d\'ail\nHerbes de Provence\nSel\nPoivre\nHuile d\'olive',
    'Salade niçoise': 'Thon en boîte\n4 œufs\nTomates cerises\nOlives noires\nSalade verte\nHaricots verts\nAnchois\nVinaigre',
    'Crème brûlée': 'Crème liquide (500ml)\n6 jaunes d\'œufs\nSucre (100g)\n1 gousse de vanille\nCassonade',
  };

  for (const [title, ingredients] of Object.entries(updates)) {
    db.runSync(
      "UPDATE recipes SET ingredients = ? WHERE title = ? AND (ingredients = '' OR ingredients IS NULL);",
      [ingredients, title]
    );
  }
}

function seedDatabase() {
  const recipes: Omit<Recipe, 'id'>[] = [
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

  for (const recipe of recipes) {
    db.runSync(
      'INSERT INTO recipes (title, category, prep_time, description, ingredients) VALUES (?, ?, ?, ?, ?);',
      [recipe.title, recipe.category, recipe.prep_time, recipe.description, recipe.ingredients]
    );
  }
}

// ─── Recettes ─────────────────────────────────────────────────

export function getAllRecipes(): Recipe[] {
  return db.getAllSync<Recipe>('SELECT * FROM recipes ORDER BY title ASC;');
}

export function getRecipeById(id: number): Recipe | null {
  return db.getFirstSync<Recipe>('SELECT * FROM recipes WHERE id = ?;', [id]) ?? null;
}

export function addRecipe(recipe: Omit<Recipe, 'id'>): void {
  db.runSync(
    'INSERT INTO recipes (title, category, prep_time, description, ingredients) VALUES (?, ?, ?, ?, ?);',
    [recipe.title, recipe.category, recipe.prep_time, recipe.description, recipe.ingredients]
  );
}

export function deleteRecipe(id: number): void {
  db.runSync('DELETE FROM recipes WHERE id = ?;', [id]);
}

// ─── Meal Plan ────────────────────────────────────────────────

export function getMealPlan(date: string): MealPlan {
  const row = db.getFirstSync<{ lunch_id: number | null; dinner_id: number | null }>(
    'SELECT * FROM meal_plans WHERE date = ?;',
    [date]
  );
  return { date, lunch: row?.lunch_id ?? null, dinner: row?.dinner_id ?? null };
}

export function setMeal(date: string, slot: MealSlot, recipeId: number | null): void {
  const current = getMealPlan(date);
  db.runSync(
    'INSERT OR REPLACE INTO meal_plans (date, lunch_id, dinner_id) VALUES (?, ?, ?);',
    [date, slot === 'lunch' ? recipeId : current.lunch, slot === 'dinner' ? recipeId : current.dinner]
  );
}

// ─── Liste de courses ─────────────────────────────────────────

export function getShoppingList(): ShoppingItem[] {
  return db.getAllSync<ShoppingItem>('SELECT * FROM shopping_list ORDER BY recipe_name ASC, id ASC;');
}

export function addToShoppingList(items: { name: string; recipe_name: string }[]): void {
  for (const item of items) {
    db.runSync(
      'INSERT INTO shopping_list (name, recipe_name, done) VALUES (?, ?, 0);',
      [item.name, item.recipe_name]
    );
  }
}

export function toggleShoppingItem(id: number): void {
  db.runSync('UPDATE shopping_list SET done = CASE WHEN done = 1 THEN 0 ELSE 1 END WHERE id = ?;', [id]);
}

export function clearShoppingList(): void {
  db.runSync('DELETE FROM shopping_list;');
}

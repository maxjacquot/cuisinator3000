import * as SQLite from 'expo-sqlite';

export type Recipe = {
  id: number;
  title: string;
  category: string;
  prep_time: number; // minutes
  description: string;
};

const db = SQLite.openDatabaseSync('cuisinator.db');

export function initDatabase() {
  db.execSync(`
    CREATE TABLE IF NOT EXISTS recipes (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      title TEXT NOT NULL,
      category TEXT NOT NULL,
      prep_time INTEGER NOT NULL,
      description TEXT NOT NULL
    );
  `);

  const count = db.getFirstSync<{ count: number }>('SELECT COUNT(*) as count FROM recipes;');
  if (count?.count === 0) {
    seedDatabase();
  }
}

function seedDatabase() {
  const recipes: Omit<Recipe, 'id'>[] = [
    {
      title: 'Pâtes carbonara',
      category: 'Plat',
      prep_time: 20,
      description: 'Des pâtes crémeuses à la guanciale, oeufs et pecorino.',
    },
    {
      title: 'Tarte aux pommes',
      category: 'Dessert',
      prep_time: 60,
      description: 'Une tarte maison avec une pâte brisée et des pommes caramélisées.',
    },
    {
      title: 'Soupe à l\'oignon',
      category: 'Entrée',
      prep_time: 45,
      description: 'La classique soupe à l\'oignon gratinée au gruyère.',
    },
    {
      title: 'Poulet rôti',
      category: 'Plat',
      prep_time: 90,
      description: 'Poulet entier rôti avec herbes de provence, ail et beurre.',
    },
    {
      title: 'Salade niçoise',
      category: 'Entrée',
      prep_time: 15,
      description: 'Salade fraîche avec thon, œufs durs, tomates et olives.',
    },
    {
      title: 'Crème brûlée',
      category: 'Dessert',
      prep_time: 40,
      description: 'Crème vanillée avec une croûte de sucre caramélisé croustillante.',
    },
  ];

  for (const recipe of recipes) {
    db.runSync(
      'INSERT INTO recipes (title, category, prep_time, description) VALUES (?, ?, ?, ?);',
      [recipe.title, recipe.category, recipe.prep_time, recipe.description]
    );
  }
}

export function getAllRecipes(): Recipe[] {
  return db.getAllSync<Recipe>('SELECT * FROM recipes ORDER BY title ASC;');
}

export function getRecipeById(id: number): Recipe | null {
  return db.getFirstSync<Recipe>('SELECT * FROM recipes WHERE id = ?;', [id]) ?? null;
}

export function addRecipe(recipe: Omit<Recipe, 'id'>): void {
  db.runSync(
    'INSERT INTO recipes (title, category, prep_time, description) VALUES (?, ?, ?, ?);',
    [recipe.title, recipe.category, recipe.prep_time, recipe.description]
  );
}

export function deleteRecipe(id: number): void {
  db.runSync('DELETE FROM recipes WHERE id = ?;', [id]);
}

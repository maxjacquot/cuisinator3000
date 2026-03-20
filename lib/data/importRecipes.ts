import type { SeedRecipe } from './recipes';
import type { RecipeStep, StepType } from '../types';

export type ImportResult = {
  imported: number;
  errors: string[];
};

function isValidCategory(cat: unknown): cat is 'Plat' | 'Entrée' | 'Dessert' {
  return cat === 'Plat' || cat === 'Entrée' || cat === 'Dessert';
}

function isValidStepType(t: unknown): t is StepType {
  return t === 'prep' || t === 'cook' || t === 'wait' || t === 'rest';
}

export function parseImportJson(json: string): { recipes: SeedRecipe[]; errors: string[] } {
  const errors: string[] = [];
  let parsed: unknown;

  try {
    parsed = JSON.parse(json);
  } catch {
    return { recipes: [], errors: ['JSON invalide — vérifiez la syntaxe.'] };
  }

  if (!Array.isArray(parsed)) {
    return { recipes: [], errors: ['Le JSON doit être un tableau : [ { ... }, ... ]'] };
  }

  const recipes: SeedRecipe[] = [];

  for (let i = 0; i < parsed.length; i++) {
    const item = parsed[i] as Record<string, unknown>;
    const label = item?.title ? `"${item.title}"` : `Recette ${i + 1}`;

    if (typeof item !== 'object' || item === null) {
      errors.push(`${label} : doit être un objet`);
      continue;
    }

    if (!item.title || typeof item.title !== 'string') {
      errors.push(`${label} : champ "title" manquant`);
      continue;
    }

    if (!isValidCategory(item.category)) {
      errors.push(`${label} : "category" doit être "Plat", "Entrée" ou "Dessert"`);
      continue;
    }

    // Ingrédients : accepte string[] ou string (séparé par \n)
    const ingredients: string[] = Array.isArray(item.ingredients)
      ? (item.ingredients as unknown[]).filter((x): x is string => typeof x === 'string')
      : typeof item.ingredients === 'string'
      ? item.ingredients.split('\n').filter(Boolean)
      : [];

    // Steps : valide chaque étape individuellement
    const steps: RecipeStep[] = Array.isArray(item.steps)
      ? (item.steps as unknown[]).filter((s): s is RecipeStep => {
          if (typeof s !== 'object' || s === null) return false;
          const step = s as Record<string, unknown>;
          return (
            typeof step.label === 'string' &&
            typeof step.instruction === 'string' &&
            typeof step.duration === 'number' &&
            isValidStepType(step.type)
          );
        })
      : [];

    const tags: string[] = Array.isArray(item.tags)
      ? (item.tags as unknown[]).filter((x): x is string => typeof x === 'string')
      : [];

    recipes.push({
      title: item.title as string,
      category: item.category as 'Plat' | 'Entrée' | 'Dessert',
      prep_time: typeof item.prep_time === 'number' ? item.prep_time : 0,
      cook_time: typeof item.cook_time === 'number' ? item.cook_time : 0,
      description: typeof item.description === 'string' ? item.description : '',
      ingredients,
      steps,
      tags,
    });
  }

  return { recipes, errors };
}

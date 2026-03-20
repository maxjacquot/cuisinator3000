export type StepType = 'prep' | 'cook' | 'wait' | 'rest';

export type RecipeStep = {
  label: string;
  instruction: string;
  duration: number; // minutes
  type: StepType;
};

export type Recipe = {
  id: number;
  title: string;
  category: string;
  prep_time: number;
  cook_time: number;
  description: string;
  ingredients: string; // newline-separated
  steps: string;       // JSON: RecipeStep[]
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

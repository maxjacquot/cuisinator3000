import type { RecipeStep } from '../types';

export type SeedRecipe = {
  title: string;
  category: string;
  prep_time: number;
  cook_time: number;
  description: string;
  ingredients: string[];
  steps: RecipeStep[];
  tags: string[];
};

export const SEED_RECIPES: SeedRecipe[] = [
  {
    title: "Falafels maison au air fryer & sauce yaourt ail-citron",
    category: "Plat",
    prep_time: 51,
    cook_time: 15,
    description: "Des falafels maison ultra dorés et croustillants, cuits à l'air fryer pour un résultat léger et savoureux. Servis dans un pain pita avec une sauce au yaourt grec à l'ail et au citron.",
    ingredients: [
      "400 g de pois chiches cuits en boîte, égouttés (environ 14.3 oz)",
      "1 oignon rouge",
      "2 gousses d'ail",
      "20 g de persil frais",
      "1 c. à café de cumin en poudre",
      "1 c. à café de coriandre en poudre",
      "3 c. à soupe de farine",
      "1 c. à soupe d'huile d'olive (pour badigeonner)",
      "Sel & poivre",
      "100 g de yaourt grec",
      "1/2 citron (jus)",
      "2 pains pita",
    ],
    tags: ["végétarien", "fait-maison", "air-fryer", "sandwich"],
    steps: [
      {
        label: "Mixer la pâte",
        instruction:
          "Dans un mixeur, combiner les pois chiches égouttés, l'oignon rouge, les gousses d'ail, le persil frais, le cumin, la coriandre, la farine, le sel et le poivre. Mixer par impulsions jusqu'à obtenir une pâte grossière — pas une purée lisse. Ajuster l'assaisonnement.",
        duration: 5,
        type: "prep",
      },
      {
        label: "Façonner les falafels",
        instruction:
          "Avec les mains légèrement humides, former environ 10 à 12 boulettes d'environ 3 cm de diamètre. Les disposer sur une assiette et placer au réfrigérateur 15 minutes pour qu'elles se tiennent mieux à la cuisson.",
        duration: 18,
        type: "wait",
      },
      {
        label: "Préparer la sauce yaourt",
        instruction:
          "Mélanger le yaourt grec avec le jus d'un demi-citron et une pointe d'ail écrasé. Assaisonner avec sel et poivre. Réserver au frigo jusqu'au service.",
        duration: 3,
        type: "prep",
      },
      {
        label: "Préchauffer le air fryer",
        instruction: "Préchauffer le air fryer à 190 °C pendant 3 minutes.",
        duration: 3,
        type: "wait",
      },
      {
        label: "Cuisson des falafels",
        instruction:
          "Badigeonner les boulettes d'huile d'olive et les déposer dans le panier du air fryer en une seule couche, sans les superposer. Cuire à 190 °C pendant 15 minutes en les retournant à mi-cuisson pour une dorure uniforme.",
        duration: 15,
        type: "cook",
      },
      {
        label: "Assembler & servir",
        instruction:
          "Ouvrir les pains pita et les garnir de falafels chauds, de sauce yaourt ail-citron, de tomates en tranches et de feuilles de roquette.",
        duration: 7,
        type: "prep",
      },
    ],
  },
];

/** Convertit une SeedRecipe en format DB (ingrédients en string, steps en JSON) */
export function toDbFormat(r: SeedRecipe): Omit<import('../types').Recipe, 'id'> {
  return {
    title: r.title,
    category: r.category,
    prep_time: r.prep_time,
    cook_time: r.cook_time,
    description: r.description,
    ingredients: r.ingredients.join('\n'),
    steps: r.steps.length > 0 ? JSON.stringify(r.steps) : '',
    tags: r.tags.length > 0 ? JSON.stringify(r.tags) : '[]',
  };
}

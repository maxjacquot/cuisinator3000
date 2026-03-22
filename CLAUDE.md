# Cuisinator 3000 — Contexte projet

Application mobile de gestion de recettes et de planification de repas, développée avec Expo (React Native).

## Stack technique

- **Framework**: Expo 52 + React Native 0.76 + React 18
- **Routing**: Expo Router 4 (file-based, similaire à Next.js)
- **Base de données**: Expo SQLite (natif iOS/Android) / localStorage (web)
- **Langage**: TypeScript strict
- **Plateformes cibles**: iOS, Android, Web

## Structure du projet

```
app/
  _layout.tsx          # Layout racine + navigation
  index.tsx            # Écran principal (planning 7 jours + tabs)
  recipe/[id].tsx      # Page détail recette
lib/
  database.ts          # Résolveur de module (natif vs web)
  database.native.ts   # Implémentation SQLite (iOS/Android)
  database.web.ts      # Implémentation localStorage (web)
  types.ts             # Types TypeScript centraux
  theme.tsx            # Design system (couleurs, typographie, espacements)
  TabBar.tsx           # Tab bar custom (Courses / Home / Recettes)
  panels/
    RecipesPanel.tsx   # Onglet "Recettes" (recherche, filtres, liste)
    CoursesPanel.tsx   # Onglet "Courses" (liste de courses par rayon)
  AddRecipeModal.tsx   # Formulaire ajout recette
  EditRecipeModal.tsx  # Formulaire édition recette
  ImportModal.tsx      # Import JSON de recettes
  PlanningModal.tsx    # Sélecteur de recette pour le planning
  AppAlert.tsx         # Context/hook pour alertes custom
  data/
    recipes.ts         # Données de seed
    importRecipes.ts   # Validation et import JSON
```

## Schéma de base de données

**`recipes`**
- `id` INTEGER PK AUTOINCREMENT
- `title` TEXT NOT NULL
- `category` TEXT — `'Entrée' | 'Plat' | 'Dessert'`
- `prep_time` INTEGER (minutes)
- `cook_time` INTEGER (minutes, défaut 0)
- `description` TEXT
- `ingredients` TEXT — JSON array de `{qty, unit, name}`
- `steps` TEXT — JSON array de `{label, instruction, duration, type}`
- `tags` TEXT — JSON array de strings

**`meal_plans`**
- `date` TEXT PK — format ISO `YYYY-MM-DD`
- `lunch_id` INTEGER — FK vers recipes.id
- `dinner_id` INTEGER — FK vers recipes.id

**`shopping_list`**
- `id` INTEGER PK AUTOINCREMENT
- `name` TEXT
- `recipe_name` TEXT
- `done` INTEGER — 0 ou 1

## Types principaux (`lib/types.ts`)

```typescript
type StepType = 'prep' | 'cook' | 'wait' | 'rest';

type Ingredient = { qty: number | null; unit: string; name: string };

type RecipeStep = {
  label: string;
  instruction: string;
  duration: number; // minutes
  type: StepType;
};

type Recipe = {
  id: number;
  title: string;
  category: string;
  prep_time: number;
  cook_time: number;
  description: string;
  ingredients: string; // JSON serialisé
  steps: string;       // JSON serialisé
  tags: string;        // JSON serialisé
};
```

## Design system (`lib/theme.tsx`)

- Couleur principale: orange `#FF6B35`
- Fond sombre: anthracite `#1D1D1B`
- Espacement: échelle 8px (xs=4 → xxxxl=48)
- Typographie: xs=11px → xxxl=30px
- Border radius: sm=8 → full=999

## Fonctionnalités principales

1. **Planning 7 jours** — assigner déjeuner/dîner par date (écran principal)
2. **Gestion recettes** — CRUD complet avec catégories et filtres
3. **Liste de courses** — générée depuis le planning, groupée par rayon
4. **Import JSON** — validation + import de recettes depuis fichier

## Scripts npm

```bash
expo start          # dev server
expo start --web    # version web
expo run:android    # build Android
expo run:ios        # build iOS
```

## Notes importantes

- `database.native.ts` et `database.web.ts` ont la même API — Metro choisit le bon fichier selon la plateforme
- `ingredients`, `steps`, `tags` sont stockés en JSON sérialisé dans SQLite — toujours parser avant usage
- L'initialisation de la DB est protégée par un flag `_dbReady` pour éviter les initialisations multiples

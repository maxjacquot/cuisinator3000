import { useState, useCallback } from 'react';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  TextInput,
} from 'react-native';
import { useRouter, useFocusEffect, Stack } from 'expo-router';
import { TabBar } from '../../lib/TabBar';
import { getAllRecipes, type Recipe } from '../../lib/database';
import { colors, typography, spacing, radii, shadows, Badge } from '../../lib/theme';

// ─── Helpers ─────────────────────────────────────────────────

const CATEGORIES = ['Toutes', 'Entrée', 'Plat', 'Dessert'];

const CATEGORY_EMOJI: Record<string, string> = {
  Entrée: '🥗',
  Plat: '🍽️',
  Dessert: '🍰',
};

const EMOJI_BG: Record<string, string> = {
  Entrée: colors.successLight,
  Plat: colors.primaryLight,
  Dessert: colors.primaryLight,
};

function getBadge(recipe: Recipe): { label: string; color: string } {
  if (recipe.prep_time <= 15) return { label: 'Rapide', color: colors.primary };
  if (recipe.category === 'Entrée') return { label: 'Sain', color: colors.success };
  return { label: 'Facile', color: colors.success };
}

// ─── Sous-composant : carte recette ──────────────────────────

interface RecipeCardProps {
  recipe: Recipe;
  onPress: () => void;
}

function RecipeCard({ recipe, onPress }: RecipeCardProps) {
  const emoji = CATEGORY_EMOJI[recipe.category] ?? '🍴';
  const emojiBg = EMOJI_BG[recipe.category] ?? colors.primaryLight;
  const badge = getBadge(recipe);

  return (
    <TouchableOpacity style={styles.card} onPress={onPress} activeOpacity={0.7}>
      <View style={[styles.emojiBox, { backgroundColor: emojiBg }]}>
        <Text style={styles.emojiText}>{emoji}</Text>
      </View>
      <View style={styles.cardBody}>
        <Text style={styles.cardTitle} numberOfLines={1}>{recipe.title}</Text>
        <Text style={styles.cardMeta}>⏱ {recipe.prep_time} min</Text>
        <Badge label={badge.label} color={badge.color} style={styles.badge} />
      </View>
    </TouchableOpacity>
  );
}

// ─── Écran liste des recettes ─────────────────────────────────


export default function RecipesScreen() {
  const router = useRouter();
  const [recipes, setRecipes] = useState<Recipe[]>([]);
  const [search, setSearch] = useState('');
  const [activeCategory, setActiveCategory] = useState('Toutes');

  useFocusEffect(
    useCallback(() => {
      setRecipes(getAllRecipes());
    }, [])
  );

  const filtered = recipes.filter((r) => {
    const matchSearch = r.title.toLowerCase().includes(search.toLowerCase());
    const matchCat = activeCategory === 'Toutes' || r.category === activeCategory;
    return matchSearch && matchCat;
  });

  return (
    <>
      <Stack.Screen
        options={{
          title: 'Mes recettes',
          headerStyle: { backgroundColor: colors.dark },
          headerTintColor: colors.surface,
          headerTitleStyle: { fontWeight: 'bold' },
        }}
      />
      <View style={styles.root}>
        {/* Recherche */}
        <View style={styles.searchContainer}>
          <TextInput
            style={styles.searchInput}
            placeholder="Rechercher une recette..."
            placeholderTextColor={colors.textSecondary}
            value={search}
            onChangeText={setSearch}
          />
        </View>

        {/* Filtres */}
        <View style={styles.filterRow}>
          {CATEGORIES.map((cat) => (
            <TouchableOpacity
              key={cat}
              style={[styles.filterBtn, activeCategory === cat && styles.filterBtnActive]}
              onPress={() => setActiveCategory(cat)}
              activeOpacity={0.7}
            >
              <Text style={[styles.filterText, activeCategory === cat && styles.filterTextActive]}>
                {cat}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* Liste */}
        <FlatList
          data={filtered}
          keyExtractor={(item) => String(item.id)}
          contentContainerStyle={styles.list}
          showsVerticalScrollIndicator={false}
          ListEmptyComponent={
            <Text style={styles.emptyText}>Aucune recette trouvée.</Text>
          }
          renderItem={({ item }) => (
            <RecipeCard
              recipe={item}
              onPress={() => router.push(`/recipe/${item.id}`)}
            />
          )}
        />

        {/* FAB ajout */}
        <TouchableOpacity style={styles.fab} onPress={() => router.push('/add')}>
          <Text style={styles.fabText}>+</Text>
        </TouchableOpacity>

        <TabBar />
      </View>
    </>
  );
}

// ─── Styles ───────────────────────────────────────────────────

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: colors.background,
  },
  searchContainer: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.lg,
    paddingBottom: spacing.sm,
  },
  searchInput: {
    backgroundColor: colors.surface,
    borderRadius: radii.md,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md - 2,
    fontSize: typography.fontSizes.md,
    borderWidth: 1,
    borderColor: colors.border,
    color: colors.textPrimary,
    ...shadows.sm,
  },
  filterRow: {
    flexDirection: 'row',
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.md,
    gap: spacing.sm,
  },
  filterBtn: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs + 2,
    borderRadius: radii.full,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
  },
  filterBtnActive: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  filterText: {
    fontSize: typography.fontSizes.sm,
    color: colors.textSecondary,
    fontWeight: typography.fontWeights.medium,
  },
  filterTextActive: {
    color: colors.surface,
  },
  list: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.xs,
    paddingBottom: 100,
    gap: spacing.md,
  },
  emptyText: {
    textAlign: 'center',
    marginTop: spacing.xxxxl,
    color: colors.textSecondary,
    fontSize: typography.fontSizes.md,
  },
  card: {
    backgroundColor: colors.surface,
    borderRadius: radii.lg,
    flexDirection: 'row',
    alignItems: 'center',
    padding: spacing.md,
    gap: spacing.md,
    ...shadows.md,
  },
  emojiBox: {
    width: 52,
    height: 52,
    borderRadius: radii.md,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  emojiText: {
    fontSize: 26,
  },
  cardBody: {
    flex: 1,
    gap: spacing.xs,
  },
  cardTitle: {
    fontSize: typography.fontSizes.lg,
    fontWeight: typography.fontWeights.bold,
    color: colors.textPrimary,
  },
  cardMeta: {
    fontSize: typography.fontSizes.sm,
    color: colors.textSecondary,
  },
  badge: {
    alignSelf: 'flex-start',
  },
  fab: {
    position: 'absolute',
    bottom: 30,
    right: spacing.xxl,
    width: 54,
    height: 54,
    borderRadius: 27,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    ...shadows.primary,
  },
  fabText: {
    fontSize: 28,
    color: colors.surface,
    lineHeight: 32,
  },
});

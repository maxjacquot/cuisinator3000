import { useState, useEffect } from 'react';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  TextInput,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { getAllRecipes, type Recipe } from '../database';
import { colors, typography, spacing, radii, shadows, Badge } from '../theme';
import { ImportModal } from '../ImportModal';

// ─── Helpers ──────────────────────────────────────────────────

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

// ─── Carte recette ────────────────────────────────────────────

function RecipeCard({ recipe, onPress }: { recipe: Recipe; onPress: () => void }) {
  const emoji = CATEGORY_EMOJI[recipe.category] ?? '🍴';
  const emojiBg = EMOJI_BG[recipe.category] ?? colors.primaryLight;
  const badge = getBadge(recipe);
  return (
    <TouchableOpacity style={s.card} onPress={onPress} activeOpacity={0.7}>
      <View style={[s.emojiBox, { backgroundColor: emojiBg }]}>
        <Text style={s.emojiText}>{emoji}</Text>
      </View>
      <View style={s.cardBody}>
        <Text style={s.cardTitle} numberOfLines={1}>{recipe.title}</Text>
        <View style={s.cardMetaRow}>
          {recipe.cook_time > 0 ? (
            <>
              <Text style={s.cardMeta}>🔪 {recipe.prep_time - recipe.cook_time} min</Text>
              <Text style={s.cardMetaSep}>·</Text>
              <Text style={[s.cardMeta, s.cardMetaCook]}>🔥 {recipe.cook_time} min</Text>
            </>
          ) : (
            <Text style={s.cardMeta}>⏱ {recipe.prep_time} min</Text>
          )}
        </View>
        <Badge label={badge.label} color={badge.color} style={s.badge} />
      </View>
    </TouchableOpacity>
  );
}

// ─── Panneau Recettes ─────────────────────────────────────────

interface RecipesPanelProps {
  width: number;
  isFocused: boolean;
  focusKey: number;
}

export function RecipesPanel({ width, isFocused, focusKey }: RecipesPanelProps) {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const [recipes, setRecipes] = useState<Recipe[]>([]);
  const [search, setSearch] = useState('');
  const [activeCategory, setActiveCategory] = useState('Toutes');
  const [importVisible, setImportVisible] = useState(false);

  useEffect(() => {
    if (isFocused) setRecipes(getAllRecipes());
  }, [isFocused, focusKey]);

  const filtered = recipes.filter((r) => {
    const matchSearch = r.title.toLowerCase().includes(search.toLowerCase());
    const matchCat = activeCategory === 'Toutes' || r.category === activeCategory;
    return matchSearch && matchCat;
  });

  return (
    <View style={[s.root, { width }]} pointerEvents={isFocused ? 'auto' : 'none'}>
      {/* Header */}
      <View style={[s.header, { paddingTop: insets.top + spacing.xl }]}>
        <Text style={s.headerTitle}>Mes recettes</Text>
        <TouchableOpacity
          style={s.importBtn}
          onPress={() => setImportVisible(true)}
          activeOpacity={0.7}
        >
          <Text style={s.importBtnText}>＋ Importer</Text>
        </TouchableOpacity>
      </View>

      <ImportModal
        visible={importVisible}
        onClose={() => setImportVisible(false)}
        onImported={() => {
          setImportVisible(false);
          setRecipes(getAllRecipes());
        }}
      />

      {/* Recherche */}
      <View style={s.searchContainer}>
        <TextInput
          style={s.searchInput}
          placeholder="Rechercher une recette..."
          placeholderTextColor={colors.textSecondary}
          value={search}
          onChangeText={setSearch}
        />
      </View>

      {/* Filtres */}
      <View style={s.filterRow}>
        {CATEGORIES.map((cat) => (
          <TouchableOpacity
            key={cat}
            style={[s.filterBtn, activeCategory === cat && s.filterBtnActive]}
            onPress={() => setActiveCategory(cat)}
            activeOpacity={0.7}
          >
            <Text style={[s.filterText, activeCategory === cat && s.filterTextActive]}>
              {cat}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* Liste */}
      <FlatList
        data={filtered}
        keyExtractor={(item) => String(item.id)}
        contentContainerStyle={s.list}
        showsVerticalScrollIndicator={false}
        ListEmptyComponent={<Text style={s.emptyText}>Aucune recette trouvée.</Text>}
        renderItem={({ item }) => (
          <RecipeCard
            recipe={item}
            onPress={() => router.push(`/recipe/${item.id}`)}
          />
        )}
      />

    </View>
  );
}

// ─── Styles ───────────────────────────────────────────────────

const s = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: colors.background,
  },
  header: {
    backgroundColor: colors.dark,
    paddingHorizontal: spacing.xl,
    paddingBottom: spacing.xl,
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'space-between',
  },
  headerTitle: {
    fontSize: typography.fontSizes.xxl,
    fontWeight: typography.fontWeights.extraBold,
    color: colors.surface,
    letterSpacing: -0.5,
  },
  importBtn: {
    backgroundColor: colors.primary,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs + 2,
    borderRadius: radii.full,
    marginBottom: 2,
  },
  importBtnText: {
    color: colors.surface,
    fontSize: typography.fontSizes.sm,
    fontWeight: typography.fontWeights.semiBold,
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
    paddingBottom: 80,
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
  emojiText: { fontSize: 26 },
  cardBody: { flex: 1, gap: spacing.xs },
  cardTitle: {
    fontSize: typography.fontSizes.lg,
    fontWeight: typography.fontWeights.bold,
    color: colors.textPrimary,
  },
  cardMetaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  cardMeta: {
    fontSize: typography.fontSizes.sm,
    color: colors.textSecondary,
  },
  cardMetaSep: {
    fontSize: typography.fontSizes.sm,
    color: colors.border,
  },
  cardMetaCook: {
    color: '#E53E3E',
  },
  badge: { alignSelf: 'flex-start' },
});

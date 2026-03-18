import { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  Modal,
  FlatList,
  SafeAreaView,
  // Alert gardé pour la modale ingrédients
} from 'react-native';
import { useLocalSearchParams, useRouter, useNavigation } from 'expo-router';
import {
  getRecipeById,
  deleteRecipe,
  addToShoppingList,
  getShoppingList,
  type Recipe,
} from '../../lib/database';
import { colors, typography, spacing, radii, shadows } from '../../lib/theme';

const CATEGORY_COLORS: Record<string, string> = {
  Entrée: '#4CAF50',
  Plat: '#FF6B35',
  Dessert: '#9C27B0',
};

// ─── Modale sélection ingrédients ────────────────────────────

interface IngredientsModalProps {
  visible: boolean;
  recipe: Recipe;
  onClose: () => void;
  onAdd: (selected: string[]) => void;
}

function IngredientsModal({ visible, recipe, onClose, onAdd }: IngredientsModalProps) {
  const allIngredients = recipe.ingredients
    .split('\n')
    .map((s) => s.trim())
    .filter(Boolean);

  // Tous cochés par défaut (true = à ajouter)
  const [checked, setChecked] = useState<Record<number, boolean>>({});
  const [existingCounts, setExistingCounts] = useState<Record<string, number>>({});

  useEffect(() => {
    const initial: Record<number, boolean> = {};
    allIngredients.forEach((_, i) => { initial[i] = true; });
    setChecked(initial);

    // Compte combien de fois chaque ingrédient est déjà dans la liste
    const list = getShoppingList();
    const counts: Record<string, number> = {};
    for (const item of list) {
      const key = item.name.toLowerCase().trim();
      counts[key] = (counts[key] ?? 0) + 1;
    }
    setExistingCounts(counts);
  }, [recipe.id]);

  function toggle(index: number) {
    setChecked((prev) => ({ ...prev, [index]: !prev[index] }));
  }

  function handleAdd() {
    const selected = allIngredients.filter((_, i) => checked[i]);
    if (selected.length === 0) {
      Alert.alert('Aucun ingrédient sélectionné');
      return;
    }
    onAdd(selected);
  }

  const selectedCount = allIngredients.filter((_, i) => checked[i]).length;

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet" onRequestClose={onClose}>
      <SafeAreaView style={modal.root}>
        {/* Header */}
        <View style={modal.header}>
          <View>
            <Text style={modal.title}>Ajouter aux courses</Text>
            <Text style={modal.subtitle}>{recipe.title}</Text>
          </View>
          <TouchableOpacity onPress={onClose} style={modal.closeBtn}>
            <Text style={modal.closeBtnText}>✕</Text>
          </TouchableOpacity>
        </View>

        <Text style={modal.hint}>Décochez les ingrédients que vous avez déjà.</Text>

        {/* Liste ingrédients */}
        <FlatList
          data={allIngredients}
          keyExtractor={(_, i) => String(i)}
          contentContainerStyle={modal.list}
          renderItem={({ item, index }) => {
            const count = existingCounts[item.toLowerCase().trim()] ?? 0;
            return (
              <TouchableOpacity
                style={modal.item}
                onPress={() => toggle(index)}
                activeOpacity={0.7}
              >
                <View style={[modal.checkbox, checked[index] && modal.checkboxActive]}>
                  {checked[index] && <Text style={modal.checkmark}>✓</Text>}
                </View>
                <Text style={[modal.itemText, !checked[index] && modal.itemTextOff]}>
                  {item}
                </Text>
                {count > 0 && (
                  <View style={modal.countBadge}>
                    <Text style={modal.countBadgeText}>×{count}</Text>
                  </View>
                )}
              </TouchableOpacity>
            );
          }}
        />

        {/* Bouton confirmer */}
        <View style={modal.footer}>
          <TouchableOpacity style={modal.addBtn} onPress={handleAdd} activeOpacity={0.85}>
            <Text style={modal.addBtnText}>
              Ajouter {selectedCount} ingrédient{selectedCount > 1 ? 's' : ''} à la liste
            </Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    </Modal>
  );
}

// ─── Écran détail recette ─────────────────────────────────────

export default function RecipeScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const navigation = useNavigation();
  const [recipe, setRecipe] = useState<Recipe | null>(null);
  const [modalVisible, setModalVisible] = useState(false);

  useEffect(() => {
    if (id) {
      const r = getRecipeById(Number(id));
      setRecipe(r);
      if (r) navigation.setOptions({ title: r.title });
    }
  }, [id]);

  function handleDelete() {
    deleteRecipe(Number(id));
    router.back();
  }

  function handleAddToShopping(selected: string[]) {
    if (!recipe) return;
    addToShoppingList(selected.map((name) => ({ name, recipe_name: recipe.title })));
    setModalVisible(false);
    Alert.alert('✓ Ajouté !', `${selected.length} ingrédient${selected.length > 1 ? 's' : ''} ajouté${selected.length > 1 ? 's' : ''} à ta liste de courses.`);
  }

  if (!recipe) {
    return (
      <View style={styles.centered}>
        <Text style={styles.notFound}>Recette introuvable.</Text>
      </View>
    );
  }

  const ingredients = recipe.ingredients
    .split('\n')
    .map((s) => s.trim())
    .filter(Boolean);

  return (
    <>
      <ScrollView style={styles.container} contentContainerStyle={styles.content}>
        {/* Badges */}
        <View style={styles.metaRow}>
          <View style={[styles.categoryBadge, { backgroundColor: CATEGORY_COLORS[recipe.category] ?? '#888' }]}>
            <Text style={styles.categoryText}>{recipe.category}</Text>
          </View>
          <View style={styles.timeBadge}>
            <Text style={styles.timeText}>⏱ {recipe.prep_time} min</Text>
          </View>
        </View>

        {/* Titre */}
        <Text style={styles.title}>{recipe.title}</Text>
        <View style={styles.divider} />

        {/* Description */}
        <Text style={styles.sectionLabel}>Description</Text>
        <Text style={styles.description}>{recipe.description}</Text>

        {/* Ingrédients */}
        {ingredients.length > 0 && (
          <>
            <View style={styles.divider} />
            <Text style={styles.sectionLabel}>Ingrédients</Text>
            <View style={styles.ingredientsList}>
              {ingredients.map((ing, i) => (
                <View key={i} style={styles.ingredientRow}>
                  <View style={styles.ingredientDot} />
                  <Text style={styles.ingredientText}>{ing}</Text>
                </View>
              ))}
            </View>

            {/* Bouton ajouter aux courses */}
            <TouchableOpacity
              style={styles.shoppingBtn}
              onPress={() => setModalVisible(true)}
              activeOpacity={0.85}
            >
              <Text style={styles.shoppingBtnText}>🛒  Ajouter aux courses</Text>
            </TouchableOpacity>
          </>
        )}

        {/* Supprimer recette */}
        <TouchableOpacity style={styles.deleteBtn} onPress={handleDelete}>
          <Text style={styles.deleteBtnText}>Supprimer la recette</Text>
        </TouchableOpacity>
      </ScrollView>

      {/* Modale ingrédients */}
      {modalVisible && (
        <IngredientsModal
          visible={modalVisible}
          recipe={recipe}
          onClose={() => setModalVisible(false)}
          onAdd={handleAddToShopping}
        />
      )}
    </>
  );
}

// ─── Styles ───────────────────────────────────────────────────

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  content: {
    padding: spacing.xl,
    paddingBottom: 60,
  },
  centered: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  notFound: {
    color: colors.textSecondary,
    fontSize: typography.fontSizes.md,
  },
  metaRow: {
    flexDirection: 'row',
    gap: spacing.sm,
    marginBottom: spacing.md,
  },
  categoryBadge: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    borderRadius: radii.full,
  },
  categoryText: {
    color: colors.surface,
    fontWeight: typography.fontWeights.bold,
    fontSize: typography.fontSizes.sm,
  },
  timeBadge: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    borderRadius: radii.full,
    backgroundColor: colors.background,
    borderWidth: 1,
    borderColor: colors.border,
  },
  timeText: {
    color: colors.textSecondary,
    fontWeight: typography.fontWeights.semiBold,
    fontSize: typography.fontSizes.sm,
  },
  title: {
    fontSize: 28,
    fontWeight: typography.fontWeights.extraBold,
    color: colors.textPrimary,
    marginBottom: spacing.lg,
    lineHeight: 34,
  },
  divider: {
    height: 1,
    backgroundColor: colors.border,
    marginVertical: spacing.xl,
  },
  sectionLabel: {
    fontSize: typography.fontSizes.xs,
    fontWeight: typography.fontWeights.bold,
    color: colors.primary,
    textTransform: 'uppercase',
    letterSpacing: 1,
    marginBottom: spacing.md,
  },
  description: {
    fontSize: typography.fontSizes.md,
    color: colors.textPrimary,
    lineHeight: typography.lineHeights.relaxed,
  },
  ingredientsList: {
    gap: spacing.sm,
  },
  ingredientRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  ingredientDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: colors.primary,
    flexShrink: 0,
  },
  ingredientText: {
    fontSize: typography.fontSizes.md,
    color: colors.textPrimary,
  },
  shoppingBtn: {
    marginTop: spacing.xl,
    backgroundColor: colors.dark,
    borderRadius: radii.lg,
    paddingVertical: spacing.lg,
    alignItems: 'center',
    ...shadows.md,
  },
  shoppingBtnText: {
    color: colors.surface,
    fontSize: typography.fontSizes.md,
    fontWeight: typography.fontWeights.bold,
  },
  deleteBtn: {
    marginTop: spacing.xxxxl,
    paddingVertical: spacing.md,
    borderRadius: radii.md,
    backgroundColor: '#FEE2E2',
    alignItems: 'center',
  },
  deleteBtnText: {
    color: '#DC2626',
    fontWeight: typography.fontWeights.bold,
    fontSize: typography.fontSizes.md,
  },
});

// Styles modale
const modal = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: colors.background,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.xl,
    paddingTop: spacing.xl,
    paddingBottom: spacing.lg,
    backgroundColor: colors.dark,
  },
  title: {
    fontSize: typography.fontSizes.xl,
    fontWeight: typography.fontWeights.extraBold,
    color: colors.surface,
  },
  subtitle: {
    fontSize: typography.fontSizes.sm,
    color: colors.textSecondary,
    marginTop: spacing.xs,
  },
  closeBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: 'rgba(255,255,255,0.1)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  closeBtnText: {
    color: colors.surface,
    fontSize: 16,
    fontWeight: typography.fontWeights.bold,
  },
  hint: {
    fontSize: typography.fontSizes.sm,
    color: colors.textSecondary,
    paddingHorizontal: spacing.xl,
    paddingVertical: spacing.lg,
    fontStyle: 'italic',
  },
  list: {
    paddingHorizontal: spacing.lg,
    gap: spacing.xs,
    paddingBottom: spacing.lg,
  },
  item: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderRadius: radii.md,
    padding: spacing.lg,
    gap: spacing.md,
    ...shadows.sm,
  },
  itemText: {
    fontSize: typography.fontSizes.md,
    color: colors.textPrimary,
    flex: 1,
  },
  itemTextOff: {
    color: colors.textSecondary,
    textDecorationLine: 'line-through',
  },
  countBadge: {
    backgroundColor: colors.primaryLight,
    borderRadius: radii.full,
    paddingHorizontal: spacing.sm,
    paddingVertical: 2,
    borderWidth: 1,
    borderColor: colors.primary + '55',
  },
  countBadgeText: {
    fontSize: typography.fontSizes.xs,
    fontWeight: typography.fontWeights.bold,
    color: colors.primary,
  },
  footer: {
    padding: spacing.xl,
    borderTopWidth: 1,
    borderTopColor: colors.border,
    backgroundColor: colors.surface,
  },
  addBtn: {
    backgroundColor: colors.primary,
    borderRadius: radii.lg,
    paddingVertical: spacing.lg,
    alignItems: 'center',
    ...shadows.primary,
  },
  addBtnText: {
    color: colors.surface,
    fontSize: typography.fontSizes.md,
    fontWeight: typography.fontWeights.extraBold,
  },
});

import { useCallback, useState } from 'react';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  StyleSheet,
} from 'react-native';
import { useFocusEffect, Stack } from 'expo-router';
import {
  getShoppingList,
  toggleShoppingItem,
  clearShoppingList,
} from '../../lib/database';
import type { ShoppingItem } from '../../lib/database';
import { colors, typography, spacing, radii, shadows } from '../../lib/theme';
import { TabBar } from '../../lib/TabBar';

// ─── Rayons supermarché ───────────────────────────────────────

const RAYONS: { label: string; emoji: string; keywords: string[] }[] = [
  {
    label: 'Fruits & Légumes',
    emoji: '🥦',
    keywords: ['pomme', 'tomate', 'oignon', 'salade', 'haricot', 'ail', 'thym', 'herbe', 'carotte', 'légume', 'fruit', 'poireau', 'courgette', 'champignon', 'citron', 'persil', 'basilic'],
  },
  {
    label: 'Viandes & Poissons',
    emoji: '🥩',
    keywords: ['poulet', 'guanciale', 'thon', 'anchois', 'viande', 'poisson', 'bœuf', 'porc', 'lardon', 'jambon', 'saumon', 'crevette', 'merlan'],
  },
  {
    label: 'Produits laitiers',
    emoji: '🧀',
    keywords: ['beurre', 'crème', 'œuf', 'oeuf', 'gruyère', 'pecorino', 'fromage', 'lait', 'yaourt', 'parmesan', 'mozzarella', 'ricotta', 'comté'],
  },
  {
    label: 'Boulangerie',
    emoji: '🥖',
    keywords: ['baguette', 'pain', 'brioche', 'farine'],
  },
  {
    label: 'Épicerie',
    emoji: '🫙',
    keywords: ['pâte', 'sucre', 'sel', 'poivre', 'huile', 'vinaigre', 'bouillon', 'cassonade', 'vanille', 'canelle', 'moutarde', 'sauce', 'riz', 'lentille', 'fécule', 'levure', 'chocolat', 'miel'],
  },
  {
    label: 'Boissons',
    emoji: '🍷',
    keywords: ['vin', 'jus', 'eau', 'bière', 'cidre'],
  },
];

const RAYON_AUTRE = { label: 'Autres', emoji: '🛒' };

function getRayon(name: string): string {
  const lower = name.toLowerCase();
  for (const rayon of RAYONS) {
    if (rayon.keywords.some((kw) => lower.includes(kw))) return rayon.label;
  }
  return RAYON_AUTRE.label;
}

function getRayonEmoji(label: string): string {
  return RAYONS.find((r) => r.label === label)?.emoji ?? RAYON_AUTRE.emoji;
}

// ─── Groupement générique ─────────────────────────────────────

type Group = { title: string; emoji: string; items: ShoppingItem[] };

function groupByRecipe(items: ShoppingItem[]): Group[] {
  const map = new Map<string, ShoppingItem[]>();
  for (const item of items) {
    const key = item.recipe_name || 'Autre';
    if (!map.has(key)) map.set(key, []);
    map.get(key)!.push(item);
  }
  return Array.from(map.entries()).map(([title, items]) => ({ title, emoji: '🍽️', items }));
}

function groupByRayon(items: ShoppingItem[]): Group[] {
  const map = new Map<string, ShoppingItem[]>();
  for (const item of items) {
    const key = getRayon(item.name);
    if (!map.has(key)) map.set(key, []);
    map.get(key)!.push(item);
  }
  // Ordre fixe des rayons + Autres en dernier
  const ordered: Group[] = [];
  for (const rayon of RAYONS) {
    if (map.has(rayon.label)) {
      ordered.push({ title: rayon.label, emoji: rayon.emoji, items: map.get(rayon.label)! });
    }
  }
  if (map.has(RAYON_AUTRE.label)) {
    ordered.push({ title: RAYON_AUTRE.label, emoji: RAYON_AUTRE.emoji, items: map.get(RAYON_AUTRE.label)! });
  }
  return ordered;
}

// ─── Écran Courses ────────────────────────────────────────────

type ViewMode = 'recette' | 'rayon';

export default function CoursesScreen() {
  const [items, setItems] = useState<ShoppingItem[]>([]);
  const [viewMode, setViewMode] = useState<ViewMode>('recette');

  const loadData = useCallback(() => {
    setItems(getShoppingList());
  }, []);

  useFocusEffect(loadData);

  function handleToggle(id: number) {
    toggleShoppingItem(id);
    loadData();
  }

  function handleClearAll() {
    clearShoppingList();
    loadData();
  }

  const groups = viewMode === 'recette' ? groupByRecipe(items) : groupByRayon(items);
  const doneCount = items.filter((i) => i.done === 1).length;

  return (
    <>
      <Stack.Screen options={{ headerShown: false }} />
      <View style={styles.root}>
        {/* Header */}
        <View style={styles.header}>
          <View style={styles.headerTop}>
            <View>
              <Text style={styles.headerTitle}>🛒 Courses</Text>
              {items.length > 0 && (
                <Text style={styles.headerSub}>{doneCount}/{items.length} dans le panier</Text>
              )}
            </View>
            {items.length > 0 && (
              <TouchableOpacity style={styles.clearBtn} onPress={handleClearAll} activeOpacity={0.7}>
                <Text style={styles.clearBtnText}>Tout supprimer</Text>
              </TouchableOpacity>
            )}
          </View>

          {/* Toggle vue */}
          {items.length > 0 && (
            <View style={styles.toggle}>
              <TouchableOpacity
                style={[styles.toggleBtn, viewMode === 'recette' && styles.toggleBtnActive]}
                onPress={() => setViewMode('recette')}
                activeOpacity={0.8}
              >
                <Text style={[styles.toggleText, viewMode === 'recette' && styles.toggleTextActive]}>
                  Par recette
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.toggleBtn, viewMode === 'rayon' && styles.toggleBtnActive]}
                onPress={() => setViewMode('rayon')}
                activeOpacity={0.8}
              >
                <Text style={[styles.toggleText, viewMode === 'rayon' && styles.toggleTextActive]}>
                  Par rayon
                </Text>
              </TouchableOpacity>
            </View>
          )}
        </View>

        {/* Liste */}
        {items.length === 0 ? (
          <View style={styles.emptyState}>
            <Text style={styles.emptyIcon}>🛍️</Text>
            <Text style={styles.emptyTitle}>Liste vide</Text>
            <Text style={styles.emptySub}>
              Ouvre une recette et appuie sur{'\n'}"Ajouter aux courses"
            </Text>
          </View>
        ) : (
          <FlatList
            data={groups}
            keyExtractor={(group) => group.title}
            contentContainerStyle={styles.list}
            showsVerticalScrollIndicator={false}
            renderItem={({ item: group }) => (
              <View style={styles.group}>
                <View style={styles.groupHeader}>
                  <Text style={styles.groupEmoji}>{group.emoji}</Text>
                  <Text style={styles.groupTitle}>{group.title}</Text>
                  <Text style={styles.groupCount}>{group.items.length}</Text>
                </View>

                <View style={styles.groupItems}>
                  {group.items.map((item) => (
                    <TouchableOpacity
                      key={item.id}
                      style={styles.item}
                      onPress={() => handleToggle(item.id)}
                      activeOpacity={0.7}
                    >
                      <View style={[styles.checkbox, item.done === 1 && styles.checkboxDone]}>
                        {item.done === 1 && <Text style={styles.checkmark}>✓</Text>}
                      </View>
                      <View style={styles.itemBody}>
                        <Text style={[styles.itemName, item.done === 1 && styles.itemNameDone]}>
                          {item.name}
                        </Text>
                        {viewMode === 'rayon' && item.recipe_name ? (
                          <Text style={styles.itemRecipe}>{item.recipe_name}</Text>
                        ) : null}
                      </View>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>
            )}
          />
        )}

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

  // Header
  header: {
    backgroundColor: colors.dark,
    paddingTop: spacing.xxxxl,
    paddingBottom: spacing.lg,
    paddingHorizontal: spacing.xl,
    gap: spacing.lg,
  },
  headerTop: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  headerTitle: {
    fontSize: typography.fontSizes.xxl,
    fontWeight: typography.fontWeights.extraBold,
    color: colors.surface,
  },
  headerSub: {
    fontSize: typography.fontSizes.sm,
    color: colors.textSecondary,
    marginTop: spacing.xs,
  },
  clearBtn: {
    backgroundColor: '#FEE2E2',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: radii.full,
  },
  clearBtnText: {
    fontSize: typography.fontSizes.sm,
    fontWeight: typography.fontWeights.semiBold,
    color: '#DC2626',
  },

  // Toggle
  toggle: {
    flexDirection: 'row',
    backgroundColor: 'rgba(255,255,255,0.08)',
    borderRadius: radii.full,
    padding: 3,
  },
  toggleBtn: {
    flex: 1,
    paddingVertical: spacing.sm,
    borderRadius: radii.full,
    alignItems: 'center',
  },
  toggleBtnActive: {
    backgroundColor: colors.primary,
  },
  toggleText: {
    fontSize: typography.fontSizes.sm,
    fontWeight: typography.fontWeights.semiBold,
    color: colors.textSecondary,
  },
  toggleTextActive: {
    color: colors.surface,
  },

  // Liste
  list: {
    padding: spacing.lg,
    gap: spacing.lg,
    paddingBottom: spacing.xxxxl,
  },

  // Groupe
  group: {
    backgroundColor: colors.surface,
    borderRadius: radii.lg,
    overflow: 'hidden',
    ...shadows.md,
  },
  groupHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    backgroundColor: colors.background,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  groupEmoji: {
    fontSize: 16,
  },
  groupTitle: {
    flex: 1,
    fontSize: typography.fontSizes.sm,
    fontWeight: typography.fontWeights.bold,
    color: colors.textPrimary,
    textTransform: 'uppercase',
    letterSpacing: 0.6,
  },
  groupCount: {
    fontSize: typography.fontSizes.xs,
    fontWeight: typography.fontWeights.bold,
    color: colors.textSecondary,
    backgroundColor: colors.border,
    paddingHorizontal: spacing.sm,
    paddingVertical: 2,
    borderRadius: radii.full,
    overflow: 'hidden',
  },
  groupItems: {
    paddingVertical: spacing.xs,
  },

  // Item
  item: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    gap: spacing.md,
  },
  checkbox: {
    width: 24,
    height: 24,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  checkboxDone: {
    backgroundColor: colors.success,
    borderColor: colors.success,
  },
  checkmark: {
    fontSize: 13,
    color: colors.surface,
    fontWeight: typography.fontWeights.bold,
  },
  itemBody: {
    flex: 1,
  },
  itemName: {
    fontSize: typography.fontSizes.md,
    color: colors.textPrimary,
  },
  itemNameDone: {
    color: colors.textSecondary,
    textDecorationLine: 'line-through',
  },
  itemRecipe: {
    fontSize: typography.fontSizes.xs,
    color: colors.textSecondary,
    marginTop: 1,
  },

  // État vide
  emptyState: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.md,
    paddingBottom: spacing.xxxxl,
  },
  emptyIcon: {
    fontSize: 56,
  },
  emptyTitle: {
    fontSize: typography.fontSizes.xl,
    fontWeight: typography.fontWeights.bold,
    color: colors.textPrimary,
  },
  emptySub: {
    fontSize: typography.fontSizes.md,
    color: colors.textSecondary,
    textAlign: 'center',
    lineHeight: typography.lineHeights.normal,
  },
});

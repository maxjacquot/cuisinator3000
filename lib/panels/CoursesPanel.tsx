import { useState, useEffect } from 'react';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  StyleSheet,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import {
  getShoppingList,
  toggleShoppingItem,
  clearShoppingList,
  deleteShoppingItemsByIds,
} from '../database';
import type { ShoppingItem } from '../database';
import { colors, typography, spacing, radii, shadows } from '../theme';
import { useAppAlert } from '../AppAlert';

// ─── Rayons supermarché ───────────────────────────────────────

const RAYONS: { label: string; emoji: string; keywords: string[] }[] = [
  {
    label: 'Fruits & Légumes',
    emoji: '🥦',
    keywords: [
      // Légumes
      'tomate', 'oignon', 'échalote', 'ail', 'carotte', 'poireau', 'courgette', 'champignon',
      'poivron', 'aubergine', 'brocoli', 'épinard', 'chou', 'céleri', 'artichaut', 'asperge',
      'betterave', 'concombre', 'fenouil', 'navet', 'radis', 'patate douce', 'pomme de terre',
      'potiron', 'potimarron', 'butternut', 'courge', 'maïs', 'petit pois', 'endive', 'laitue',
      'roquette', 'mâche', 'avocat', 'haricot', 'pois chiche', 'fève',
      // Herbes fraîches
      'persil', 'basilic', 'ciboulette', 'menthe',
      // Fruits
      'pomme', 'poire', 'banane', 'fraise', 'framboise', 'cerise', 'abricot', 'pêche', 'prune',
      'raisin', 'orange', 'citron', 'ananas', 'mangue', 'kiwi', 'melon', 'figue', 'myrtille',
      'fruit', 'légume', 'salade',
    ],
  },
  {
    label: 'Viandes',
    emoji: '🥩',
    keywords: ['poulet', 'guanciale', 'viande', 'bœuf', 'porc', 'lardon', 'jambon', 'veau', 'agneau', 'canard', 'dinde'],
  },
  {
    label: 'Poissons & Fruits de mer',
    emoji: '🐟',
    keywords: ['thon', 'anchois', 'poisson', 'saumon', 'crevette', 'merlan', 'cabillaud', 'moule', 'calmar', 'seiche'],
  },
  {
    label: 'Produits laitiers',
    emoji: '🧀',
    keywords: ['beurre', 'crème', 'œuf', 'oeuf', 'gruyère', 'pecorino', 'fromage', 'lait', 'yaourt', 'parmesan', 'mozzarella', 'ricotta', 'comté'],
  },
  {
    label: 'Boulangerie',
    emoji: '🥖',
    keywords: ['baguette', 'pain', 'brioche'],
  },
  {
    label: 'Épicerie',
    emoji: '🌾',
    keywords: ['pâte', 'farine', 'sucre', 'sel', 'poivre', 'huile', 'vinaigre', 'bouillon', 'cassonade', 'moutarde', 'sauce', 'riz', 'lentille', 'fécule', 'levure', 'chocolat', 'miel'],
  },
  {
    label: 'Épices',
    emoji: '🌶️',
    keywords: [
      // Épices
      'cumin', 'curcuma', 'curry', 'paprika', 'cannelle', 'vanille', 'cardamome', 'coriandre',
      'gingembre', 'piment', 'safran', 'muscade', 'anis', 'clou de girofle', 'fenugrec',
      // Herbes séchées
      'thym', 'romarin', 'laurier', 'origan', 'sauge', 'estragon', 'aneth', 'herbe de provence',
    ],
  },
  {
    label: 'Cuisine du monde',
    emoji: '🌍',
    keywords: [
      // Asiatique — sauces & condiments
      'soja', 'nuoc mam', 'miso', 'hoisin', 'teriyaki', 'oyster', 'sriracha', 'sambal',
      'mirin', 'saké', 'vinaigre de riz', 'huile de sésame', 'pâte de curry', 'wasabi', 'tahini',
      // Asiatique — produits secs
      'nouille', 'vermicelle de riz', 'soba', 'udon', 'ramen', 'galette de riz', 'feuille de riz',
      'lait de coco', 'crème de coco', 'pâte de tamarin', 'tofu',
      // Mexicain / Tex-Mex
      'tortilla', 'nachos', 'jalapeño', 'guacamole', 'salsa', 'haricot noir', 'haricot rouge',
      // Moyen-Orient
      'houmous', 'pita', 'chapati', 'naan', 'semoule', 'couscous', 'boulgour',
      // Autres
      'kimchi', 'tempeh', 'edamame',
    ],
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
  const isFresh = lower.includes('fraîch') || lower.includes('frais');
  for (const rayon of RAYONS) {
    if (rayon.keywords.some((kw) => lower.includes(kw))) {
      if (isFresh && rayon.label === 'Épices') return 'Fruits & Légumes';
      return rayon.label;
    }
  }
  return RAYON_AUTRE.label;
}

// ─── Groupement ───────────────────────────────────────────────

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

// ─── Panneau Courses ──────────────────────────────────────────

type ViewMode = 'recette' | 'rayon';

interface CoursesPanelProps {
  width: number;
  isFocused: boolean;
  focusKey: number;
}

export function CoursesPanel({ width, isFocused, focusKey }: CoursesPanelProps) {
  const insets = useSafeAreaInsets();
  const [items, setItems] = useState<ShoppingItem[]>([]);
  const [viewMode, setViewMode] = useState<ViewMode>('recette');
  const { showAlert, AlertComponent } = useAppAlert();

  useEffect(() => {
    if (isFocused) setItems(getShoppingList());
  }, [isFocused, focusKey]);

  function handleToggle(id: number) {
    toggleShoppingItem(id);
    setItems(getShoppingList());
  }

  function handleClearAll() {
    showAlert({
      title: 'Vider la liste ?',
      message: 'Tous les articles de ta liste de courses vont être supprimés.',
      buttons: [
        { text: 'Annuler', style: 'cancel' },
        {
          text: 'Vider la liste',
          style: 'destructive',
          onPress: () => {
            clearShoppingList();
            setItems([]);
          },
        },
      ],
    });
  }

  function handleDeleteGroup(groupItems: ShoppingItem[]) {
    deleteShoppingItemsByIds(groupItems.map((i) => i.id));
    setItems(getShoppingList());
  }

  const groups = viewMode === 'recette' ? groupByRecipe(items) : groupByRayon(items);
  const doneCount = items.filter((i) => i.done === 1).length;

  return (
    <View style={[s.root, { width }]} pointerEvents={isFocused ? 'auto' : 'none'}>
      {/* Header */}
      <View style={[s.header, { paddingTop: insets.top + spacing.xl }]}>
        <View style={s.headerTop}>
          <View>
            <Text style={s.headerTitle}>🛒 Courses</Text>
            {items.length > 0 && (
              <Text style={s.headerSub}>{doneCount}/{items.length} dans le panier</Text>
            )}
          </View>
          {items.length > 0 && (
            <TouchableOpacity style={s.clearBtn} onPress={handleClearAll} activeOpacity={0.7}>
              <Text style={s.clearBtnText}>✓ J'ai fait les courses</Text>
            </TouchableOpacity>
          )}
        </View>

        {items.length > 0 && (
          <View style={s.toggle}>
            <TouchableOpacity
              style={[s.toggleBtn, viewMode === 'recette' && s.toggleBtnActive]}
              onPress={() => setViewMode('recette')}
              activeOpacity={0.8}
            >
              <Text style={[s.toggleText, viewMode === 'recette' && s.toggleTextActive]}>
                Par recette
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[s.toggleBtn, viewMode === 'rayon' && s.toggleBtnActive]}
              onPress={() => setViewMode('rayon')}
              activeOpacity={0.8}
            >
              <Text style={[s.toggleText, viewMode === 'rayon' && s.toggleTextActive]}>
                Par rayon
              </Text>
            </TouchableOpacity>
          </View>
        )}
      </View>

      {/* Liste */}
      {items.length === 0 ? (
        <View style={s.emptyState}>
          <Text style={s.emptyIcon}>🛍️</Text>
          <Text style={s.emptyTitle}>Liste vide</Text>
          <Text style={s.emptySub}>
            Ouvre une recette et appuie sur{'\n'}"Ajouter au planning"
          </Text>
        </View>
      ) : (
        <FlatList
          data={groups}
          keyExtractor={(group) => group.title}
          contentContainerStyle={s.list}
          showsVerticalScrollIndicator={false}
          renderItem={({ item: group }) => {
            const allDone = group.items.every((i) => i.done === 1);
            return (
              <View style={[s.group, allDone && s.groupDone]}>
                <View style={s.groupHeader}>
                  <Text style={s.groupEmoji}>{group.emoji}</Text>
                  <Text style={s.groupTitle}>{group.title}</Text>
                  {allDone ? (
                    <TouchableOpacity
                      style={s.groupDeleteBtn}
                      onPress={() => handleDeleteGroup(group.items)}
                      activeOpacity={0.7}
                    >
                      <Ionicons name="trash-outline" size={14} color="#DC2626" />
                      <Text style={s.groupDeleteText}>Supprimer</Text>
                    </TouchableOpacity>
                  ) : (
                    <Text style={s.groupCount}>{group.items.length}</Text>
                  )}
                </View>

                <View style={s.groupItems}>
                  {group.items.map((item) => (
                    <TouchableOpacity
                      key={item.id}
                      style={s.item}
                      onPress={() => handleToggle(item.id)}
                      activeOpacity={0.7}
                    >
                      <View style={[s.checkbox, item.done === 1 && s.checkboxDone]}>
                        {item.done === 1 && <Text style={s.checkmark}>✓</Text>}
                      </View>
                      <View style={s.itemBody}>
                        <Text style={[s.itemName, item.done === 1 && s.itemNameDone]}>
                          {item.name}
                        </Text>
                        {viewMode === 'rayon' && item.recipe_name ? (
                          <Text style={s.itemRecipe}>{item.recipe_name}</Text>
                        ) : null}
                      </View>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>
            );
          }}
        />
      )}
      {AlertComponent}
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
    backgroundColor: '#E8F5E9',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: radii.full,
  },
  clearBtnText: {
    fontSize: typography.fontSizes.sm,
    fontWeight: typography.fontWeights.semiBold,
    color: '#2E7D32',
  },
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
  toggleBtnActive: { backgroundColor: colors.primary },
  toggleText: {
    fontSize: typography.fontSizes.sm,
    fontWeight: typography.fontWeights.semiBold,
    color: colors.textSecondary,
  },
  toggleTextActive: { color: colors.surface },
  list: {
    padding: spacing.lg,
    gap: spacing.lg,
    paddingBottom: spacing.xxxxl,
  },
  group: {
    backgroundColor: colors.surface,
    borderRadius: radii.lg,
    overflow: 'hidden',
    ...shadows.md,
  },
  groupDone: { opacity: 0.75 },
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
  groupEmoji: { fontSize: 16 },
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
  groupDeleteBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#FEE2E2',
    paddingHorizontal: spacing.sm,
    paddingVertical: 4,
    borderRadius: radii.full,
  },
  groupDeleteText: {
    fontSize: typography.fontSizes.xs,
    fontWeight: typography.fontWeights.bold,
    color: '#DC2626',
  },
  groupItems: { paddingVertical: spacing.xs },
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
  itemBody: { flex: 1 },
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
  emptyState: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.md,
    paddingBottom: spacing.xxxxl,
  },
  emptyIcon: { fontSize: 56 },
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

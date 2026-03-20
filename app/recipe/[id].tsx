import { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Modal,
  FlatList,
  SafeAreaView,
} from 'react-native';
import { useLocalSearchParams, useRouter, useNavigation } from 'expo-router';
import {
  getRecipeById,
  deleteRecipe,
  addToShoppingList,
  updateShoppingItemName,
  getShoppingList,
  type Recipe,
  type RecipeStep,
} from '../../lib/database';
import { colors, typography, spacing, radii, shadows } from '../../lib/theme';
import { useAppAlert } from '../../lib/AppAlert';
import { PlanningModal } from '../../lib/PlanningModal';

// ─── Helpers ingrédients ──────────────────────────────────────

export type IngredientLine = {
  id: number;
  original: string;
  qty: number | null;  // null = pas de quantité détectée
  suffix: string;      // tout ce qui suit le nombre ("g de farine", " œufs", …)
  currentQty: number;  // quantité ajustée par l'utilisateur
  included: boolean;   // pour les lignes sans quantité
};

function parseIngredients(lines: string[], factor: number): IngredientLine[] {
  return lines.map((line, id) => {
    const match = line.match(/^(\d+(?:[.,]\d+)?)(.*)/);
    if (!match) {
      return { id, original: line, qty: null, suffix: line, currentQty: 0, included: true };
    }
    const qty = parseFloat(match[1].replace(',', '.'));
    return { id, original: line, qty, suffix: match[2], currentQty: qty * factor, included: true };
  });
}

function formatQty(n: number): string {
  return Number.isInteger(n) ? String(n) : n.toFixed(1).replace('.', ',');
}

function reconstructLine(line: IngredientLine): string {
  if (line.qty === null) return line.original;
  return formatQty(line.currentQty) + line.suffix;
}

function getStep(qty: number): number {
  if (!Number.isInteger(qty)) return 0.5;
  if (qty >= 500) return 50;
  if (qty >= 100) return 10;
  return 1;
}

// Clé de comparaison : la partie non-numérique de l'ingrédient (ex: " œufs", "g de farine")
function ingredientBaseKey(name: string): string {
  const match = name.match(/^(\d+(?:[.,]\d+)?)(.*)/);
  return (match ? match[2] : name).toLowerCase().trim();
}

// Additionne les quantités de deux chaînes ingrédient ayant la même clé de base
function sumIngredientNames(existing: string, adding: string): string {
  const parse = (s: string) => {
    const m = s.match(/^(\d+(?:[.,]\d+)?)(.*)/);
    return m ? { qty: parseFloat(m[1].replace(',', '.')), suffix: m[2] } : null;
  };
  const e = parse(existing);
  const a = parse(adding);
  if (!e || !a) return existing;
  const total = e.qty + a.qty;
  const formatted = Number.isInteger(total) ? String(total) : total.toFixed(1).replace('.', ',');
  return formatted + e.suffix;
}

// ─── Modale ajustement ingrédients ───────────────────────────

interface IngredientsAdjustModalProps {
  visible: boolean;
  recipe: Recipe;
  lines: IngredientLine[];
  totalSlots: number;
  onClose: () => void;
  onAdd: (lines: IngredientLine[]) => void;
  onLinesChange: (lines: IngredientLine[]) => void;
}

function IngredientsAdjustModal({
  visible, recipe, lines, totalSlots, onClose, onAdd, onLinesChange,
}: IngredientsAdjustModalProps) {
  function adjustQty(id: number, delta: number) {
    onLinesChange(lines.map((l) => {
      if (l.id !== id || l.qty === null) return l;
      const step = getStep(l.qty * totalSlots);
      const next = Math.max(0, l.currentQty + delta * step);
      return { ...l, currentQty: next };
    }));
  }

  function toggleIncluded(id: number) {
    onLinesChange(lines.map((l) =>
      l.id === id ? { ...l, included: !l.included } : l
    ));
  }

  const activeCount = lines.filter((l) =>
    l.qty !== null ? l.currentQty > 0 : l.included
  ).length;

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet" onRequestClose={onClose}>
      <SafeAreaView style={adjModal.root}>
        {/* Header */}
        <View style={adjModal.header}>
          <View style={{ flex: 1 }}>
            <Text style={adjModal.title}>Ingrédients à acheter</Text>
            <Text style={adjModal.subtitle}>{recipe.title}</Text>
          </View>
          <TouchableOpacity onPress={onClose} style={adjModal.closeBtn}>
            <Text style={adjModal.closeBtnText}>✕</Text>
          </TouchableOpacity>
        </View>

        {totalSlots > 1 && (
          <Text style={adjModal.hint}>
            Quantités calculées pour {totalSlots} créneaux. Ajuste si tu en as déjà certains.
          </Text>
        )}
        {totalSlots === 1 && (
          <Text style={adjModal.hint}>Ajuste les quantités si tu en as déjà certains à la maison.</Text>
        )}

        {/* Liste */}
        <FlatList
          data={lines}
          keyExtractor={(item) => String(item.id)}
          contentContainerStyle={adjModal.list}
          renderItem={({ item }) => {
            const isZero = item.qty !== null ? item.currentQty === 0 : !item.included;

            return (
              <View style={[adjModal.row, isZero && adjModal.rowDisabled]}>
                {/* Nom de l'ingrédient */}
                <Text
                  style={[adjModal.rowName, isZero && adjModal.rowNameDisabled]}
                  numberOfLines={2}
                >
                  {item.qty !== null ? item.suffix.replace(/^\s*/, '') : item.original}
                </Text>

                {/* Stepper si quantité détectée */}
                {item.qty !== null ? (
                  <View style={adjModal.stepper}>
                    <TouchableOpacity
                      style={[adjModal.stepBtn, adjModal.stepBtnMinus]}
                      onPress={() => adjustQty(item.id, -1)}
                      activeOpacity={0.7}
                    >
                      <Text style={adjModal.stepBtnText}>−</Text>
                    </TouchableOpacity>
                    <View style={adjModal.stepValue}>
                      <Text style={[adjModal.stepValueText, isZero && adjModal.stepValueZero]}>
                        {formatQty(item.currentQty)}
                        {/* Unité collée si présente (ex: "g", "ml") */}
                        {item.suffix.match(/^([a-zA-Zg-ÿ]+)/) ? (
                          <Text style={adjModal.stepUnit}>
                            {item.suffix.match(/^([a-zA-Zg-ÿ]+)/)![1]}
                          </Text>
                        ) : null}
                      </Text>
                    </View>
                    <TouchableOpacity
                      style={[adjModal.stepBtn, adjModal.stepBtnPlus]}
                      onPress={() => adjustQty(item.id, 1)}
                      activeOpacity={0.7}
                    >
                      <Text style={adjModal.stepBtnText}>+</Text>
                    </TouchableOpacity>
                  </View>
                ) : (
                  /* Toggle pour ingrédients sans quantité */
                  <TouchableOpacity
                    style={[adjModal.checkbox, item.included && adjModal.checkboxActive]}
                    onPress={() => toggleIncluded(item.id)}
                    activeOpacity={0.7}
                  >
                    {item.included && <Text style={adjModal.checkmark}>✓</Text>}
                  </TouchableOpacity>
                )}
              </View>
            );
          }}
        />

        {/* Footer */}
        <View style={adjModal.footer}>
          <TouchableOpacity
            style={[adjModal.addBtn, activeCount === 0 && adjModal.addBtnDisabled]}
            onPress={() => onAdd(lines)}
            disabled={activeCount === 0}
            activeOpacity={0.85}
          >
            <Text style={adjModal.addBtnText}>
              {activeCount === 0
                ? 'Sélectionne au moins un ingrédient'
                : `Ajouter ${activeCount} ingrédient${activeCount > 1 ? 's' : ''} aux courses`}
            </Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    </Modal>
  );
}

// ─── Couleurs catégories ──────────────────────────────────────

const CATEGORY_COLORS: Record<string, string> = {
  Entrée: '#4CAF50',
  Plat: '#FF6B35',
  Dessert: '#9C27B0',
};

// ─── Frise chronologique ──────────────────────────────────────

const STEP_CONFIG: Record<string, { emoji: string; color: string; bg: string; label: string }> = {
  prep: { emoji: '🔪', color: '#FF6B35', bg: '#FFF0EA', label: 'Préparation' },
  cook: { emoji: '🔥', color: '#E53E3E', bg: '#FFF5F5', label: 'Cuisson' },
  wait: { emoji: '❄️', color: '#805AD5', bg: '#FAF5FF', label: 'Frigo' },
  rest: { emoji: '⏸️', color: '#38A169', bg: '#F0FFF4', label: 'Repos' },
};

function RecipeTimeline({ steps }: { steps: RecipeStep[] }) {
  const total = steps.reduce((acc, s) => acc + s.duration, 0);

  return (
    <View style={timeline.wrap}>
      {/* En-tête */}
      <View style={timeline.header}>
        <Text style={timeline.sectionLabel}>Étapes</Text>
        <View style={timeline.totalBadge}>
          <Text style={timeline.totalBadgeText}>⏱ {total} min au total</Text>
        </View>
      </View>

      {/* Légende des types */}
      <View style={timeline.legend}>
        {Object.entries(STEP_CONFIG).map(([key, cfg]) => (
          <View key={key} style={[timeline.legendItem, { backgroundColor: cfg.bg }]}>
            <Text style={timeline.legendEmoji}>{cfg.emoji}</Text>
            <Text style={[timeline.legendLabel, { color: cfg.color }]}>{cfg.label}</Text>
          </View>
        ))}
      </View>

      {/* Étapes */}
      <View style={timeline.steps}>
        {steps.map((step, index) => {
          const cfg = STEP_CONFIG[step.type] ?? STEP_CONFIG.prep;
          const isLast = index === steps.length - 1;
          const widthPct = Math.max(15, Math.round((step.duration / total) * 100));

          return (
            <View key={index} style={timeline.stepRow}>
              {/* Ligne verticale + dot */}
              <View style={timeline.dotCol}>
                <View style={[timeline.dot, { backgroundColor: cfg.color }]}>
                  <Text style={timeline.dotEmoji}>{cfg.emoji}</Text>
                </View>
                {!isLast && <View style={[timeline.line, { backgroundColor: cfg.color + '40' }]} />}
              </View>

              {/* Contenu */}
              <View style={[timeline.stepCard, { borderLeftColor: cfg.color }]}>
                <View style={timeline.stepCardTop}>
                  <Text style={timeline.stepLabel}>{`Étape ${index + 1} — ${step.label}`}</Text>
                  <View style={[timeline.durationBadge, { backgroundColor: cfg.bg }]}>
                    <Text style={[timeline.durationText, { color: cfg.color }]}>
                      {step.duration} min
                    </Text>
                  </View>
                </View>
                {step.instruction ? (
                  <Text style={timeline.stepInstruction}>{step.instruction}</Text>
                ) : null}
                {/* Barre de durée proportionnelle */}
                <View style={timeline.barTrack}>
                  <View style={[timeline.barFill, { width: `${widthPct}%` as any, backgroundColor: cfg.color }]} />
                </View>
              </View>
            </View>
          );
        })}
      </View>
    </View>
  );
}

// ─── Écran détail recette ─────────────────────────────────────

export default function RecipeScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const navigation = useNavigation();
  const { showAlert, AlertComponent } = useAppAlert();

  const [recipe, setRecipe] = useState<Recipe | null>(null);
  const [planningModalVisible, setPlanningModalVisible] = useState(false);
  const [adjustModalVisible, setAdjustModalVisible] = useState(false);
  const [ingredientLines, setIngredientLines] = useState<IngredientLine[]>([]);
  const [totalSlotsRef, setTotalSlotsRef] = useState(1);

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

  function handlePlanningConfirm(newSlots: number) {
    if (!recipe || newSlots === 0) return; // aucun nouveau créneau, pas d'ajout aux courses
    const rawLines = recipe.ingredients
      .split('\n')
      .map((s) => s.trim())
      .filter(Boolean);
    setTotalSlotsRef(newSlots);
    setIngredientLines(parseIngredients(rawLines, newSlots));
    setAdjustModalVisible(true);
  }

  function handleAddToShopping(lines: IngredientLine[]) {
    if (!recipe) return;

    const active = lines.filter((l) =>
      l.qty !== null ? l.currentQty > 0 : l.included
    );

    // Ingrédients déjà en liste pour cette recette (non cochés)
    const existing = getShoppingList().filter(
      (i) => i.recipe_name === recipe.title && i.done === 0
    );

    const toInsert: { name: string; recipe_name: string }[] = [];

    for (const line of active) {
      const newName = reconstructLine(line);
      const baseKey = ingredientBaseKey(newName);
      const match = existing.find((e) => ingredientBaseKey(e.name) === baseKey);

      if (match) {
        // Incrémente la quantité de la ligne existante
        updateShoppingItemName(match.id, sumIngredientNames(match.name, newName));
      } else {
        toInsert.push({ name: newName, recipe_name: recipe.title });
      }
    }

    if (toInsert.length > 0) addToShoppingList(toInsert);

    setAdjustModalVisible(false);
    showAlert({
      title: 'Courses mises à jour !',
      message: `${active.length} ingrédient${active.length > 1 ? 's' : ''} ajouté${active.length > 1 ? 's' : ''} à ta liste de courses.`,
    });
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

  let steps: RecipeStep[] = [];
  try {
    if (recipe.steps) steps = JSON.parse(recipe.steps);
  } catch { /* ignore */ }

  let tags: string[] = [];
  try { if (recipe.tags) tags = JSON.parse(recipe.tags); } catch { /* ignore */ }

  const hasCookTime = recipe.cook_time > 0;
  const prepOnly = hasCookTime ? recipe.prep_time - recipe.cook_time : recipe.prep_time;

  return (
    <>
      <ScrollView style={styles.container} contentContainerStyle={styles.content}>
        {/* Badges */}
        <View style={styles.metaRow}>
          <View style={[styles.categoryBadge, { backgroundColor: CATEGORY_COLORS[recipe.category] ?? '#888' }]}>
            <Text style={styles.categoryText}>{recipe.category}</Text>
          </View>
          {hasCookTime ? (
            <>
              <View style={[styles.timeBadge, styles.timeBadgePrep]}>
                <Text style={styles.timeText}>🔪 {prepOnly} min de prépa</Text>
              </View>
              <View style={[styles.timeBadge, styles.timeBadgeCook]}>
                <Text style={[styles.timeText, { color: '#E53E3E' }]}>🔥 {recipe.cook_time} min de cuisson</Text>
              </View>
            </>
          ) : (
            <View style={styles.timeBadge}>
              <Text style={styles.timeText}>⏱ {recipe.prep_time} min</Text>
            </View>
          )}
        </View>

        {/* Titre */}
        <Text style={styles.title}>{recipe.title}</Text>

        {/* Tags */}
        {tags.length > 0 && (
          <View style={styles.tagsRow}>
            {tags.map((tag) => (
              <View key={tag} style={styles.tagChip}>
                <Text style={styles.tagChipText}>{tag}</Text>
              </View>
            ))}
          </View>
        )}

        <View style={styles.divider} />

        {/* Description */}
        <Text style={styles.sectionLabel}>Description</Text>
        <Text style={styles.description}>{recipe.description}</Text>

        {/* Frise des étapes */}
        {steps.length > 0 && (
          <>
            <View style={styles.divider} />
            <RecipeTimeline steps={steps} />
          </>
        )}

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

            {/* Bouton planning */}
            <TouchableOpacity
              style={styles.planningBtn}
              onPress={() => setPlanningModalVisible(true)}
              activeOpacity={0.85}
            >
              <Text style={styles.planningBtnText}>📅  Ajouter au planning</Text>
            </TouchableOpacity>
          </>
        )}

        {/* Supprimer */}
        <TouchableOpacity style={styles.deleteBtn} onPress={handleDelete}>
          <Text style={styles.deleteBtnText}>Supprimer la recette</Text>
        </TouchableOpacity>
      </ScrollView>

      {/* Modale planning */}
      {planningModalVisible && (
        <PlanningModal
          visible={planningModalVisible}
          recipe={recipe}
          onClose={() => setPlanningModalVisible(false)}
          onConfirm={handlePlanningConfirm}
        />
      )}

      {/* Modale ajustement ingrédients */}
      {adjustModalVisible && (
        <IngredientsAdjustModal
          visible={adjustModalVisible}
          recipe={recipe}
          lines={ingredientLines}
          totalSlots={totalSlotsRef}
          onClose={() => setAdjustModalVisible(false)}
          onAdd={handleAddToShopping}
          onLinesChange={setIngredientLines}
        />
      )}

      {AlertComponent}
    </>
  );
}

// ─── Styles recette ───────────────────────────────────────────

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
  timeBadgePrep: {
    borderColor: '#FF6B35',
    backgroundColor: '#FFF0EA',
  },
  timeBadgeCook: {
    borderColor: '#E53E3E',
    backgroundColor: '#FFF5F5',
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
  planningBtn: {
    marginTop: spacing.xl,
    backgroundColor: colors.primary,
    borderRadius: radii.lg,
    paddingVertical: spacing.lg,
    alignItems: 'center',
    ...shadows.primary,
  },
  planningBtnText: {
    color: colors.surface,
    fontSize: typography.fontSizes.md,
    fontWeight: typography.fontWeights.bold,
  },
  tagsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
    marginTop: spacing.sm,
    marginBottom: spacing.sm,
  },
  tagChip: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    borderRadius: radii.full,
    backgroundColor: colors.primaryLight,
    borderWidth: 1,
    borderColor: colors.primary,
  },
  tagChipText: {
    fontSize: typography.fontSizes.xs,
    color: colors.primary,
    fontWeight: typography.fontWeights.semiBold,
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

// ─── Styles frise chronologique ───────────────────────────────

const timeline = StyleSheet.create({
  wrap: { gap: spacing.lg },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  sectionLabel: {
    fontSize: typography.fontSizes.xs,
    fontWeight: typography.fontWeights.bold,
    color: colors.primary,
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  totalBadge: {
    backgroundColor: colors.primaryLight,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    borderRadius: radii.full,
  },
  totalBadgeText: {
    fontSize: typography.fontSizes.xs,
    fontWeight: typography.fontWeights.bold,
    color: colors.primary,
  },
  legend: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: spacing.sm,
    paddingVertical: 3,
    borderRadius: radii.full,
  },
  legendEmoji: { fontSize: 11 },
  legendLabel: {
    fontSize: typography.fontSizes.xs,
    fontWeight: typography.fontWeights.semiBold,
  },
  steps: { gap: 0 },
  stepRow: {
    flexDirection: 'row',
    gap: spacing.md,
  },
  dotCol: {
    alignItems: 'center',
    width: 36,
  },
  dot: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  dotEmoji: { fontSize: 16 },
  line: {
    width: 2,
    flex: 1,
    minHeight: 16,
    marginVertical: 2,
  },
  stepCard: {
    flex: 1,
    backgroundColor: colors.surface,
    borderRadius: radii.lg,
    borderLeftWidth: 3,
    padding: spacing.md,
    marginBottom: spacing.md,
    gap: spacing.sm,
    ...shadows.sm,
  },
  stepCardTop: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.sm,
  },
  stepLabel: {
    flex: 1,
    fontSize: typography.fontSizes.sm,
    fontWeight: typography.fontWeights.bold,
    color: colors.textPrimary,
  },
  stepInstruction: {
    fontSize: typography.fontSizes.sm,
    color: colors.textSecondary,
    lineHeight: typography.lineHeights.normal,
  },
  durationBadge: {
    paddingHorizontal: spacing.sm,
    paddingVertical: 3,
    borderRadius: radii.full,
    flexShrink: 0,
  },
  durationText: {
    fontSize: typography.fontSizes.xs,
    fontWeight: typography.fontWeights.bold,
  },
  barTrack: {
    height: 4,
    backgroundColor: colors.border,
    borderRadius: 2,
    overflow: 'hidden',
  },
  barFill: {
    height: 4,
    borderRadius: 2,
    opacity: 0.7,
  },
});

// ─── Styles modale ajustement ingrédients ─────────────────────

const adjModal = StyleSheet.create({
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
    paddingBottom: spacing.lg,
    gap: spacing.sm,
  },

  // Ligne ingrédient
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderRadius: radii.lg,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    gap: spacing.md,
    ...shadows.sm,
  },
  rowDisabled: {
    opacity: 0.45,
  },
  rowName: {
    flex: 1,
    fontSize: typography.fontSizes.md,
    color: colors.textPrimary,
    fontWeight: typography.fontWeights.medium,
  },
  rowNameDisabled: {
    textDecorationLine: 'line-through',
    color: colors.textSecondary,
  },

  // Stepper
  stepper: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  stepBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  stepBtnMinus: {
    backgroundColor: colors.border,
  },
  stepBtnPlus: {
    backgroundColor: colors.primary,
  },
  stepBtnText: {
    fontSize: 18,
    fontWeight: typography.fontWeights.bold,
    color: colors.textPrimary,
    lineHeight: 20,
  },
  stepValue: {
    minWidth: 48,
    alignItems: 'center',
  },
  stepValueText: {
    fontSize: typography.fontSizes.md,
    fontWeight: typography.fontWeights.extraBold,
    color: colors.textPrimary,
  },
  stepValueZero: {
    color: colors.textSecondary,
  },
  stepUnit: {
    fontSize: typography.fontSizes.sm,
    fontWeight: typography.fontWeights.medium,
    color: colors.textSecondary,
  },

  // Checkbox (ingrédients sans quantité)
  checkbox: {
    width: 28,
    height: 28,
    borderRadius: 14,
    borderWidth: 2,
    borderColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkboxActive: {
    backgroundColor: colors.success,
    borderColor: colors.success,
  },
  checkmark: {
    fontSize: 13,
    color: colors.surface,
    fontWeight: typography.fontWeights.bold,
  },

  // Footer
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
  addBtnDisabled: {
    backgroundColor: colors.border,
    shadowOpacity: 0,
    elevation: 0,
  },
  addBtnText: {
    color: colors.surface,
    fontSize: typography.fontSizes.md,
    fontWeight: typography.fontWeights.extraBold,
  },
});


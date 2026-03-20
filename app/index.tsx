import { useCallback, useRef, useState, useEffect } from 'react';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  StatusBar,
  Animated,
  Easing,
  TextInput,
  Modal,
  SafeAreaView,
  useWindowDimensions,
} from 'react-native';
import { useRouter, useFocusEffect, Stack } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import {
  getMealPlan,
  getRecipeById,
  getAllRecipes,
  setMeal,
  type Recipe,
} from '../lib/database';
import { colors, typography, spacing, radii, shadows, Badge } from '../lib/theme';
import { TabBar } from '../lib/TabBar';
import { CoursesPanel } from '../lib/panels/CoursesPanel';
import { RecipesPanel } from '../lib/panels/RecipesPanel';
import { PlanningModal } from '../lib/PlanningModal';

// ─── Helpers date ─────────────────────────────────────────────

const DAYS_COUNT = 7;
const DAYS_FR = ['Dimanche', 'Lundi', 'Mardi', 'Mercredi', 'Jeudi', 'Vendredi', 'Samedi'];
const MONTHS_FR = [
  'janvier', 'février', 'mars', 'avril', 'mai', 'juin',
  'juillet', 'août', 'septembre', 'octobre', 'novembre', 'décembre',
];

function getDateString(offset: number): string {
  const d = new Date();
  d.setDate(d.getDate() + offset);
  return d.toISOString().split('T')[0];
}

function formatDayLabel(dateStr: string, offset: number): { main: string; sub: string } {
  const d = new Date(dateStr + 'T12:00:00');
  const dayNum = d.getDate();
  const month = MONTHS_FR[d.getMonth()];
  const dayName = DAYS_FR[d.getDay()];
  if (offset === 0) return { main: "Aujourd'hui", sub: `${dayName} ${dayNum} ${month}` };
  if (offset === 1) return { main: 'Demain', sub: `${dayName} ${dayNum} ${month}` };
  return { main: dayName, sub: `${dayNum} ${month}` };
}

type DayData = {
  dateStr: string;
  label: { main: string; sub: string };
  lunchRecipe: Recipe | null;
  dinnerRecipe: Recipe | null;
};

// ─── Modale choix de recette ──────────────────────────────────

const PICKER_CATEGORIES = ['Toutes', 'Entrée', 'Plat', 'Dessert'];

const PICKER_EMOJI: Record<string, string> = {
  Entrée: '🥗',
  Plat: '🍽️',
  Dessert: '🍰',
};

const PICKER_EMOJI_BG: Record<string, string> = {
  Entrée: colors.successLight,
  Plat: colors.primaryLight,
  Dessert: colors.primaryLight,
};

function getPickerBadge(recipe: Recipe): { label: string; color: string } {
  if (recipe.prep_time <= 15) return { label: 'Rapide', color: colors.primary };
  if (recipe.category === 'Entrée') return { label: 'Sain', color: colors.success };
  return { label: 'Facile', color: colors.success };
}

interface RecipePickerModalProps {
  visible: boolean;
  onClose: () => void;
  onSelect: (recipe: Recipe) => void;
}

function RecipePickerModal({ visible, onClose, onSelect }: RecipePickerModalProps) {
  const [recipes, setRecipes] = useState<Recipe[]>([]);
  const [search, setSearch] = useState('');
  const [activeCategory, setActiveCategory] = useState('Toutes');

  useEffect(() => {
    if (visible) {
      setRecipes(getAllRecipes());
      setSearch('');
      setActiveCategory('Toutes');
    }
  }, [visible]);

  const filtered = recipes.filter((r) => {
    const matchSearch = r.title.toLowerCase().includes(search.toLowerCase());
    const matchCat = activeCategory === 'Toutes' || r.category === activeCategory;
    return matchSearch && matchCat;
  });

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet" onRequestClose={onClose}>
      <SafeAreaView style={picker.root}>
        <View style={picker.header}>
          <Text style={picker.title}>Choisir une recette</Text>
          <TouchableOpacity onPress={onClose} style={picker.closeBtn}>
            <Text style={picker.closeBtnText}>✕</Text>
          </TouchableOpacity>
        </View>

        <View style={picker.searchWrap}>
          <TextInput
            style={picker.search}
            placeholder="Rechercher..."
            placeholderTextColor={colors.textSecondary}
            value={search}
            onChangeText={setSearch}
          />
        </View>

        {/* Filtres catégories */}
        <View style={picker.filterRow}>
          {PICKER_CATEGORIES.map((cat) => (
            <TouchableOpacity
              key={cat}
              style={[picker.filterBtn, activeCategory === cat && picker.filterBtnActive]}
              onPress={() => setActiveCategory(cat)}
              activeOpacity={0.7}
            >
              <Text style={[picker.filterText, activeCategory === cat && picker.filterTextActive]}>
                {cat}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        <FlatList
          data={filtered}
          keyExtractor={(r) => String(r.id)}
          contentContainerStyle={picker.list}
          showsVerticalScrollIndicator={false}
          ListEmptyComponent={
            <Text style={picker.empty}>Aucune recette trouvée.</Text>
          }
          renderItem={({ item }) => {
            const emoji = PICKER_EMOJI[item.category] ?? '🍴';
            const emojiBg = PICKER_EMOJI_BG[item.category] ?? colors.primaryLight;
            const badge = getPickerBadge(item);
            return (
              <TouchableOpacity
                style={picker.item}
                onPress={() => { onSelect(item); onClose(); }}
                activeOpacity={0.7}
              >
                <View style={[picker.emojiBox, { backgroundColor: emojiBg }]}>
                  <Text style={picker.emojiText}>{emoji}</Text>
                </View>
                <View style={picker.itemBody}>
                  <Text style={picker.itemTitle} numberOfLines={1}>{item.title}</Text>
                  <View style={picker.itemMetaRow}>
                    {item.cook_time > 0 ? (
                      <>
                        <Text style={picker.itemMeta}>🔪 {item.prep_time - item.cook_time} min</Text>
                        <Text style={picker.itemMetaSep}>·</Text>
                        <Text style={[picker.itemMeta, picker.itemMetaCook]}>🔥 {item.cook_time} min</Text>
                      </>
                    ) : (
                      <Text style={picker.itemMeta}>⏱ {item.prep_time} min</Text>
                    )}
                  </View>
                  <Badge label={badge.label} color={badge.color} style={picker.badge} />
                </View>
              </TouchableOpacity>
            );
          }}
        />
      </SafeAreaView>
    </Modal>
  );
}

// ─── Créneau repas ────────────────────────────────────────────

interface MealSlotProps {
  icon: string;
  label: string;
  recipe: Recipe | null;
  onView: () => void;
  onClear: () => void;
  onAdd: () => void;
}

function MealSlot({ icon, label, recipe, onView, onClear, onAdd }: MealSlotProps) {
  return (
    <View style={styles.slot}>
      <View style={styles.slotHeader}>
        <Text style={styles.slotIcon}>{icon}</Text>
        <Text style={styles.slotLabel}>{label}</Text>
      </View>

      {recipe ? (
        <View style={styles.recipeRow}>
          <TouchableOpacity style={styles.recipeCard} onPress={onView} activeOpacity={0.75}>
            <View style={styles.recipeCardBody}>
              <Text style={styles.recipeTitle}>{recipe.title}</Text>
              <Text style={styles.recipeMeta}>
                {recipe.category} · ⏱ {recipe.prep_time} min
              </Text>
            </View>
            <Text style={styles.recipeChevron}>›</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.clearBtn} onPress={onClear} activeOpacity={0.7}>
            <Text style={styles.clearBtnText}>✕</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <TouchableOpacity style={styles.addSlotBtn} onPress={onAdd} activeOpacity={0.7}>
          <Text style={styles.addSlotIcon}>+</Text>
          <Text style={styles.addSlotText}>Ajouter une recette</Text>
        </TouchableOpacity>
      )}
    </View>
  );
}

// ─── Page d'un jour ───────────────────────────────────────────

interface DayPageProps {
  day: DayData;
  width: number;
  height: number;
  router: ReturnType<typeof useRouter>;
  onClearMeal: (dateStr: string, slot: 'lunch' | 'dinner') => void;
  onAddMeal: (dateStr: string, slot: 'lunch' | 'dinner') => void;
}

function DayPage({ day, width, height, router, onClearMeal, onAddMeal }: DayPageProps) {
  return (
    <View style={[styles.page, { width, height }]}>
      <View style={styles.dayLabelBlock}>
        <Text style={styles.dayMain}>{day.label.main}</Text>
        <Text style={styles.daySub}>{day.label.sub}</Text>
      </View>

      <View style={styles.slotsContainer}>
        <MealSlot
          icon="🥗"
          label="Midi"
          recipe={day.lunchRecipe}
          onView={() => router.push(`/recipe/${day.lunchRecipe!.id}`)}
          onClear={() => onClearMeal(day.dateStr, 'lunch')}
          onAdd={() => onAddMeal(day.dateStr, 'lunch')}
        />
        <MealSlot
          icon="🥣"
          label="Soir"
          recipe={day.dinnerRecipe}
          onView={() => router.push(`/recipe/${day.dinnerRecipe!.id}`)}
          onClear={() => onClearMeal(day.dateStr, 'dinner')}
          onAdd={() => onAddMeal(day.dateStr, 'dinner')}
        />
      </View>
    </View>
  );
}

// ─── Panneau Accueil ──────────────────────────────────────────

interface HomePanelProps {
  width: number;
  isFocused: boolean;
  focusKey: number;
}

function HomePanel({ width, isFocused, focusKey }: HomePanelProps) {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const [days, setDays] = useState<DayData[]>([]);
  const [bodyHeight, setBodyHeight] = useState(0);
  // Étape 1 : choix de la recette
  const [pickerTarget, setPickerTarget] = useState<{ dateStr: string; slot: 'lunch' | 'dinner' } | null>(null);
  // Étape 2 : planning modal avec la recette choisie + pré-sélection du créneau
  const [planningRecipe, setPlanningRecipe] = useState<Recipe | null>(null);
  const [planningPreselect, setPlanningPreselect] = useState<{ dateStr: string; slot: 'lunch' | 'dinner' } | null>(null);

  const loadData = useCallback(() => {
    const loaded: DayData[] = Array.from({ length: DAYS_COUNT }, (_, offset) => {
      const dateStr = getDateString(offset);
      const plan = getMealPlan(dateStr);
      return {
        dateStr,
        label: formatDayLabel(dateStr, offset),
        lunchRecipe: plan.lunch ? getRecipeById(plan.lunch) : null,
        dinnerRecipe: plan.dinner ? getRecipeById(plan.dinner) : null,
      };
    });
    setDays(loaded);
  }, []);

  useEffect(() => {
    if (isFocused) loadData();
  }, [isFocused, focusKey]);

  function handleClearMeal(dateStr: string, slot: 'lunch' | 'dinner') {
    setMeal(dateStr, slot, null);
    loadData();
  }

  function handleSelectRecipe(recipe: Recipe) {
    // Mémorise le créneau pré-sélectionné avant de fermer le picker
    setPlanningPreselect(pickerTarget);
    setPickerTarget(null);
    setPlanningRecipe(recipe);
  }

  function handlePlanningConfirm() {
    setPlanningRecipe(null);
    setPlanningPreselect(null);
    loadData();
  }

  return (
    <View style={[styles.homeRoot, { width }]} pointerEvents={isFocused ? 'auto' : 'none'}>
      {/* Header */}
      <View style={[styles.header, { paddingTop: insets.top + spacing.xl }]}>
        <View style={styles.headerContent}>
          <View>
            <Text style={styles.headerTitle}>Menu du jour</Text>
            <Text style={styles.headerSub}>Planifie tes repas de la semaine</Text>
          </View>
          <View style={styles.headerBadge}>
            <Text style={styles.headerBadgeText}>7 jours</Text>
          </View>
        </View>
      </View>

      {/* Jours swipeables */}
      <View
        style={styles.body}
        onLayout={(e) => setBodyHeight(e.nativeEvent.layout.height)}
      >
        {bodyHeight > 0 && (
          <FlatList
            data={days}
            horizontal
            pagingEnabled
            showsHorizontalScrollIndicator={false}
            bounces={false}
            getItemLayout={(_, index) => ({ length: width, offset: width * index, index })}
            keyExtractor={(item) => item.dateStr}
            renderItem={({ item }) => (
              <DayPage
                day={item}
                width={width}
                height={bodyHeight}
                router={router}
                onClearMeal={handleClearMeal}
                onAddMeal={(dateStr, slot) => setPickerTarget({ dateStr, slot })}
              />
            )}
          />
        )}
      </View>

      {/* Étape 1 : choix de la recette */}
      <RecipePickerModal
        visible={pickerTarget !== null}
        onClose={() => setPickerTarget(null)}
        onSelect={handleSelectRecipe}
      />

      {/* Étape 2 : planning modal (même composant que depuis la fiche recette) */}
      {planningRecipe && (
        <PlanningModal
          visible
          recipe={planningRecipe}
          preselect={planningPreselect ?? undefined}
          onClose={() => { setPlanningRecipe(null); setPlanningPreselect(null); }}
          onConfirm={handlePlanningConfirm}
        />
      )}
    </View>
  );
}

// ─── Conteneur onglets (écran racine) ─────────────────────────

export default function TabContainer() {
  const { width } = useWindowDimensions();
  const [activeTab, setActiveTab] = useState(1); // 0=Courses 1=Accueil 2=Recettes
  const [focusKey, setFocusKey] = useState(0);
  const translateX = useRef(new Animated.Value(-width)).current;

  // Quand on revient sur cet écran (ex : retour depuis fiche recette), rafraîchit le panneau actif
  useFocusEffect(
    useCallback(() => {
      setFocusKey((k) => k + 1);
    }, [])
  );

  function switchTab(newTab: number) {
    if (newTab === activeTab) return;
    Animated.timing(translateX, {
      toValue: -newTab * width,
      duration: 260,
      useNativeDriver: true,
      easing: Easing.out(Easing.cubic),
    }).start();
    setActiveTab(newTab);
  }

  return (
    <>
      <Stack.Screen options={{ headerShown: false }} />
      <StatusBar barStyle="light-content" backgroundColor={colors.dark} />
      <View style={styles.container}>
        <Animated.View
          style={[styles.panelRow, { width: width * 3, transform: [{ translateX }] }]}
        >
          <CoursesPanel width={width} isFocused={activeTab === 0} focusKey={focusKey} />
          <HomePanel width={width} isFocused={activeTab === 1} focusKey={focusKey} />
          <RecipesPanel width={width} isFocused={activeTab === 2} focusKey={focusKey} />
        </Animated.View>
        <TabBar activeTab={activeTab} onSwitch={switchTab} />
      </View>
    </>
  );
}

// ─── Styles ───────────────────────────────────────────────────

const styles = StyleSheet.create({
  // Conteneur global
  container: {
    flex: 1,
    overflow: 'hidden',
    backgroundColor: colors.background,
  },
  panelRow: {
    flex: 1,
    flexDirection: 'row',
  },

  // Panneau Accueil
  homeRoot: {
    flex: 1,
    backgroundColor: colors.background,
  },
  header: {
    backgroundColor: colors.dark,
    paddingHorizontal: spacing.xl,
    paddingBottom: spacing.xl,
  },
  headerContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  headerTitle: {
    fontSize: typography.fontSizes.xxl,
    fontWeight: typography.fontWeights.extraBold,
    color: colors.surface,
    letterSpacing: -0.5,
  },
  headerSub: {
    fontSize: typography.fontSizes.sm,
    color: colors.textSecondary,
    marginTop: spacing.xs,
  },
  headerBadge: {
    backgroundColor: colors.primary,
    borderRadius: radii.full,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
  },
  headerBadgeText: {
    fontSize: typography.fontSizes.sm,
    fontWeight: typography.fontWeights.bold,
    color: colors.surface,
  },
  body: { flex: 1 },

  // Page d'un jour
  page: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.xl,
    paddingBottom: spacing.lg,
    justifyContent: 'center',
    gap: spacing.xxl,
  },
  dayLabelBlock: { gap: spacing.xs },
  dayMain: {
    fontSize: 34,
    fontWeight: typography.fontWeights.extraBold,
    color: colors.textPrimary,
    letterSpacing: -0.5,
  },
  daySub: {
    fontSize: typography.fontSizes.md,
    color: colors.textSecondary,
    fontWeight: typography.fontWeights.medium,
  },

  // Créneaux repas
  slotsContainer: { gap: spacing.lg },
  slot: {
    backgroundColor: colors.surface,
    borderRadius: radii.xl,
    padding: spacing.xl,
    gap: spacing.lg,
    ...shadows.md,
  },
  slotHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  slotIcon: { fontSize: 20 },
  slotLabel: {
    fontSize: typography.fontSizes.sm,
    fontWeight: typography.fontWeights.bold,
    color: colors.textSecondary,
    textTransform: 'uppercase',
    letterSpacing: 0.8,
  },

  // Recette assignée
  recipeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  recipeCard: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.background,
    borderRadius: radii.lg,
    padding: spacing.lg,
    gap: spacing.md,
  },
  recipeCardBody: { flex: 1 },
  recipeTitle: {
    fontSize: typography.fontSizes.xl,
    fontWeight: typography.fontWeights.bold,
    color: colors.textPrimary,
  },
  recipeMeta: {
    fontSize: typography.fontSizes.sm,
    color: colors.textSecondary,
    marginTop: spacing.xs,
  },
  recipeChevron: {
    fontSize: 26,
    color: colors.textSecondary,
  },
  clearBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#FEE2E2',
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  clearBtnText: {
    fontSize: 14,
    color: '#DC2626',
    fontWeight: typography.fontWeights.bold,
  },

  // Créneau vide → bouton ajout
  addSlotBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    backgroundColor: colors.background,
    borderRadius: radii.lg,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.lg,
    borderWidth: 1.5,
    borderColor: colors.border,
    borderStyle: 'dashed',
  },
  addSlotIcon: {
    fontSize: 18,
    color: colors.primary,
    fontWeight: typography.fontWeights.bold,
  },
  addSlotText: {
    fontSize: typography.fontSizes.sm,
    color: colors.textSecondary,
    fontWeight: typography.fontWeights.medium,
  },
});

// ─── Styles modale picker ─────────────────────────────────────

const picker = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: colors.background,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
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
  searchWrap: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.md,
    paddingBottom: spacing.sm,
  },
  search: {
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
    gap: spacing.md,
    paddingBottom: spacing.xxxxl,
  },
  empty: {
    textAlign: 'center',
    marginTop: spacing.xxxxl,
    color: colors.textSecondary,
    fontSize: typography.fontSizes.md,
  },
  item: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderRadius: radii.lg,
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
  itemBody: {
    flex: 1,
    gap: spacing.xs,
  },
  itemTitle: {
    fontSize: typography.fontSizes.lg,
    fontWeight: typography.fontWeights.bold,
    color: colors.textPrimary,
  },
  itemMetaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  itemMeta: {
    fontSize: typography.fontSizes.sm,
    color: colors.textSecondary,
  },
  itemMetaSep: {
    fontSize: typography.fontSizes.sm,
    color: colors.border,
  },
  itemMetaCook: {
    color: '#E53E3E',
  },
  badge: {
    alignSelf: 'flex-start',
  },
});

import { useCallback, useState } from 'react';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  SafeAreaView,
  StatusBar,
  useWindowDimensions,
} from 'react-native';
import { useRouter, useFocusEffect, Stack } from 'expo-router';
import { getMealPlan, getRecipeById, setMeal, type Recipe } from '../lib/database';
import { colors, typography, spacing, radii, shadows } from '../lib/theme';
import { TabBar } from '../lib/TabBar';

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

// ─── Types ────────────────────────────────────────────────────

type DayData = {
  dateStr: string;
  label: { main: string; sub: string };
  lunchRecipe: Recipe | null;
  dinnerRecipe: Recipe | null;
};

// ─── Sous-composant : créneau repas ──────────────────────────

interface MealSlotProps {
  icon: string;
  label: string;
  recipe: Recipe | null;
  onPick: () => void;
  onView: () => void;
  onClear: () => void;
}

function MealSlot({ icon, label, recipe, onPick, onView, onClear }: MealSlotProps) {
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
          {/* Bouton supprimer le repas du créneau */}
          <TouchableOpacity style={styles.clearBtn} onPress={onClear} activeOpacity={0.7}>
            <Text style={styles.clearBtnText}>✕</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <TouchableOpacity style={styles.pickBtn} onPress={onPick} activeOpacity={0.8}>
          <Text style={styles.pickBtnText}>+ Choisir une recette</Text>
        </TouchableOpacity>
      )}
    </View>
  );
}

// ─── Sous-composant : page d'un jour ─────────────────────────

interface DayPageProps {
  day: DayData;
  width: number;
  height: number;
  router: ReturnType<typeof useRouter>;
  onClearMeal: (dateStr: string, slot: 'lunch' | 'dinner') => void;
}

function DayPage({ day, width, height, router, onClearMeal }: DayPageProps) {
  return (
    <View style={[styles.page, { width, height }]}>
      <View style={styles.dayLabelBlock}>
        <Text style={styles.dayMain}>{day.label.main}</Text>
        <Text style={styles.daySub}>{day.label.sub}</Text>
      </View>

      <View style={styles.slotsContainer}>
        <MealSlot
          icon="☀️"
          label="Midi"
          recipe={day.lunchRecipe}
          onPick={() => router.push(`/calendar/pick?date=${day.dateStr}&slot=lunch`)}
          onView={() => router.push(`/recipe/${day.lunchRecipe!.id}`)}
          onClear={() => onClearMeal(day.dateStr, 'lunch')}
        />
        <MealSlot
          icon="🌙"
          label="Soir"
          recipe={day.dinnerRecipe}
          onPick={() => router.push(`/calendar/pick?date=${day.dateStr}&slot=dinner`)}
          onView={() => router.push(`/recipe/${day.dinnerRecipe!.id}`)}
          onClear={() => onClearMeal(day.dateStr, 'dinner')}
        />
      </View>
    </View>
  );
}

// ─── Écran principal ─────────────────────────────────────────

export default function TodayScreen() {
  const router = useRouter();
  const { width } = useWindowDimensions();
  const [days, setDays] = useState<DayData[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [bodyHeight, setBodyHeight] = useState(0);

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

  useFocusEffect(loadData);

  function handleClearMeal(dateStr: string, slot: 'lunch' | 'dinner') {
    setMeal(dateStr, slot, null);
    loadData();
  }

  return (
    <>
      <Stack.Screen options={{ headerShown: false }} />
      <StatusBar barStyle="light-content" backgroundColor={colors.dark} />

      <View style={styles.root}>
        {/* Header fixe */}
        <SafeAreaView style={styles.header}>
          <Text style={styles.headerTitle}>Menu du jour</Text>
        </SafeAreaView>

        {/* Zone swipeable */}
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
              getItemLayout={(_, index) => ({
                length: width,
                offset: width * index,
                index,
              })}
              onMomentumScrollEnd={(e) => {
                const index = Math.round(e.nativeEvent.contentOffset.x / width);
                setCurrentIndex(index);
              }}
              keyExtractor={(item) => item.dateStr}
              renderItem={({ item }) => (
                <DayPage
                  day={item}
                  width={width}
                  height={bodyHeight}
                  router={router}
                  onClearMeal={handleClearMeal}
                />
              )}
            />
          )}
        </View>

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
    paddingHorizontal: spacing.xl,
    paddingTop: spacing.lg,
    paddingBottom: spacing.lg,
  },
  headerTitle: {
    fontSize: typography.fontSizes.sm,
    fontWeight: typography.fontWeights.bold,
    color: colors.primary,
    textTransform: 'uppercase',
    letterSpacing: 1.5,
  },

  // Body
  body: {
    flex: 1,
  },

  // Page d'un jour
  page: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.xl,
    paddingBottom: spacing.lg,
    justifyContent: 'center',
    gap: spacing.xxl,
  },
  dayLabelBlock: {
    gap: spacing.xs,
  },
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

  // Slots
  slotsContainer: {
    gap: spacing.lg,
  },
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
  slotIcon: {
    fontSize: 20,
  },
  slotLabel: {
    fontSize: typography.fontSizes.sm,
    fontWeight: typography.fontWeights.bold,
    color: colors.textSecondary,
    textTransform: 'uppercase',
    letterSpacing: 0.8,
  },

  // Recette sélectionnée
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
  recipeCardBody: {
    flex: 1,
  },
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

  // Bouton choisir
  pickBtn: {
    borderWidth: 1.5,
    borderColor: colors.primary,
    borderStyle: 'dashed',
    borderRadius: radii.lg,
    paddingVertical: spacing.lg,
    alignItems: 'center',
  },
  pickBtnText: {
    fontSize: typography.fontSizes.md,
    fontWeight: typography.fontWeights.bold,
    color: colors.primary,
  },

  // Dots
  dots: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: spacing.xs,
    paddingVertical: spacing.md,
  },
  dot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: colors.border,
  },
  dotActive: {
    width: 20,
    backgroundColor: colors.primary,
  },

  // Footer nav bar
  footer: {
    flexDirection: 'row',
    borderTopWidth: 1,
    borderTopColor: colors.border,
    backgroundColor: colors.surface,
  },
  footerBtn: {
    flex: 1,
    paddingVertical: spacing.md,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 2,
  },
  footerBtnActive: {
    borderTopWidth: 2,
    borderTopColor: colors.primary,
    marginTop: -1,
  },
  footerBtnIcon: {
    fontSize: 20,
  },
  footerBtnIconActive: {
    fontSize: 20,
  },
  footerBtnLabel: {
    fontSize: typography.fontSizes.xs,
    fontWeight: typography.fontWeights.medium,
    color: colors.textSecondary,
  },
  footerBtnLabelActive: {
    fontSize: typography.fontSizes.xs,
    fontWeight: typography.fontWeights.bold,
    color: colors.primary,
  },
});

import { useCallback, useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
} from 'react-native';
import { useRouter, useFocusEffect, Stack } from 'expo-router';

function HomeButton() {
  const router = useRouter();
  return (
    <TouchableOpacity onPress={() => router.replace('/')} style={{ paddingHorizontal: 8 }}>
      <Text style={{ fontSize: 22 }}>🏠</Text>
    </TouchableOpacity>
  );
}
import { getMealPlan, getRecipeById, type Recipe } from '../../lib/database';
import { colors, typography, spacing, radii, shadows } from '../../lib/theme';

// ─── Helpers date ─────────────────────────────────────────────

const DAYS_FR = ['Dimanche', 'Lundi', 'Mardi', 'Mercredi', 'Jeudi', 'Vendredi', 'Samedi'];
const MONTHS_FR = ['janv.', 'févr.', 'mars', 'avr.', 'mai', 'juin', 'juil.', 'août', 'sept.', 'oct.', 'nov.', 'déc.'];

function getDateString(offsetDays: number): string {
  const d = new Date();
  d.setDate(d.getDate() + offsetDays);
  return d.toISOString().split('T')[0];
}

function dayLabel(offset: number): string {
  if (offset === 0) return "Aujourd'hui";
  if (offset === 1) return 'Demain';
  const d = new Date();
  d.setDate(d.getDate() + offset);
  return DAYS_FR[d.getDay()];
}

function formatDate(dateStr: string): string {
  const d = new Date(dateStr + 'T12:00:00');
  return `${d.getDate()} ${MONTHS_FR[d.getMonth()]}`;
}

// ─── Types ────────────────────────────────────────────────────

type DayData = {
  offset: number;
  dateStr: string;
  label: string;
  date: string;
  lunchRecipe: Recipe | null;
  dinnerRecipe: Recipe | null;
};

// ─── Sous-composant : créneau repas ──────────────────────────

interface MealSlotProps {
  icon: string;
  label: string;
  recipe: Recipe | null;
  onPress: () => void;
}

function MealSlot({ icon, label, recipe, onPress }: MealSlotProps) {
  return (
    <TouchableOpacity
      style={[styles.slot, !recipe && styles.slotEmpty]}
      onPress={onPress}
      activeOpacity={0.7}
    >
      <Text style={styles.slotIcon}>{icon}</Text>
      <View style={styles.slotBody}>
        <Text style={styles.slotLabel}>{label}</Text>
        {recipe ? (
          <Text style={styles.slotRecipeName} numberOfLines={1}>
            {recipe.title}
          </Text>
        ) : (
          <Text style={styles.slotPlaceholder}>Rien de prévu</Text>
        )}
      </View>
      {recipe ? (
        <Text style={styles.slotChevron}>›</Text>
      ) : (
        <View style={styles.addBtn}>
          <Text style={styles.addBtnText}>+ Ajouter du plaisir</Text>
        </View>
      )}
    </TouchableOpacity>
  );
}

// ─── Écran calendrier ─────────────────────────────────────────

export default function CalendarScreen() {
  const router = useRouter();
  const [days, setDays] = useState<DayData[]>([]);

  const loadData = useCallback(() => {
    const loaded: DayData[] = [0, 1, 2].map((offset) => {
      const dateStr = getDateString(offset);
      const plan = getMealPlan(dateStr);
      return {
        offset,
        dateStr,
        label: dayLabel(offset),
        date: formatDate(dateStr),
        lunchRecipe: plan.lunch ? getRecipeById(plan.lunch) : null,
        dinnerRecipe: plan.dinner ? getRecipeById(plan.dinner) : null,
      };
    });
    setDays(loaded);
  }, []);

  useFocusEffect(loadData);

  return (
    <>
      <Stack.Screen
        options={{
          title: 'Mon planning',
          headerStyle: { backgroundColor: colors.dark },
          headerTintColor: colors.surface,
          headerTitleStyle: { fontWeight: 'bold' },
          headerRight: () => <HomeButton />,
        }}
      />
      <ScrollView
        style={styles.root}
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        {days.map((day) => (
          <View key={day.dateStr} style={styles.dayCard}>
            {/* En-tête du jour */}
            <View style={[styles.dayHeader, day.offset === 0 && styles.dayHeaderToday]}>
              <Text style={[styles.dayLabel, day.offset === 0 && styles.dayLabelToday]}>
                {day.label}
              </Text>
              <Text style={[styles.dayDate, day.offset === 0 && styles.dayDateToday]}>
                {day.date}
              </Text>
            </View>

            {/* Créneau midi */}
            <MealSlot
              icon="☀️"
              label="Midi"
              recipe={day.lunchRecipe}
              onPress={() =>
                day.lunchRecipe
                  ? router.push(`/recipe/${day.lunchRecipe.id}`)
                  : router.push(`/calendar/pick?date=${day.dateStr}&slot=lunch`)
              }
            />

            <View style={styles.slotDivider} />

            {/* Créneau soir */}
            <MealSlot
              icon="🌙"
              label="Soir"
              recipe={day.dinnerRecipe}
              onPress={() =>
                day.dinnerRecipe
                  ? router.push(`/recipe/${day.dinnerRecipe.id}`)
                  : router.push(`/calendar/pick?date=${day.dateStr}&slot=dinner`)
              }
            />
          </View>
        ))}
      </ScrollView>
    </>
  );
}

// ─── Styles ───────────────────────────────────────────────────

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: colors.background,
  },
  content: {
    padding: spacing.lg,
    gap: spacing.lg,
    paddingBottom: spacing.xxxxl,
  },

  // Carte jour
  dayCard: {
    backgroundColor: colors.surface,
    borderRadius: radii.lg,
    overflow: 'hidden',
    ...shadows.md,
  },
  dayHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    backgroundColor: colors.background,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  dayHeaderToday: {
    backgroundColor: colors.dark,
    borderBottomColor: 'transparent',
  },
  dayLabel: {
    fontSize: typography.fontSizes.lg,
    fontWeight: typography.fontWeights.bold,
    color: colors.textPrimary,
  },
  dayLabelToday: {
    color: colors.surface,
  },
  dayDate: {
    fontSize: typography.fontSizes.sm,
    color: colors.textSecondary,
    fontWeight: typography.fontWeights.medium,
  },
  dayDateToday: {
    color: colors.primary,
  },

  // Créneau repas
  slot: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    gap: spacing.md,
    minHeight: 64,
  },
  slotEmpty: {
    // pas de style supplémentaire, l'état vide est géré par le contenu
  },
  slotIcon: {
    fontSize: 20,
    width: 28,
    textAlign: 'center',
  },
  slotBody: {
    flex: 1,
  },
  slotLabel: {
    fontSize: typography.fontSizes.xs,
    fontWeight: typography.fontWeights.bold,
    color: colors.textSecondary,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  slotRecipeName: {
    fontSize: typography.fontSizes.md,
    fontWeight: typography.fontWeights.semiBold,
    color: colors.textPrimary,
    marginTop: 2,
  },
  slotPlaceholder: {
    fontSize: typography.fontSizes.sm,
    color: colors.textSecondary,
    marginTop: 2,
    fontStyle: 'italic',
  },
  slotChevron: {
    fontSize: 22,
    color: colors.textSecondary,
  },
  addBtn: {
    backgroundColor: colors.primaryLight,
    borderRadius: radii.full,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    borderWidth: 1,
    borderColor: colors.primary + '44',
  },
  addBtnText: {
    fontSize: typography.fontSizes.xs,
    fontWeight: typography.fontWeights.bold,
    color: colors.primary,
  },
  slotDivider: {
    height: 1,
    backgroundColor: colors.border,
    marginHorizontal: spacing.lg,
  },
});

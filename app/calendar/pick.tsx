import { useEffect, useState } from 'react';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  StyleSheet,
} from 'react-native';
import { useLocalSearchParams, useRouter, Stack } from 'expo-router';
import { getAllRecipes, setMeal, type Recipe, type MealSlot } from '../../lib/database';
import { colors, typography, spacing, radii, shadows } from '../../lib/theme';

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

const SLOT_LABEL: Record<string, string> = {
  lunch: 'Midi',
  dinner: 'Soir',
};

export default function PickRecipeScreen() {
  const router = useRouter();
  const { date, slot } = useLocalSearchParams<{ date: string; slot: MealSlot }>();
  const [recipes, setRecipes] = useState<Recipe[]>([]);

  useEffect(() => {
    setRecipes(getAllRecipes());
  }, []);

  function handlePick(recipe: Recipe) {
    setMeal(date, slot, recipe.id);
    router.back();
  }

  const slotLabel = SLOT_LABEL[slot] ?? slot;

  return (
    <>
      <Stack.Screen
        options={{
          title: `Choisir pour ${slotLabel}`,
          presentation: 'modal',
          headerStyle: { backgroundColor: colors.dark },
          headerTintColor: colors.surface,
          headerTitleStyle: { fontWeight: 'bold' },
        }}
      />
      <FlatList
        data={recipes}
        keyExtractor={(item) => String(item.id)}
        style={styles.root}
        contentContainerStyle={styles.list}
        showsVerticalScrollIndicator={false}
        ListHeaderComponent={
          <Text style={styles.hint}>Appuie sur une recette pour l'ajouter au menu.</Text>
        }
        renderItem={({ item }) => {
          const emoji = CATEGORY_EMOJI[item.category] ?? '🍴';
          const emojiBg = EMOJI_BG[item.category] ?? colors.primaryLight;
          return (
            <TouchableOpacity
              style={styles.card}
              onPress={() => handlePick(item)}
              activeOpacity={0.7}
            >
              <View style={[styles.emojiBox, { backgroundColor: emojiBg }]}>
                <Text style={styles.emojiText}>{emoji}</Text>
              </View>
              <View style={styles.cardBody}>
                <Text style={styles.cardTitle}>{item.title}</Text>
                <Text style={styles.cardMeta}>
                  {item.category} · ⏱ {item.prep_time} min
                </Text>
              </View>
              <Text style={styles.cardChevron}>›</Text>
            </TouchableOpacity>
          );
        }}
      />
    </>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: colors.background,
  },
  list: {
    padding: spacing.lg,
    gap: spacing.md,
    paddingBottom: spacing.xxxxl,
  },
  hint: {
    fontSize: typography.fontSizes.sm,
    color: colors.textSecondary,
    marginBottom: spacing.md,
    textAlign: 'center',
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
    width: 48,
    height: 48,
    borderRadius: radii.md,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  emojiText: {
    fontSize: 24,
  },
  cardBody: {
    flex: 1,
  },
  cardTitle: {
    fontSize: typography.fontSizes.md,
    fontWeight: typography.fontWeights.bold,
    color: colors.textPrimary,
  },
  cardMeta: {
    fontSize: typography.fontSizes.sm,
    color: colors.textSecondary,
    marginTop: 2,
  },
  cardChevron: {
    fontSize: 22,
    color: colors.textSecondary,
  },
});

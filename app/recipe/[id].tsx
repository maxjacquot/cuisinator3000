import { useEffect, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Alert } from 'react-native';
import { useLocalSearchParams, useRouter, useNavigation } from 'expo-router';
import { getRecipeById, deleteRecipe, type Recipe } from '../../lib/database';

const CATEGORY_COLORS: Record<string, string> = {
  Entrée: '#4CAF50',
  Plat: '#FF6B35',
  Dessert: '#9C27B0',
};

export default function RecipeScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const navigation = useNavigation();
  const [recipe, setRecipe] = useState<Recipe | null>(null);

  useEffect(() => {
    if (id) {
      const r = getRecipeById(Number(id));
      setRecipe(r);
      if (r) navigation.setOptions({ title: r.title });
    }
  }, [id]);

  function handleDelete() {
    Alert.alert(
      'Supprimer la recette',
      `Voulez-vous vraiment supprimer "${recipe?.title}" ?`,
      [
        { text: 'Annuler', style: 'cancel' },
        {
          text: 'Supprimer',
          style: 'destructive',
          onPress: () => {
            deleteRecipe(Number(id));
            router.back();
          },
        },
      ]
    );
  }

  if (!recipe) {
    return (
      <View style={styles.centered}>
        <Text style={styles.notFound}>Recette introuvable.</Text>
      </View>
    );
  }

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      {/* Badge catégorie + temps */}
      <View style={styles.metaRow}>
        <View
          style={[
            styles.categoryBadge,
            { backgroundColor: CATEGORY_COLORS[recipe.category] ?? '#888' },
          ]}
        >
          <Text style={styles.categoryText}>{recipe.category}</Text>
        </View>
        <View style={styles.timeBadge}>
          <Text style={styles.timeText}>⏱ {recipe.prep_time} min</Text>
        </View>
      </View>

      {/* Titre */}
      <Text style={styles.title}>{recipe.title}</Text>

      {/* Séparateur */}
      <View style={styles.divider} />

      {/* Description */}
      <Text style={styles.sectionLabel}>Description</Text>
      <Text style={styles.description}>{recipe.description}</Text>

      {/* Bouton supprimer */}
      <TouchableOpacity style={styles.deleteBtn} onPress={handleDelete}>
        <Text style={styles.deleteBtnText}>Supprimer la recette</Text>
      </TouchableOpacity>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFF9F5',
  },
  content: {
    padding: 20,
    paddingBottom: 60,
  },
  centered: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  notFound: {
    color: '#aaa',
    fontSize: 16,
  },
  metaRow: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 14,
  },
  categoryBadge: {
    paddingHorizontal: 14,
    paddingVertical: 5,
    borderRadius: 14,
  },
  categoryText: {
    color: '#fff',
    fontWeight: '700',
    fontSize: 13,
  },
  timeBadge: {
    paddingHorizontal: 14,
    paddingVertical: 5,
    borderRadius: 14,
    backgroundColor: '#F0E8E0',
  },
  timeText: {
    color: '#664',
    fontWeight: '600',
    fontSize: 13,
  },
  title: {
    fontSize: 28,
    fontWeight: '800',
    color: '#1A1A1A',
    marginBottom: 16,
    lineHeight: 34,
  },
  divider: {
    height: 1,
    backgroundColor: '#E8DDD5',
    marginBottom: 20,
  },
  sectionLabel: {
    fontSize: 12,
    fontWeight: '700',
    color: '#FF6B35',
    textTransform: 'uppercase',
    letterSpacing: 1,
    marginBottom: 8,
  },
  description: {
    fontSize: 16,
    color: '#444',
    lineHeight: 26,
  },
  deleteBtn: {
    marginTop: 50,
    paddingVertical: 14,
    borderRadius: 12,
    backgroundColor: '#FEE2E2',
    alignItems: 'center',
  },
  deleteBtnText: {
    color: '#DC2626',
    fontWeight: '700',
    fontSize: 15,
  },
});

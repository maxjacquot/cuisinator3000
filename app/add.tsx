import { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  Alert,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { useRouter } from 'expo-router';
import { addRecipe } from '../lib/database';

const CATEGORIES = ['Entrée', 'Plat', 'Dessert'];

export default function AddScreen() {
  const router = useRouter();
  const [title, setTitle] = useState('');
  const [category, setCategory] = useState('Plat');
  const [prepTime, setPrepTime] = useState('');
  const [description, setDescription] = useState('');
  const [ingredients, setIngredients] = useState('');

  function handleSave() {
    if (!title.trim()) {
      Alert.alert('Erreur', 'Le titre est obligatoire.');
      return;
    }
    if (!prepTime || isNaN(Number(prepTime)) || Number(prepTime) <= 0) {
      Alert.alert('Erreur', 'Le temps de préparation doit être un nombre valide.');
      return;
    }
    if (!description.trim()) {
      Alert.alert('Erreur', 'La description est obligatoire.');
      return;
    }

    addRecipe({
      title: title.trim(),
      category,
      prep_time: Number(prepTime),
      description: description.trim(),
      ingredients: ingredients.trim(),
    });

    router.back();
  }

  return (
    <KeyboardAvoidingView
      style={{ flex: 1 }}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <ScrollView style={styles.container} contentContainerStyle={styles.content}>
        <Text style={styles.label}>Titre *</Text>
        <TextInput
          style={styles.input}
          placeholder="Nom de la recette"
          placeholderTextColor="#bbb"
          value={title}
          onChangeText={setTitle}
        />

        <Text style={styles.label}>Catégorie *</Text>
        <View style={styles.categoryRow}>
          {CATEGORIES.map((cat) => (
            <TouchableOpacity
              key={cat}
              style={[styles.catBtn, category === cat && styles.catBtnActive]}
              onPress={() => setCategory(cat)}
            >
              <Text style={[styles.catText, category === cat && styles.catTextActive]}>
                {cat}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        <Text style={styles.label}>Temps de préparation (min) *</Text>
        <TextInput
          style={styles.input}
          placeholder="Ex : 30"
          placeholderTextColor="#bbb"
          keyboardType="numeric"
          value={prepTime}
          onChangeText={setPrepTime}
        />

        <Text style={styles.label}>Description *</Text>
        <TextInput
          style={[styles.input, styles.textArea]}
          placeholder="Décrivez votre recette..."
          placeholderTextColor="#bbb"
          multiline
          numberOfLines={5}
          textAlignVertical="top"
          value={description}
          onChangeText={setDescription}
        />

        <Text style={styles.label}>Ingrédients</Text>
        <Text style={styles.inputHint}>Un ingrédient par ligne</Text>
        <TextInput
          style={[styles.input, styles.textArea]}
          placeholder={'Pâtes (400g)\nGuanciale\nŒufs\n...'}
          placeholderTextColor="#bbb"
          multiline
          numberOfLines={6}
          textAlignVertical="top"
          value={ingredients}
          onChangeText={setIngredients}
        />

        <TouchableOpacity style={styles.saveBtn} onPress={handleSave}>
          <Text style={styles.saveBtnText}>Enregistrer la recette</Text>
        </TouchableOpacity>
      </ScrollView>
    </KeyboardAvoidingView>
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
  label: {
    fontSize: 13,
    fontWeight: '700',
    color: '#FF6B35',
    textTransform: 'uppercase',
    letterSpacing: 0.8,
    marginBottom: 8,
    marginTop: 20,
  },
  input: {
    backgroundColor: '#fff',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    fontSize: 15,
    color: '#333',
    borderWidth: 1,
    borderColor: '#E0D5CC',
  },
  textArea: {
    height: 130,
    paddingTop: 12,
  },
  inputHint: {
    fontSize: 12,
    color: '#aaa',
    marginBottom: 6,
    marginTop: -4,
  },
  categoryRow: {
    flexDirection: 'row',
    gap: 10,
  },
  catBtn: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 12,
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#E0D5CC',
    alignItems: 'center',
  },
  catBtnActive: {
    backgroundColor: '#FF6B35',
    borderColor: '#FF6B35',
  },
  catText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#666',
  },
  catTextActive: {
    color: '#fff',
  },
  saveBtn: {
    marginTop: 36,
    paddingVertical: 16,
    borderRadius: 14,
    backgroundColor: '#FF6B35',
    alignItems: 'center',
    shadowColor: '#FF6B35',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  saveBtnText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '800',
  },
});

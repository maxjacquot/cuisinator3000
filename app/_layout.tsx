import { useEffect } from 'react';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { initDatabase } from '../lib/database';

export default function RootLayout() {
  useEffect(() => {
    initDatabase();
  }, []);

  return (
    <>
      <StatusBar style="dark" />
      <Stack
        screenOptions={{
          headerStyle: { backgroundColor: '#FF6B35' },
          headerTintColor: '#fff',
          headerTitleStyle: { fontWeight: 'bold' },
          contentStyle: { backgroundColor: '#FFF9F5' },
        }}
      >
        <Stack.Screen
          name="index"
          options={{ title: 'Cuisinator 3000' }}
        />
        <Stack.Screen
          name="recipe/[id]"
          options={{ title: 'Recette' }}
        />
        <Stack.Screen
          name="add"
          options={{ title: 'Nouvelle recette', presentation: 'modal' }}
        />
      </Stack>
    </>
  );
}

import { View, Text, Pressable, StyleSheet } from 'react-native';
import { useRouter, usePathname } from 'expo-router';
import { colors, typography, spacing } from './theme';

const TABS = [
  { label: 'Courses', icon: '🛒', href: '/courses' },
  { label: 'Accueil', icon: '🏠', href: '/' },
  { label: 'Recettes', icon: '📖', href: '/recipes' },
] as const;

interface TabBarProps {
  // Mode panneau : props explicites (pas de navigation)
  activeTab?: number;
  onSwitch?: (index: number) => void;
}

export function TabBar({ activeTab, onSwitch }: TabBarProps) {
  // Mode legacy : détection par pathname + router (pour les écrans standalone restants)
  const router = useRouter();
  const pathname = usePathname();

  function isActive(index: number) {
    if (activeTab !== undefined) return index === activeTab;
    const href = TABS[index].href;
    if (href === '/') return pathname === '/';
    return pathname.startsWith(href);
  }

  function handlePress(index: number) {
    if (isActive(index)) return;
    if (onSwitch) {
      onSwitch(index);
    } else {
      router.replace(TABS[index].href);
    }
  }

  return (
    <View style={styles.container}>
      {TABS.map((tab, i) => {
        const active = isActive(i);
        return (
          <Pressable
            key={tab.label}
            style={({ pressed }) => [styles.tab, pressed && !active && styles.tabPressed]}
            onPress={() => handlePress(i)}
          >
            {active && <View style={styles.activeIndicator} />}
            <Text style={styles.icon}>{tab.icon}</Text>
            <Text style={[styles.label, active && styles.labelActive]}>{tab.label}</Text>
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    backgroundColor: colors.surface,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  tab: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing.md,
    gap: 2,
  },
  tabPressed: {
    opacity: 0.45,
  },
  activeIndicator: {
    position: 'absolute',
    top: 0,
    left: '20%',
    right: '20%',
    height: 2,
    backgroundColor: colors.primary,
    borderBottomLeftRadius: 2,
    borderBottomRightRadius: 2,
  },
  icon: {
    fontSize: 20,
  },
  label: {
    fontSize: typography.fontSizes.xs,
    fontWeight: typography.fontWeights.medium,
    color: colors.textSecondary,
  },
  labelActive: {
    fontWeight: typography.fontWeights.bold,
    color: colors.primary,
  },
});

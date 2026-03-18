import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { useRouter, usePathname } from 'expo-router';
import { colors, typography, spacing } from './theme';

const TABS = [
  { label: 'Courses', icon: '🛒', href: '/courses' },
  { label: 'Accueil', icon: '🏠', href: '/' },
  { label: 'Recettes', icon: '📖', href: '/recipes' },
] as const;

export function TabBar() {
  const router = useRouter();
  const pathname = usePathname();

  function isActive(href: string) {
    if (href === '/') return pathname === '/';
    return pathname.startsWith(href);
  }

  return (
    <View style={styles.container}>
      {TABS.map((tab) => {
        const active = isActive(tab.href);
        return (
          <TouchableOpacity
            key={tab.href}
            style={styles.tab}
            onPress={() => router.navigate(tab.href)}
            activeOpacity={0.7}
          >
            {active && <View style={styles.activeIndicator} />}
            <Text style={styles.icon}>{tab.icon}</Text>
            <Text style={[styles.label, active && styles.labelActive]}>{tab.label}</Text>
          </TouchableOpacity>
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

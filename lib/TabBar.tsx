import { View, Text, Pressable, StyleSheet } from 'react-native';
import { colors, typography, spacing } from './theme';

const TABS = [
  { label: 'Courses', icon: '🛒' },
  { label: 'Accueil', icon: '🏠' },
  { label: 'Recettes', icon: '📖' },
] as const;

interface TabBarProps {
  activeTab: number;
  onSwitch: (index: number) => void;
}

export function TabBar({ activeTab, onSwitch }: TabBarProps) {
  return (
    <View style={styles.container}>
      {TABS.map((tab, i) => {
        const active = i === activeTab;
        return (
          <Pressable
            key={tab.label}
            style={({ pressed }) => [styles.tab, pressed && !active && styles.tabPressed]}
            onPress={() => { if (!active) onSwitch(i); }}
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

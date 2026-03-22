import { useState, useEffect } from 'react';
import {
  View,
  Text,
  Modal,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  SafeAreaView,
} from 'react-native';
import { getMealPlan, setMeal, type Recipe } from './database';
import { colors, typography, spacing, radii, shadows } from './theme';

// ─── Helpers ──────────────────────────────────────────────────

type SlotKey = 'lunch' | 'dinner';

const DAYS_SHORT = ['Dim.', 'Lun.', 'Mar.', 'Mer.', 'Jeu.', 'Ven.', 'Sam.'];
const MONTHS_SHORT = ['jan.', 'fév.', 'mar.', 'avr.', 'mai', 'juin', 'juil.', 'août', 'sep.', 'oct.', 'nov.', 'déc.'];

export function getPlanningDays() {
  return Array.from({ length: 7 }, (_, offset) => {
    const d = new Date();
    d.setDate(d.getDate() + offset);
    const dateStr = d.toISOString().split('T')[0];
    const label = offset === 0
      ? `Aujourd'hui, ${d.getDate()} ${MONTHS_SHORT[d.getMonth()]}`
      : offset === 1
      ? `Demain, ${d.getDate()} ${MONTHS_SHORT[d.getMonth()]}`
      : `${DAYS_SHORT[d.getDay()]} ${d.getDate()} ${MONTHS_SHORT[d.getMonth()]}`;
    return { dateStr, label };
  });
}

// ─── Composant PlanningModal ───────────────────────────────────

export interface PlanningModalProps {
  visible: boolean;
  recipe: Recipe;
  /** Pré-sélectionne un créneau à l'ouverture (optionnel) */
  preselect?: { dateStr: string; slot: SlotKey };
  onClose: () => void;
  /** pendingAdds = créneaux à ajouter (setMeal différé), newSlots = nombre */
  onConfirm: (pendingAdds: { dateStr: string; slot: SlotKey; id: number }[], newSlots: number) => void;
}

export function PlanningModal({ visible, recipe, preselect, onClose, onConfirm }: PlanningModalProps) {
  const days = getPlanningDays();
  const [selected, setSelected] = useState<Record<string, Record<SlotKey, boolean>>>({});

  useEffect(() => {
    if (!visible) return;
    const init: Record<string, Record<SlotKey, boolean>> = {};
    for (const { dateStr } of days) {
      const plan = getMealPlan(dateStr);
      init[dateStr] = {
        lunch: plan.lunch === recipe.id,
        dinner: plan.dinner === recipe.id,
      };
    }
    // Pré-sélection depuis l'accueil
    if (preselect) {
      init[preselect.dateStr] = {
        ...(init[preselect.dateStr] ?? { lunch: false, dinner: false }),
        [preselect.slot]: true,
      };
    }
    setSelected(init);
  }, [visible, recipe.id, preselect?.dateStr, preselect?.slot]);

  function toggle(dateStr: string, slot: SlotKey) {
    setSelected((prev) => ({
      ...prev,
      [dateStr]: { ...prev[dateStr], [slot]: !prev[dateStr]?.[slot] },
    }));
  }

  function handleConfirm() {
    const pendingAdds: { dateStr: string; slot: SlotKey; id: number }[] = [];
    let newSlots = 0;
    for (const { dateStr } of days) {
      const s = selected[dateStr];
      if (!s) continue;
      const plan = getMealPlan(dateStr);
      if (s.lunch) {
        if (plan.lunch !== recipe.id) {
          newSlots++;
          pendingAdds.push({ dateStr, slot: 'lunch', id: recipe.id });
        }
      } else if (plan.lunch === recipe.id) {
        setMeal(dateStr, 'lunch', null); // suppressions immédiates
      }
      if (s.dinner) {
        if (plan.dinner !== recipe.id) {
          newSlots++;
          pendingAdds.push({ dateStr, slot: 'dinner', id: recipe.id });
        }
      } else if (plan.dinner === recipe.id) {
        setMeal(dateStr, 'dinner', null); // suppressions immédiates
      }
    }
    onClose();
    onConfirm(pendingAdds, newSlots);
  }

  const totalSelected = Object.values(selected).reduce(
    (acc, s) => acc + (s?.lunch ? 1 : 0) + (s?.dinner ? 1 : 0),
    0
  );

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet" onRequestClose={onClose}>
      <SafeAreaView style={s.root}>
        <View style={s.header}>
          <View style={{ flex: 1 }}>
            <Text style={s.title}>Ajouter au planning</Text>
            <Text style={s.subtitle}>{recipe.title}</Text>
          </View>
          <TouchableOpacity onPress={onClose} style={s.closeBtn}>
            <Text style={s.closeBtnText}>✕</Text>
          </TouchableOpacity>
        </View>

        <Text style={s.hint}>Sélectionne les créneaux où tu veux cuisiner cette recette.</Text>

        <FlatList
          data={days}
          keyExtractor={(item) => item.dateStr}
          contentContainerStyle={s.list}
          renderItem={({ item }) => {
            const sel = selected[item.dateStr] ?? { lunch: false, dinner: false };
            return (
              <View style={s.dayRow}>
                <Text style={s.dayLabel}>{item.label}</Text>
                <View style={s.slotBtns}>
                  <TouchableOpacity
                    style={[s.slotBtn, sel.lunch && s.slotBtnActive]}
                    onPress={() => toggle(item.dateStr, 'lunch')}
                    activeOpacity={0.75}
                  >
                    <Text style={[s.slotBtnText, sel.lunch && s.slotBtnTextActive]}>☀️  Midi</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[s.slotBtn, sel.dinner && s.slotBtnActive]}
                    onPress={() => toggle(item.dateStr, 'dinner')}
                    activeOpacity={0.75}
                  >
                    <Text style={[s.slotBtnText, sel.dinner && s.slotBtnTextActive]}>🌙  Soir</Text>
                  </TouchableOpacity>
                </View>
              </View>
            );
          }}
        />

        <View style={s.footer}>
          <TouchableOpacity
            style={[s.confirmBtn, totalSelected === 0 && s.confirmBtnDisabled]}
            onPress={handleConfirm}
            disabled={totalSelected === 0}
            activeOpacity={0.85}
          >
            <Text style={s.confirmBtnText}>
              {totalSelected === 0
                ? 'Sélectionne un créneau'
                : `Confirmer (${totalSelected} créneau${totalSelected > 1 ? 'x' : ''})`}
            </Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    </Modal>
  );
}

// ─── Styles ───────────────────────────────────────────────────

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.background },
  header: {
    flexDirection: 'row',
    alignItems: 'flex-start',
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
  subtitle: {
    fontSize: typography.fontSizes.sm,
    color: colors.textSecondary,
    marginTop: spacing.xs,
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
  hint: {
    fontSize: typography.fontSizes.sm,
    color: colors.textSecondary,
    paddingHorizontal: spacing.xl,
    paddingVertical: spacing.lg,
    fontStyle: 'italic',
  },
  list: { paddingHorizontal: spacing.lg, gap: spacing.sm, paddingBottom: spacing.lg },
  dayRow: {
    backgroundColor: colors.surface,
    borderRadius: radii.lg,
    padding: spacing.lg,
    gap: spacing.md,
    ...shadows.sm,
  },
  dayLabel: {
    fontSize: typography.fontSizes.md,
    fontWeight: typography.fontWeights.semiBold,
    color: colors.textPrimary,
  },
  slotBtns: { flexDirection: 'row', gap: spacing.sm },
  slotBtn: {
    flex: 1,
    paddingVertical: spacing.md,
    borderRadius: radii.md,
    alignItems: 'center',
    borderWidth: 1.5,
    borderColor: colors.border,
    backgroundColor: colors.background,
  },
  slotBtnActive: {
    backgroundColor: colors.primaryLight,
    borderColor: colors.primary,
  },
  slotBtnText: {
    fontSize: typography.fontSizes.sm,
    fontWeight: typography.fontWeights.semiBold,
    color: colors.textSecondary,
  },
  slotBtnTextActive: {
    color: colors.primary,
    fontWeight: typography.fontWeights.bold,
  },
  footer: {
    padding: spacing.xl,
    borderTopWidth: 1,
    borderTopColor: colors.border,
    backgroundColor: colors.surface,
  },
  confirmBtn: {
    backgroundColor: colors.primary,
    borderRadius: radii.lg,
    paddingVertical: spacing.lg,
    alignItems: 'center',
    ...shadows.primary,
  },
  confirmBtnDisabled: {
    backgroundColor: colors.border,
    shadowOpacity: 0,
    elevation: 0,
  },
  confirmBtnText: {
    color: colors.surface,
    fontSize: typography.fontSizes.md,
    fontWeight: typography.fontWeights.extraBold,
  },
});

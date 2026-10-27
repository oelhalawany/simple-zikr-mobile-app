import React from 'react';
import { Alert, Pressable, ScrollView, StyleSheet, Text } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { theme } from '../constants/theme';
import FullScreenModal from './FullScreenModal';

interface Props {
  visible: boolean;
  onClose: () => void;
  /** Fired only after the user confirms in the Alert. */
  onResetToday: () => void;
  /** Fired only after both chained Alerts are confirmed. */
  onResetEverything: () => void;
}

/**
 * Full-screen settings sheet. Owns the confirmation dialogs so the screen only
 * receives "the user confirmed" callbacks and stays about state.
 */
export default function SettingsModal({ visible, onClose, onResetToday, onResetEverything }: Props) {
  const insets = useSafeAreaInsets();

  const askFinalResetEverything = () => {
    Alert.alert('تصفير كل شيء', 'هل أنت متأكد؟ سيُحذف السجل كله ولا يمكن التراجع عن ذلك.', [
      { text: 'إلغاء', style: 'cancel' },
      { text: 'حذف الكل', style: 'destructive', onPress: onResetEverything },
    ]);
  };

  const askResetEverything = () => {
    Alert.alert('تصفير كل شيء', 'سيُحذف سجل جميع الأيام والإجمالي الكلي، وليس عدادات اليوم فقط.', [
      { text: 'إلغاء', style: 'cancel' },
      { text: 'متابعة', style: 'destructive', onPress: askFinalResetEverything },
    ]);
  };

  const askResetToday = () => {
    Alert.alert('تصفير اليوم', 'ستُصفَّر عدادات اليوم فقط، ويبقى سجل الأيام السابقة كما هو.', [
      { text: 'إلغاء', style: 'cancel' },
      { text: 'تصفير', style: 'destructive', onPress: onResetToday },
    ]);
  };

  return (
    <FullScreenModal visible={visible} title="الإعدادات" onClose={onClose}>
      <ScrollView
        contentContainerStyle={[styles.body, { paddingBottom: insets.bottom + 40 }]}
      >
        <Text style={styles.sectionLabel}>البيانات</Text>

        <Pressable
          onPress={askResetToday}
          style={({ pressed }) => [styles.row, pressed && styles.rowPressed]}
          accessibilityRole="button"
          accessibilityLabel="تصفير اليوم"
        >
          <Text style={styles.rowTitle}>تصفير اليوم</Text>
          <Text style={styles.rowHint}>يصفّر عدادات اليوم ويحتفظ بسجل الأيام السابقة</Text>
        </Pressable>

        <Pressable
          onPress={askResetEverything}
          style={({ pressed }) => [styles.row, pressed && styles.rowPressed]}
          accessibilityRole="button"
          accessibilityLabel="تصفير كل شيء"
        >
          <Text style={[styles.rowTitle, styles.dangerText]}>تصفير كل شيء</Text>
          <Text style={styles.rowHint}>يمسح عدادات اليوم والسجل والإجمالي الكلي</Text>
        </Pressable>

        <Text style={styles.footerNote}>لا يمكن التراجع عن أي من هذه الإجراءات.</Text>
      </ScrollView>
    </FullScreenModal>
  );
}

const styles = StyleSheet.create({
  body: {
    width: '100%',
    maxWidth: 520,
    alignSelf: 'center',
    paddingHorizontal: 16,
    paddingTop: 22,
    paddingBottom: 40,
  },
  sectionLabel: {
    fontSize: 13,
    fontWeight: 'bold',
    color: theme.sage,
    marginBottom: 10,
    textAlign: 'right',
  },
  row: {
    backgroundColor: theme.ink2,
    borderRadius: 14,
    paddingVertical: 16,
    paddingHorizontal: 18,
    marginBottom: 12,
  },
  rowPressed: {
    backgroundColor: theme.ink2Pressed,
  },
  rowTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: theme.text,
    textAlign: 'right',
  },
  dangerText: {
    color: theme.danger,
  },
  rowHint: {
    fontSize: 12,
    color: theme.sage,
    marginTop: 4,
    lineHeight: 18,
    textAlign: 'right',
  },
  footerNote: {
    fontSize: 12,
    color: theme.textFaint,
    marginTop: 6,
    textAlign: 'right',
  },
});

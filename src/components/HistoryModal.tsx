import React from 'react';
import { ScrollView, StyleSheet } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import FullScreenModal from './FullScreenModal';
import HistoryList, { type HistoryEntry } from './HistoryList';

interface Props {
  visible: boolean;
  onClose: () => void;
  entries: HistoryEntry[];
}

/** Past days, opened from the home screen's history button. */
export default function HistoryModal({ visible, onClose, entries }: Props) {
  const insets = useSafeAreaInsets();
  return (
    <FullScreenModal visible={visible} title="الأيام السابقة" onClose={onClose}>
      <ScrollView
        contentContainerStyle={[styles.body, { paddingBottom: insets.bottom + 40 }]}
      >
        <HistoryList entries={entries} />
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
});

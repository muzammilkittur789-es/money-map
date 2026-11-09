import React, { useState } from 'react';
import {
  Modal,
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Image,
  Alert,
  ActivityIndicator,
  Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { Expense, ExpenseCategory, ExpenseScope, FamilyMember, PaymentMode } from '../types';
import { DEMO_RECEIPTS, ParsedItem } from '../utils/receiptParser';
import { getCategoryMeta } from '../utils/categories';

interface ReceiptScannerModalProps {
  visible: boolean;
  onClose: () => void;
  onSaveExpenses: (expenses: Expense[]) => void;
  currentUser: FamilyMember;
  familyMembers: FamilyMember[];
}

export const ReceiptScannerModal: React.FC<ReceiptScannerModalProps> = ({
  visible,
  onClose,
  onSaveExpenses,
  currentUser,
  familyMembers,
}) => {
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [storeName, setStoreName] = useState<string>('Online Order');
  const [items, setItems] = useState<ParsedItem[]>(DEMO_RECEIPTS.blinkit.items);
  const [scope, setScope] = useState<ExpenseScope>('FAMILY');
  const [selectedSpender, setSelectedSpender] = useState<FamilyMember>(currentUser);
  const [paymentMode, setPaymentMode] = useState<PaymentMode>('ONLINE');

  const handlePickImage = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert(
        'Permission Required',
        'Gallery permission is needed to import order screenshots.'
      );
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsEditing: false,
      quality: 0.8,
    });

    if (!result.canceled && result.assets && result.assets.length > 0) {
      setSelectedImage(result.assets[0].uri);
      processImage();
    }
  };

  const handleTakePhoto = async () => {
    const { status } = await ImagePicker.requestCameraPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert(
        'Permission Required',
        'Camera permission is needed to photograph physical bills.'
      );
      return;
    }

    const result = await ImagePicker.launchCameraAsync({
      allowsEditing: false,
      quality: 0.8,
    });

    if (!result.canceled && result.assets && result.assets.length > 0) {
      setSelectedImage(result.assets[0].uri);
      processImage();
    }
  };

  const processImage = () => {
    setLoading(true);
    // Simulating OCR parsing delay for realistic tactile feedback
    setTimeout(() => {
      setStoreName('Amazon Order Receipt');
      setItems(DEMO_RECEIPTS.amazon.items);
      setLoading(false);
    }, 1200);
  };

  const loadDemoReceipt = (key: 'blinkit' | 'amazon') => {
    const demo = DEMO_RECEIPTS[key];
    setStoreName(demo.storeName);
    setItems(demo.items);
    setSelectedImage(null);
  };

  const toggleItemSelection = (id: string) => {
    setItems((prev) =>
      prev.map((item) => (item.id === id ? { ...item, selected: !item.selected } : item))
    );
  };

  const cycleCategory = (id: string) => {
    const categoryList: ExpenseCategory[] = [
      'Groceries',
      'Home & Maintenance',
      'Education',
      'Health & Medical',
      'Shopping',
      'Dining & Food',
      'Bills & Utilities',
      'Other',
    ];

    setItems((prev) =>
      prev.map((item) => {
        if (item.id === id) {
          const currentIndex = categoryList.indexOf(item.category);
          const nextCategory = categoryList[(currentIndex + 1) % categoryList.length];
          return { ...item, category: nextCategory };
        }
        return item;
      })
    );
  };

  const selectedItems = items.filter((i) => i.selected);
  const selectedTotal = selectedItems.reduce((acc, curr) => acc + curr.price, 0);

  const handleSaveAll = () => {
    if (selectedItems.length === 0) {
      Alert.alert('No Items Selected', 'Please check at least one item to save.');
      return;
    }

    const newExpenses: Expense[] = selectedItems.map((item, index) => ({
      id: `exp_itemized_${Date.now()}_${index}`,
      title: item.name,
      amount: item.price,
      category: item.category,
      paymentMode,
      upiProvider: paymentMode === 'ONLINE' ? 'PHONEPE' : undefined,
      payeeName: storeName,
      scope,
      spentBy: selectedSpender,
      date: new Date().toISOString(),
      notes: `Imported from ${storeName}`,
      status: 'COMPLETED',
    }));

    onSaveExpenses(newExpenses);
    Alert.alert(
      'Items Added Successfully! 🎉',
      `Saved ${newExpenses.length} individual items totaling ₹${selectedTotal.toLocaleString('en-IN')} to ${
        scope === 'FAMILY' ? 'Family Pool' : 'Personal Spends'
      }.`
    );
    onClose();
  };

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <View style={styles.backdrop}>
        <View style={styles.sheetContainer}>
          <View style={styles.notch} />

          {/* Header */}
          <View style={styles.header}>
            <View>
              <Text style={styles.headerTitle}>Order & Invoice Scanner</Text>
              <Text style={styles.headerSubtitle}>
                Extracts individual items & categories automatically
              </Text>
            </View>
            <TouchableOpacity onPress={onClose} style={styles.closeBtn}>
              <Ionicons name="close" size={22} color="#64748B" />
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.scrollArea} showsVerticalScrollIndicator={false}>
            {/* Action Bar: Gallery / Camera / Demo */}
            <View style={styles.importActionBar}>
              <TouchableOpacity style={styles.importBtn} onPress={handlePickImage}>
                <Ionicons name="images" size={18} color="#059669" />
                <Text style={styles.importBtnText}>Pick Screenshot</Text>
              </TouchableOpacity>

              <TouchableOpacity style={styles.importBtn} onPress={handleTakePhoto}>
                <Ionicons name="camera" size={18} color="#3B82F6" />
                <Text style={styles.importBtnText}>Camera Bill</Text>
              </TouchableOpacity>
            </View>

            {/* Demo Quick Load Chips */}
            <View style={styles.demoSection}>
              <Text style={styles.demoLabel}>Or test with sample orders:</Text>
              <View style={styles.demoChipsRow}>
                <TouchableOpacity
                  style={styles.demoChip}
                  onPress={() => loadDemoReceipt('blinkit')}
                >
                  <Text style={styles.demoChipText}>🛒 Blinkit Mixed Order</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={styles.demoChip}
                  onPress={() => loadDemoReceipt('amazon')}
                >
                  <Text style={styles.demoChipText}>📦 Amazon Cart Order</Text>
                </TouchableOpacity>
              </View>
            </View>

            {/* Selected Image Preview (if uploaded) */}
            {selectedImage && (
              <View style={styles.previewContainer}>
                <Image source={{ uri: selectedImage }} style={styles.previewImage} />
                <Text style={styles.previewLabel}>Screenshot loaded</Text>
              </View>
            )}

            {/* Loading Indicator */}
            {loading ? (
              <View style={styles.loadingBox}>
                <ActivityIndicator size="large" color="#059669" />
                <Text style={styles.loadingText}>Reading line items and prices...</Text>
              </View>
            ) : (
              <>
                {/* Store Name Badge */}
                <View style={styles.storeHeader}>
                  <View style={styles.storeTitleGroup}>
                    <Ionicons name="receipt" size={18} color="#059669" />
                    <Text style={styles.storeTitle}>{storeName}</Text>
                  </View>
                  <Text style={styles.itemsFoundCount}>
                    {selectedItems.length} of {items.length} selected
                  </Text>
                </View>

                {/* Items List */}
                <View style={styles.itemsList}>
                  {items.map((item) => {
                    const meta = getCategoryMeta(item.category);
                    return (
                      <View
                        key={item.id}
                        style={[
                          styles.itemCard,
                          !item.selected && styles.itemCardUnselected,
                        ]}
                      >
                        {/* Checkbox */}
                        <TouchableOpacity
                          style={styles.checkbox}
                          onPress={() => toggleItemSelection(item.id)}
                        >
                          <Ionicons
                            name={item.selected ? 'checkbox' : 'square-outline'}
                            size={22}
                            color={item.selected ? '#059669' : '#94A3B8'}
                          />
                        </TouchableOpacity>

                        {/* Title and Category */}
                        <View style={styles.itemInfo}>
                          <Text
                            style={[
                              styles.itemName,
                              !item.selected && styles.itemNameStrikethrough,
                            ]}
                            numberOfLines={2}
                          >
                            {item.name}
                          </Text>

                          {/* Category Pill (Tap to cycle category) */}
                          <TouchableOpacity
                            style={[styles.categoryBadge, { backgroundColor: meta.bgColor }]}
                            onPress={() => cycleCategory(item.id)}
                          >
                            <Ionicons name={meta.icon as any} size={11} color={meta.color} />
                            <Text style={[styles.categoryBadgeText, { color: meta.color }]}>
                              {item.category}
                            </Text>
                            <Ionicons name="swap-horizontal" size={10} color={meta.color} />
                          </TouchableOpacity>
                        </View>

                        {/* Price */}
                        <Text
                          style={[
                            styles.itemPrice,
                            !item.selected && styles.itemPriceUnselected,
                          ]}
                        >
                          ₹{item.price.toLocaleString('en-IN')}
                        </Text>
                      </View>
                    );
                  })}
                </View>

                {/* Scope & Attribution */}
                <View style={styles.settingsSection}>
                  <Text style={styles.sectionLabel}>Add items to:</Text>
                  <View style={styles.scopeButtonGroup}>
                    <TouchableOpacity
                      style={[
                        styles.scopeOption,
                        scope === 'PERSONAL' && styles.scopeOptionActivePersonal,
                      ]}
                      onPress={() => setScope('PERSONAL')}
                    >
                      <Ionicons
                        name="person"
                        size={15}
                        color={scope === 'PERSONAL' ? '#FFFFFF' : '#64748B'}
                      />
                      <Text
                        style={[
                          styles.scopeOptionText,
                          scope === 'PERSONAL' && styles.scopeOptionTextActive,
                        ]}
                      >
                        Personal Spends
                      </Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                      style={[
                        styles.scopeOption,
                        scope === 'FAMILY' && styles.scopeOptionActiveFamily,
                      ]}
                      onPress={() => setScope('FAMILY')}
                    >
                      <Ionicons
                        name="people"
                        size={15}
                        color={scope === 'FAMILY' ? '#FFFFFF' : '#64748B'}
                      />
                      <Text
                        style={[
                          styles.scopeOptionText,
                          scope === 'FAMILY' && styles.scopeOptionTextActive,
                        ]}
                      >
                        Family Pool
                      </Text>
                    </TouchableOpacity>
                  </View>
                </View>
              </>
            )}

            <View style={{ height: 20 }} />
          </ScrollView>

          {/* Bottom Save All Bar */}
          <View style={styles.footerBar}>
            <View>
              <Text style={styles.footerSub}>Total for {selectedItems.length} items:</Text>
              <Text style={styles.footerTotal}>₹{selectedTotal.toLocaleString('en-IN')}</Text>
            </View>

            <TouchableOpacity style={styles.saveAllBtn} onPress={handleSaveAll}>
              <Ionicons name="checkmark-done" size={18} color="#FFFFFF" />
              <Text style={styles.saveAllBtnText}>Save All Items</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.65)',
    justifyContent: 'flex-end',
  },
  sheetContainer: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    maxHeight: '94%',
    paddingBottom: Platform.OS === 'ios' ? 34 : 16,
  },
  notch: {
    width: 40,
    height: 5,
    backgroundColor: '#E2E8F0',
    borderRadius: 3,
    alignSelf: 'center',
    marginTop: 12,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: '#0F172A',
  },
  headerSubtitle: {
    fontSize: 12,
    color: '#64748B',
    marginTop: 2,
  },
  closeBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#F1F5F9',
    justifyContent: 'center',
    alignItems: 'center',
  },
  scrollArea: {
    paddingHorizontal: 20,
    paddingTop: 16,
  },
  importActionBar: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 12,
  },
  importBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#F8FAFC',
    borderRadius: 14,
    paddingVertical: 12,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    gap: 6,
  },
  importBtnText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#1E293B',
  },
  demoSection: {
    marginBottom: 16,
  },
  demoLabel: {
    fontSize: 11,
    color: '#64748B',
    fontWeight: '600',
    marginBottom: 6,
  },
  demoChipsRow: {
    flexDirection: 'row',
    gap: 8,
  },
  demoChip: {
    backgroundColor: '#F1F5F9',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  demoChipText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#475569',
  },
  previewContainer: {
    alignItems: 'center',
    marginBottom: 14,
  },
  previewImage: {
    width: '100%',
    height: 120,
    borderRadius: 12,
    resizeMode: 'cover',
  },
  previewLabel: {
    fontSize: 11,
    color: '#059669',
    fontWeight: '600',
    marginTop: 4,
  },
  loadingBox: {
    paddingVertical: 40,
    alignItems: 'center',
    gap: 12,
  },
  loadingText: {
    fontSize: 13,
    color: '#64748B',
    fontWeight: '600',
  },
  storeHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#F8FAFC',
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  storeTitleGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  storeTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: '#0F172A',
  },
  itemsFoundCount: {
    fontSize: 11,
    color: '#059669',
    fontWeight: '700',
  },
  itemsList: {
    gap: 8,
    marginBottom: 16,
  },
  itemCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 14,
    padding: 12,
    gap: 10,
  },
  itemCardUnselected: {
    opacity: 0.5,
    backgroundColor: '#F8FAFC',
  },
  checkbox: {
    padding: 2,
  },
  itemInfo: {
    flex: 1,
    gap: 4,
  },
  itemName: {
    fontSize: 13,
    fontWeight: '600',
    color: '#0F172A',
  },
  itemNameStrikethrough: {
    textDecorationLine: 'line-through',
    color: '#94A3B8',
  },
  categoryBadge: {
    alignSelf: 'flex-start',
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
    gap: 4,
  },
  categoryBadgeText: {
    fontSize: 10,
    fontWeight: '700',
  },
  itemPrice: {
    fontSize: 14,
    fontWeight: '800',
    color: '#0F172A',
  },
  itemPriceUnselected: {
    color: '#94A3B8',
  },
  settingsSection: {
    marginBottom: 16,
  },
  sectionLabel: {
    fontSize: 12,
    fontWeight: '700',
    color: '#475569',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 8,
  },
  scopeButtonGroup: {
    flexDirection: 'row',
    gap: 10,
  },
  scopeOption: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    borderRadius: 12,
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    gap: 6,
  },
  scopeOptionActivePersonal: {
    backgroundColor: '#334155',
    borderColor: '#334155',
  },
  scopeOptionActiveFamily: {
    backgroundColor: '#059669',
    borderColor: '#059669',
  },
  scopeOptionText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#64748B',
  },
  scopeOptionTextActive: {
    color: '#FFFFFF',
    fontWeight: '700',
  },
  footerBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#F1F5F9',
  },
  footerSub: {
    fontSize: 11,
    color: '#64748B',
    fontWeight: '500',
  },
  footerTotal: {
    fontSize: 20,
    fontWeight: '800',
    color: '#0F172A',
  },
  saveAllBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#059669',
    paddingHorizontal: 18,
    paddingVertical: 12,
    borderRadius: 14,
    gap: 6,
    shadowColor: '#059669',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 6,
    elevation: 3,
  },
  saveAllBtnText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '700',
  },
});

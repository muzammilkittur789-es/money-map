import React, { useState, useEffect, useRef } from 'react';
import {
  Modal,
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  SafeAreaView,
  StatusBar,
  TextInput,
  Alert,
  Platform,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { CameraView, useCameraPermissions } from 'expo-camera';
import { Ionicons } from '@expo/vector-icons';
import { parseUpiQr } from '../utils/upi';
import { ParsedUpiData } from '../types';

interface ScanModalProps {
  visible: boolean;
  onClose: () => void;
  onScanSuccess: (data: ParsedUpiData) => void;
}

export const ScanModal: React.FC<ScanModalProps> = ({ visible, onClose, onScanSuccess }) => {
  const insets = useSafeAreaInsets();
  const [permission, requestPermission] = useCameraPermissions();
  const [scanned, setScanned] = useState(false);
  const [manualUpi, setManualUpi] = useState('');
  const [showManualInput, setShowManualInput] = useState(false);
  const [torch, setTorch] = useState(false);
  const lastScannedTime = useRef(0);

  // Safe area padding calculations to prevent colliding with notification bar and nav bar
  const topHeaderPadding =
    Math.max(insets.top, Platform.OS === 'android' ? (StatusBar.currentHeight || 36) : 20) + 12;
  const bottomFooterPadding =
    Math.max(insets.bottom, Platform.OS === 'android' ? 28 : 16) + 16;

  // Re-arm camera and reset scanning state every time modal opens or closes
  useEffect(() => {
    if (visible) {
      setScanned(false);
      setManualUpi('');
      setShowManualInput(false);
      setTorch(false);
      lastScannedTime.current = 0;
    } else {
      setScanned(false);
      setTorch(false);
    }
  }, [visible]);

  const handleBarcodeScanned = ({ data }: { data: string }) => {
    const now = Date.now();
    // Prevent duplicate rapid-fire scanning within 1.5 seconds
    if (scanned || now - lastScannedTime.current < 1500) return;
    lastScannedTime.current = now;
    setScanned(true);

    const parsed = parseUpiQr(data);
    if (parsed && parsed.payeeUpiId) {
      onScanSuccess(parsed);
      // Auto-reset scanned state after a short delay so user can scan again without restarting app
      setTimeout(() => {
        setScanned(false);
      }, 1200);
    } else {
      Alert.alert(
        'QR Code Detected',
        `Scanned: ${data.slice(0, 80)}...\n\nThis does not appear to be a standard UPI payment QR code.`,
        [
          {
            text: 'Try Again',
            onPress: () => {
              setScanned(false);
              lastScannedTime.current = 0;
            },
          },
        ]
      );
    }
  };

  const handleClose = () => {
    setScanned(false);
    onClose();
  };

  const handleManualSubmit = () => {
    if (!manualUpi.trim()) return;
    const parsed = parseUpiQr(manualUpi.trim());
    if (parsed) {
      onScanSuccess(parsed);
      setManualUpi('');
      setShowManualInput(false);
    } else {
      Alert.alert('Invalid UPI ID', 'Please enter a valid UPI ID (e.g. merchant@okaxis)');
    }
  };

  return (
    <Modal visible={visible} animationType="slide" onRequestClose={handleClose}>
      <SafeAreaView style={styles.container}>
        <StatusBar barStyle="light-content" />

        {/* Header (Brought down safely below upper notification bar) */}
        <View style={[styles.header, { paddingTop: topHeaderPadding, paddingBottom: 16 }]}>
          <TouchableOpacity onPress={handleClose} style={styles.headerButton}>
            <Ionicons name="close" size={24} color="#FFFFFF" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Scan UPI QR Code</Text>
          <TouchableOpacity
            onPress={() => setTorch((prev) => !prev)}
            style={styles.headerButton}
          >
            <Ionicons
              name={torch ? 'flash' : 'flash-off'}
              size={22}
              color={torch ? '#F59E0B' : '#FFFFFF'}
            />
          </TouchableOpacity>
        </View>

        {/* Camera Viewfinder or Permission Request */}
        {!permission ? (
          <View style={styles.permissionBox}>
            <Text style={styles.permissionText}>Requesting camera permission...</Text>
          </View>
        ) : !permission.granted ? (
          <View style={styles.permissionBox}>
            <Ionicons name="camera-reverse" size={48} color="#94A3B8" />
            <Text style={styles.permissionText}>
              Camera permission is needed to scan merchant UPI QR codes.
            </Text>
            <TouchableOpacity style={styles.permissionButton} onPress={requestPermission}>
              <Text style={styles.permissionButtonText}>Grant Permission</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <View style={styles.cameraContainer}>
            <CameraView
              key={visible ? 'camera-scanner-active' : 'camera-scanner-inactive'}
              style={StyleSheet.absoluteFill}
              enableTorch={torch}
              barcodeScannerSettings={{
                barcodeTypes: ['qr'],
              }}
              onBarcodeScanned={scanned ? undefined : handleBarcodeScanned}
            />

            {/* Target Reticle Frame */}
            <View style={styles.overlay}>
              <View style={styles.scanTarget}>
                <View style={[styles.corner, styles.cornerTL]} />
                <View style={[styles.corner, styles.cornerTR]} />
                <View style={[styles.corner, styles.cornerBL]} />
                <View style={[styles.corner, styles.cornerBR]} />
                <View style={styles.scanLine} />
              </View>
              <Text style={styles.hintText}>
                Align UPI QR code inside the frame to pay and track
              </Text>
            </View>
          </View>
        )}

        {/* Footer Controls (Brought up safely above lower navigation bar) */}
        <View style={[styles.footer, { paddingBottom: bottomFooterPadding }]}>
          {showManualInput ? (
            <View style={styles.manualInputCard}>
              <View style={styles.manualInputRow}>
                <Ionicons name="at" size={20} color="#10B981" style={{ marginRight: 6 }} />
                <TextInput
                  style={styles.input}
                  placeholder="e.g. merchant@okhdfcbank"
                  placeholderTextColor="#64748B"
                  value={manualUpi}
                  onChangeText={setManualUpi}
                  autoCapitalize="none"
                  autoCorrect={false}
                  autoFocus
                />
                {manualUpi.length > 0 && (
                  <TouchableOpacity
                    onPress={() => setManualUpi('')}
                    hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                  >
                    <Ionicons name="close-circle" size={18} color="#64748B" />
                  </TouchableOpacity>
                )}
              </View>
              <View style={styles.manualButtonsRow}>
                <TouchableOpacity
                  style={styles.manualCancelBtn}
                  onPress={() => {
                    setShowManualInput(false);
                    setManualUpi('');
                  }}
                  activeOpacity={0.7}
                >
                  <Text style={styles.manualCancelText}>Cancel</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={styles.manualSubmitBtn}
                  onPress={handleManualSubmit}
                  activeOpacity={0.85}
                >
                  <Ionicons name="arrow-forward-circle" size={18} color="#FFFFFF" />
                  <Text style={styles.manualSubmitText}>Pay & Log</Text>
                </TouchableOpacity>
              </View>
            </View>
          ) : (
            <View style={styles.quickActions}>
              <TouchableOpacity
                style={styles.actionBtnFull}
                onPress={() => setShowManualInput(true)}
                activeOpacity={0.8}
              >
                <View style={styles.actionIconCircle}>
                  <Ionicons name="keypad" size={17} color="#10B981" />
                </View>
                <Text style={styles.actionBtnFullText}>Enter Merchant UPI ID Manually</Text>
                <Ionicons name="chevron-forward" size={16} color="#64748B" />
              </TouchableOpacity>
            </View>
          )}
        </View>
      </SafeAreaView>
    </Modal>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0F172A',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 14,
  },
  headerButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.1)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 17,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  cameraContainer: {
    flex: 1,
    position: 'relative',
    overflow: 'hidden',
  },
  overlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    justifyContent: 'center',
    alignItems: 'center',
  },
  scanTarget: {
    width: 260,
    height: 260,
    position: 'relative',
    justifyContent: 'center',
    alignItems: 'center',
  },
  corner: {
    position: 'absolute',
    width: 32,
    height: 32,
    borderColor: '#10B981',
  },
  cornerTL: {
    top: 0,
    left: 0,
    borderTopWidth: 4,
    borderLeftWidth: 4,
    borderTopLeftRadius: 10,
  },
  cornerTR: {
    top: 0,
    right: 0,
    borderTopWidth: 4,
    borderRightWidth: 4,
    borderTopRightRadius: 10,
  },
  cornerBL: {
    bottom: 0,
    left: 0,
    borderBottomWidth: 4,
    borderLeftWidth: 4,
    borderBottomLeftRadius: 10,
  },
  cornerBR: {
    bottom: 0,
    right: 0,
    borderBottomWidth: 4,
    borderRightWidth: 4,
    borderBottomRightRadius: 10,
  },
  scanLine: {
    width: '90%',
    height: 2,
    backgroundColor: '#10B981',
    shadowColor: '#10B981',
    shadowOpacity: 0.9,
    shadowRadius: 6,
  },
  hintText: {
    marginTop: 28,
    color: '#E2E8F0',
    fontSize: 13,
    fontWeight: '500',
    backgroundColor: 'rgba(15, 23, 42, 0.75)',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
  },
  permissionBox: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 30,
    gap: 16,
  },
  permissionText: {
    color: '#94A3B8',
    fontSize: 15,
    textAlign: 'center',
    lineHeight: 22,
  },
  permissionButton: {
    backgroundColor: '#10B981',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 12,
  },
  permissionButtonText: {
    color: '#FFFFFF',
    fontWeight: '700',
    fontSize: 14,
  },
  footer: {
    paddingHorizontal: 20,
    paddingTop: 16,
    backgroundColor: '#0F172A',
    borderTopWidth: 1,
    borderTopColor: 'rgba(255, 255, 255, 0.08)',
  },
  quickActions: {
    alignItems: 'center',
  },
  actionBtnFull: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#1E293B',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.12)',
    width: '100%',
  },
  actionIconCircle: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: 'rgba(16, 185, 129, 0.15)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  actionBtnFullText: {
    color: '#F8FAFC',
    fontSize: 14,
    fontWeight: '700',
    flex: 1,
    marginLeft: 12,
  },
  manualInputCard: {
    backgroundColor: '#1E293B',
    borderRadius: 16,
    padding: 14,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.12)',
    gap: 12,
  },
  manualInputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.06)',
    borderRadius: 12,
    paddingHorizontal: 12,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },
  input: {
    flex: 1,
    paddingVertical: 10,
    color: '#FFFFFF',
    fontSize: 14,
  },
  manualButtonsRow: {
    flexDirection: 'row',
    gap: 10,
  },
  manualCancelBtn: {
    flex: 1,
    paddingVertical: 12,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 12,
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
  },
  manualCancelText: {
    color: '#94A3B8',
    fontSize: 13,
    fontWeight: '600',
  },
  manualSubmitBtn: {
    flex: 1.6,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#10B981',
    paddingVertical: 12,
    borderRadius: 12,
    gap: 6,
  },
  manualSubmitText: {
    color: '#FFFFFF',
    fontWeight: '700',
    fontSize: 14,
  },
});

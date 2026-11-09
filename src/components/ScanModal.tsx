import React, { useState } from 'react';
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
} from 'react-native';
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
  const [permission, requestPermission] = useCameraPermissions();
  const [scanned, setScanned] = useState(false);
  const [manualUpi, setManualUpi] = useState('');
  const [showManualInput, setShowManualInput] = useState(false);
  const [torch, setTorch] = useState(false);

  const handleBarcodeScanned = ({ data }: { data: string }) => {
    if (scanned) return;
    setScanned(true);

    const parsed = parseUpiQr(data);
    if (parsed && parsed.payeeUpiId) {
      onScanSuccess(parsed);
    } else {
      Alert.alert(
        'QR Code Detected',
        `Scanned: ${data.slice(0, 80)}...\n\nThis does not appear to be a standard UPI payment QR code.`,
        [{ text: 'Try Again', onPress: () => setScanned(false) }]
      );
    }
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

  const handleSampleScan = () => {
    // Demo merchant QR code to test easily without a physical QR
    const demoQr = 'upi://pay?pa=kirana.store@okaxis&pn=Sharma%20Kirana%20Store&mc=5411&cu=INR';
    const parsed = parseUpiQr(demoQr);
    if (parsed) {
      onScanSuccess(parsed);
    }
  };

  return (
    <Modal visible={visible} animationType="slide" onRequestClose={onClose}>
      <SafeAreaView style={styles.container}>
        <StatusBar barStyle="light-content" />

        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity onPress={onClose} style={styles.headerButton}>
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

        {/* Footer Controls */}
        <View style={styles.footer}>
          {showManualInput ? (
            <View style={styles.manualInputGroup}>
              <TextInput
                style={styles.input}
                placeholder="Enter UPI ID (e.g. store@okhdfcbank)"
                placeholderTextColor="#94A3B8"
                value={manualUpi}
                onChangeText={setManualUpi}
                autoCapitalize="none"
              />
              <TouchableOpacity style={styles.manualSubmitBtn} onPress={handleManualSubmit}>
                <Text style={styles.manualSubmitText}>Pay & Log</Text>
              </TouchableOpacity>
            </View>
          ) : (
            <View style={styles.quickActions}>
              <TouchableOpacity
                style={styles.actionBtn}
                onPress={() => setShowManualInput(true)}
              >
                <Ionicons name="keypad" size={18} color="#E2E8F0" />
                <Text style={styles.actionBtnText}>Enter UPI ID</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.actionBtn, styles.demoActionBtn]}
                onPress={handleSampleScan}
              >
                <Ionicons name="flask" size={18} color="#34D399" />
                <Text style={[styles.actionBtnText, { color: '#34D399' }]}>
                  Test Demo Merchant QR
                </Text>
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
    padding: 20,
    backgroundColor: '#0F172A',
  },
  quickActions: {
    flexDirection: 'row',
    gap: 12,
  },
  actionBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255,255,255,0.08)',
    paddingVertical: 12,
    borderRadius: 14,
    gap: 8,
  },
  demoActionBtn: {
    backgroundColor: 'rgba(16, 185, 129, 0.12)',
    borderWidth: 1,
    borderColor: 'rgba(16, 185, 129, 0.3)',
  },
  actionBtnText: {
    color: '#E2E8F0',
    fontSize: 13,
    fontWeight: '600',
  },
  manualInputGroup: {
    flexDirection: 'row',
    gap: 10,
  },
  input: {
    flex: 1,
    backgroundColor: 'rgba(255,255,255,0.08)',
    borderRadius: 12,
    paddingHorizontal: 14,
    color: '#FFFFFF',
    fontSize: 14,
  },
  manualSubmitBtn: {
    backgroundColor: '#10B981',
    paddingHorizontal: 16,
    justifyContent: 'center',
    borderRadius: 12,
  },
  manualSubmitText: {
    color: '#FFFFFF',
    fontWeight: '700',
    fontSize: 13,
  },
});

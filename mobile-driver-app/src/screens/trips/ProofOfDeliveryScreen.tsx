/**
 * Proof of Delivery Screen
 * Capture photos, signature, and complete delivery
 */

import React, { useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  Alert,
  Image,
  TextInput,
  ActivityIndicator,
} from 'react-native';
import { useNavigation, useRoute } from '@react-navigation/native';
import * as ImagePicker from 'expo-image-picker';
import { useAppDispatch, useAppSelector } from '../../store/hooks';
import { submitPOD, completeTrip } from '../../store/slices/tripsSlice';
import locationService from '../../services/location.service';
import { ProofOfDelivery } from '../../types';

export default function ProofOfDeliveryScreen() {
  const navigation = useNavigation();
  const route = useRoute();
  const dispatch = useAppDispatch();
  const { currentTrip } = useAppSelector((state) => state.trips);

  const [photos, setPhotos] = useState<string[]>([]);
  const [signature, setSignature] = useState<string | null>(null);
  const [recipientName, setRecipientName] = useState('');
  const [notes, setNotes] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const requestCameraPermission = async () => {
    const { status } = await ImagePicker.requestCameraPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Permission Required', 'Camera permission is required to take photos');
      return false;
    }
    return true;
  };

  const handleTakePhoto = async () => {
    const hasPermission = await requestCameraPermission();
    if (!hasPermission) return;

    try {
      const result = await ImagePicker.launchCameraAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        quality: 0.8,
        allowsEditing: true,
      });

      if (!result.canceled && result.assets[0]) {
        setPhotos([...photos, result.assets[0].uri]);
      }
    } catch (error) {
      console.error('Error taking photo:', error);
      Alert.alert('Error', 'Failed to take photo');
    }
  };

  const handleRemovePhoto = (index: number) => {
    const newPhotos = [...photos];
    newPhotos.splice(index, 1);
    setPhotos(newPhotos);
  };

  const handleCaptureSignature = () => {
    // Navigate to signature capture screen (to be implemented)
    Alert.alert('Signature Capture', 'Signature capture feature coming soon');
  };

  const handleSubmit = async () => {
    if (photos.length === 0) {
      Alert.alert('Required', 'Please take at least one photo');
      return;
    }

    if (!signature) {
      Alert.alert('Required', 'Please capture recipient signature');
      return;
    }

    if (!recipientName.trim()) {
      Alert.alert('Required', 'Please enter recipient name');
      return;
    }

    if (!currentTrip) {
      Alert.alert('Error', 'No trip selected');
      return;
    }

    Alert.alert(
      'Submit POD',
      'Submit proof of delivery and complete trip?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Submit',
          onPress: async () => {
            setIsLoading(true);
            try {
              // Get current location
              const location = await locationService.getCurrentLocation();
              if (!location) {
                throw new Error('Unable to get current location');
              }

              // Prepare POD data
              const podData: ProofOfDelivery = {
                tripId: currentTrip.trip_id,
                photos,
                signature,
                timestamp: new Date().toISOString(),
                location: {
                  lat: location.lat,
                  lng: location.lng,
                  accuracy: location.accuracy,
                  timestamp: location.timestamp,
                },
                recipientName: recipientName.trim(),
                notes: notes.trim() || undefined,
                packages: currentTrip.packages?.map(p => p.id) || [],
              };

              // Submit POD
              await dispatch(submitPOD({ tripId: currentTrip.trip_id, pod: podData })).unwrap();

              // Complete trip
              await dispatch(
                completeTrip({
                  tripId: currentTrip.trip_id,
                  location: { lat: location.lat, lng: location.lng },
                })
              ).unwrap();

              // Stop location tracking
              await locationService.stopBackgroundTracking();

              Alert.alert('Success', 'Delivery completed successfully', [
                {
                  text: 'OK',
                  onPress: () => navigation.navigate('TripsList' as never),
                },
              ]);
            } catch (error: any) {
              Alert.alert('Error', error || 'Failed to submit POD');
            } finally {
              setIsLoading(false);
            }
          },
        },
      ]
    );
  };

  return (
    <View style={styles.container}>
      <ScrollView style={styles.scrollView}>
        {/* Photos Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Delivery Photos *</Text>
          <Text style={styles.sectionSubtitle}>Take photos of the delivered items</Text>

          <View style={styles.photosContainer}>
            {photos.map((photo, index) => (
              <View key={index} style={styles.photoWrapper}>
                <Image source={{ uri: photo }} style={styles.photo} />
                <TouchableOpacity
                  style={styles.removePhotoButton}
                  onPress={() => handleRemovePhoto(index)}
                >
                  <Text style={styles.removePhotoText}>✕</Text>
                </TouchableOpacity>
              </View>
            ))}

            {photos.length < 5 && (
              <TouchableOpacity style={styles.addPhotoButton} onPress={handleTakePhoto}>
                <Text style={styles.addPhotoIcon}>📷</Text>
                <Text style={styles.addPhotoText}>Add Photo</Text>
              </TouchableOpacity>
            )}
          </View>
        </View>

        {/* Signature Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Recipient Signature *</Text>
          <Text style={styles.sectionSubtitle}>Capture recipient signature</Text>

          {signature ? (
            <View style={styles.signaturePreview}>
              <Image source={{ uri: signature }} style={styles.signatureImage} />
              <TouchableOpacity
                style={styles.retakeButton}
                onPress={handleCaptureSignature}
              >
                <Text style={styles.retakeButtonText}>Retake</Text>
              </TouchableOpacity>
            </View>
          ) : (
            <TouchableOpacity
              style={styles.captureSignatureButton}
              onPress={handleCaptureSignature}
            >
              <Text style={styles.captureSignatureText}>✍️ Capture Signature</Text>
            </TouchableOpacity>
          )}
        </View>

        {/* Recipient Details */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Recipient Information *</Text>
          
          <TextInput
            style={styles.input}
            placeholder="Recipient Name"
            value={recipientName}
            onChangeText={setRecipientName}
          />

          <TextInput
            style={[styles.input, styles.textArea]}
            placeholder="Additional Notes (optional)"
            value={notes}
            onChangeText={setNotes}
            multiline
            numberOfLines={4}
            textAlignVertical="top"
          />
        </View>

        {/* Package Summary */}
        {currentTrip?.packages && currentTrip.packages.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Packages Delivered</Text>
            {currentTrip.packages.map((pkg) => (
              <View key={pkg.id} style={styles.packageItem}>
                <Text style={styles.packageTrack}>{pkg.trackingNumber}</Text>
                <Text style={styles.packageDesc}>{pkg.description}</Text>
              </View>
            ))}
          </View>
        )}
      </ScrollView>

      {/* Submit Button */}
      <View style={styles.actionsContainer}>
        <TouchableOpacity
          style={[styles.submitButton, isLoading && styles.submitButtonDisabled]}
          onPress={handleSubmit}
          disabled={isLoading}
        >
          {isLoading ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={styles.submitButtonText}>Submit & Complete Delivery</Text>
          )}
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F5F6FA',
  },
  scrollView: {
    flex: 1,
  },
  section: {
    backgroundColor: '#fff',
    padding: 16,
    marginBottom: 12,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#2C3E50',
    marginBottom: 4,
  },
  sectionSubtitle: {
    fontSize: 14,
    color: '#7F8C8D',
    marginBottom: 16,
  },
  photosContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginTop: 8,
  },
  photoWrapper: {
    width: 100,
    height: 100,
    marginRight: 12,
    marginBottom: 12,
    position: 'relative',
  },
  photo: {
    width: '100%',
    height: '100%',
    borderRadius: 8,
  },
  removePhotoButton: {
    position: 'absolute',
    top: -8,
    right: -8,
    backgroundColor: '#E74C3C',
    borderRadius: 12,
    width: 24,
    height: 24,
    justifyContent: 'center',
    alignItems: 'center',
  },
  removePhotoText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  addPhotoButton: {
    width: 100,
    height: 100,
    borderWidth: 2,
    borderColor: '#4A90E2',
    borderStyle: 'dashed',
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#F5F6FA',
  },
  addPhotoIcon: {
    fontSize: 32,
    marginBottom: 4,
  },
  addPhotoText: {
    fontSize: 12,
    color: '#4A90E2',
    fontWeight: '600',
  },
  captureSignatureButton: {
    backgroundColor: '#4A90E2',
    padding: 20,
    borderRadius: 12,
    alignItems: 'center',
  },
  captureSignatureText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '600',
  },
  signaturePreview: {
    backgroundColor: '#F5F6FA',
    borderRadius: 12,
    padding: 16,
  },
  signatureImage: {
    width: '100%',
    height: 150,
    borderRadius: 8,
    marginBottom: 12,
  },
  retakeButton: {
    backgroundColor: '#4A90E2',
    padding: 12,
    borderRadius: 8,
    alignItems: 'center',
  },
  retakeButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  input: {
    backgroundColor: '#F5F6FA',
    borderRadius: 8,
    padding: 16,
    fontSize: 16,
    marginBottom: 12,
  },
  textArea: {
    height: 100,
  },
  packageItem: {
    padding: 12,
    backgroundColor: '#F5F6FA',
    borderRadius: 8,
    marginBottom: 8,
  },
  packageTrack: {
    fontSize: 14,
    fontWeight: '600',
    color: '#2C3E50',
    marginBottom: 4,
  },
  packageDesc: {
    fontSize: 14,
    color: '#7F8C8D',
  },
  actionsContainer: {
    padding: 16,
    backgroundColor: '#fff',
    borderTopWidth: 1,
    borderTopColor: '#E1E8ED',
  },
  submitButton: {
    backgroundColor: '#27AE60',
    paddingVertical: 18,
    borderRadius: 12,
    alignItems: 'center',
  },
  submitButtonDisabled: {
    opacity: 0.6,
  },
  submitButtonText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: 'bold',
  },
});

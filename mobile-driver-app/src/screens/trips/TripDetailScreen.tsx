/**
 * Trip Detail Screen
 * Displays detailed information about a trip and allows status updates
 */

import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { useNavigation, useRoute } from '@react-navigation/native';
import { useAppDispatch, useAppSelector } from '../../store/hooks';
import {
  acceptTrip,
  startTrip,
  updateTripStatus,
  completeTrip,
} from '../../store/slices/tripsSlice';
import locationService from '../../services/location.service';
import { format } from 'date-fns';

export default function TripDetailScreen() {
  const navigation = useNavigation();
  const route = useRoute();
  const dispatch = useAppDispatch();
  
  const { currentTrip } = useAppSelector((state) => state.trips);
  const [isLoading, setIsLoading] = useState(false);
  const [currentLocation, setCurrentLocation] = useState<{ lat: number; lng: number } | null>(null);

  useEffect(() => {
    getCurrentLocation();
  }, []);

  const getCurrentLocation = async () => {
    const location = await locationService.getCurrentLocation();
    if (location) {
      setCurrentLocation({ lat: location.lat, lng: location.lng });
    }
  };

  if (!currentTrip) {
    return (
      <View style={styles.emptyContainer}>
        <Text style={styles.emptyText}>No trip selected</Text>
      </View>
    );
  }

  const handleAcceptTrip = async () => {
    Alert.alert(
      'Accept Trip',
      'Do you want to accept this trip?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Accept',
          onPress: async () => {
            setIsLoading(true);
            try {
              await dispatch(acceptTrip(currentTrip.trip_id)).unwrap();
              Alert.alert('Success', 'Trip accepted successfully');
            } catch (error: any) {
              Alert.alert('Error', error || 'Failed to accept trip');
            } finally {
              setIsLoading(false);
            }
          },
        },
      ]
    );
  };

  const handleStartTrip = async () => {
    if (!currentLocation) {
      Alert.alert('Error', 'Unable to get current location');
      return;
    }

    Alert.alert(
      'Start Trip',
      'Are you ready to start this trip?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Start',
          onPress: async () => {
            setIsLoading(true);
            try {
              await dispatch(
                startTrip({ tripId: currentTrip.trip_id, location: currentLocation })
              ).unwrap();
              Alert.alert('Success', 'Trip started successfully');
              
              // Start location tracking
              const user = useAppSelector.getState().auth.user;
              if (user) {
                await locationService.startBackgroundTracking(
                  user.driverId,
                  currentTrip.vehicle_reg,
                  currentTrip.trip_id
                );
              }
            } catch (error: any) {
              Alert.alert('Error', error || 'Failed to start trip');
            } finally {
              setIsLoading(false);
            }
          },
        },
      ]
    );
  };

  const handleReportDelay = () => {
    Alert.prompt(
      'Report Delay',
      'Please provide a reason for the delay:',
      async (reason) => {
        if (reason) {
          setIsLoading(true);
          try {
            await dispatch(
              updateTripStatus({
                tripId: currentTrip.trip_id,
                status: 'delayed',
                notes: reason,
              })
            ).unwrap();
            Alert.alert('Success', 'Delay reported');
          } catch (error: any) {
            Alert.alert('Error', error || 'Failed to report delay');
          } finally {
            setIsLoading(false);
          }
        }
      }
    );
  };

  const handleCompleteTrip = () => {
    navigation.navigate('ProofOfDelivery' as never, { tripId: currentTrip.trip_id } as never);
  };

  const getStatusColor = (status: string): string => {
    switch (status) {
      case 'pending':
        return '#FFA500';
      case 'assigned':
        return '#4A90E2';
      case 'in_progress':
        return '#3498DB';
      case 'completed':
        return '#27AE60';
      case 'delayed':
        return '#E74C3C';
      default:
        return '#7F8C8D';
    }
  };

  return (
    <View style={styles.container}>
      <ScrollView style={styles.scrollView}>
        {/* Status Section */}
        <View style={styles.section}>
          <View style={styles.statusHeader}>
            <Text style={styles.tripId}>Trip #{currentTrip.trip_id.slice(-8)}</Text>
            <View style={[styles.statusBadge, { backgroundColor: getStatusColor(currentTrip.status) }]}>
              <Text style={styles.statusText}>{currentTrip.status.toUpperCase()}</Text>
            </View>
          </View>
        </View>

        {/* Customer Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Customer</Text>
          <Text style={styles.customerName}>{currentTrip.customer}</Text>
        </View>

        {/* Route Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Route Details</Text>
          
          <View style={styles.routeItem}>
            <Text style={styles.routeLabel}>Origin</Text>
            <Text style={styles.routeValue}>{currentTrip.origin}</Text>
          </View>
          
          <View style={styles.routeItem}>
            <Text style={styles.routeLabel}>Destination</Text>
            <Text style={styles.routeValue}>{currentTrip.destination}</Text>
          </View>

          {currentTrip.distance && (
            <View style={styles.routeItem}>
              <Text style={styles.routeLabel}>Distance</Text>
              <Text style={styles.routeValue}>{currentTrip.distance} km</Text>
            </View>
          )}

          {currentTrip.eta && (
            <View style={styles.routeItem}>
              <Text style={styles.routeLabel}>ETA</Text>
              <Text style={styles.etaValue}>{format(new Date(currentTrip.eta), 'PPp')}</Text>
            </View>
          )}
        </View>

        {/* Vehicle Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Vehicle</Text>
          <Text style={styles.vehicleReg}>{currentTrip.vehicle_reg}</Text>
          <Text style={styles.driverName}>Driver: {currentTrip.driver}</Text>
        </View>

        {/* Packages Section */}
        {currentTrip.packages && currentTrip.packages.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Packages ({currentTrip.packages.length})</Text>
            {currentTrip.packages.map((pkg) => (
              <View key={pkg.id} style={styles.packageItem}>
                <Text style={styles.packageTrack}>{pkg.trackingNumber}</Text>
                <Text style={styles.packageDesc}>{pkg.description}</Text>
              </View>
            ))}
          </View>
        )}

        {/* POD Status */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Proof of Delivery Status</Text>
          <Text style={[styles.podStatus, { color: currentTrip.pod_status === 'captured' ? '#27AE60' : '#E74C3C' }]}>
            {currentTrip.pod_status.toUpperCase()}
          </Text>
        </View>
      </ScrollView>

      {/* Action Buttons */}
      <View style={styles.actionsContainer}>
        {currentTrip.status === 'assigned' && (
          <>
            <TouchableOpacity
              style={[styles.actionButton, styles.acceptButton]}
              onPress={handleAcceptTrip}
              disabled={isLoading}
            >
              {isLoading ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <Text style={styles.actionButtonText}>Accept Trip</Text>
              )}
            </TouchableOpacity>
          </>
        )}

        {currentTrip.status === 'accepted' && (
          <TouchableOpacity
            style={[styles.actionButton, styles.startButton]}
            onPress={handleStartTrip}
            disabled={isLoading}
          >
            {isLoading ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text style={styles.actionButtonText}>Start Trip</Text>
            )}
          </TouchableOpacity>
        )}

        {currentTrip.status === 'in_progress' && (
          <View style={styles.actionButtonGroup}>
            <TouchableOpacity
              style={[styles.actionButton, styles.delayButton, { flex: 1, marginRight: 8 }]}
              onPress={handleReportDelay}
              disabled={isLoading}
            >
              <Text style={styles.actionButtonText}>Report Delay</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.actionButton, styles.completeButton, { flex: 1 }]}
              onPress={handleCompleteTrip}
              disabled={isLoading}
            >
              <Text style={styles.actionButtonText}>Complete & POD</Text>
            </TouchableOpacity>
          </View>
        )}
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
  statusHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  tripId: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#2C3E50',
  },
  statusBadge: {
    paddingVertical: 6,
    paddingHorizontal: 16,
    borderRadius: 16,
  },
  statusText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: 'bold',
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#7F8C8D',
    marginBottom: 12,
  },
  customerName: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#2C3E50',
  },
  routeItem: {
    marginBottom: 12,
  },
  routeLabel: {
    fontSize: 14,
    color: '#7F8C8D',
    marginBottom: 4,
  },
  routeValue: {
    fontSize: 16,
    color: '#2C3E50',
  },
  etaValue: {
    fontSize: 16,
    color: '#E74C3C',
    fontWeight: '600',
  },
  vehicleReg: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#2C3E50',
    marginBottom: 8,
  },
  driverName: {
    fontSize: 14,
    color: '#7F8C8D',
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
  podStatus: {
    fontSize: 16,
    fontWeight: 'bold',
  },
  actionsContainer: {
    padding: 16,
    backgroundColor: '#fff',
    borderTopWidth: 1,
    borderTopColor: '#E1E8ED',
  },
  actionButton: {
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: 'center',
    marginBottom: 8,
  },
  acceptButton: {
    backgroundColor: '#4A90E2',
  },
  startButton: {
    backgroundColor: '#27AE60',
  },
  delayButton: {
    backgroundColor: '#E74C3C',
  },
  completeButton: {
    backgroundColor: '#27AE60',
  },
  actionButtonText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: 'bold',
  },
  actionButtonGroup: {
    flexDirection: 'row',
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#F5F6FA',
  },
  emptyText: {
    fontSize: 16,
    color: '#95A5A6',
  },
});

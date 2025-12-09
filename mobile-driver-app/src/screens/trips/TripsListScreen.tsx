/**
 * Trips List Screen
 * Displays list of trips assigned to the driver
 */

import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  RefreshControl,
  ActivityIndicator,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { useAppDispatch, useAppSelector } from '../../store/hooks';
import { fetchTrips, setCurrentTrip } from '../../store/slices/tripsSlice';
import { Trip, TripStatus } from '../../types';
import { format } from 'date-fns';

export default function TripsListScreen() {
  const navigation = useNavigation();
  const dispatch = useAppDispatch();
  const { trips, isLoading } = useAppSelector((state) => state.trips);
  const { user } = useAppSelector((state) => state.auth);

  const [refreshing, setRefreshing] = useState(false);
  const [filter, setFilter] = useState<TripStatus | 'all'>('all');

  useEffect(() => {
    loadTrips();
  }, [filter]);

  const loadTrips = async () => {
    const statusFilter = filter === 'all' ? undefined : filter;
    await dispatch(fetchTrips(statusFilter));
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    await loadTrips();
    setRefreshing(false);
  };

  const handleTripPress = (trip: Trip) => {
    dispatch(setCurrentTrip(trip));
    navigation.navigate('TripDetail' as never, { tripId: trip.trip_id } as never);
  };

  const getStatusColor = (status: TripStatus): string => {
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
      case 'cancelled':
        return '#95A5A6';
      default:
        return '#7F8C8D';
    }
  };

  const renderTripItem = ({ item }: { item: Trip }) => (
    <TouchableOpacity
      style={styles.tripCard}
      onPress={() => handleTripPress(item)}
    >
      <View style={styles.tripHeader}>
        <Text style={styles.tripId}>Trip #{item.trip_id.slice(-6)}</Text>
        <View style={[styles.statusBadge, { backgroundColor: getStatusColor(item.status) }]}>
          <Text style={styles.statusText}>{item.status.toUpperCase()}</Text>
        </View>
      </View>

      <View style={styles.tripDetails}>
        <Text style={styles.customer}>{item.customer}</Text>
        <View style={styles.locationRow}>
          <Text style={styles.label}>From:</Text>
          <Text style={styles.location}>{item.origin}</Text>
        </View>
        <View style={styles.locationRow}>
          <Text style={styles.label}>To:</Text>
          <Text style={styles.location}>{item.destination}</Text>
        </View>
        {item.eta && (
          <View style={styles.locationRow}>
            <Text style={styles.label}>ETA:</Text>
            <Text style={styles.eta}>{format(new Date(item.eta), 'PPp')}</Text>
          </View>
        )}
      </View>

      <View style={styles.tripFooter}>
        <Text style={styles.vehicle}>Vehicle: {item.vehicle_reg}</Text>
        <Text style={styles.timestamp}>
          {format(new Date(item.updated_at), 'PP')}
        </Text>
      </View>
    </TouchableOpacity>
  );

  const renderFilterButton = (label: string, value: TripStatus | 'all') => (
    <TouchableOpacity
      style={[
        styles.filterButton,
        filter === value && styles.filterButtonActive,
      ]}
      onPress={() => setFilter(value)}
    >
      <Text
        style={[
          styles.filterText,
          filter === value && styles.filterTextActive,
        ]}
      >
        {label}
      </Text>
    </TouchableOpacity>
  );

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.welcomeText}>Welcome, {user?.name || 'Driver'}</Text>
        <TouchableOpacity
          style={styles.settingsButton}
          onPress={() => navigation.navigate('Settings' as never)}
        >
          <Text style={styles.settingsText}>⚙️</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.filterContainer}>
        {renderFilterButton('All', 'all')}
        {renderFilterButton('Assigned', 'assigned')}
        {renderFilterButton('In Progress', 'in_progress')}
        {renderFilterButton('Completed', 'completed')}
      </View>

      {isLoading && !refreshing ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#4A90E2" />
        </View>
      ) : (
        <FlatList
          data={trips}
          keyExtractor={(item) => item.trip_id}
          renderItem={renderTripItem}
          contentContainerStyle={styles.listContent}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />
          }
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <Text style={styles.emptyText}>No trips found</Text>
            </View>
          }
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F5F6FA',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#E1E8ED',
  },
  welcomeText: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#2C3E50',
  },
  settingsButton: {
    padding: 8,
  },
  settingsText: {
    fontSize: 24,
  },
  filterContainer: {
    flexDirection: 'row',
    padding: 12,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#E1E8ED',
  },
  filterButton: {
    paddingVertical: 8,
    paddingHorizontal: 16,
    marginRight: 8,
    borderRadius: 20,
    backgroundColor: '#F5F6FA',
  },
  filterButtonActive: {
    backgroundColor: '#4A90E2',
  },
  filterText: {
    fontSize: 14,
    color: '#7F8C8D',
    fontWeight: '600',
  },
  filterTextActive: {
    color: '#fff',
  },
  listContent: {
    padding: 16,
  },
  tripCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  tripHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  tripId: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#2C3E50',
  },
  statusBadge: {
    paddingVertical: 4,
    paddingHorizontal: 12,
    borderRadius: 12,
  },
  statusText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: 'bold',
  },
  tripDetails: {
    marginBottom: 12,
  },
  customer: {
    fontSize: 16,
    fontWeight: '600',
    color: '#34495E',
    marginBottom: 8,
  },
  locationRow: {
    flexDirection: 'row',
    marginBottom: 4,
  },
  label: {
    fontSize: 14,
    color: '#7F8C8D',
    width: 50,
  },
  location: {
    flex: 1,
    fontSize: 14,
    color: '#2C3E50',
  },
  eta: {
    flex: 1,
    fontSize: 14,
    color: '#E74C3C',
    fontWeight: '600',
  },
  tripFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#E1E8ED',
  },
  vehicle: {
    fontSize: 14,
    color: '#7F8C8D',
  },
  timestamp: {
    fontSize: 12,
    color: '#95A5A6',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  emptyContainer: {
    padding: 40,
    alignItems: 'center',
  },
  emptyText: {
    fontSize: 16,
    color: '#95A5A6',
  },
});

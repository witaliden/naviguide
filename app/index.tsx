import { View, Text, FlatList, TouchableOpacity, StyleSheet, RefreshControl } from 'react-native';
import { useRoutes } from '../hooks/useRoutes';
import { useRouter } from 'expo-router';
import React from 'react';

export default function IndexScreen() {
  const { routes, loading, refreshing, error, refreshRoutes } = useRoutes();
  const router = useRouter();

  if (loading && !refreshing) {
    return (
      <View style={styles.centerContainer}>
        <Text>Loading...</Text>
      </View>
    );
  }

  if (error) {
    return (
      <View style={styles.centerContainer}>
        <Text style={styles.errorText}>Error: {error.message}</Text>
        <TouchableOpacity 
          style={styles.retryButton}
          onPress={refreshRoutes}
        >
          <Text style={styles.retryButtonText}>Retry</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <>
    {routes ? (
      <FlatList
        data={routes}
        renderItem={({ item }) => (
          <TouchableOpacity 
            style={styles.routeCard}
            onPress={() => router.push({
              pathname: "/route/[id]",
              params: { id: item.id }
            })}
          >
            <Text style={styles.routeName}>{item.name}</Text>
            <Text style={styles.routeDescription} numberOfLines={2}>
              {item.description}
            </Text>
          </TouchableOpacity>
        )}
        refreshControl={
          <RefreshControl 
            refreshing={refreshing} 
            onRefresh={refreshRoutes}
            colors={['#2196F3']}
          />
        }
        contentContainerStyle={routes.length === 0 && styles.emptyList}
        ListEmptyComponent={
          <Text style={styles.emptyText}>No routes available</Text>
        }
      />
      ) : (
      <View style={styles.centerContainer}>
        <Text>Loading...</Text>
      </View>
    )}
    </>
  );
}

const styles = StyleSheet.create({
  routeCard: {
    padding: 16,
    backgroundColor: '#fff',
    marginVertical: 8,
    marginHorizontal: 16,
    borderRadius: 8,
    elevation: 2,
  },
  routeName: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 8,
  },
  routeDescription: {
    fontSize: 14,
    color: '#666',
  },
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  errorText: {
    color: 'red',
    marginBottom: 16,
    textAlign: 'center',
  },
  retryButton: {
    backgroundColor: '#2196F3',
    padding: 12,
    borderRadius: 8,
  },
  retryButtonText: {
    color: 'white',
    fontWeight: 'bold',
  },
  emptyList: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  emptyText: {
    color: '#666',
    fontSize: 16,
  },
});
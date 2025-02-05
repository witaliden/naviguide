import { View, Text, FlatList, TouchableOpacity, StyleSheet, RefreshControl } from 'react-native';
import { useRoutes } from '../hooks/useRoutes';
import { useRouter } from 'expo-router';

export default function IndexScreen() {
  const { routes, loading, error, loadRoutes } = useRoutes();
  const router = useRouter();

  if (loading) {
    return <Text>Loading...</Text>;
  }

  if (error) {
    return <Text>Error: {error.message}</Text>;
  }

  return (
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
        <RefreshControl refreshing={loading} onRefresh={loadRoutes} />
      }
    />
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
});
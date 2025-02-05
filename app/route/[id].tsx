import { View, Text, ScrollView, TouchableOpacity, StyleSheet, Alert } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { routeService } from '../../services/routeService';
import { useState, useEffect } from 'react';

// Definiujemy interfejsy
interface Waypoint {
  id: number;
  name: string;
  description: string;
  lat: number;
  lng: number;
  route_id: number;
}

interface Route {
  id: number;
  name: string;
  description: string;
  waypoints?: Waypoint[];
}

export default function RouteDetailsScreen() {
  const { id } = useLocalSearchParams();
  const router = useRouter();
  const [route, setRoute] = useState<Route | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadRouteDetails();
  }, [id]);

  const loadRouteDetails = async () => {
    try {
      const routeData = await routeService.getRouteWithWaypoints(Number(id));
      setRoute(routeData);
    } catch (error) {
      console.error('Error loading route details:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleDownloadRoute = async () => {
    if (!route) return;
    try {
      await routeService.syncRoutes();
      Alert.alert(
        "Success",
        "Route has been downloaded successfully and is available offline",
        [
          { text: "OK" }
        ]);
    } catch (error) {
        Alert.alert(
            "Error",
            "Failed to download route. Please try again later.",
            [
              { text: "OK" }
            ]);
      console.error('Error downloading route:', error);
    }
  };

  const handleStartNavigation = () => {
    router.push({
      pathname: "/route/[id]",
      params: { id }
    });
  };

  if (loading || !route) {
    return <Text>Loading...</Text>;
  }

  return (
    <ScrollView style={styles.container}>
      <Text style={styles.title}>{route.name}</Text>
      <Text style={styles.description}>{route.description}</Text>

      <Text style={styles.subtitle}>Waypoints:</Text>
      {route.waypoints?.map((waypoint: Waypoint, index: number) => (
        <View key={index} style={styles.waypointCard}>
          <Text style={styles.waypointName}>{waypoint.name}</Text>
          <Text style={styles.waypointDescription}>{waypoint.description}</Text>
        </View>
      ))}

      <View style={styles.buttonContainer}>
        <TouchableOpacity 
          style={[styles.button, styles.downloadButton]} 
          onPress={handleDownloadRoute}
        >
          <Text style={styles.buttonText}>Download Route</Text>
        </TouchableOpacity>
        
        <TouchableOpacity 
          style={[styles.button, styles.navigationButton]} 
          onPress={handleStartNavigation}
        >
          <Text style={styles.buttonText}>Start Navigation</Text>
        </TouchableOpacity>
      </View>
    </ScrollView>
  );
}


const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 16,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 8,
  },
  description: {
    fontSize: 16,
    marginBottom: 24,
  },
  subtitle: {
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 16,
  },
  waypointCard: {
    padding: 16,
    backgroundColor: '#f5f5f5',
    borderRadius: 8,
    marginBottom: 12,
  },
  waypointName: {
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  waypointDescription: {
    fontSize: 14,
  },
  buttonContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 24,
    marginBottom: 32,
  },
  button: {
    flex: 1,
    padding: 16,
    borderRadius: 8,
    marginHorizontal: 8,
    alignItems: 'center',
  },
  downloadButton: {
    backgroundColor: '#4CAF50',
  },
  navigationButton: {
    backgroundColor: '#2196F3',
  },
  buttonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: 'bold',
  },
});
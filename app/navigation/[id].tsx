import React, { useEffect, useState } from 'react';
import { View, StyleSheet, Text, Linking, Alert } from 'react-native';
import { useLocalSearchParams } from 'expo-router';
import Constants from 'expo-constants';
import { WebView } from 'react-native-webview';
import { routeService } from '../../services/routeService';
import * as Location from 'expo-location';
import { Route, Waypoint } from '../../types/models';
import DraggableFlatList, { ScaleDecorator, RenderItemParams } from 'react-native-draggable-flatlist';
import { GestureHandlerRootView, TouchableOpacity } from 'react-native-gesture-handler';
import Sound from 'react-native-sound';

Sound.setCategory('Playback');
const arrivalSound = new Sound('arrival.mp3', Sound.MAIN_BUNDLE, error => {
  if (error) {
    console.error('Failed to load the sound', error);
  }
});

const getDistance = (
  lat1: number, lon1: number, lat2: number, lon2: number
): number => {
  const R = 6371e3; // promień Ziemi w metrach
  const toRad = (value: number) => (value * Math.PI) / 180;
  const φ1 = toRad(lat1);
  const φ2 = toRad(lat2);
  const Δφ = toRad(lat2 - lat1);
  const Δλ = toRad(lon2 - lon1);
  const a =
    Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
    Math.cos(φ1) * Math.cos(φ2) *
    Math.sin(Δλ / 2) * Math.sin(Δλ / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
};

// Przenieś deklarację funkcji loadRouteAndLocation na początek,
// aby można było ją wywołać w useEffect poniżej
const NavigationScreen = () => {
  const googleMapsApiKey = Constants.expoConfig?.android?.config?.googleMaps?.apiKey;
  const { id } = useLocalSearchParams();
  const [route, setRoute] = useState<Route | null>(null);
  const [waypoints, setWaypoints] = useState<Waypoint[]>([]);
  const [currentLocation, setCurrentLocation] = useState<{ lat: number; lng: number } | null>(null);
  const [reached, setReached] = useState<number[]>([]);

  // Funkcja ładowania trasy oraz lokalizacji
  const loadRouteAndLocation = async () => {
    try {
      const routeData = await routeService.getRouteWithWaypoints(Number(id));
      setRoute(routeData);

      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        throw new Error('Permission to access location was denied');
      }
      const location = await Location.getCurrentPositionAsync({});
      console.log('Location:', location);
      setCurrentLocation({
        lat: location.coords.latitude,
        lng: location.coords.longitude,
      });
    } catch (error) {
      console.error('Error:', error);
    }
  };

  useEffect(() => {
    loadRouteAndLocation();
  }, [id]);

  // Po ustawieniu trasy kopiujemy waypointy do stanu (umożliwia zmianę kolejności)
  useEffect(() => {
    if (route?.waypoints) {
      console.log('Setting waypoint order:', route.waypoints);
      setWaypoints([...route.waypoints]);
    }
  }, [route]);

  // Subskrypcja aktualizacji lokalizacji
  useEffect(() => {
    let subscription: Location.LocationSubscription;
    const startWatching = async () => {
      try {
        const { status } = await Location.requestForegroundPermissionsAsync();
        if (status !== 'granted') {
          throw new Error('Permission to access location was denied');
        }
        subscription = await Location.watchPositionAsync(
          {
            accuracy: Location.Accuracy.High,
            timeInterval: 5000,
            distanceInterval: 10,
          },
          (loc) => {
            const newLocation = {
              lat: loc.coords.latitude,
              lng: loc.coords.longitude,
            };
            setCurrentLocation(newLocation);
          }
        );
      } catch (error) {
        console.error('Error watching location:', error);
      }
    };
    startWatching();
    return () => {
      if (subscription) subscription.remove();
    };
  }, []);

  // Sprawdzenie dotarcia do waypointu: jeśli użytkownik jest w promieniu 50 m,
  // odtwarzamy sygnał dźwiękowy oraz wyświetlamy alert.
  useEffect(() => {
    if (currentLocation && waypoints.length) {
      waypoints.forEach((wp, idx) => {
        if (!reached.includes(idx)) {
          const dist = getDistance(currentLocation.lat, currentLocation.lng, wp.lat, wp.lng);
          if (dist < 50) {
            console.log(`Waypoint ${idx + 1} reached, distance: ${dist}m`);
            setReached(prev => [...prev, idx]);
            arrivalSound.play(success => {
              if (success) {
                console.log('Arrival sound played successfully');
              } else {
                console.error('Playback failed');
              }
            });
            Alert.alert(wp.name, wp.description);
          }
        }
      });
    }
  }, [currentLocation, waypoints, reached]);

  const openFullNavigation = (
    orderedWaypoints: Waypoint[],
    currentLoc: { lat: number; lng: number }
  ) => {
    const origin = `${currentLoc.lat},${currentLoc.lng}`;
    const destination = orderedWaypoints[orderedWaypoints.length - 1];
    const waypointsStr = orderedWaypoints
      .slice(0, -1)
      .map(wp => `${wp.lat},${wp.lng}`)
      .join('|');

    const url = `google.navigation:q=${destination.lat},${destination.lng}&waypoints=${waypointsStr}`;
    Linking.openURL(url).catch(() => {
      const mapsUrl =
        `https://www.google.com/maps/dir/?api=1` +
        `&origin=${origin}` +
        `&destination=${destination.lat},${destination.lng}` +
        `&waypoints=${waypointsStr}` +
        `&travelmode=driving`;
      Linking.openURL(mapsUrl);
    });
  };

  const getMapHTML = () => {
    if (!route || !currentLocation || !waypoints?.length) {
      console.log('Missing data for map:', { route, currentLocation, waypoints });
      return '';
    }
    console.log('Generating map with waypoints:', waypoints);
    return `
      <!DOCTYPE html>
      <html>
        <head>
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <meta http-equiv="Content-Security-Policy" content="default-src * 'unsafe-inline' 'unsafe-eval'; geolocation *;">
          <script src="https://maps.googleapis.com/maps/api/js?key=${googleMapsApiKey}"></script>
          <style>
            #map { height: 100vh; width: 100%; }
          </style>
        </head>
        <body>
          <div id="map"></div>
          <script>
            function initMap() {
              const map = new google.maps.Map(document.getElementById('map'), {
                zoom: 12,
                center: { lat: ${currentLocation.lat}, lng: ${currentLocation.lng} }
              });
              new google.maps.Marker({
                position: { lat: ${currentLocation.lat}, lng: ${currentLocation.lng} },
                map: map,
                title: 'Your location'
              });
              ${waypoints.map((wp, index) => `
                new google.maps.Marker({
                  position: { lat: ${wp.lat}, lng: ${wp.lng} },
                  map: map,
                  title: '${wp.name}',
                  label: '${index + 1}'
                });
              `).join('')}
              const directionsService = new google.maps.DirectionsService();
              const directionsRenderer = new google.maps.DirectionsRenderer({ map: map });
              const waypointsJs = ${JSON.stringify(waypoints.map(wp => ({ location: { lat: wp.lat, lng: wp.lng } })))};
              directionsService.route({
                origin: { lat: ${currentLocation.lat}, lng: ${currentLocation.lng} },
                destination: waypointsJs[waypointsJs.length - 1].location,
                waypoints: waypointsJs.slice(0, -1),
                travelMode: 'DRIVING'
              }, (response, status) => {
                if (status === 'OK') {
                  directionsRenderer.setDirections(response);
                }
              });
            }
            initMap();
          </script>
        </body>
      </html>
    `;
  };

  const renderWaypoint = (params: RenderItemParams<Waypoint>): JSX.Element => {
    const { item, drag, isActive, getIndex } = params;
    const index = getIndex() ?? 0;
    return (
      <ScaleDecorator>
        <TouchableOpacity
          activeOpacity={1}
          onLongPress={drag}
          disabled={isActive}
          style={[
            styles.waypointItem,
            { backgroundColor: isActive ? '#f0f0f0' : 'white' },
          ]}
        >
          <View style={styles.waypointContent}>
            <Text style={styles.waypointName}>
              {index + 1}. {item.name}
            </Text>
            <Text style={styles.waypointDescription}>{item.description}</Text>
          </View>
        </TouchableOpacity>
      </ScaleDecorator>
    );
  };

  if (!route || !currentLocation) {
    return <Text>Loading...</Text>;
  }

  return (
    <GestureHandlerRootView style={styles.container}>
      <WebView
        key={`map-${waypoints.map(w => w.id).join('-')}`}
        style={styles.map}
        source={{ html: getMapHTML() }}
        javaScriptEnabled={true}
        geolocationEnabled={true}
        originWhitelist={['*']}
        allowUniversalAccessFromFileURLs={true}
        cacheEnabled={false}
        cacheMode={'LOAD_NO_CACHE'}
        incognito={true}
      />
      <View style={styles.waypointsList}>
        <TouchableOpacity
          style={styles.navigateAllButton}
          onPress={() => openFullNavigation(waypoints, currentLocation)}
        >
          <Text style={styles.navigateAllButtonText}>
            Navigate Through All Points
          </Text>
        </TouchableOpacity>
        <DraggableFlatList
          data={waypoints}
          onDragEnd={({ data }) => {
            console.log('New waypoints order:', data);
            setWaypoints([...data]);
          }}
          keyExtractor={(item) => item.id.toString()}
          renderItem={renderWaypoint}
        />
      </View>
    </GestureHandlerRootView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  map: {
    flex: 1,
  },
  waypointsList: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: 'white',
    maxHeight: '40%',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: 16,
  },
  navigateAllButton: {
    backgroundColor: '#2196F3',
    padding: 16,
    borderRadius: 8,
    marginBottom: 16,
    alignItems: 'center',
  },
  navigateAllButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: 'bold',
  },
  waypointItem: {
    padding: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  waypointName: {
    fontSize: 16,
    fontWeight: 'bold',
  },
  waypointDescription: {
    fontSize: 14,
    color: '#666',
  },
  waypointContent: {
    flex: 1,
  },
  dragHandle: {
    padding: 10,
  },
});

export default NavigationScreen;
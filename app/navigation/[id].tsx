import React, { useEffect, useState } from 'react';
import { View, StyleSheet, Text, Linking } from 'react-native';
import { useLocalSearchParams } from 'expo-router';
import Constants from 'expo-constants';
import { WebView } from 'react-native-webview';
import { routeService } from '../../services/routeService';
import * as Location from 'expo-location';
import { Route, Waypoint } from '../../types/models';
import DraggableFlatList, { ScaleDecorator, RenderItemParams } from 'react-native-draggable-flatlist';
import { GestureHandlerRootView, TouchableOpacity } from 'react-native-gesture-handler';


export default function NavigationScreen() {
  const googleMapsApiKey = Constants.expoConfig?.android?.config?.googleMaps?.apiKey;
  const { id } = useLocalSearchParams();
  const [route, setRoute] = useState<Route | null>(null);
  const [waypoints, setWaypoints] = useState<Waypoint[]>([]);
  const [currentLocation, setCurrentLocation] = useState<{ lat: number; lng: number } | null>(null);

  // Ładowanie trasy i lokalizacji
  useEffect(() => {
    loadRouteAndLocation();
  }, [id]);

  // Po ustawieniu trasy, zapisujemy waypointy do stanu (pozwala to na zmianę kolejności)
  useEffect(() => {
    if (route?.waypoints) {
      console.log('Setting waypoints:', route.waypoints);
      // Tworzymy kopię, aby nie modyfikować oryginalnego obiektu
      setWaypoints([...route.waypoints]);
    }
  }, [route]);

  const loadRouteAndLocation = async () => {
    try {
      // Pobierz trasę z backendu (lub cache)
      const routeData = await routeService.getRouteWithWaypoints(Number(id));
      setRoute(routeData);

      // Pobierz lokalizację użytkownika
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

  // Funkcja otwierająca nawigację dla wszystkich punktów według bieżącej kolejności
  const openFullNavigation = (
    orderedWaypoints: Waypoint[],
    currentLocation: { lat: number; lng: number }
  ) => {
    // Aktualna lokalizacja jako punkt startowy:
    const origin = `${currentLocation.lat},${currentLocation.lng}`;
    // Ostatni punkt na liście jako destynacja:
    const destination = orderedWaypoints[orderedWaypoints.length - 1];
    // Pozostałe punkty to waypointy (łączymy je separatorem "|")
    const waypointsStr = orderedWaypoints
      .slice(0, -1)
      .map(wp => `${wp.lat},${wp.lng}`)
      .join('|');

    const url = `google.navigation:q=${destination.lat},${destination.lng}&waypoints=${waypointsStr}`;
    Linking.openURL(url).catch(() => {
      // Fallback – otwiera Google Maps w przeglądarce
      const mapsUrl =
        `https://www.google.com/maps/dir/?api=1` +
        `&origin=${origin}` +
        `&destination=${destination.lat},${destination.lng}` +
        `&waypoints=${waypointsStr}` +
        `&travelmode=driving`;
      Linking.openURL(mapsUrl);
    });
  };

  // Funkcja generująca HTML dla WebView z mapą Google,
  // wykorzystując aktualną kolejność waypointów
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

              // Marker aktualnej lokalizacji
              new google.maps.Marker({
                position: { lat: ${currentLocation.lat}, lng: ${currentLocation.lng} },
                map: map,
                title: 'Your location'
              });

              // Dodaj markery dla waypointów
              ${waypoints.map((wp, index) => `
                new google.maps.Marker({
                  position: { lat: ${wp.lat}, lng: ${wp.lng} },
                  map: map,
                  title: '${wp.name}',
                  label: '${index + 1}'
                });
              `).join('')}

              // Rysowanie trasy między punktami
              const directionsService = new google.maps.DirectionsService();
              const directionsRenderer = new google.maps.DirectionsRenderer({
                map: map
              });
              const waypointsJs = ${JSON.stringify(waypoints.map(wp => ({
                location: { lat: wp.lat, lng: wp.lng }
              })))};
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

  // Funkcja renderująca pojedynczy element listy waypointów
  const renderWaypoint = (params: RenderItemParams<Waypoint>): JSX.Element => {
    const { item, drag, isActive, getIndex } = params;
    const index = getIndex() !== undefined ? getIndex() : 0;
    const safeIndex = index ?? 0;
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
              {safeIndex + 1}. {item.name}
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
}

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
  waypointsContainer: {
    flex: 1,
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

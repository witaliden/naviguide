import React, { useEffect, useState } from 'react';
import { View, StyleSheet, Dimensions, TouchableOpacity, Text, Linking } from 'react-native';
import { useLocalSearchParams } from 'expo-router';
import Constants from 'expo-constants';
import { WebView } from 'react-native-webview';
import { routeService } from '../../services/routeService';
import * as Location from 'expo-location';
import { Route, Waypoint } from '../../types/models';

export default function NavigationScreen() {
  const googleMapsApiKey = Constants.expoConfig?.android?.config?.googleMaps?.apiKey;
  const { id } = useLocalSearchParams();
  const [route, setRoute] = useState<Route | null>(null);
  const [currentLocation, setCurrentLocation] = useState<{ lat: number; lng: number } | null>(null);

  useEffect(() => {
    loadRouteAndLocation();
  }, [id]);

  const loadRouteAndLocation = async () => {
    try {
      // Pobierz trasę
      const routeData = await routeService.getRouteWithWaypoints(Number(id));
      setRoute(routeData);

      // Pobierz lokalizację
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        throw new Error('Permission to access location was denied');
      }

      const location = await Location.getCurrentPositionAsync({});
      console.log('Location:', location);
      setCurrentLocation({
        lat: location.coords.latitude,
        lng: location.coords.longitude
      });
    } catch (error) {
      console.error('Error:', error);
    }
  };

  const openNativeNavigation = (waypoint: Waypoint) => {
    const url = `google.navigation:q=${waypoint.lat},${waypoint.lng}`;
    Linking.openURL(url).catch(() => {
      // Fallback dla iOS lub gdy Google Maps nie jest zainstalowane
      const mapsUrl = `https://www.google.com/maps/dir/?api=1&destination=${waypoint.lat},${waypoint.lng}`;
      Linking.openURL(mapsUrl);
    });
  };

  // HTML dla WebView z Google Maps
  const getMapHTML = () => {
    if (!route || !currentLocation) {return ''};
    console.log('2 Route:', route);
    console.log('2 Current location:', currentLocation);
    
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

              // Dodaj marker aktualnej lokalizacji
              new google.maps.Marker({
                position: { lat: ${currentLocation.lat}, lng: ${currentLocation.lng} },
                map: map,
                title: 'Your location'
              });

              // Dodaj markery dla waypointów
              ${route.waypoints.map((wp, index) => `
                new google.maps.Marker({
                  position: { lat: ${wp.lat}, lng: ${wp.lng} },
                  map: map,
                  title: '${wp.name}',
                  label: '${index + 1}'
                });
              `).join('')}

              // Narysuj trasę między punktami
              const directionsService = new google.maps.DirectionsService();
              const directionsRenderer = new google.maps.DirectionsRenderer({
                map: map
              });

              const waypoints = ${JSON.stringify(route.waypoints.map(wp => ({
                location: { lat: wp.lat, lng: wp.lng }
              })))};

              directionsService.route({
                origin: { lat: ${currentLocation.lat}, lng: ${currentLocation.lng} },
                destination: waypoints[waypoints.length - 1].location,
                waypoints: waypoints.slice(0, -1),
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

  if (!route || !currentLocation) {
    return <Text>Loading...</Text>;
  }

  return (
    <View style={styles.container}>
      <WebView
        key={`${currentLocation.lat}-${currentLocation.lng}`}
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
        {route.waypoints.map((waypoint, index) => (
          <TouchableOpacity
            key={waypoint.id}
            style={styles.waypointItem}
            onPress={() => openNativeNavigation(waypoint)}
          >
            <Text style={styles.waypointName}>
              {index + 1}. {waypoint.name}
            </Text>
            <Text style={styles.waypointDescription}>
              {waypoint.description}
            </Text>
          </TouchableOpacity>
        ))}
      </View>
    </View>
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
    maxHeight: '30%',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: 16,
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
});
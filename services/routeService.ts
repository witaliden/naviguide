import AsyncStorage from '@react-native-async-storage/async-storage';
import axios from 'axios';
import { Route, Waypoint } from '../types/models';

const API_URL = 'http://10.0.2.2:8080/api';
// const API_URL = 'http://192.168.1.133:8080/api';
const ROUTES_CACHE_KEY = 'routes_cache';
const WAYPOINTS_CACHE_KEY = 'waypoints_cache';

export const routeService = {
  async getAllRoutes(): Promise<Route[]> {
    try {
      const cachedRoutes = await AsyncStorage.getItem(ROUTES_CACHE_KEY);
      if (cachedRoutes) {
        return JSON.parse(cachedRoutes);
      }

      const response = await axios.get(`${API_URL}/routes`);
      const routes = response.data;
      
      await AsyncStorage.setItem(ROUTES_CACHE_KEY, JSON.stringify(routes));
      return routes;
    } catch (error) {
      console.error('Error fetching routes:', error);

      const cachedRoutes = await AsyncStorage.getItem(ROUTES_CACHE_KEY);
      if (cachedRoutes) {
        return JSON.parse(cachedRoutes);
      }
      throw error;
    }
  },

  async forceRefreshRoutes(): Promise<Route[]> {
    try {
      const response = await axios.get(`${API_URL}/routes`);
      const routes = response.data;
      
      await AsyncStorage.setItem(ROUTES_CACHE_KEY, JSON.stringify(routes));
      
      // Odświeżanie waypointów
      for (const route of routes) {
        const routeDetails = await axios.get(`${API_URL}/routes/${route.id}`);
        await AsyncStorage.setItem(
          `${WAYPOINTS_CACHE_KEY}_${route.id}`,
          JSON.stringify(routeDetails.data)
        );
      }
      
      return routes;
    } catch (error) {
      console.error('Error refreshing routes:', error);
      throw error;
    }
  },
   

  async getRouteWithWaypoints(routeId: number): Promise<Route> {
    try {
      const cacheKey = `${WAYPOINTS_CACHE_KEY}_${routeId}`;
      const cachedRoute = await AsyncStorage.getItem(cacheKey);
      
      if (cachedRoute) {
        return JSON.parse(cachedRoute);
      }

      const response = await axios.get(`${API_URL}/routes/${routeId}`);
      const route = response.data;
      
      await AsyncStorage.setItem(cacheKey, JSON.stringify(route));
      return route;
    } catch (error) {
      console.error('Error fetching route:', error);
      const cachedRoute = await AsyncStorage.getItem(`${WAYPOINTS_CACHE_KEY}_${routeId}`);
      if (cachedRoute) {
        return JSON.parse(cachedRoute);
      }
      throw error;
    }
  },

  async syncRoutes(): Promise<void> {
    try {
      const response = await axios.get(`${API_URL}/routes`);
      const routes = response.data;
      await AsyncStorage.setItem(ROUTES_CACHE_KEY, JSON.stringify(routes));
      
      for (const route of routes) {
        const routeDetails = await this.getRouteWithWaypoints(route.id);
        await AsyncStorage.setItem(
          `${WAYPOINTS_CACHE_KEY}_${route.id}`,
          JSON.stringify(routeDetails)
        );
      }
    } catch (error) {
      console.error('Error syncing routes:', error);
      throw error;
    }
  },

  async clearCache(): Promise<void> {
    try {
      await AsyncStorage.removeItem(ROUTES_CACHE_KEY);
      const allKeys = await AsyncStorage.getAllKeys();
      const waypointKeys = allKeys.filter(key => key.startsWith(WAYPOINTS_CACHE_KEY));
      await AsyncStorage.multiRemove(waypointKeys);
    } catch (error) {
      console.error('Error clearing cache:', error);
      throw error;
    }
  }
};
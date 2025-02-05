import { useState, useEffect, useCallback } from 'react';
import { routeService } from '../services/routeService';
import { Route } from '../types/models';

export const useRoutes = () => {
    const [routes, setRoutes] = useState<Route[]>([]);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [error, setError] = useState<Error | null>(null);

    const loadRoutes = useCallback(async () => {
        try {
            setLoading(true);
            setError(null);
            const data = await routeService.getAllRoutes();
            setRoutes(data);
        } catch (err) {
            setError(err instanceof Error ? err : new Error('An error occurred'));
        } finally {
            setLoading(false);
        }
    }, []);

    const refreshRoutes = async () => {
        try {
            setRefreshing(true);
            setError(null);
            const data = await routeService.forceRefreshRoutes();
            setRoutes(data);
        } catch (err) {
            setError(err instanceof Error ? err : new Error('An error occurred'));
        } finally {
            setRefreshing(false);
        }
    };

    useEffect(() => {
        loadRoutes();
    }, [loadRoutes]);

    return { 
        routes, 
        loading, 
        refreshing,
        error, 
        refreshRoutes,
        loadRoutes 
    };
};
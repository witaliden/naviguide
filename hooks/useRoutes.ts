import { useState, useEffect } from 'react';
import { routeService } from '../services/routeService';

interface Route {
    id: number;
    name: string;
    description: string;
    waypoints?: Waypoint[];
}

interface Waypoint {
    id: number;
    name: string;
    description: string;
    lat: number;
    lng: number;
    route_id: number;
}

export const useRoutes = () => {
    const [routes, setRoutes] = useState<Route[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<Error | null>(null);

    const loadRoutes = async () => {
        try {
            setLoading(true);
            const data = await routeService.getAllRoutes();
            setRoutes(data);
        } catch (err) {
            setError(err instanceof Error ? err : new Error('An error occurred'));
        } finally {
            setLoading(false);
        }
    };

    const syncRoutes = async () => {
        try {
            setLoading(true);
            await routeService.syncRoutes();
            await loadRoutes();
        } catch (err) {
            setError(err instanceof Error ? err : new Error('An error occurred'));
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        loadRoutes();
    }, []);

    return { routes, loading, error, syncRoutes, loadRoutes };
};
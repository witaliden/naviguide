export interface Waypoint {
    id: number;
    name: string;
    description: string;
    lat: number;
    lng: number;
    route_id: number;
  }
  
  export interface Route {
    id: number;
    name: string;
    description: string;
    waypoints: Waypoint[];
  }  
export interface RouteLog {
  route_log_id?: number;
  user_id: number;
  planned_route_id?: number | null;

  start_name: string;
  destination_name: string;

  elevation: number;
  distance: number;
  duration: number;

  street_names: string[];

  completed_at?: Date;
  created_at?: Date;
}
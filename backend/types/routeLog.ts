export interface RouteLog {
  route_log_id?: number;
  route_id: number;
  user_id: number;
  street_names: string[];
  completed_at?: Date;
  created_at?: Date;
}
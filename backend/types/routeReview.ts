export interface RouteReview {
  review_id?: number;
  route_log_id: number;
  user_id: number;

  overall_rating: number;
  safety_rating: number;
  difficulty_rating: number;

  comments?: string | null;

  created_at?: Date;
  updated_at?: Date;
}
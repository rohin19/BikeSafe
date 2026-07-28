export interface Review {
  review_id?: number;
  route_id: number;
  user_id: number;
  review_rating: number;
  safety_rating: number;
  difficulty_rating: number;
  comment?: string | null;
  created_at?: Date;
  updated_at?: Date;
}
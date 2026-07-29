export interface Review {
  review_id: number;
  route_id: number;
  user_id: number | null;
  review_rating: number;
  comment: string | null;
  created_at: Date;
}

export interface CreateReviewBody {
  route_id: number;
  review_rating: number;
  comment?: string | null;
}

export interface UpdateReviewBody {
  review_rating?: number;
  comment?: string | null;
}

export interface CommunityReview extends Review {
  user_name: string | null;
  start_name: string;
  destination_name: string;
  elevation: number;
  distance: number;
  duration: number;
  safety_score: number;
  is_mine: boolean;
}
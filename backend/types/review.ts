export interface Review {
    review_id?: number,
    route_id: number,
    user_id: number,
    review_rating: number,
    comment?: string,
    creasted_at?: Date,
}
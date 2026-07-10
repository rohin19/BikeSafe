export interface Hazard {
    hazard_id?: number,
    user_id: number,
    title: string,
    description: string,
    category: string,
    current_status: 'reported' | 'in_progress' | 'resolved',
    severity: number,
    latitude: number,
    longitude: number,
    image_url?: string,
    created_at?: Date,
}
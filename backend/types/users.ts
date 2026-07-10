export interface User {
    user_id?: number,
    name: string,
    email: string,
    hashed_password: string,
    role?: 'admin' | 'user',
    created_at?: Date,
}
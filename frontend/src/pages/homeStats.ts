import type { Hazard } from '../types';

// "now" is injectable (defaults to the real clock) so this is testable with a fixed reference time
export function computeReportedToday(hazards: Hazard[], now: number = Date.now()): number {
  const oneDayAgo = now - 24 * 60 * 60 * 1000;
  return hazards.filter((h) => new Date(h.created_at).getTime() > oneDayAgo).length;
}

export function computeReportedByYou(hazards: Hazard[], userId: number): number {
  return hazards.filter((h) => h.user_id === userId).length;
}

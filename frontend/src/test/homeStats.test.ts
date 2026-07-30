import { describe, it, expect } from 'vitest';
import { computeReportedToday, computeReportedByYou } from '../pages/homeStats';
import type { Hazard } from '../types';

const DAY_MS = 24 * 60 * 60 * 1000;
const NOW = new Date('2026-07-30T12:00:00.000Z').getTime();

function hazard(overrides: Partial<Hazard> = {}): Hazard {
  return {
    hazard_id: 1,
    user_id: 1,
    title: 'Test hazard',
    description: '',
    category: 'Other',
    current_status: 'reported',
    severity: 1,
    latitude: 0,
    longitude: 0,
    created_at: new Date(NOW).toISOString(),
    ...overrides,
  };
}

describe('computeReportedToday', () => {
  it('returns 0 when there are no hazards', () => {
    expect(computeReportedToday([], NOW)).toBe(0);
  });

  it('counts a hazard reported well within the last 24 hours', () => {
    const hazards = [hazard({ created_at: new Date(NOW - 1000).toISOString() })];
    expect(computeReportedToday(hazards, NOW)).toBe(1);
  });

  it('does not count a hazard reported well over 24 hours ago', () => {
    const hazards = [hazard({ created_at: new Date(NOW - 2 * DAY_MS).toISOString() })];
    expect(computeReportedToday(hazards, NOW)).toBe(0);
  });

  it('counts a hazard reported 1ms inside the 24-hour boundary', () => {
    const hazards = [hazard({ created_at: new Date(NOW - DAY_MS + 1).toISOString() })];
    expect(computeReportedToday(hazards, NOW)).toBe(1);
  });

  it('does not count a hazard reported exactly at the 24-hour boundary (strictly greater-than, not inclusive)', () => {
    const hazards = [hazard({ created_at: new Date(NOW - DAY_MS).toISOString() })];
    expect(computeReportedToday(hazards, NOW)).toBe(0);
  });

  it('counts only the hazards within the window out of a mixed list', () => {
    const hazards = [
      hazard({ created_at: new Date(NOW - 1000).toISOString() }), // in
      hazard({ created_at: new Date(NOW - 2 * DAY_MS).toISOString() }), // out
      hazard({ created_at: new Date(NOW - DAY_MS + 1).toISOString() }), // in
    ];
    expect(computeReportedToday(hazards, NOW)).toBe(2);
  });
});

describe('computeReportedByYou', () => {
  it('returns 0 when the user has reported nothing', () => {
    const hazards = [hazard({ user_id: 2 }), hazard({ user_id: 3 })];
    expect(computeReportedByYou(hazards, 1)).toBe(0);
  });

  it('counts only hazards matching the given user id', () => {
    const hazards = [
      hazard({ user_id: 1 }),
      hazard({ user_id: 2 }),
      hazard({ user_id: 1 }),
    ];
    expect(computeReportedByYou(hazards, 1)).toBe(2);
  });
});

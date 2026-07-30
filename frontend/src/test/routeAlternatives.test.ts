import { describe, it, expect } from 'vitest';
import { pickSafestIndex, type RouteAlternative } from '../pages/routeAlternatives';

describe('pickSafestIndex', () => {
  function alt(safetyScore: number): RouteAlternative {
    return { path: [], distance: 0, duration: 0, elevation: 0, avoidedHazards: false, safetyScore };
  }

  it('returns null for an empty list', () => {
    expect(pickSafestIndex([])).toBeNull();
  });

  it('returns the index of the highest safety score', () => {
    expect(pickSafestIndex([alt(70), alt(95), alt(80)])).toBe(1);
  });

  it('returns the first index on a tie', () => {
    expect(pickSafestIndex([alt(90), alt(90)])).toBe(0);
  });

  it('works with a single alternative', () => {
    expect(pickSafestIndex([alt(50)])).toBe(0);
  });
});
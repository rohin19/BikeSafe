export interface RouteAlternative {
  path: { lat: number; lon: number }[];
  distance: number;
  duration: number;
  safetyScore: number;
  elevation: number;
  avoidedHazards: boolean;
}

// picks the index of whichever alternative scored safest; null when there's nothing to pick from.
// kept in its own file (no Leaflet/DOM-touching imports) so it's testable with zero DOM environment
export function pickSafestIndex(alternatives: RouteAlternative[]): number | null {
  if (alternatives.length === 0) return null;
  return alternatives.reduce(
    (bestI, alt, i) => (alt.safetyScore > alternatives[bestI]!.safetyScore ? i : bestI),
    0
  );
}

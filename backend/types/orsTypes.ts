export interface ORSFeature {
    geometry: {
        coordinates: [number, number], // [lon, lat] is GeoJSON standard order
    },
    properties: { 
        label: string 
    }
}

export interface ORSDirectionsFeature {
    geometry: {
        coordinates: [number, number][] // array of [lon, lat] pairs tracing a path
    },
    properties: {
        summary: {
            distance: number,
            duration: number
        },
        ascent: number,
    }
}
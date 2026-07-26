import { Router, Request, Response } from 'express';
import routesRouter from './routes';

// OpenRouteService API ~ ORS

interface ORSFeature {
    geometry: {coordinates: [number, number] }; //[lon, lat] - GeoJSON order
    properties: { label: string };
}

const geocodeRouter = Router();

// GET /api/routes/geocode/search?q= forward geocode: turn a typed place name/address into a list of candidate {lat,lon,label} matches
geocodeRouter.get('/search', async (req: Request, res: Response) => {
    try {
        const query = req.query.q as string;
        if (!query) {
            return res.status(400).json({ error: 'q query param is required' });
        }

        // urlsearchparams joins the kv pairs into the right format: key1=value1&key2=value2
        const params = new URLSearchParams({
            api_key: process.env.ORS_API_KEY as string,
            text: query,
        });

        // geocoding search, we send it a text string like ('Vancouver') which gives us a list of candidate matches: https://openrouteservice.org/dev/#/api-docs/geocode/search/get
        const orsRes = await fetch(`https://api.openrouteservice.org/geocode/search?${params.toString()}`);
        const orsData = await orsRes.json();

        const results = (orsData.features as ORSFeature[]).map((feature) => ({
            lat: feature.geometry.coordinates[1],
            lon: feature.geometry.coordinates[0],
            label: feature.properties.label,
        }));

        return res.status(200).json(results);

    } catch (e) {
        console.error(`Error geocoding search: ${e}`);
        return res.status(500).json({ error: 'Failed to geocode search (OpenRouteService API error)'});
    }
});

//GET /api/routes/geocode/reverse?lat=&lon= reverse geocode: turn a clicked map point into its nearest human readable address
geocodeRouter.get('/reverse', async(req:Request, res:Response) => {
    // TODO: implement reverse search
    try {
        const lat = parseFloat(req.query.lat as string);
        const lon = parseFloat(req.query.lon as string);

        if (isNaN(lat) || isNaN(lon)){
            return res.status(400).json({ error: 'lat and lon query params are required and must be valid numbers'});
        }

        const params = new URLSearchParams({
            api_key: process.env.ORS_API_KEY as string,
            'point.lat': lat.toString(),
            'point.lon': lon.toString()
        });

        const orsRes = await fetch(`https://api.openrouteservice.org/geocode/reverse?${params.toString()}`);
        const orsData = await orsRes.json();

        const results = (orsData.features as ORSFeature[]).map((feature) => ({
            lat: feature.geometry.coordinates[1],
            lon: feature.geometry.coordinates[0],
            label: feature.properties.label,
        }));

        return res.status(200).json(results[0] ?? null);
    } catch (e){
        console.error(`Error geocoding reverse search: ${e}`);
        return res.status(500).json({ error: 'Failed to geocode reverse search (OpenRouteService API error)'});
    }
});

export default geocodeRouter;
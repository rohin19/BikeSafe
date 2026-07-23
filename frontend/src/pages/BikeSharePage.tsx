import { useEffect, useState } from "react";
import Map from "../components/Map";
import type { CleanStation, CleanFreeBike, Bounds } from '../types'
import { gbfsApi } from "../services/api";


export default function BikeSharePage() {
    const [stations, setStations] = useState<CleanStation[]>([]);
    const [freeBikes, setFreeBikes] = useState<CleanFreeBike[]>([]);
    const [loading, setloading] = useState<boolean>(false);
    const [error, setError] = useState('');
    const [bounds, setBounds] = useState<Bounds | null>(null);
    
    useEffect(() => {
        if (!bounds) return;

        const currentBounds = bounds;

        const timeout = setTimeout(() => {
            fetchGBFS();
        }, 300);

        return () => clearTimeout(timeout);

        async function fetchGBFS () {
            try{
                setloading(true);
                const Params = new URLSearchParams({
                    north: currentBounds.north.toString(),
                    south: currentBounds.south.toString(),
                    east: currentBounds.east.toString(),
                    west: currentBounds.west.toString()
                });
                
                const fetchedStations = await gbfsApi.stations(Params.toString());
                const fetchedFreeBikes = await gbfsApi.freeBikes(Params.toString());
                setStations(fetchedStations);
                setFreeBikes(fetchedFreeBikes);
                console.log(fetchedStations);
                console.log(fetchedFreeBikes);
            } catch (err) {
                setError(err instanceof Error ? err.message : 'Something went wrong');
            } finally {
                setloading(false);
            }
        }
    }, [bounds]);

    return (
        <div className="page">
            <h1>BikeShare</h1>
            {error && <div className="page">{error}</div>}
            <div className="map-placeholder">
                <Map stations={stations} freeBikes={freeBikes} onBoundsChange={setBounds}/>
            </div>
            {loading && <div className="page">Loading map data...</div>}
        </div>
    )
}
import { useEffect, useState } from "react";
import Map from "../components/Map";
import type { CleanStation, CleanFreeBikes } from '../types'
import { gbfsApi } from "../services/api";


export default function BikeSharePage() {
    const [stations, setStations] = useState<CleanStation[]>([]);
    const [freeBikes, setFreeBikes] = useState<CleanFreeBikes[]>([]);
    const [loading, setloading] = useState<boolean>(false);
    const [error, setError] = useState('');
    const [bounds, setBounds] = useState<{
        north: number;
        south: number;
        east: number;
        west: number;
    } | null>(null);
    
    useEffect(() => {
        if (!bounds) return;

        const timeout = setTimeout(() => {
            fetchGBFS();
        }, 300);

        return () => clearTimeout(timeout);

        async function fetchGBFS () {
            try{
                setloading(true);
                const fetchedStations = await gbfsApi.stations();
                const fetchedFreeBikes = await gbfsApi.freeBikes();
                setStations(fetchedStations);
                setFreeBikes(fetchedFreeBikes);
            } catch (err) {
                setError(err instanceof Error ? err.message : 'Something went wrong');
            } finally {
                setloading(false);
            }
        }
    })

    if (loading) return <div className="page">Loading...</div>
    if (error) return <div className="page">{error}</div>

    return (
        <div className="page">
            <h1>BikeShare</h1>
            <div className="map-placeholder">
                <Map stations={stations} freeBikes={freeBikes} onBoundsChange={setBounds}/>
            </div>
        </div>
    )
}
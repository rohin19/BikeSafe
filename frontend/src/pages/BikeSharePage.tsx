import { useEffect, useState } from "react";
import Map from "../components/Map";
import type { CleanStation, CleanFreeBike, Bounds } from '../types'
import { bikeShareApi } from "../services/api";
import '../styles/BikeSharePage.css'


export default function BikeSharePage() {
    const [stations, setStations] = useState<CleanStation[]>([]);
    const [freeBikes, setFreeBikes] = useState<CleanFreeBike[]>([]);
    const [loading, setloading] = useState<boolean>(false);
    const [error, setError] = useState('');
    const [bounds, setBounds] = useState<Bounds | null>(null);
    const [lastUpdated, setLastUpdated] = useState<Date | null>(null)
    
    useEffect(() => {
        if (!bounds) return;

        const currentBounds = bounds;

        const timeout = setTimeout(() => {
            fetchBikeShare();
        }, 300);

        return () => clearTimeout(timeout);

        async function fetchBikeShare () {
            try{
                setloading(true);
                const Params = new URLSearchParams({
                    north: currentBounds.north.toString(),
                    south: currentBounds.south.toString(),
                    east: currentBounds.east.toString(),
                    west: currentBounds.west.toString()
                });
                
                const fetchedStations = await bikeShareApi.stations(Params.toString());
                const fetchedFreeBikes = await bikeShareApi.freeBikes(Params.toString());
                setStations(fetchedStations);
                setFreeBikes(fetchedFreeBikes);
                setLastUpdated(new Date());
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
        <div className="bike-share-page">
            <header className="bike-share-header">
                <h1>Lime Vancouver</h1>
                <p>
                    {loading
                        ? 'Updating live availability...'
                        : lastUpdated
                            ? `Last updated at ${lastUpdated.toLocaleTimeString(
                                [],
                                {
                                    hour: 'numeric',
                                    minute: '2-digit',
                                },
                            )}`
                            : 'Loading live availability...'}
                </p>
            </header>
            {error && (
                <div className="bike-share-error" role="alert">
                    {error}
                </div>
            )}
            <div className="bike-share-map">
                <Map
                    stations={stations}
                    freeBikes={freeBikes}
                    onBoundsChange={setBounds}
                />
            </div>
        </div>
    )
}
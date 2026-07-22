import Map from "../components/Map";

export default function BikeSharePage() {
    return (
        <div className="page">
            <h1>BikeShare</h1>
            <div className="map-placeholder">
                <Map />
            </div>
        </div>
    )
}
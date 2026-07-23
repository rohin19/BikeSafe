import type { StationPopupProps } from "../types";

export default function StationPopup({ station }: StationPopupProps) {
    return (
        <div>
            <h3 className="text-[12px] font-bold border-b border-black pb-1">
            ${station.name}
            </h3>
            <p>Number of vehicles available: ${station.num_vehicles_available}</p>
            <p>vehicles type: ${station.vehicle_type_available}</p>
            <p>Number of docks available: ${station.num_docks_available}</p>
        </div>
    )
}
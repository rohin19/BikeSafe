import type { FreeBikesPopupProps } from "../types";

export default function FreeBikePopup({ freeBike } : FreeBikesPopupProps) {
    return (
        <div>
            <p>Vehicle Type: {freeBike.vehicle_type}</p>
            <p>Availability: {freeBike.is_reserved ? "Reserved" : "Available"}</p>
            <p>Condition: {freeBike.is_disabled ? "Disabled" : "Normal"}</p>
        </div>
    )
}
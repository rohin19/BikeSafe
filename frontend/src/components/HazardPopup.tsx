import type { hazardPopupProps } from "../types";

export default function HazardPopup({ hazard }: hazardPopupProps) {
    return (
        <div>
            <h3 className="text-[12px] font-bold border-b border-black pb-1">
            {hazard.title}
            </h3>
            {/* <p>Current Status: {hazard.current_status}</p> */}
            <p>Description: {hazard.description}</p>
            <p>Severity: {hazard.severity}</p>
            <p>Category: {hazard.category}</p>
        </div>
    )
}
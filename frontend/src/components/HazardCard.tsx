import type { Hazard, HazardCardProps } from "../types";
// the db only has latitute/long, not streename, so the subtext line shows short coordinates + relative time instead of a fake location string:
function formatRelativeTime(dateString: string) {
    const diffMs = Date.now() - new Date(dateString).getTime();
    const minutes = Math.floor(diffMs / 60000) 
    if (minutes < 1) return 'just now'
    if (minutes < 60) return `${minutes} min. ago`
    const hours = Math.floor(minutes / 60)
    if (hours < 24) return `${hours} hr${hours === 1 ? '' : 's'} ago`
    const days = Math.floor(hours / 24)
    return `${days} day${days === 1 ? '' : 's'} ago`
}

export default function HazardCard({ hazard, isAdmin, onDelete, deleting }: HazardCardProps) {
    return (
      <div className="card">
        <div className="card-header">
          <strong>{hazard.category}</strong>
          {isAdmin && (
            <button
              type="button"
              className="button danger"
              disabled={deleting}
              onClick={() => onDelete(hazard.hazard_id)}
            >
              {deleting ? "Deleting..." : "X"}
            </button>
          )}
        </div>
        <div className="text-muted">
          Lat {Number(hazard.latitude).toFixed(3)}, Lng{" "}
          {Number(hazard.longitude).toFixed(3)} .{" "}
          {formatRelativeTime(hazard.created_at)}
        </div>
      </div>
    );
}
import { useState, type SubmitEvent } from "react";
import { useNavigate } from "react-router-dom";
import { hazardApi } from "../services/api";
import type { User } from "../types";

const CATEGORIES = [
  "Construction",
  "Accident",
  "Bike Theft",
  "Road Condition",
  "Obstacle",
  "Other",
] as const;

export default function ReportHazard({ user }: {user: User}) {
  const navigate = useNavigate();
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [category, setCategory] = useState<string>(CATEGORIES[0]);
  const [severity, setSeverity] = useState("1");
  const [latitude, setLatitude] = useState("");
  const [longitude, setLongitude] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  function useCurrentLocation() {
    // https://developer.mozilla.org/en-US/docs/Web/API/Navigator/geolocation
    // returns Geolocation object that gives the web content access to loc of device
    if (!navigator.geolocation) {
      setError("Geolocation is not supported in this browser :(");
    }
    //https://developer.mozilla.org/en-US/docs/Web/API/Geolocation/getCurrentPosition
    navigator.geolocation.getCurrentPosition(
      (position) => {
        setLatitude(String(position.coords.latitude));
        setLongitude(String(position.coords.longitude));
      },
      () => setError("Could not get your location - enter it manually pwease"),
    );
  }

  async function handleSubmit(e: SubmitEvent<HTMLFormElement>) {
    e.preventDefault();
    setBusy(true);
    setError("");
    try {
      await hazardApi.create({
        user_id: user.user_id,
        title,
        description,
        category,
        severity: Number(severity),
        latitude: Number(latitude),
        longitude: Number(longitude),
      });
      navigate("/hazards");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setBusy(false);
    }
  }

  return (
    <form className="page" onSubmit={handleSubmit}>
      <h1>Report a Hazard</h1>

      <label>
        Title
        <input
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          required
        />
      </label>

      <label>
        Description
        <textarea
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          rows={4}
        />
      </label>

      <label>
        Category
        <select value={category} onChange={(e) => setCategory(e.target.value)}>
          {CATEGORIES.map((c) => (
            <option key={c} value={c}>
              {c}
            </option>
          ))}
        </select>
      </label>

      <label>
        Severity (1-5)
        <input
          type="number"
          min="1"
          max="5"
          value={severity}
          onChange={(e) => setSeverity(e.target.value)}
        />
      </label>

      <label>
        Latitude
        <input
          type="number"
          step="any"
          value={latitude}
          onChange={(e) => setLatitude(e.target.value)}
          required
        />
      </label>

      <label>
        Longitude
        <input
          type="number"
          step="any"
          value={longitude}
          onChange={(e) => setLongitude(e.target.value)}
          required
        />
      </label>

      <button
        type="button"
        className="button secondary"
        onClick={useCurrentLocation}
      >
        Use my current location
      </button>

      {error && <div className="text-muted">{error}</div>}

      <button type="submit" className="button primary" disabled={busy}>
        {busy ? "Submitting…" : "Submit"}
      </button>
    </form>
  );
}

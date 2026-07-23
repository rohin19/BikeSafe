import { useEffect, useRef } from "react";
import L from "leaflet";
import 'leaflet/dist/leaflet.css';
import type { MapProps } from '../types';

export default function Map ({stations, freeBikes, onBoundsChange}: MapProps) {
  const mapRef = useRef<HTMLDivElement | null>(null);
  const leafletMapRef = useRef<L.Map | null>(null);
  const markersLayerRef = useRef<L.LayerGroup | null>(null);
  const onBoundsChangeRef = useRef(onBoundsChange);
  useEffect(() => {
    onBoundsChangeRef.current = onBoundsChange;
  }, [onBoundsChange]);

  useEffect(() => {
    if (!mapRef.current) return;

    const defaultCenter: [number, number] = [49.2827, -123.1207];
    
    const defaultZoom = 12;
    
    const map = L.map(mapRef.current, {
      zoomControl: false,
      scrollWheelZoom: true,
    }).setView(defaultCenter, defaultZoom);

    L.tileLayer(
      "https://{s}.basemaps.cartocdn.com/light_nolabels/{z}/{x}/{y}{r}.png",
      { attribution: "© CARTO" }
    ).addTo(map);

    const markersLayer = L.layerGroup().addTo(map);

    leafletMapRef.current = map;
    markersLayerRef.current = markersLayer;

    function updateBounds() {
      const bounds = map.getBounds();
      if (onBoundsChangeRef.current) {
        onBoundsChangeRef.current({
          north: bounds.getNorth(),
          south: bounds.getSouth(),
          east: bounds.getEast(),
          west: bounds.getWest(),
        });
      }
    }

    updateBounds();
    map.on("moveend", updateBounds);

    return () => {
      map.off("moveend", updateBounds);
      map.remove();
      leafletMapRef.current = null;
      markersLayerRef.current = null;
    };
  }, []);

  useEffect(() => {
    const markersLayer = markersLayerRef.current;
    if (!markersLayer) return;

    markersLayer.clearLayers();

    const stationsIcon = L.divIcon({
      className: "station-marker",
      html: `<div class="w-4 h-4 bg-[#0000ff] border-2 border-black"></div>`,
      iconSize: [16, 16],
    });

    const freeBikesIcon = L.divIcon({
      className: "freeBikes-marker",
      html: `<div class="w-4 h-4 bg-[#0000ff] border-2 border-white"></div>`,
      iconSize: [16, 16],
    });

    stations.forEach((station) => {
      const popupContent = `
        <div>
          <h3 class="text-[12px] font-bold border-b border-black pb-1">
            ${station.name}
          </h3>
          <p>Number of vehicles available: ${station.num_vehicles_available}</p>
          <p>vehicles type: ${station.vehicle_type_available}</p>
          <p>Number of docks available: ${station.num_docks_available}</p>
        </div>
      `;

      const marker = L.marker([station.lat, station.lon], { icon: stationsIcon })
        .bindPopup(popupContent, { autoPan: false })
        .addTo(markersLayer);

    });
  }, [stations, freeBikes]);

  return (
    <div ref={mapRef}></div>
  );
};
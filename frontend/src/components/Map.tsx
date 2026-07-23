import { useEffect, useRef } from "react";
import L from "leaflet";
import 'leaflet/dist/leaflet.css';
import type { MapProps } from '../types';
import { renderToStaticMarkup } from "react-dom/server";
import StationPopup from "./StationPopup";
import FreeBikePopup from "./FreeBikePopup";

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
      className: "clean-map-icon",
      html: `
        <div class="marker-dot station">
          <div class="inner-dot"></div>
        </div>
      `,
      iconSize: [20, 20],
      iconAnchor: [10, 10],
      popupAnchor: [0, -10],
    });

    const freeBikesIcon = L.divIcon({
      className: "clean-map-icon",
      html: `
        <div class="marker-dot bike"></div>
      `,
      iconSize: [14, 14],
      iconAnchor: [7, 7],
      popupAnchor: [0, -7],
    });

    stations.forEach((station) => {
      const popupHtml = renderToStaticMarkup(<StationPopup station={station} />);

      const marker = L.marker([station.lat, station.lon], { icon: stationsIcon })
        .bindPopup(popupHtml, { autoPan: false })
        .addTo(markersLayer);

    });

    freeBikes.forEach((freeBike) => {
      const popupHtml = renderToStaticMarkup(<FreeBikePopup freeBike={freeBike} />);

      const marker = L.marker([freeBike.lat, freeBike.lon], { icon: freeBikesIcon })
        .bindPopup(popupHtml, { autoPan: false })
        .addTo(markersLayer);
    });
  }, [stations, freeBikes]);

  return (
    <div ref={mapRef} style={{ width: '100%', height: '100%' }}></div>
  );
};
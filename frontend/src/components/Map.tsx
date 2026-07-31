import { useEffect, useRef } from "react";
import L from "leaflet";
import 'leaflet/dist/leaflet.css';
import type { MapProps, RouteDisplay } from '../types';
import { renderToStaticMarkup } from "react-dom/server";
import StationPopup from "./StationPopup";
import FreeBikePopup from "./FreeBikePopup";
import HazardPopup from "./HazardPopup";

L.Icon.Default.mergeOptions({
  iconUrl: '/marker-icon.png',
  iconRetinaUrl: '/marker-icon-2x.png',
  shadowUrl: '/marker-shadow.png'
})

export default function Map ({
  stations = [], freeBikes = [], hazards = [], onBoundsChange, route, onMapClick, flyTo, selectedPoint, liveLocation}: MapProps) {
  const mapRef = useRef<HTMLDivElement | null>(null);
  const leafletMapRef = useRef<L.Map | null>(null);
  const markersLayerRef = useRef<L.LayerGroup | null>(null);
  const routeLayerRef = useRef<L.LayerGroup | null>(null);
  const liveLocationLayerRef = useRef<L.LayerGroup | null>(null);
  const onMapClickRef = useRef(onMapClick);

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
    const routeLayer = L.layerGroup().addTo(map);
    const liveLocationLayer = L.layerGroup().addTo(map);

    leafletMapRef.current = map;
    markersLayerRef.current = markersLayer;
    routeLayerRef.current = routeLayer;
    liveLocationLayerRef.current = liveLocationLayer;

    function updateBounds() {
      const bounds = map.getBounds();
      onBoundsChange?.({
          north: bounds.getNorth(),
          south: bounds.getSouth(),
          east: bounds.getEast(),
          west: bounds.getWest(),
        });
    }

    function handleClick(e: L.LeafletMouseEvent) {
      onMapClickRef.current?.(e.latlng.lat, e.latlng.lng); // read from ref, not the closed-over prop
    }

    updateBounds();
    map.on("moveend", updateBounds);
    map.on("click", handleClick);

    return () => {
      map.off("moveend", updateBounds);
      map.off("click", handleClick);
      map.remove();
      leafletMapRef.current = null;
      markersLayerRef.current = null;
      routeLayerRef.current = null;
      liveLocationLayerRef.current = null;
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

    const hazardIcon = L.divIcon({
      className: "clean-map-icon",
      html: `
        <div class="marker-triangle">
          <div class="hazard-content">!</div>
        </div>
      `,
      iconSize: [20, 20],
      iconAnchor: [10, 10],
      popupAnchor: [0, -10],
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

    hazards.forEach((hazard) => {
      const popupHtml = renderToStaticMarkup(<HazardPopup hazard={hazard} />);

      const marker = L.marker([hazard.latitude, hazard.longitude], { icon: hazardIcon })
        .bindPopup(popupHtml, { autoPan: false })
        .addTo(markersLayer);
    });

  }, [stations, freeBikes, hazards]);

  // keep onMapClickref point at the latest onMapClick, so the click listener (registered once on mount) always calls current logic
  useEffect(() => {
    onMapClickRef.current = onMapClick;
  }, [onMapClick]);

  useEffect(() => {
    // draws route markers
    const routeLayer = routeLayerRef.current; // this layer for routes and start/end markers
    if (!routeLayer) return;
    
    routeLayer.clearLayers();
    if (selectedPoint) {
      L.marker([selectedPoint.lat, selectedPoint.lon])
        .bindPopup('Selected hazard location')
        .addTo(routeLayer)
    }
    if (!route) return;

    if (route.start) {
      L.marker([route.start.lat, route.start.lon])
        .bindPopup(route.start.label)
        .addTo(routeLayer);
    }

    if (route.destination) {
      L.marker([route.destination.lat, route.destination.lon])
        .bindPopup(route.destination.label)
        .addTo(routeLayer);
    }

    if (route.path.length > 0) {
      L.polyline(
        route.path.map((p) => [p.lat, p.lon] as [number, number]),
        { color: "blue", weight: 4 },
      ).addTo(routeLayer);
    }
  }, [route, selectedPoint]);

  // pans/zooms the map to a point on demand (e.g. when a search result is selected)
  useEffect(() => {
    if (!flyTo || !leafletMapRef.current) return;
    leafletMapRef.current.flyTo([flyTo.lat, flyTo.lon], 15);
  }, [flyTo]);

  // draws/moves the live navigation position marker, on its own layer so it doesn't get wiped by route redraws
  useEffect(() => {
    const liveLocationLayer = liveLocationLayerRef.current;
    const map = leafletMapRef.current;
    if (!liveLocationLayer || !map) return;

    liveLocationLayer.clearLayers();
    if (!liveLocation) return;

    const liveIcon = L.divIcon({
      className: "clean-map-icon",
      html: `<div class="marker-dot live"></div>`,
      iconSize: [16, 16],
      iconAnchor: [8, 8],
    });

    L.marker([liveLocation.lat, liveLocation.lon], { icon: liveIcon }).addTo(liveLocationLayer);

    // only recenter when the marker actually leaves the visible area - don't fight the user's own panning/zooming
    if (!map.getBounds().contains([liveLocation.lat, liveLocation.lon])) {
      map.panTo([liveLocation.lat, liveLocation.lon]);
    }
  }, [liveLocation]);

  return (
    <div ref={mapRef} style={{ width: '100%', height: '100%' }}></div>
  );
};
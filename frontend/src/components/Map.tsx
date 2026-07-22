import React from 'react';
import { MapContainer, TileLayer } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';

export default function Map () {
  // Vancouver coordinates: [latitude, longitude]
  const vancouverCoords: [number, number] = [49.2827, -123.1207];

  return (
    <MapContainer 
      center={vancouverCoords} 
      zoom={12} 
      style={{ height: '100%', width: '100%' }}
    >
      <TileLayer
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
      />
    </MapContainer>
  );
};
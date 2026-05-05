import { MapContainer, TileLayer, Marker, Popup, useMap } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';
import { cn } from "@/lib/utils";
import { useEffect } from 'react';

// Fix for default marker icons in React
import markerIcon2x from 'leaflet/dist/images/marker-icon-2x.png';
import markerIcon from 'leaflet/dist/images/marker-icon.png';
import markerShadow from 'leaflet/dist/images/marker-shadow.png';

// @ts-ignore
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: markerIcon2x,
  iconUrl: markerIcon,
  shadowUrl: markerShadow,
});

interface LeafletMapProps {
  className?: string;
  initialCenter?: { lat: number; lng: number };
  initialZoom?: number;
  markers?: Array<{
    id: number | string;
    position: { lat: number; lng: number };
    title: string;
    content?: React.ReactNode;
  }>;
  fitBounds?: boolean;
}

function ChangeView({ center, zoom }: { center: [number, number], zoom: number }) {
  const map = useMap();
  useEffect(() => {
    map.setView(center, zoom);
  }, [center, zoom, map]);
  return null;
}

function FitBounds({ markers }: { markers: any[] }) {
  const map = useMap();
  useEffect(() => {
    if (markers.length > 0) {
      const bounds = L.latLngBounds(markers.map(m => [m.position.lat, m.position.lng]));
      map.fitBounds(bounds, { padding: [50, 50] });
    }
  }, [markers, map]);
  return null;
}

export function LeafletMap({
  className,
  initialCenter = { lat: 24.7136, lng: 46.6753 },
  initialZoom = 6,
  markers = [],
  fitBounds = true,
}: LeafletMapProps) {
  return (
    <MapContainer
      center={[initialCenter.lat, initialCenter.lng]}
      zoom={initialZoom}
      className={cn("w-full h-[500px]", className)}
      style={{ zIndex: 0 }}
    >
      <TileLayer
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
      />
      <ChangeView center={[initialCenter.lat, initialCenter.lng]} zoom={initialZoom} />
      {fitBounds && <FitBounds markers={markers} />}
      
      {markers.map((marker) => (
        <Marker key={marker.id} position={[marker.position.lat, marker.position.lng]}>
          {marker.content && (
            <Popup>
              <div className="rtl font-tajawal">
                {marker.content}
              </div>
            </Popup>
          )}
        </Marker>
      ))}
    </MapContainer>
  );
}

import { MapContainer, TileLayer, useMap, Marker, LayerGroup } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';
import { cn } from "@/lib/utils";
import { useEffect, useState } from 'react';
import { Map as MapIcon, Globe } from 'lucide-react';

// Fix for default marker icons in React
import markerIcon2x from 'leaflet/dist/images/marker-icon-2x.png';
import markerIcon from 'leaflet/dist/images/marker-icon.png';
import markerShadow from 'leaflet/dist/images/marker-shadow.png';

// @ts-ignore
if (typeof window !== 'undefined') {
  delete (L.Icon.Default.prototype as any)._getIconUrl;
  L.Icon.Default.mergeOptions({
    iconRetinaUrl: markerIcon2x,
    iconUrl: markerIcon,
    shadowUrl: markerShadow,
  });
}

interface MapViewProps {
  className?: string;
  initialCenter?: { lat: number; lng: number };
  initialZoom?: number;
  onMapReady?: (map: L.Map) => void;
  children?: React.ReactNode;
}

function MapEvents({ onMapReady }: { onMapReady?: (map: L.Map) => void }) {
  const map = useMap();
  useEffect(() => {
    if (onMapReady) {
      onMapReady(map);
    }
  }, [map]);
  return null;
}

function ChangeView({ center, zoom }: { center: [number, number], zoom: number }) {
  const map = useMap();
  useEffect(() => {
    map.setView(center, zoom);
  }, [center, zoom, map]);
  return null;
}

export function MapView({
  className,
  initialCenter = { lat: 24.7136, lng: 46.6753 },
  initialZoom = 12,
  onMapReady,
  children
}: MapViewProps) {
  const [mapType, setMapType] = useState<'street' | 'satellite'>('street');

  return (
    <div className={cn("relative w-full h-[500px]", className)}>
      <MapContainer
        center={[initialCenter.lat, initialCenter.lng]}
        zoom={initialZoom}
        className="w-full h-full"
        style={{ zIndex: 0 }}
      >
        {mapType === 'street' ? (
          <TileLayer
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          />
        ) : (
          <LayerGroup>
            <TileLayer
              attribution='&copy; <a href="https://www.esri.com/">Esri</a>, i-cubed, USDA, USGS, AEX, GeoEye, Getmapping, Aerogrid, IGN, IGP, UPR-EBP, and the GIS User Community'
              url="https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}"
            />
            <TileLayer
              attribution='&copy; <a href="https://www.esri.com/">Esri</a>'
              url="https://server.arcgisonline.com/ArcGIS/rest/services/Reference/World_Boundaries_and_Places/MapServer/tile/{z}/{y}/{x}"
              zIndex={1000}
            />
          </LayerGroup>
        )}

        <ChangeView center={[initialCenter.lat, initialCenter.lng]} zoom={initialZoom} />
        <MapEvents onMapReady={onMapReady} />
        {children}
      </MapContainer>

      {/* زر تبديل نوع الخريطة المباشر - متموضع أسفل أدوات التكبير */}
      <div className="absolute top-[82px] left-[10px] z-[1000]">
        <button
          type="button"
          onClick={() => setMapType(mapType === 'street' ? 'satellite' : 'street')}
          className={cn(
            "h-[34px] w-[34px] bg-white rounded-[2px] shadow-sm border border-gray-300 transition-all hover:bg-gray-50 flex items-center justify-center",
            mapType === 'satellite' ? "text-primary border-primary bg-primary/5" : "text-gray-600"
          )}
          title={mapType === 'street' ? "التبديل إلى صور الأقمار الصناعية" : "التبديل إلى خريطة الشوارع"}
        >
          {mapType === 'street' ? (
            <Globe className="h-[18px] w-[18px]" />
          ) : (
            <MapIcon className="h-[18px] w-[18px]" />
          )}
        </button>
      </div>
    </div>
  );
}


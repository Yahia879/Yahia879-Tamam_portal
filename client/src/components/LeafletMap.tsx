import { MapContainer, TileLayer, Marker, Popup, useMap, LayerGroup } from 'react-leaflet';
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
    status?: string;
  }>;
  fitBounds?: boolean;
}

// دالة لإنشاء أيقونة ملونة بناءً على الحالة
const createStatusIcon = (status?: string) => {
  let color = '#3b82f6'; // الأزرق الافتراضي
  
  if (status === 'approved') color = '#22c55e'; // أخضر للمعتمد
  else if (status === 'pending') color = '#f59e0b'; // برتقالي لقيد المراجعة
  else if (status === 'rejected') color = '#ef4444'; // أحمر للمرفوض

  const svgIcon = `
    <svg width="32" height="32" viewBox="0 0 32 32" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path d="M16 2C11.03 2 7 6.03 7 11C7 18.75 16 30 16 30C16 30 25 18.75 25 11C25 6.03 20.97 2 16 2ZM16 15C13.79 15 12 13.21 12 11C12 8.79 13.79 7 16 7C18.21 7 20 8.79 20 11C20 13.21 18.21 15 16 15Z" fill="${color}" stroke="white" stroke-width="1.5"/>
    </svg>
  `;

  return L.divIcon({
    className: 'custom-status-marker',
    html: svgIcon,
    iconSize: [32, 32],
    iconAnchor: [16, 32],
    popupAnchor: [0, -32],
  });
};

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
        {fitBounds && <FitBounds markers={markers} />}
        
        {markers.map((marker) => (
          <Marker 
            key={marker.id} 
            position={[marker.position.lat, marker.position.lng]}
            icon={createStatusIcon(marker.status)}
          >
            {marker.content && (
              <Popup>
                <div className="rtl font-tajawal text-right">
                  {marker.content}
                </div>
              </Popup>
            )}
          </Marker>
        ))}
      </MapContainer>

      {/* زر تبديل نوع الخريطة المباشر - متموضع أسفل أدوات التكبير */}
      <div className="absolute top-[82px] left-[10px] z-[1000]">
        <button
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

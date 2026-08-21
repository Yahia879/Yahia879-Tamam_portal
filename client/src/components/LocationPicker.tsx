import { useEffect, useRef, useState } from "react";
import { MapView } from "@/components/Map";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import { MapPin, Search, Crosshair } from "lucide-react";
import { Marker, useMapEvents } from "react-leaflet";
import L from "leaflet";

interface LocationPickerProps {
  value?: { lat: number; lng: number };
  onChange?: (location: { lat: number; lng: number; address?: string; region?: string; city?: string; district?: string }) => void;
  className?: string;
}

// Component to handle map clicks
function MapClickHandler({ onClick }: { onClick: (lat: number, lng: number) => void }) {
  useMapEvents({
    click(e) {
      onClick(e.latlng.lat, e.latlng.lng);
    },
  });
  return null;
}

export function LocationPicker({ value, onChange, className }: LocationPickerProps) {
  const mapRef = useRef<L.Map | null>(null);
  const [searchAddress, setSearchAddress] = useState("");
  const [currentLocation, setCurrentLocation] = useState<{ lat: number; lng: number } | null>(
    value || null
  );
  const [address, setAddress] = useState("");
  const [isSearching, setIsSearching] = useState(false);

  // Sync currentLocation with value prop
  useEffect(() => {
    if (value && (!currentLocation || value.lat !== currentLocation.lat || value.lng !== currentLocation.lng)) {
      setCurrentLocation({ lat: value.lat, lng: value.lng });
      // Reverse geocode if value changes from outside
      reverseGeocode(value.lat, value.lng);
    }
  }, [value?.lat, value?.lng]);

  const reverseGeocode = async (lat: number, lng: number) => {
    try {
      const response = await fetch(
        `https://nominatim.openstreetmap.org/reverse?format=jsonv2&lat=${lat}&lon=${lng}&accept-language=ar&addressdetails=1`
      );
      const data = await response.json();
      if (data && data.display_name) {
        setAddress(data.display_name);
        const addr = data.address || {};
        const region = addr.state || addr.province || addr.region || "";
        const city = addr.city || addr.town || addr.village || addr.municipality || addr.city_district || "";
        const district = addr.suburb || addr.neighbourhood || addr.quarter || "";
        return { fullAddress: data.display_name, region, city, district };
      }
    } catch (error) {
      console.error("Reverse geocoding error:", error);
    }
    setAddress("موقع محدد على الخريطة");
    return { fullAddress: "موقع محدد على الخريطة", region: "", city: "", district: "" };
  };

  const handleLocationChange = async (lat: number, lng: number) => {
    const validPosition = { lat, lng };
    setCurrentLocation(validPosition);

    const { fullAddress, region, city, district } = await reverseGeocode(lat, lng);
    onChange?.({ ...validPosition, address: fullAddress, region, city, district });
    
    if (mapRef.current) {
      mapRef.current.panTo([lat, lng]);
    }
  };

  const handleSearch = async () => {
    if (!searchAddress.trim()) return;

    setIsSearching(true);
    try {
      const response = await fetch(
        `https://nominatim.openstreetmap.org/search?format=jsonv2&q=${encodeURIComponent(
          searchAddress
        )}&accept-language=ar&addressdetails=1`
      );
      const data = await response.json();
      if (data && data.length > 0) {
        const firstResult = data[0];
        const lat = parseFloat(firstResult.lat);
        const lng = parseFloat(firstResult.lon);
        const fullAddress = firstResult.display_name;
        
        const addr = firstResult.address || {};
        const region = addr.state || addr.province || addr.region || "";
        const city = addr.city || addr.town || addr.village || addr.municipality || addr.city_district || "";
        const district = addr.suburb || addr.neighbourhood || addr.quarter || "";
        
        const validPosition = { lat, lng };
        setCurrentLocation(validPosition);
        setAddress(fullAddress);
        onChange?.({ ...validPosition, address: fullAddress, region, city, district });

        if (mapRef.current) {
          mapRef.current.setView([lat, lng], 17);
        }
      }
    } catch (error) {
      console.error("Search error:", error);
    } finally {
      setIsSearching(false);
    }
  };

  const getCurrentLocation = () => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          const lat = position.coords.latitude;
          const lng = position.coords.longitude;
          handleLocationChange(lat, lng);
          if (mapRef.current) {
            mapRef.current.setView([lat, lng], 17);
          }
        },
        (error) => {
          console.error("Geolocation error:", error);
        }
      );
    }
  };

  const handleMapReady = (map: L.Map) => {
    mapRef.current = map;
  };

  return (
    <div className={className}>
      <Card>
        <CardContent className="pt-4 space-y-4">
          <div className="flex gap-2">
            <div className="flex-1 relative">
              <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                placeholder="ابحث عن عنوان أو موقع..."
                value={searchAddress}
                onChange={(e) => setSearchAddress(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    handleSearch();
                  }
                }}
                className="pr-10 text-right"
                dir="rtl"
              />
            </div>
            <Button type="button" onClick={handleSearch} disabled={isSearching}>
              {isSearching ? "جاري البحث..." : "بحث"}
            </Button>
            <Button type="button" variant="outline" onClick={getCurrentLocation} title="موقعي الحالي">
              <Crosshair className="w-4 h-4" />
            </Button>
          </div>

          {/* الخريطة */}
          <div className="relative rounded-lg overflow-hidden border">
            <MapView
              className="h-[400px]"
              initialCenter={value || { lat: 18.2164, lng: 42.5053 }}
              initialZoom={value ? 15 : 6}
              onMapReady={handleMapReady}
            >
              <MapClickHandler onClick={handleLocationChange} />
              {currentLocation && (
                <Marker 
                  position={[currentLocation.lat, currentLocation.lng]} 
                  draggable={true}
                  eventHandlers={{
                    dragend: (e) => {
                      const marker = e.target;
                      const position = marker.getLatLng();
                      handleLocationChange(position.lat, position.lng);
                    },
                  }}
                />
              )}
            </MapView>

          </div>

          {/* عرض الإحداثيات والعنوان */}
          {currentLocation && (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 p-4 bg-muted/50 rounded-lg" dir="rtl">
              <div className="text-right">
                <Label className="text-xs text-muted-foreground">خط العرض</Label>
                <p className="font-mono text-sm">{currentLocation.lat.toFixed(6)}</p>
              </div>
              <div className="text-right">
                <Label className="text-xs text-muted-foreground">خط الطول</Label>
                <p className="font-mono text-sm">{currentLocation.lng.toFixed(6)}</p>
              </div>
              <div className="md:col-span-1 text-right">
                <Label className="text-xs text-muted-foreground">العنوان</Label>
                <p className="text-sm truncate" title={address}>{address || "جاري التحميل..."}</p>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}


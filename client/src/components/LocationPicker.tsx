import { useEffect, useRef, useState } from "react";
import { MapView } from "@/components/Map";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import { MapPin, Search, Crosshair } from "lucide-react";

interface LocationPickerProps {
  value?: { lat: number; lng: number };
  onChange?: (location: { lat: number; lng: number; address?: string }) => void;
  className?: string;
}

export function LocationPicker({ value, onChange, className }: LocationPickerProps) {
  const mapRef = useRef<google.maps.Map | null>(null);
  const markerRef = useRef<google.maps.marker.AdvancedMarkerElement | null>(null);
  const geocoderRef = useRef<google.maps.Geocoder | null>(null);
  
  const [searchAddress, setSearchAddress] = useState("");
  const [currentLocation, setCurrentLocation] = useState<{ lat: number; lng: number } | null>(
    value || null
  );
  const [address, setAddress] = useState("");
  const [isSearching, setIsSearching] = useState(false);

  // تحديث العلامة على الخريطة
  const updateMarker = (position: { lat: number; lng: number }) => {
    if (!mapRef.current || !window.google) return;

    // إزالة العلامة القديمة
    if (markerRef.current) {
      markerRef.current.map = null;
    }

    // إنشاء عنصر مخصص للعلامة
    const markerContent = document.createElement("div");
    markerContent.innerHTML = `
      <div style="
        background-color: #0d9488;
        width: 40px;
        height: 40px;
        border-radius: 50% 50% 50% 0;
        transform: rotate(-45deg);
        display: flex;
        align-items: center;
        justify-content: center;
        border: 3px solid white;
        box-shadow: 0 2px 10px rgba(0,0,0,0.3);
      ">
        <svg width="20" height="20" viewBox="0 0 24 24" fill="white" style="transform: rotate(45deg);">
          <path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5c-1.38 0-2.5-1.12-2.5-2.5s1.12-2.5 2.5-2.5 2.5 1.12 2.5 2.5-1.12 2.5-2.5 2.5z"/>
        </svg>
      </div>
    `;

    // إنشاء علامة جديدة
    markerRef.current = new google.maps.marker.AdvancedMarkerElement({
      map: mapRef.current,
      position,
      content: markerContent,
      gmpDraggable: true,
    });

    // إضافة حدث السحب
    markerRef.current.addListener("dragend", () => {
      const newPosition = markerRef.current?.position;
      if (newPosition) {
        const pos = newPosition as google.maps.LatLngLiteral;
        handleLocationChange({ lat: pos.lat, lng: pos.lng });
      }
    });

    // تحريك الخريطة للموقع الجديد
    mapRef.current.panTo(position);
  };

  // معالجة تغيير الموقع
  const handleLocationChange = async (position: { lat: number; lng: number }) => {
    // التحقق من صحة الإحداثيات
    if (!position) {
      console.error("Invalid position: null or undefined");
      return;
    }

    // التأكد من أن الإحداثيات أرقام صحيحة
    const lat = typeof position.lat === 'number' ? position.lat : parseFloat(String(position.lat));
    const lng = typeof position.lng === 'number' ? position.lng : parseFloat(String(position.lng));

    if (isNaN(lat) || isNaN(lng)) {
      console.error("Invalid coordinates - NaN detected:", { lat, lng });
      return;
    }

    const validPosition = { lat, lng };
    setCurrentLocation(validPosition);

    // الحصول على العنوان من الإحداثيات
    if (geocoderRef.current) {
      try {
        const response = await geocoderRef.current.geocode({ location: validPosition });
        if (response.results[0]) {
          const formattedAddress = response.results[0].formatted_address;
          setAddress(formattedAddress);
          onChange?.(validPosition);
        } else {
          onChange?.(validPosition);
        }
      } catch (error) {
        console.error("Geocoding error:", error);
        onChange?.(validPosition);
      }
    } else {
      onChange?.(validPosition);
    }
  };

  // البحث عن عنوان
  const handleSearch = async () => {
    if (!searchAddress.trim() || !geocoderRef.current) return;

    setIsSearching(true);
    try {
      const response = await geocoderRef.current.geocode({ address: searchAddress });
      if (response.results[0]) {
        const location = response.results[0].geometry.location;
        const position = { lat: location.lat(), lng: location.lng() };
        updateMarker(position);
        handleLocationChange(position);
        mapRef.current?.setZoom(17);
      }
    } catch (error) {
      console.error("Search error:", error);
    } finally {
      setIsSearching(false);
    }
  };

  // الحصول على الموقع الحالي
  const getCurrentLocation = () => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          const pos = {
            lat: position.coords.latitude,
            lng: position.coords.longitude,
          };
          updateMarker(pos);
          handleLocationChange(pos);
          mapRef.current?.setZoom(17);
        },
        (error) => {
          console.error("Geolocation error:", error);
        }
      );
    }
  };

  // معالجة جاهزية الخريطة
  const handleMapReady = (map: google.maps.Map) => {
    mapRef.current = map;
    geocoderRef.current = new google.maps.Geocoder();

    // إضافة حدث النقر على الخريطة
    map.addListener("click", (e: google.maps.MapMouseEvent) => {
      if (e.latLng) {
        const position = { lat: e.latLng.lat(), lng: e.latLng.lng() };
        updateMarker(position);
        handleLocationChange(position);
      }
    });

    // إذا كان هناك قيمة مبدئية، عرض العلامة
    if (value) {
      updateMarker(value);
      handleLocationChange(value);
    }
  };

  return (
    <div className={className}>
      <Card>
        <CardContent className="pt-4 space-y-4">
          {/* شريط البحث */}
          <div className="flex gap-2">
            <div className="flex-1 relative">
              <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                placeholder="ابحث عن عنوان أو موقع..."
                value={searchAddress}
                onChange={(e) => setSearchAddress(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleSearch()}
                className="pr-10"
              />
            </div>
            <Button onClick={handleSearch} disabled={isSearching}>
              {isSearching ? "جاري البحث..." : "بحث"}
            </Button>
            <Button variant="outline" onClick={getCurrentLocation} title="موقعي الحالي">
              <Crosshair className="w-4 h-4" />
            </Button>
          </div>

          {/* الخريطة */}
          <div className="relative rounded-lg overflow-hidden border">
            <MapView
              className="h-[400px]"
              initialCenter={value || { lat: 24.7136, lng: 46.6753 }}
              initialZoom={value ? 15 : 6}
              onMapReady={handleMapReady}
            />

            {/* تعليمات */}
            <div className="absolute bottom-4 left-4 bg-white/90 backdrop-blur-sm rounded-lg px-3 py-2 text-xs text-muted-foreground">
              <MapPin className="w-3 h-3 inline-block ml-1" />
              انقر على الخريطة أو اسحب العلامة لتحديد الموقع
            </div>
          </div>

          {/* عرض الإحداثيات والعنوان */}
          {currentLocation && (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 p-4 bg-muted/50 rounded-lg">
              <div>
                <Label className="text-xs text-muted-foreground">خط العرض</Label>
                <p className="font-mono text-sm">{currentLocation.lat.toFixed(6)}</p>
              </div>
              <div>
                <Label className="text-xs text-muted-foreground">خط الطول</Label>
                <p className="font-mono text-sm">{currentLocation.lng.toFixed(6)}</p>
              </div>
              <div className="md:col-span-1">
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

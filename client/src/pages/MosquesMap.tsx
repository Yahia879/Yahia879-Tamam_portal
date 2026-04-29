import { useState, useRef, useEffect } from "react";
import { MapView } from "@/components/Map";
import { trpc } from "@/lib/trpc";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Building2, MapPin, Search, List, Map as MapIcon, ChevronRight, Users } from "lucide-react";
import { Link } from "wouter";
import DashboardLayout from "@/components/DashboardLayout";

// لون افتراضي للمساجد
const MOSQUE_COLOR = "#0d9488"; // تركوازي

export default function MosquesMap() {
  const mapRef = useRef<google.maps.Map | null>(null);
  const markersRef = useRef<google.maps.marker.AdvancedMarkerElement[]>([]);
  const infoWindowRef = useRef<google.maps.InfoWindow | null>(null);
  
  const [viewMode, setViewMode] = useState<"map" | "list">("map");
  const [searchQuery, setSearchQuery] = useState("");
  const [cityFilter, setCityFilter] = useState<string>("all");
  const [selectedMosque, setSelectedMosque] = useState<any>(null);

  // جلب المساجد
  const { data: mosquesData, isLoading } = trpc.mosques.search.useQuery({
    search: searchQuery || undefined,
    city: cityFilter !== "all" ? cityFilter : undefined,
    limit: 500,
  });

  const mosques = mosquesData?.mosques || [];

  // جلب قائمة المدن الفريدة
  const cities = Array.from(new Set(mosques.map(m => m.city).filter(Boolean)));

  // تحديث العلامات على الخريطة
  useEffect(() => {
    if (!mapRef.current || !window.google) return;

    // إزالة العلامات القديمة
    markersRef.current.forEach(marker => {
      marker.map = null;
    });
    markersRef.current = [];

    // إنشاء نافذة معلومات واحدة
    if (!infoWindowRef.current) {
      infoWindowRef.current = new google.maps.InfoWindow();
    }

    // إضافة علامات جديدة
    mosques.forEach(mosque => {
      if (!mosque.latitude || !mosque.longitude) return;

      const lat = parseFloat(mosque.latitude);
      const lng = parseFloat(mosque.longitude);
      
      if (isNaN(lat) || isNaN(lng)) return;

      // إنشاء عنصر مخصص للعلامة
      const markerContent = document.createElement("div");
      markerContent.innerHTML = `
        <div style="
          background-color: ${MOSQUE_COLOR};
          width: 32px;
          height: 32px;
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
          border: 3px solid white;
          box-shadow: 0 2px 6px rgba(0,0,0,0.3);
          cursor: pointer;
        ">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="white">
            <path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5c-1.38 0-2.5-1.12-2.5-2.5s1.12-2.5 2.5-2.5 2.5 1.12 2.5 2.5-1.12 2.5-2.5 2.5z"/>
          </svg>
        </div>
      `;

      const marker = new google.maps.marker.AdvancedMarkerElement({
        map: mapRef.current!,
        position: { lat, lng },
        title: mosque.name,
        content: markerContent,
      });

      // إضافة حدث النقر
      marker.addListener("click", () => {
        setSelectedMosque(mosque);
        
        const content = `
          <div style="direction: rtl; padding: 8px; min-width: 200px; font-family: 'Tajawal', sans-serif;">
            <h3 style="margin: 0 0 8px 0; font-size: 16px; font-weight: bold; color: #1f2937;">${mosque.name}</h3>
            <p style="margin: 0 0 4px 0; font-size: 13px; color: #6b7280;">
              <strong>المدينة:</strong> ${mosque.city}
            </p>
            ${mosque.governorate ? `<p style="margin: 0 0 4px 0; font-size: 13px; color: #6b7280;"><strong>المحافظة:</strong> ${mosque.governorate}</p>` : ''}
            ${mosque.district ? `<p style="margin: 0 0 4px 0; font-size: 13px; color: #6b7280;"><strong>الحي:</strong> ${mosque.district}</p>` : ''}
            ${mosque.capacity ? `<p style="margin: 0 0 4px 0; font-size: 13px; color: #6b7280;"><strong>عدد المصلين:</strong> ${mosque.capacity}</p>` : ''}
            <a href="/mosques/${mosque.id}" style="
              display: inline-block;
              background-color: #0d9488;
              color: white;
              padding: 6px 12px;
              border-radius: 6px;
              text-decoration: none;
              font-size: 13px;
              margin-top: 4px;
            ">عرض التفاصيل</a>
          </div>
        `;

        infoWindowRef.current!.setContent(content);
        infoWindowRef.current!.open(mapRef.current!, marker);
      });

      markersRef.current.push(marker);
    });

    // تعديل حدود الخريطة لتشمل جميع العلامات
    if (markersRef.current.length > 0) {
      const bounds = new google.maps.LatLngBounds();
      markersRef.current.forEach(marker => {
        if (marker.position) {
          bounds.extend(marker.position as google.maps.LatLng);
        }
      });
      mapRef.current.fitBounds(bounds);
    }
  }, [mosques]);

  const handleMapReady = (map: google.maps.Map) => {
    mapRef.current = map;
  };

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* العنوان والأدوات */}
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-foreground">خريطة المساجد</h1>
            <p className="text-muted-foreground">عرض جميع المساجد المسجلة على الخريطة</p>
          </div>

          <div className="flex items-center gap-2">
            <Button
              variant={viewMode === "map" ? "default" : "outline"}
              size="sm"
              onClick={() => setViewMode("map")}
            >
              <MapIcon className="w-4 h-4 ml-1" />
              خريطة
            </Button>
            <Button
              variant={viewMode === "list" ? "default" : "outline"}
              size="sm"
              onClick={() => setViewMode("list")}
            >
              <List className="w-4 h-4 ml-1" />
              قائمة
            </Button>
          </div>
        </div>

        {/* أدوات البحث والفلترة */}
        <Card>
          <CardContent className="pt-4">
            <div className="flex flex-col md:flex-row gap-4">
              <div className="flex-1 relative">
                <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  placeholder="البحث عن مسجد..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pr-10"
                />
              </div>

              <Select value={cityFilter} onValueChange={setCityFilter}>
                <SelectTrigger className="w-full md:w-[180px]">
                  <SelectValue placeholder="المدينة" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">جميع المدن</SelectItem>
                  {cities.map(city => (
                    <SelectItem key={city} value={city}>{city}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>

        {/* عرض الخريطة أو القائمة */}
        {viewMode === "map" ? (
          <Card className="overflow-hidden">
            <CardContent className="p-0">
              <div className="relative">
                <MapView
                  className="h-[600px]"
                  initialCenter={{ lat: 24.7136, lng: 46.6753 }} // الرياض
                  initialZoom={6}
                  onMapReady={handleMapReady}
                />

                {/* عداد المساجد */}
                <div className="absolute top-4 right-4 bg-white rounded-lg shadow-lg px-4 py-2">
                  <p className="text-sm">
                    <span className="font-bold text-primary">{mosques.length}</span> مسجد
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {isLoading ? (
              <div className="col-span-full text-center py-12">
                <div className="animate-spin w-8 h-8 border-4 border-primary border-t-transparent rounded-full mx-auto mb-4" />
                <p className="text-muted-foreground">جاري التحميل...</p>
              </div>
            ) : mosques.length === 0 ? (
              <div className="col-span-full text-center py-12">
                <Building2 className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                <p className="text-muted-foreground">لا توجد مساجد مطابقة للبحث</p>
              </div>
            ) : (
              mosques.map(mosque => (
                <Card key={mosque.id} className="card-hover">
                  <CardHeader className="pb-2">
                    <div className="flex items-start justify-between">
                      <CardTitle className="text-lg">{mosque.name}</CardTitle>
                      <Badge variant="secondary" className="bg-primary/10 text-primary">
                        مسجد
                      </Badge>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-2 text-sm text-muted-foreground mb-4">
                      <div className="flex items-center gap-2">
                        <MapPin className="w-4 h-4" />
                        <span>{mosque.city}{mosque.district ? ` - ${mosque.district}` : ''}</span>
                      </div>
                      {mosque.capacity && (
                        <div className="flex items-center gap-2">
                          <Users className="w-4 h-4" />
                          <span>{mosque.capacity} مصلي</span>
                        </div>
                      )}
                    </div>
                    <Link href={`/mosques/${mosque.id}`}>
                      <Button variant="outline" size="sm" className="w-full">
                        عرض التفاصيل
                        <ChevronRight className="w-4 h-4 mr-1" />
                      </Button>
                    </Link>
                  </CardContent>
                </Card>
              ))
            )}
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}

import { useState } from "react";
import { LeafletMap } from "@/components/LeafletMap";
import { trpc } from "@/lib/trpc";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Building2, MapPin, Search, List, Map as MapIcon, ChevronRight, Users, ChevronDown, ChevronUp } from "lucide-react";
import { Link } from "wouter";
import DashboardLayout from "@/components/DashboardLayout";
import { motion, AnimatePresence } from "framer-motion";

export default function MosquesMap() {
  const [viewMode, setViewMode] = useState<"map" | "list">("map");
  const [searchQuery, setSearchQuery] = useState("");
  const [cityFilter, setCityFilter] = useState<string>("all");
  const [isLegendExpanded, setIsLegendExpanded] = useState(false);

  // جلب المساجد
  const { data: mosquesData, isLoading } = trpc.mosques.search.useQuery({
    search: searchQuery || undefined,
    city: cityFilter !== "all" ? cityFilter : undefined,
    limit: 500,
  });

  const mosques = mosquesData?.mosques || [];

  // حساب الإحصائيات الحالية
  const stats = {
    total: mosques.length,
    approved: mosques.filter(m => m.approvalStatus === 'approved').length,
    pending: mosques.filter(m => m.approvalStatus === 'pending').length,
    rejected: mosques.filter(m => m.approvalStatus === 'rejected').length,
  };

  // جلب قائمة المدن الفريدة
  const cities = Array.from(new Set(mosques.map(m => m.city).filter(Boolean)));

  // تحضير العلامات للخريطة
  const mapMarkers = mosques
    .filter(m => {
      if (!m.latitude || !m.longitude) return false;
      const lat = parseFloat(m.latitude);
      const lng = parseFloat(m.longitude);
      return !isNaN(lat) && !isNaN(lng);
    })
    .map(mosque => ({
      id: mosque.id,
      position: { 
        lat: parseFloat(mosque.latitude!), 
        lng: parseFloat(mosque.longitude!) 
      },
      title: mosque.name,
      status: mosque.approvalStatus || 'pending', // نمرر الحالة هنا
      content: (
        <div style={{ direction: 'rtl', minWidth: '200px' }}>
          <div className="flex items-center justify-between mb-2">
            <h3 style={{ margin: 0, fontSize: '16px', fontWeight: 'bold' }}>{mosque.name}</h3>
            <Badge className={
              mosque.approvalStatus === 'approved' ? 'bg-green-100 text-green-800' :
              mosque.approvalStatus === 'pending' ? 'bg-orange-100 text-orange-800' :
              'bg-red-100 text-red-800'
            }>
              {mosque.approvalStatus === 'approved' ? 'معتمد' :
               mosque.approvalStatus === 'pending' ? 'قيد المراجعة' : 'مرفوض'}
            </Badge>
          </div>
          <p style={{ margin: '0 0 4px 0', fontSize: '13px', color: '#6b7280' }}>
            <strong>المدينة:</strong> {mosque.city}
          </p>
          {mosque.governorate && (
            <p style={{ margin: '0 0 4px 0', fontSize: '13px', color: '#6b7280' }}>
              <strong>المحافظة:</strong> {mosque.governorate}
            </p>
          )}
          {mosque.district && (
            <p style={{ margin: '0 0 4px 0', fontSize: '13px', color: '#6b7280' }}>
              <strong>الحي:</strong> {mosque.district}
            </p>
          )}
          {mosque.capacity && (
            <p style={{ margin: '0 0 4px 0', fontSize: '13px', color: '#6b7280' }}>
              <strong>عدد المصلين:</strong> {mosque.capacity}
            </p>
          )}
          <Link href={`/mosques/${mosque.id}`}>
            <Button variant="default" size="sm" className="w-full mt-2 h-8 text-xs gradient-primary text-white">
              عرض التفاصيل
            </Button>
          </Link>
        </div>
      )
    }));

  return (
    <DashboardLayout>
      <div className="space-y-6 max-w-full overflow-x-hidden">
        {/* العنوان والأدوات */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div className="min-w-0">
            <h1 className="text-xl md:text-2xl font-bold text-foreground truncate">خريطة المساجد</h1>
            <p className="text-sm md:text-base text-muted-foreground break-words max-w-2xl">عرض جميع المساجد المسجلة على الخريطة مع إمكانية عرض صور الأقمار الصناعية</p>
          </div>

          <div className="grid grid-cols-2 sm:flex sm:items-center gap-2 w-full sm:w-auto shrink-0">
            <Button
              variant={viewMode === "map" ? "default" : "outline"}
              size="sm"
              onClick={() => setViewMode("map")}
              className="w-full sm:w-28"
            >
              <MapIcon className="w-4 h-4 ml-1 shrink-0" />
              <span className="truncate">خريطة</span>
            </Button>
            <Button
              variant={viewMode === "list" ? "default" : "outline"}
              size="sm"
              onClick={() => setViewMode("list")}
              className="w-full sm:w-28"
            >
              <List className="w-4 h-4 ml-1 shrink-0" />
              <span className="truncate">قائمة</span>
            </Button>
          </div>
        </div>

        {/* أدوات البحث والفلترة */}
        <Card className="border-0 shadow-sm">
          <CardContent className="p-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="md:col-span-2 relative">
                <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  placeholder="البحث عن مسجد..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pr-10 h-10 w-full"
                />
              </div>

              <Select value={cityFilter} onValueChange={setCityFilter}>
                <SelectTrigger className="w-full h-10">
                  <SelectValue placeholder="المدينة" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">جميع المدن</SelectItem>
                  {cities.map(city => (
                    <SelectItem key={city as string} value={city as string}>{city}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>

        {/* عرض الخريطة أو القائمة */}
        {viewMode === "map" ? (
          <Card className="overflow-hidden border-0 shadow-sm w-full">
            <CardContent className="p-0">
              <div className="relative w-full overflow-hidden">
                <LeafletMap
                  className="h-[400px] sm:h-[500px] md:h-[600px] w-full"
                  markers={mapMarkers}
                  initialCenter={{ lat: 24.7136, lng: 46.6753 }} // الرياض
                  initialZoom={6}
                />

                {/* مفتاح الخريطة التفاعلي */}
                <div className="absolute top-2 right-2 sm:top-4 sm:right-4 z-[1000] w-auto max-w-[calc(100%-1rem)] sm:min-w-[220px]">
                  <motion.div 
                    initial={false}
                    className="bg-white/95 backdrop-blur-sm rounded-lg shadow-lg border border-border overflow-hidden cursor-pointer"
                    onClick={() => setIsLegendExpanded(!isLegendExpanded)}
                  >
                    <div className="p-2.5 sm:p-3 flex items-center justify-between gap-2 hover:bg-muted/50 transition-colors">
                      <p className="text-[11px] sm:text-sm font-medium text-foreground whitespace-nowrap">
                        إجمالي المساجد: <span className="font-bold text-primary">{stats.total}</span>
                      </p>
                      {isLegendExpanded ? (
                        <ChevronUp className="h-4 w-4 text-muted-foreground shrink-0" />
                      ) : (
                        <ChevronDown className="h-4 w-4 text-muted-foreground shrink-0" />
                      )}
                    </div>

                    <AnimatePresence>
                      {isLegendExpanded && (
                        <motion.div
                          initial={{ height: 0, opacity: 0 }}
                          animate={{ height: "auto", opacity: 1 }}
                          exit={{ height: 0, opacity: 0 }}
                          transition={{ duration: 0.2 }}
                        >
                          <div className="p-3 pt-0 space-y-2 border-t border-border mt-1">
                            <div className="flex items-center justify-between text-[10px] sm:text-xs py-1">
                              <div className="flex items-center gap-2">
                                <div className="w-2.5 h-2.5 rounded-full bg-[#22c55e]" />
                                <span className="text-muted-foreground">معتمد</span>
                              </div>
                              <span className="font-bold text-foreground">{stats.approved}</span>
                            </div>
                            <div className="flex items-center justify-between text-[10px] sm:text-xs py-1">
                              <div className="flex items-center gap-2">
                                <div className="w-2.5 h-2.5 rounded-full bg-[#f59e0b]" />
                                <span className="text-muted-foreground">قيد المراجعة</span>
                              </div>
                              <span className="font-bold text-foreground">{stats.pending}</span>
                            </div>
                            <div className="flex items-center justify-between text-[10px] sm:text-xs py-1">
                              <div className="flex items-center gap-2">
                                <div className="w-2.5 h-2.5 rounded-full bg-[#ef4444]" />
                                <span className="text-muted-foreground">مرفوض</span>
                              </div>
                              <span className="font-bold text-foreground">{stats.rejected}</span>
                            </div>
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </motion.div>
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
                <Card key={mosque.id} className="card-hover border-0 shadow-sm">
                  <CardHeader className="pb-2">
                    <div className="flex items-start justify-between gap-2">
                      <CardTitle className="text-base md:text-lg line-clamp-1">{mosque.name}</CardTitle>
                      <Badge variant="secondary" className="bg-primary/10 text-primary shrink-0 text-[10px] md:text-xs">
                        مسجد
                      </Badge>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-2 text-[13px] md:text-sm text-muted-foreground mb-4">
                      <div className="flex items-center gap-2">
                        <MapPin className="w-4 h-4 shrink-0" />
                        <span className="line-clamp-1">{mosque.city}{mosque.district ? ` - ${mosque.district}` : ''}</span>
                      </div>
                      {mosque.capacity && (
                        <div className="flex items-center gap-2">
                          <Users className="w-4 h-4 shrink-0" />
                          <span>{mosque.capacity} مصلي</span>
                        </div>
                      )}
                    </div>
                    <Link href={`/mosques/${mosque.id}`}>
                      <Button variant="outline" size="sm" className="w-full h-9 text-xs md:text-sm">
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

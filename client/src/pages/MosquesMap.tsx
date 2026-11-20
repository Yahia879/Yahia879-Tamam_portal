import { useMemo, useState } from "react";
import { normalizeMosqueApprovalStatus } from "@shared/mosqueMapStatus";
import { LeafletMap } from "@/components/LeafletMap";
import { trpc } from "@/lib/trpc";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Building2, MapPin, Search, List, Map as MapIcon, ChevronRight, Users, ChevronDown, ChevronUp, ArrowRight } from "lucide-react";
import { Link } from "wouter";
import DashboardLayout from "@/components/DashboardLayout";
import { usePermission } from "@/hooks/usePermission";
import { motion, AnimatePresence } from "framer-motion";

export default function MosquesMap() {
  const canViewMap = usePermission("mosque_map.view");
  const canViewDetails = usePermission("mosque_map.view_details");
  const [viewMode, setViewMode] = useState<"map" | "list">("map");
  const [searchQuery, setSearchQuery] = useState("");
  const [cityFilter, setCityFilter] = useState<string>("all");
  const [isLegendExpanded, setIsLegendExpanded] = useState(false);

  // جلب المساجد
  const { data: mosquesData, isLoading } = trpc.mosques.search.useQuery({
    search: searchQuery || undefined,
    city: cityFilter !== "all" ? cityFilter : undefined,
    limit: 500,
  }, {
    enabled: canViewMap,
    staleTime: 0,
    refetchOnMount: "always",
    refetchOnWindowFocus: true,
    refetchInterval: 5000,
  });

  const mosques = useMemo(() => (mosquesData?.mosques || []).map(mosque => ({
    ...mosque,
    approvalStatus: normalizeMosqueApprovalStatus(mosque.approvalStatus),
  })), [mosquesData?.mosques]);

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
        <div className="min-w-[180px] max-w-[min(250px,calc(100vw-5rem))]" style={{ direction: 'rtl' }}>
          <div className="flex items-start justify-between gap-2 mb-2">
            <h3 className="m-0 text-sm sm:text-base font-bold leading-snug break-words">{mosque.name}</h3>
            <Badge className={`shrink-0 text-[10px] sm:text-xs ${
              mosque.approvalStatus === 'approved' ? 'bg-green-100 text-green-800' :
              mosque.approvalStatus === 'pending' ? 'bg-orange-100 text-orange-800' :
              'bg-red-100 text-red-800'
            }`}>
              {mosque.approvalStatus === 'approved' ? 'معتمد' :
               mosque.approvalStatus === 'pending' ? 'قيد المراجعة' : 'مرفوض'}
            </Badge>
          </div>
          <p className="m-0 mb-1 text-xs sm:text-[13px] text-gray-600">
            <strong>المدينة:</strong> {mosque.city}
          </p>
          {mosque.governorate && (
            <p className="m-0 mb-1 text-xs sm:text-[13px] text-gray-600">
              <strong>المحافظة:</strong> {mosque.governorate}
            </p>
          )}
          {mosque.district && (
            <p className="m-0 mb-1 text-xs sm:text-[13px] text-gray-600">
              <strong>الحي:</strong> {mosque.district}
            </p>
          )}
          {mosque.capacity && (
            <p className="m-0 mb-1 text-xs sm:text-[13px] text-gray-600">
              <strong>عدد المصلين:</strong> {mosque.capacity}
            </p>
          )}
          {canViewDetails && (
            <Link href={`/mosques/${mosque.id}`} className="block mt-2">
              <Button variant="default" size="sm" className="w-full h-9 max-lg:min-h-10 pointer-coarse:min-h-10 text-xs gradient-primary text-white">
                عرض التفاصيل
              </Button>
            </Link>
          )}
        </div>
      )
    }));

  return (
    <DashboardLayout tabletNavigation>
      {canViewMap && (
        <div className="min-w-0 space-y-4 sm:space-y-6 max-w-full overflow-x-hidden">
        {/* العنوان والأدوات */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 sm:gap-4">
          <div className="flex items-center gap-2.5 sm:gap-4 min-w-0">
            <Link href="/mosques">
              <Button
                variant="ghost"
                size="icon"
                type="button"
                className="shrink-0 size-11 lg:size-9 pointer-coarse:size-11"
                aria-label="العودة لقائمة المساجد"
              >
                <ArrowRight className="w-5 h-5" />
              </Button>
            </Link>
            <div className="min-w-0">
              <h1 className="text-xl md:text-2xl font-bold text-foreground truncate">خريطة المساجد</h1>
              <p className="text-xs sm:text-sm md:text-base text-muted-foreground break-words max-w-2xl">عرض جميع المساجد المسجلة على الخريطة مع إمكانية عرض صور الأقمار الصناعية</p>
            </div>
          </div>

          <div className="grid grid-cols-2 sm:flex sm:items-center gap-2 w-full sm:w-auto shrink-0">
            <Button
              variant={viewMode === "map" ? "default" : "outline"}
              size="sm"
              onClick={() => setViewMode("map")}
              className="w-full sm:w-28 h-10 max-lg:min-h-11 pointer-coarse:min-h-11"
            >
              <MapIcon className="w-4 h-4 ml-1 shrink-0" />
              <span className="truncate">خريطة</span>
            </Button>
            <Button
              variant={viewMode === "list" ? "default" : "outline"}
              size="sm"
              onClick={() => setViewMode("list")}
              className="w-full sm:w-28 h-10 max-lg:min-h-11 pointer-coarse:min-h-11"
            >
              <List className="w-4 h-4 ml-1 shrink-0" />
              <span className="truncate">قائمة</span>
            </Button>
          </div>
        </div>

        {/* أدوات البحث والفلترة */}
        <Card className="border-0 shadow-sm max-lg:py-0">
          <CardContent className="p-3 sm:p-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2.5 sm:gap-4">
              <div className="sm:col-span-1 md:col-span-2 relative min-w-0">
                <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" />
                <Input
                  placeholder="البحث عن مسجد..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pr-10 h-10 max-lg:min-h-11 pointer-coarse:min-h-11 max-md:text-base w-full"
                />
              </div>

              <Select value={cityFilter} onValueChange={setCityFilter}>
                <SelectTrigger className="w-full min-w-0 h-10 max-lg:min-h-11 pointer-coarse:min-h-11">
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
          <Card className="overflow-hidden border-0 shadow-sm w-full py-0">
            <CardContent className="p-0">
              <div className="relative w-full overflow-hidden">
                <LeafletMap
                  className="h-[55dvh] min-h-[340px] max-h-[520px] sm:h-[60dvh] sm:max-h-[600px] lg:h-[620px] lg:max-h-none w-full"
                  markers={mapMarkers}
                  initialCenter={{ lat: 24.7136, lng: 46.6753 }} // الرياض
                  initialZoom={6}
                />

                {/* مفتاح الخريطة التفاعلي */}
                <div className="absolute top-2 right-2 sm:top-4 sm:right-4 z-[1000] w-auto max-w-[calc(100%-3.75rem)] sm:min-w-[220px]">
                  <motion.div 
                    initial={false}
                    className="bg-card/95 backdrop-blur-sm rounded-lg shadow-lg border border-border overflow-hidden cursor-pointer"
                    onClick={() => setIsLegendExpanded(!isLegendExpanded)}
                  >
                    <div className="px-3 py-2.5 sm:p-3 min-h-10 sm:min-h-11 flex items-center justify-between gap-2 hover:bg-muted/50 transition-colors">
                      <p className="text-xs sm:text-sm font-medium text-foreground whitespace-nowrap">
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
                          <div className="p-3 pt-1 space-y-2 border-t border-border">
                            <div className="flex items-center justify-between text-xs py-0.5 gap-4">
                              <div className="flex items-center gap-2">
                                <div className="w-2.5 h-2.5 rounded-full bg-[#22c55e] shrink-0" />
                                <span className="text-muted-foreground">معتمد</span>
                              </div>
                              <span className="font-bold text-foreground">{stats.approved}</span>
                            </div>
                            <div className="flex items-center justify-between text-xs py-0.5 gap-4">
                              <div className="flex items-center gap-2">
                                <div className="w-2.5 h-2.5 rounded-full bg-[#f59e0b] shrink-0" />
                                <span className="text-muted-foreground">قيد المراجعة</span>
                              </div>
                              <span className="font-bold text-foreground">{stats.pending}</span>
                            </div>
                            <div className="flex items-center justify-between text-xs py-0.5 gap-4">
                              <div className="flex items-center gap-2">
                                <div className="w-2.5 h-2.5 rounded-full bg-[#ef4444] shrink-0" />
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
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4">
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
                <Card key={mosque.id} className="card-hover border-0 shadow-sm max-lg:py-4 gap-3 sm:gap-4 flex flex-col justify-between">
                  <CardHeader className="pb-1 px-4 sm:px-6">
                    <div className="flex items-start justify-between gap-2 min-w-0">
                      <CardTitle className="text-base md:text-lg line-clamp-1 min-w-0">{mosque.name}</CardTitle>
                      <Badge
                        variant="secondary"
                        className={`shrink-0 text-[10px] md:text-xs ${
                          mosque.approvalStatus === 'approved'
                            ? 'bg-green-100 text-green-800 dark:bg-green-950/50 dark:text-green-300'
                            : mosque.approvalStatus === 'pending'
                            ? 'bg-orange-100 text-orange-800 dark:bg-orange-950/50 dark:text-orange-300'
                            : 'bg-red-100 text-red-800 dark:bg-red-950/50 dark:text-red-300'
                        }`}
                      >
                        {mosque.approvalStatus === 'approved' ? 'معتمد' :
                         mosque.approvalStatus === 'pending' ? 'قيد المراجعة' : 'مرفوض'}
                      </Badge>
                    </div>
                  </CardHeader>
                  <CardContent className="px-4 sm:px-6 flex-1 flex flex-col justify-between">
                    <div className="space-y-2 text-[13px] md:text-sm text-muted-foreground mb-4">
                      <div className="flex items-center gap-2 min-w-0">
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
                    {canViewDetails && (
                      <Link href={`/mosques/${mosque.id}`} className="block">
                        <Button variant="outline" size="sm" className="w-full h-10 max-lg:min-h-11 pointer-coarse:min-h-11 text-xs md:text-sm">
                          عرض التفاصيل
                          <ChevronRight className="w-4 h-4 mr-1" />
                        </Button>
                      </Link>
                    )}
                  </CardContent>
                </Card>
              ))
            )}
          </div>
        )}
      </div>
      )}
    </DashboardLayout>
  );
}

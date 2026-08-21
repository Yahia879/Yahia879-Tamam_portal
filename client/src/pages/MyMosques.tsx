import { useState, useMemo, useEffect } from "react";
import { Link } from "wouter";
import { trpc } from "@/lib/trpc";
import { useAuth } from "@/_core/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Building2,
  MapPin,
  Plus,
  Search,
  Eye,
  Clock,
  CheckCircle2,
  XCircle,
  Users,
  Ruler,
  X,
  RotateCcw,
  ChevronLeft,
  ChevronRight,
  Send,
  AlertCircle,
} from "lucide-react";
import BeneficiaryLayout from "@/components/BeneficiaryLayout";

// تسميات حالة الاعتماد
const APPROVAL_STATUS_LABELS: Record<string, string> = {
  pending: "قيد المراجعة",
  approved: "معتمد",
  rejected: "مرفوض",
};

// شارات حالة الاعتماد
const getApprovalStatusBadge = (status: string) => {
  switch (status) {
    case "approved":
      return (
        <Badge
          variant="outline"
          className="rounded-xl text-[10px] sm:text-[11px] font-bold px-2 sm:px-2.5 py-0.5 border-emerald-500/30 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 gap-1 shrink-0"
        >
          <CheckCircle2 className="w-3 h-3" />
          <span>معتمد</span>
        </Badge>
      );
    case "pending":
      return (
        <Badge
          variant="outline"
          className="rounded-xl text-[10px] sm:text-[11px] font-bold px-2 sm:px-2.5 py-0.5 border-amber-500/30 bg-amber-500/10 text-amber-600 dark:text-amber-400 gap-1 shrink-0"
        >
          <Clock className="w-3 h-3" />
          <span>قيد المراجعة</span>
        </Badge>
      );
    case "rejected":
      return (
        <Badge
          variant="outline"
          className="rounded-xl text-[10px] sm:text-[11px] font-bold px-2 sm:px-2.5 py-0.5 border-rose-500/30 bg-rose-500/10 text-rose-600 dark:text-rose-400 gap-1 shrink-0"
        >
          <XCircle className="w-3 h-3" />
          <span>مرفوض</span>
        </Badge>
      );
    default:
      return (
        <Badge variant="outline" className="rounded-xl text-[10px] sm:text-[11px] font-bold px-2 py-0.5 shrink-0">
          {status}
        </Badge>
      );
  }
};

export default function MyMosques() {
  const { user } = useAuth();
  const [searchTerm, setSearchTerm] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [statusTab, setStatusTab] = useState<string>("all");
  const [cityFilter, setCityFilter] = useState<string>("all");
  const [page, setPage] = useState<number>(1);
  const limit = 9;

  // تأخير البحث لتجنب كثرة الطلبات (Debounce)
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(searchTerm.trim());
      setPage(1);
    }, 350);
    return () => clearTimeout(timer);
  }, [searchTerm]);

  // إعادة ضبط الصفحة عند تغيير التبويب أو المدينة
  useEffect(() => {
    setPage(1);
  }, [statusTab, cityFilter]);

  // جلب المدن المتاحة للفلترة
  const { data: allCategories = [] } = trpc.categories.getAllCategories.useQuery();
  const availableCities = useMemo(() => {
    const cities = allCategories
      .filter((c: any) => c.type === "city")
      .map((c: any) => c.nameAr)
      .filter(Boolean);
    return Array.from(new Set(cities));
  }, [allCategories]);

  // جلب مساجد المستخدم من الـ Backend مع الفلترة والبحث والصفحات
  const { data: responseData, isLoading } = trpc.mosques.getMyMosques.useQuery({
    search: debouncedSearch || undefined,
    status: statusTab,
    city: cityFilter !== "all" ? cityFilter : undefined,
    page,
    limit,
  });

  const mosques = Array.isArray(responseData)
    ? responseData
    : (Array.isArray(responseData?.mosques) ? responseData.mosques : []);
  const total = responseData?.total ?? mosques.length;
  const totalPages = responseData?.totalPages ?? Math.ceil(total / limit);
  const stats = responseData?.stats || {
    total: mosques.length,
    approved: mosques.filter((m: any) => m.approvalStatus === "approved").length,
    pending: mosques.filter((m: any) => m.approvalStatus === "pending").length,
    rejected: mosques.filter((m: any) => m.approvalStatus === "rejected").length,
  };

  const handlePageChange = (newPage: number) => {
    if (newPage >= 1 && newPage <= totalPages && newPage !== page) {
      setPage(newPage);
      window.scrollTo({ top: 0, behavior: "smooth" });
    }
  };

  const handleClearFilters = () => {
    setSearchTerm("");
    setDebouncedSearch("");
    setStatusTab("all");
    setCityFilter("all");
    setPage(1);
  };

  const isFiltering = debouncedSearch !== "" || statusTab !== "all" || cityFilter !== "all";

  return (
    <BeneficiaryLayout
      activeTab="mosques"
      title="مساجدي المسجلة"
      subtitle="إدارة ومتابعة كافة المساجد المسجلة والتحقق من حالة اعتمادها وطلب الخدمات"
      backUrl="/requester"
      backLabel="العودة للوحة التحكم"
      headerActions={
        <Link href="/requester/mosques/new">
          <Button className="rounded-xl sm:rounded-2xl gradient-primary text-white font-bold gap-1 sm:gap-2 shadow-sm hover:opacity-95 cursor-pointer text-[11px] sm:text-xs h-8 sm:h-10 px-2.5 sm:px-4 shrink-0">
            <Plus className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
            <span className="hidden sm:inline">تسجيل مسجد جديد</span>
            <span className="sm:hidden">مسجد جديد</span>
          </Button>
        </Link>
      }
    >
      {/* KPI Stats Overview Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-2.5 sm:gap-6 mb-4 sm:mb-8">
        <Card
          onClick={() => setStatusTab("all")}
          className={`border shadow-xs hover:shadow-md transition-all rounded-xl sm:rounded-2xl cursor-pointer group bg-card ${
            statusTab === "all" ? "border-primary ring-1 ring-primary/30" : "border-border/60 hover:border-primary/40"
          }`}
        >
          <CardContent className="p-2.5 sm:p-5 flex items-center justify-between gap-2">
            <div className="min-w-0">
              <p className="text-[10px] sm:text-xs font-medium text-muted-foreground truncate">إجمالي المساجد</p>
              <p className="text-lg sm:text-3xl font-extrabold text-foreground mt-0.5 sm:mt-1">{stats.total}</p>
            </div>
            <div className="w-8 h-8 sm:w-12 sm:h-12 rounded-xl sm:rounded-2xl bg-primary/10 dark:bg-primary/20 flex items-center justify-center text-primary shrink-0 group-hover:scale-110 transition-transform">
              <Building2 className="w-4 h-4 sm:w-6 sm:h-6" />
            </div>
          </CardContent>
        </Card>

        <Card
          onClick={() => setStatusTab("approved")}
          className={`border shadow-xs hover:shadow-md transition-all rounded-xl sm:rounded-2xl cursor-pointer group bg-card ${
            statusTab === "approved" ? "border-emerald-500 ring-1 ring-emerald-500/30" : "border-border/60 hover:border-emerald-500/40"
          }`}
        >
          <CardContent className="p-2.5 sm:p-5 flex items-center justify-between gap-2">
            <div className="min-w-0">
              <p className="text-[10px] sm:text-xs font-medium text-muted-foreground truncate">مساجد معتمدة</p>
              <p className="text-lg sm:text-3xl font-extrabold text-emerald-600 dark:text-emerald-400 mt-0.5 sm:mt-1">{stats.approved}</p>
            </div>
            <div className="w-8 h-8 sm:w-12 sm:h-12 rounded-xl sm:rounded-2xl bg-emerald-500/10 dark:bg-emerald-500/20 flex items-center justify-center text-emerald-600 dark:text-emerald-400 shrink-0 group-hover:scale-110 transition-transform">
              <CheckCircle2 className="w-4 h-4 sm:w-6 sm:h-6" />
            </div>
          </CardContent>
        </Card>

        <Card
          onClick={() => setStatusTab("pending")}
          className={`border shadow-xs hover:shadow-md transition-all rounded-xl sm:rounded-2xl cursor-pointer group bg-card ${
            statusTab === "pending" ? "border-amber-500 ring-1 ring-amber-500/30" : "border-border/60 hover:border-amber-500/40"
          }`}
        >
          <CardContent className="p-2.5 sm:p-5 flex items-center justify-between gap-2">
            <div className="min-w-0">
              <p className="text-[10px] sm:text-xs font-medium text-muted-foreground truncate">قيد المراجعة</p>
              <p className="text-lg sm:text-3xl font-extrabold text-amber-600 dark:text-amber-400 mt-0.5 sm:mt-1">{stats.pending}</p>
            </div>
            <div className="w-8 h-8 sm:w-12 sm:h-12 rounded-xl sm:rounded-2xl bg-amber-500/10 dark:bg-amber-500/20 flex items-center justify-center text-amber-600 dark:text-amber-400 shrink-0 group-hover:scale-110 transition-transform">
              <Clock className="w-4 h-4 sm:w-6 sm:h-6" />
            </div>
          </CardContent>
        </Card>

        <Card
          onClick={() => setStatusTab("rejected")}
          className={`border shadow-xs hover:shadow-md transition-all rounded-xl sm:rounded-2xl cursor-pointer group bg-card ${
            statusTab === "rejected" ? "border-rose-500 ring-1 ring-rose-500/30" : "border-border/60 hover:border-rose-500/40"
          }`}
        >
          <CardContent className="p-2.5 sm:p-5 flex items-center justify-between gap-2">
            <div className="min-w-0">
              <p className="text-[10px] sm:text-xs font-medium text-muted-foreground truncate">مرفوضة</p>
              <p className="text-lg sm:text-3xl font-extrabold text-rose-600 dark:text-rose-400 mt-0.5 sm:mt-1">{stats.rejected}</p>
            </div>
            <div className="w-8 h-8 sm:w-12 sm:h-12 rounded-xl sm:rounded-2xl bg-rose-500/10 dark:bg-rose-500/20 flex items-center justify-center text-rose-600 dark:text-rose-400 shrink-0 group-hover:scale-110 transition-transform">
              <XCircle className="w-4 h-4 sm:w-6 sm:h-6" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Search & Filter Toolbar */}
      <div className="flex flex-col md:flex-row items-center justify-between gap-3 sm:gap-4 mb-4 sm:mb-6">
        {/* Status Tabs Pills */}
        <div className="w-full md:w-auto overflow-x-auto pb-1 md:pb-0">
          <div className="flex items-center gap-1 sm:gap-1.5 bg-muted/60 dark:bg-muted/30 p-1 sm:p-1.5 rounded-xl sm:rounded-2xl border border-border/50 shrink-0">
            <button
              onClick={() => setStatusTab("all")}
              className={`px-2.5 sm:px-3.5 py-1 sm:py-1.5 rounded-lg sm:rounded-xl text-[11px] sm:text-xs font-bold transition-all whitespace-nowrap cursor-pointer ${
                statusTab === "all"
                  ? "bg-background dark:bg-card text-primary shadow-xs border border-border/60"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              الكل ({stats.total})
            </button>
            <button
              onClick={() => setStatusTab("approved")}
              className={`px-2.5 sm:px-3.5 py-1 sm:py-1.5 rounded-lg sm:rounded-xl text-[11px] sm:text-xs font-bold transition-all whitespace-nowrap cursor-pointer ${
                statusTab === "approved"
                  ? "bg-background dark:bg-card text-emerald-600 dark:text-emerald-400 shadow-xs border border-border/60"
                  : "text-muted-foreground hover:text-emerald-600 dark:hover:text-emerald-400"
              }`}
            >
              معتمدة ({stats.approved})
            </button>
            <button
              onClick={() => setStatusTab("pending")}
              className={`px-2.5 sm:px-3.5 py-1 sm:py-1.5 rounded-lg sm:rounded-xl text-[11px] sm:text-xs font-bold transition-all whitespace-nowrap cursor-pointer ${
                statusTab === "pending"
                  ? "bg-background dark:bg-card text-amber-600 dark:text-amber-400 shadow-xs border border-border/60"
                  : "text-muted-foreground hover:text-amber-600 dark:hover:text-amber-400"
              }`}
            >
              قيد المراجعة ({stats.pending})
            </button>
            <button
              onClick={() => setStatusTab("rejected")}
              className={`px-2.5 sm:px-3.5 py-1 sm:py-1.5 rounded-lg sm:rounded-xl text-[11px] sm:text-xs font-bold transition-all whitespace-nowrap cursor-pointer ${
                statusTab === "rejected"
                  ? "bg-background dark:bg-card text-rose-600 dark:text-rose-400 shadow-xs border border-border/60"
                  : "text-muted-foreground hover:text-rose-600 dark:hover:text-rose-400"
              }`}
            >
              مرفوضة ({stats.rejected})
            </button>
          </div>
        </div>

        {/* Search Input & City Filter */}
        <div className="flex items-center gap-2 sm:gap-3 w-full md:w-auto">
          <div className="relative flex-1 md:w-72">
            <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
            <Input
              placeholder="ابحث باسم المسجد أو المدينة..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pr-8 pl-7 rounded-xl sm:rounded-2xl h-8.5 sm:h-10 border-border/60 bg-background text-[11px] sm:text-xs"
            />
            {searchTerm && (
              <button
                type="button"
                onClick={() => setSearchTerm("")}
                className="absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground p-0.5 rounded-full cursor-pointer"
                title="مسح البحث"
              >
                <X className="w-3 h-3" />
              </button>
            )}
          </div>

          <Select value={cityFilter} onValueChange={setCityFilter}>
            <SelectTrigger className="w-[125px] sm:w-[140px] rounded-xl sm:rounded-2xl h-8.5 sm:h-10 border-border/60 bg-background text-[11px] sm:text-xs cursor-pointer">
              <SelectValue placeholder="المدينة" />
            </SelectTrigger>
            <SelectContent className="rounded-2xl">
              <SelectItem value="all">كل المدن</SelectItem>
              {availableCities.map((city: string) => (
                <SelectItem key={city} value={city}>
                  {city}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          {isFiltering && (
            <Button
              type="button"
              variant="ghost"
              size="icon"
              onClick={handleClearFilters}
              className="h-8.5 w-8.5 sm:h-10 sm:w-10 rounded-xl sm:rounded-2xl text-muted-foreground hover:text-destructive shrink-0 cursor-pointer"
              title="إعادة تعيين الفلاتر"
            >
              <RotateCcw className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
            </Button>
          )}
        </div>
      </div>

      {/* Mosques Grid */}
      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3.5 sm:gap-6">
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <div key={i} className="h-44 sm:h-52 bg-muted/40 animate-pulse rounded-2xl sm:rounded-3xl" />
          ))}
        </div>
      ) : mosques.length > 0 ? (
        <div className="space-y-4 sm:space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3.5 sm:gap-6">
            {mosques.map((mosque: any) => {
              const isApproved = mosque.approvalStatus === "approved";
              const isRejected = mosque.approvalStatus === "rejected";

              return (
                <Card
                  key={mosque.id}
                  className={`border shadow-xs hover:shadow-md transition-all rounded-2xl sm:rounded-3xl overflow-hidden flex flex-col group ${
                    isRejected
                      ? "border-rose-200/80 dark:border-rose-900/40 bg-rose-50/20 dark:bg-rose-950/10 hover:border-rose-300"
                      : "border-border/60 bg-card hover:border-primary/40"
                  }`}
                >
                  <CardHeader className="p-3.5 sm:p-5 pb-2 sm:pb-3">
                    <div className="flex items-start justify-between gap-2.5 sm:gap-3">
                      <div className="flex items-center gap-2.5 sm:gap-3 min-w-0 flex-1">
                        <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-xl sm:rounded-2xl bg-primary/10 dark:bg-primary/20 text-primary flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform">
                          <Building2 className="w-5 h-5 sm:w-6 sm:h-6" />
                        </div>
                        <div className="min-w-0 flex-1">
                          <h3 className="font-bold sm:font-extrabold text-xs sm:text-base text-foreground truncate group-hover:text-primary transition-colors">
                            {mosque.name}
                          </h3>
                          <p className="text-[10px] sm:text-xs text-muted-foreground flex items-center gap-1 mt-0.5 font-medium truncate">
                            <MapPin className="w-3 h-3 text-primary/70 shrink-0" />
                            <span>{mosque.city || "أبها"}</span>
                            {mosque.district && <span>• {mosque.district}</span>}
                          </p>
                        </div>
                      </div>

                      {getApprovalStatusBadge(mosque.approvalStatus)}
                    </div>
                  </CardHeader>

                  <CardContent className="p-3.5 sm:p-5 pt-0 flex-1 flex flex-col justify-between">
                    <div className="grid grid-cols-2 gap-1.5 sm:gap-2 py-2 sm:py-3 border-y border-border/40 my-2 sm:my-3 text-[10px] sm:text-xs text-muted-foreground font-medium">
                      <div className="flex items-center gap-1 truncate">
                        <Ruler className="w-3.5 h-3.5 text-primary/60 shrink-0" />
                        <span>المساحة: {mosque.area ? `${mosque.area} م²` : "غير محدد"}</span>
                      </div>
                      <div className="flex items-center gap-1 truncate">
                        <Users className="w-3.5 h-3.5 text-primary/60 shrink-0" />
                        <span>السعة: {mosque.capacity ? `${mosque.capacity} مصلٍ` : "غير محدد"}</span>
                      </div>
                    </div>

                    {/* Rejection Alert Notice */}
                    {isRejected && mosque.rejectionReason && (
                      <div className="p-2.5 sm:p-3 bg-rose-100/70 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900/50 rounded-xl sm:rounded-2xl mb-3 text-[10px] sm:text-xs text-rose-900 dark:text-rose-200 flex items-start gap-1.5 sm:gap-2">
                        <AlertCircle className="w-3.5 h-3.5 text-rose-600 dark:text-rose-400 shrink-0 mt-0.5" />
                        <div className="min-w-0 flex-1 leading-relaxed">
                          <span className="font-bold">سبب الرفض: </span>
                          <span className="font-medium">{mosque.rejectionReason}</span>
                        </div>
                      </div>
                    )}

                    <div className="flex items-center gap-2 mt-auto pt-1 sm:pt-2">
                      <Link href={`/mosques/${mosque.id}`} className="flex-1">
                        <Button variant="outline" className="w-full rounded-xl sm:rounded-2xl text-[11px] sm:text-xs font-bold h-8 sm:h-9 gap-1.5 cursor-pointer">
                          <Eye className="w-3.5 h-3.5" />
                          <span>التفاصيل</span>
                        </Button>
                      </Link>

                      {isApproved && (
                        <Link href="/request-form-dynamic" className="flex-1">
                          <Button className="w-full rounded-xl sm:rounded-2xl text-[11px] sm:text-xs font-bold h-8 sm:h-9 gap-1.5 gradient-primary text-white shadow-xs cursor-pointer">
                            <Send className="w-3.5 h-3.5" />
                            <span>طلب خدمة</span>
                          </Button>
                        </Link>
                      )}
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>

          {/* Pagination Footer */}
          <div className="p-3 sm:p-4 bg-muted/20 border border-border/60 rounded-2xl sm:rounded-3xl flex flex-col sm:flex-row items-center justify-between gap-3 sm:gap-4">
            <div className="text-[10px] sm:text-xs text-muted-foreground text-center sm:text-right font-medium">
              عرض{" "}
              <span className="font-bold text-foreground font-mono">
                {total === 0 ? 0 : (page - 1) * limit + 1}
              </span>{" "}
              إلى{" "}
              <span className="font-bold text-foreground font-mono">
                {Math.min(page * limit, total)}
              </span>{" "}
              من إجمالي{" "}
              <span className="font-bold text-foreground font-mono">{total}</span> مسجد
            </div>

            {totalPages > 1 && (
              <div className="flex items-center gap-1 overflow-x-auto max-w-full py-0.5">
                <Button
                  variant="outline"
                  size="icon"
                  onClick={() => handlePageChange(page - 1)}
                  disabled={page <= 1}
                  className="rounded-lg sm:rounded-xl h-7.5 w-7.5 sm:h-8.5 sm:w-8.5 cursor-pointer disabled:opacity-40"
                  title="الصفحة السابقة"
                >
                  <ChevronRight className="w-3.5 h-3.5" />
                </Button>

                <div className="flex items-center gap-1">
                  {Array.from({ length: totalPages }).map((_, index) => {
                    const pageNum = index + 1;
                    if (
                      totalPages <= 5 ||
                      pageNum === 1 ||
                      pageNum === totalPages ||
                      (pageNum >= page - 1 && pageNum <= page + 1)
                    ) {
                      return (
                        <Button
                          key={pageNum}
                          variant={page === pageNum ? "default" : "ghost"}
                          size="sm"
                          onClick={() => handlePageChange(pageNum)}
                          className={`rounded-lg sm:rounded-xl h-7.5 min-w-[30px] sm:h-8.5 sm:min-w-[34px] p-0 text-[10px] sm:text-xs font-bold cursor-pointer ${
                            page === pageNum ? "gradient-primary text-white shadow-xs" : ""
                          }`}
                        >
                          {pageNum}
                        </Button>
                      );
                    }
                    if (pageNum === page - 2 || pageNum === page + 2) {
                      return (
                        <span key={pageNum} className="text-[10px] sm:text-xs text-muted-foreground px-1">
                          ...
                        </span>
                      );
                    }
                    return null;
                  })}
                </div>

                <Button
                  variant="outline"
                  size="icon"
                  onClick={() => handlePageChange(page + 1)}
                  disabled={page >= totalPages}
                  className="rounded-lg sm:rounded-xl h-7.5 w-7.5 sm:h-8.5 sm:w-8.5 cursor-pointer disabled:opacity-40"
                  title="الصفحة التالية"
                >
                  <ChevronLeft className="w-3.5 h-3.5" />
                </Button>
              </div>
            )}
          </div>
        </div>
      ) : (
        <Card className="border border-border/60 shadow-xs rounded-2xl sm:rounded-3xl p-8 sm:p-12 text-center bg-card">
          <div className="w-12 h-12 sm:w-16 sm:h-16 rounded-full bg-primary/10 dark:bg-primary/20 text-primary flex items-center justify-center mx-auto mb-3 sm:mb-4">
            <Building2 className="w-6 h-6 sm:w-8 sm:h-8" />
          </div>
          <h3 className="font-bold text-base sm:text-lg text-foreground mb-1">
            {isFiltering ? "لا توجد نتائج مطابقة لبحثك" : "لا توجد مساجد مسجلة بعد"}
          </h3>
          <p className="text-[11px] sm:text-xs text-muted-foreground mb-4 sm:mb-6 max-w-md mx-auto">
            {isFiltering
              ? "لم يتم العثور على أي مساجد تطابق خيارات الفلترة أو البحث المحددة. جرب تغيير المعايير أو إعادة التعيين."
              : "قم بتسجيل مسجدك الإلكتروني لتمكن من طلب كافة الخدمات المتاحة ورعاية بيت الله بكل يسر وسهولة."}
          </p>
          {isFiltering ? (
            <Button
              onClick={handleClearFilters}
              variant="outline"
              className="rounded-xl sm:rounded-2xl font-bold gap-1.5 sm:gap-2 px-4 sm:px-6 h-9 sm:h-10 text-[11px] sm:text-xs cursor-pointer"
            >
              <RotateCcw className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
              <span>إعادة تعيين الفلاتر</span>
            </Button>
          ) : (
            <Link href="/requester/mosques/new">
              <Button className="gradient-primary text-white font-bold rounded-xl sm:rounded-2xl shadow-md gap-1.5 sm:gap-2 px-4 sm:px-6 h-9 sm:h-10 text-[11px] sm:text-xs cursor-pointer">
                <Plus className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                <span>تسجيل مسجد جديد</span>
              </Button>
            </Link>
          )}
        </Card>
      )}
    </BeneficiaryLayout>
  );
}

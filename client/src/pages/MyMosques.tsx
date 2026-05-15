import { useState } from "react";
import { Link } from "wouter";
import { trpc } from "@/lib/trpc";
import { useAuth } from "@/_core/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Building2,
  MapPin,
  Plus,
  Search,
  Eye,
  Clock,
  CheckCircle2,
  XCircle,
  ArrowLeft,
  Users,
  Ruler,
  Calendar
} from "lucide-react";

// تسميات حالة الاعتماد
const APPROVAL_STATUS_LABELS: Record<string, string> = {
  pending: "قيد المراجعة",
  approved: "معتمد",
  rejected: "مرفوض"
};

// ألوان حالة الاعتماد
const APPROVAL_STATUS_COLORS: Record<string, string> = {
  pending: "bg-yellow-100 text-yellow-800",
  approved: "bg-green-100 text-green-800",
  rejected: "bg-red-100 text-red-800"
};

// أيقونات حالة الاعتماد
const APPROVAL_STATUS_ICONS: Record<string, React.ReactNode> = {
  pending: <Clock className="w-4 h-4" />,
  approved: <CheckCircle2 className="w-4 h-4" />,
  rejected: <XCircle className="w-4 h-4" />
};

export default function MyMosques() {
  const { user } = useAuth();
  const [searchQuery, setSearchQuery] = useState("");

  // جلب مساجد المستخدم
  const { data: mosques, isLoading } = trpc.mosques.getMyMosques.useQuery();

  // فلترة المساجد حسب البحث
  const filteredMosques = mosques?.filter((mosque: any) =>
    mosque.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    mosque.city?.toLowerCase().includes(searchQuery.toLowerCase())
  ) || [];

  // إحصائيات المساجد
  const stats = {
    total: mosques?.length || 0,
    approved: mosques?.filter((m: any) => m.approvalStatus === "approved").length || 0,
    pending: mosques?.filter((m: any) => m.approvalStatus === "pending").length || 0,
    rejected: mosques?.filter((m: any) => m.approvalStatus === "rejected").length || 0
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto"></div>
          <p className="mt-4 text-muted-foreground">جاري تحميل المساجد...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-muted/30">
      {/* Header */}
      <header className="bg-white border-b sticky top-0 z-50">
        <div className="container mx-auto px-4 py-3 sm:py-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="flex items-center gap-3 sm:gap-4">
              <Link href="/requester">
                <Button variant="ghost" size="icon" className="flex-shrink-0">
                  <ArrowLeft className="w-5 h-5" />
                </Button>
              </Link>
              <div className="min-w-0">
                <h1 className="text-xl sm:text-2xl font-bold text-foreground truncate">مساجدي</h1>
                <p className="text-xs sm:text-sm text-muted-foreground truncate">إدارة المساجد المسجلة باسمك</p>
              </div>
            </div>
            <Link href="/requester/mosques/new">
              <Button className="bg-primary hover:bg-primary/90 w-full sm:w-auto h-10">
                <Plus className="w-4 h-4 ml-2" />
                تسجيل مسجد جديد
              </Button>
            </Link>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-6 sm:py-8">
        {/* بطاقات الإحصائيات */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 mb-6 sm:mb-8">
          <Card className="border-0 shadow-sm">
            <CardContent className="p-3 sm:p-4 text-center">
              <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-2">
                <Building2 className="w-5 h-5 sm:w-6 sm:h-6 text-primary" />
              </div>
              <p className="text-xl sm:text-2xl font-bold text-foreground">{stats.total}</p>
              <p className="text-[10px] sm:text-xs text-muted-foreground">إجمالي المساجد</p>
            </CardContent>
          </Card>
          <Card className="border-0 shadow-sm">
            <CardContent className="p-3 sm:p-4 text-center">
              <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-full bg-green-100 flex items-center justify-center mx-auto mb-2">
                <CheckCircle2 className="w-5 h-5 sm:w-6 sm:h-6 text-green-600" />
              </div>
              <p className="text-xl sm:text-2xl font-bold text-green-600">{stats.approved}</p>
              <p className="text-[10px] sm:text-xs text-muted-foreground">معتمدة</p>
            </CardContent>
          </Card>
          <Card className="border-0 shadow-sm">
            <CardContent className="p-3 sm:p-4 text-center">
              <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-full bg-yellow-100 flex items-center justify-center mx-auto mb-2">
                <Clock className="w-5 h-5 sm:w-6 sm:h-6 text-yellow-600" />
              </div>
              <p className="text-xl sm:text-2xl font-bold text-yellow-600">{stats.pending}</p>
              <p className="text-[10px] sm:text-xs text-muted-foreground">قيد المراجعة</p>
            </CardContent>
          </Card>
          <Card className="border-0 shadow-sm">
            <CardContent className="p-3 sm:p-4 text-center">
              <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-full bg-red-100 flex items-center justify-center mx-auto mb-2">
                <XCircle className="w-5 h-5 sm:w-6 sm:h-6 text-red-600" />
              </div>
              <p className="text-xl sm:text-2xl font-bold text-red-600">{stats.rejected}</p>
              <p className="text-[10px] sm:text-xs text-muted-foreground">مرفوضة</p>
            </CardContent>
          </Card>
        </div>

        {/* شريط البحث */}
        <div className="mb-6">
          <div className="relative w-full sm:max-w-md">
            <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 sm:w-5 sm:h-5 text-muted-foreground" />
            <Input
              placeholder="ابحث عن مسجد..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pr-10 h-10"
            />
          </div>
        </div>

        {/* قائمة المساجد */}
        {filteredMosques.length === 0 ? (
          <Card className="border-0 shadow-sm">
            <CardContent className="p-8 sm:p-12 text-center">
              <Building2 className="w-12 h-12 sm:w-16 sm:h-16 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-base sm:text-lg font-semibold mb-2">لا توجد مساجد مسجلة</h3>
              <p className="text-xs sm:text-sm text-muted-foreground mb-6">
                {searchQuery ? "لا توجد نتائج مطابقة للبحث" : "لم تقم بتسجيل أي مسجد بعد"}
              </p>
              {!searchQuery && (
                <Link href="/requester/mosques/new">
                  <Button className="bg-primary hover:bg-primary/90 w-full sm:w-auto">
                    <Plus className="w-4 h-4 ml-2" />
                    تسجيل مسجد جديد
                  </Button>
                </Link>
              )}
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-4 sm:gap-6 md:grid-cols-2 lg:grid-cols-3">
            {filteredMosques.map((mosque: any) => (
              <Card key={mosque.id} className="border-0 shadow-sm hover:shadow-md transition-all group overflow-hidden">
                <CardHeader className="p-4 sm:p-6 pb-2 sm:pb-3">
                  <div className="flex flex-col gap-3">
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex items-center gap-3 min-w-0">
                        <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0 group-hover:scale-110 transition-transform">
                          <Building2 className="w-5 h-5 sm:w-6 sm:h-6 text-primary" />
                        </div>
                        <div className="min-w-0">
                          <CardTitle className="text-base sm:text-lg truncate" title={mosque.name}>{mosque.name}</CardTitle>
                          <CardDescription className="flex items-center gap-1 text-[10px] sm:text-xs truncate">
                            <MapPin className="w-3 h-3 flex-shrink-0" />
                            {mosque.city || "غير محدد"}
                          </CardDescription>
                        </div>
                      </div>
                    </div>
                    <Badge className={`${APPROVAL_STATUS_COLORS[mosque.approvalStatus] || "bg-gray-100"} w-fit text-[10px] sm:text-xs py-0 h-5 sm:h-6`}>
                      <span className="flex items-center gap-1">
                        {APPROVAL_STATUS_ICONS[mosque.approvalStatus]}
                        <span>{APPROVAL_STATUS_LABELS[mosque.approvalStatus] || mosque.approvalStatus}</span>
                      </span>
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent className="p-4 sm:p-6 pt-0 sm:pt-0">
                  <div className="grid grid-cols-2 gap-2 sm:gap-3 text-[11px] sm:text-sm mb-4">
                    <div className="flex items-center gap-1.5 sm:gap-2 text-muted-foreground min-w-0">
                      <Ruler className="w-3.5 h-3.5 sm:w-4 sm:h-4 flex-shrink-0" />
                      <span className="truncate">المساحة: {mosque.area ? `${mosque.area} م²` : "غير محدد"}</span>
                    </div>
                    <div className="flex items-center gap-1.5 sm:gap-2 text-muted-foreground min-w-0">
                      <Users className="w-3.5 h-3.5 sm:w-4 sm:h-4 flex-shrink-0" />
                      <span className="truncate">السعة: {mosque.capacity || "غير محدد"}</span>
                    </div>
                    <div className="flex items-center gap-1.5 sm:gap-2 text-muted-foreground col-span-2 min-w-0">
                      <Calendar className="w-3.5 h-3.5 sm:w-4 sm:h-4 flex-shrink-0" />
                      <span className="truncate">تاريخ التسجيل: {new Date(mosque.createdAt).toLocaleDateString("ar-SA")}</span>
                    </div>
                  </div>
                  
                  {/* سبب الرفض إن وجد */}
                  {mosque.approvalStatus === "rejected" && mosque.rejectionReason && (
                    <div className="p-3 bg-red-50 rounded-lg mb-4 border border-red-100">
                      <p className="text-[10px] sm:text-sm text-red-700 leading-relaxed">
                        <strong>سبب الرفض:</strong> {mosque.rejectionReason}
                      </p>
                    </div>
                  )}

                  <div className="flex flex-col sm:flex-row gap-2 mt-auto">
                    <Link href={`/mosques/${mosque.id}`} className="flex-1">
                      <Button variant="outline" className="w-full h-9 sm:h-10 text-xs sm:text-sm">
                        <Eye className="w-4 h-4 ml-2" />
                        عرض التفاصيل
                      </Button>
                    </Link>
                    {mosque.approvalStatus === "approved" && (
                      <Link href="/request-form-dynamic" className="flex-1">
                        <Button className="bg-primary hover:bg-primary/90 w-full h-9 sm:h-10 text-xs sm:text-sm">
                          تقديم طلب
                        </Button>
                      </Link>
                    )}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}

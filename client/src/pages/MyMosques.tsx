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
  Users,
  Ruler,
  Calendar,
  Sparkles,
  ArrowRight,
  Send,
} from "lucide-react";
import BeneficiaryLayout from "@/components/BeneficiaryLayout";

// تسميات حالة الاعتماد
const APPROVAL_STATUS_LABELS: Record<string, string> = {
  pending: "قيد المراجعة",
  approved: "معتمد",
  rejected: "مرفوض",
};

// ألوان حالة الاعتماد
const APPROVAL_STATUS_COLORS: Record<string, string> = {
  pending: "bg-amber-500/10 text-amber-600 border-amber-500/20",
  approved: "bg-emerald-500/10 text-emerald-600 border-emerald-500/20",
  rejected: "bg-red-500/10 text-red-600 border-red-500/20",
};

export default function MyMosques() {
  const { user } = useAuth();
  const [searchQuery, setSearchQuery] = useState("");

  // جلب مساجد المستخدم
  const { data: mosques, isLoading } = trpc.mosques.getMyMosques.useQuery();

  // فلترة المساجد حسب البحث
  const filteredMosques =
    mosques?.filter(
      (mosque: any) =>
        mosque.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        mosque.city?.toLowerCase().includes(searchQuery.toLowerCase())
    ) || [];

  // إحصائيات المساجد
  const stats = {
    total: mosques?.length || 0,
    approved: mosques?.filter((m: any) => m.approvalStatus === "approved").length || 0,
    pending: mosques?.filter((m: any) => m.approvalStatus === "pending").length || 0,
    rejected: mosques?.filter((m: any) => m.approvalStatus === "rejected").length || 0,
  };

  return (
    <BeneficiaryLayout
      activeTab="mosques"
      title="مساجدي المسجلة"
      subtitle="إدارة المساجد الخاصة بك والمتابعة على طلبات خدمات بيوت الله"
      headerActions={
        <Link href="/requester/mosques/new">
          <Button className="rounded-2xl gradient-primary text-white font-bold gap-2 shadow-md hover:opacity-95">
            <Plus className="w-4 h-4" />
            <span>تسجيل مسجد جديد</span>
          </Button>
        </Link>
      }
    >
      {/* Stats Cards Overview */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <Card className="border border-border/60 shadow-xs rounded-2xl p-4 bg-background">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-medium text-muted-foreground">إجمالي المساجد</p>
              <p className="text-2xl font-extrabold text-foreground mt-1">{stats.total}</p>
            </div>
            <div className="w-10 h-10 rounded-xl bg-primary/10 text-primary flex items-center justify-center">
              <Building2 className="w-5 h-5" />
            </div>
          </div>
        </Card>

        <Card className="border border-border/60 shadow-xs rounded-2xl p-4 bg-background">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-medium text-muted-foreground">مساجد معتمدة</p>
              <p className="text-2xl font-extrabold text-emerald-600 mt-1">{stats.approved}</p>
            </div>
            <div className="w-10 h-10 rounded-xl bg-emerald-500/10 text-emerald-600 flex items-center justify-center">
              <CheckCircle2 className="w-5 h-5" />
            </div>
          </div>
        </Card>

        <Card className="border border-border/60 shadow-xs rounded-2xl p-4 bg-background">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-medium text-muted-foreground">قيد المراجعة</p>
              <p className="text-2xl font-extrabold text-amber-600 mt-1">{stats.pending}</p>
            </div>
            <div className="w-10 h-10 rounded-xl bg-amber-500/10 text-amber-600 flex items-center justify-center">
              <Clock className="w-5 h-5" />
            </div>
          </div>
        </Card>

        <Card className="border border-border/60 shadow-xs rounded-2xl p-4 bg-background">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-medium text-muted-foreground">مرفوضة</p>
              <p className="text-2xl font-extrabold text-red-600 mt-1">{stats.rejected}</p>
            </div>
            <div className="w-10 h-10 rounded-xl bg-red-500/10 text-red-600 flex items-center justify-center">
              <XCircle className="w-5 h-5" />
            </div>
          </div>
        </Card>
      </div>

      {/* Search Bar */}
      <div className="mb-6 flex flex-col sm:flex-row items-center justify-between gap-4">
        <div className="relative w-full sm:w-80">
          <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="ابحث باسم المسجد أو المدينة..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pr-9 rounded-2xl h-10 border-border/60 bg-background text-xs"
          />
        </div>
      </div>

      {/* Mosques Grid */}
      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-48 bg-muted/60 animate-pulse rounded-3xl" />
          ))}
        </div>
      ) : filteredMosques.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredMosques.map((mosque: any) => (
            <Card
              key={mosque.id}
              className="border border-border/60 shadow-xs hover:shadow-md transition-all rounded-3xl overflow-hidden bg-background flex flex-col group"
            >
              <CardHeader className="p-5 pb-3">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="w-12 h-12 rounded-2xl bg-primary/10 text-primary flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform">
                      <Building2 className="w-6 h-6" />
                    </div>
                    <div className="min-w-0">
                      <h3 className="font-extrabold text-base text-foreground truncate group-hover:text-primary transition-colors">
                        {mosque.name}
                      </h3>
                      <p className="text-xs text-muted-foreground flex items-center gap-1 mt-0.5 font-medium truncate">
                        <MapPin className="w-3.5 h-3.5 text-primary/70 shrink-0" />
                        <span>{mosque.city || "أبها"}</span>
                        {mosque.district && <span>• {mosque.district}</span>}
                      </p>
                    </div>
                  </div>

                  <Badge
                    variant="outline"
                    className={`rounded-xl text-[11px] font-bold px-2.5 py-0.5 shrink-0 ${
                      APPROVAL_STATUS_COLORS[mosque.approvalStatus] || "bg-slate-100"
                    }`}
                  >
                    {APPROVAL_STATUS_LABELS[mosque.approvalStatus] || mosque.approvalStatus}
                  </Badge>
                </div>
              </CardHeader>

              <CardContent className="p-5 pt-0 flex-1 flex flex-col justify-between">
                <div className="grid grid-cols-2 gap-3 py-3 border-y border-border/40 my-3 text-xs text-muted-foreground font-medium">
                  <div className="flex items-center gap-1.5 truncate">
                    <Ruler className="w-4 h-4 text-primary/60 shrink-0" />
                    <span>المساحة: {mosque.area ? `${mosque.area} م²` : "غير محدد"}</span>
                  </div>
                  <div className="flex items-center gap-1.5 truncate">
                    <Users className="w-4 h-4 text-primary/60 shrink-0" />
                    <span>السعة: {mosque.capacity ? `${mosque.capacity} مصلٍ` : "غير محدد"}</span>
                  </div>
                </div>

                {mosque.approvalStatus === "rejected" && mosque.rejectionReason && (
                  <div className="p-3 bg-red-500/10 border border-red-500/20 rounded-2xl mb-4 text-xs text-red-600">
                    <span className="font-bold">سبب الرفض: </span>
                    <span>{mosque.rejectionReason}</span>
                  </div>
                )}

                <div className="flex items-center gap-2 mt-auto pt-2">
                  <Link href={`/mosques/${mosque.id}`} className="flex-1">
                    <Button variant="outline" className="w-full rounded-2xl text-xs font-bold h-9 gap-1.5">
                      <Eye className="w-3.5 h-3.5" />
                      <span>التفاصيل</span>
                    </Button>
                  </Link>

                  {mosque.approvalStatus === "approved" && (
                    <Link href="/request-form-dynamic" className="flex-1">
                      <Button className="w-full rounded-2xl text-xs font-bold h-9 gap-1.5 gradient-primary text-white shadow-xs">
                        <Send className="w-3.5 h-3.5" />
                        <span>طلب خدمة</span>
                      </Button>
                    </Link>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : (
        <Card className="border border-border/60 shadow-xs rounded-3xl p-12 text-center bg-background">
          <div className="w-16 h-16 rounded-full bg-primary/10 text-primary flex items-center justify-center mx-auto mb-4">
            <Building2 className="w-8 h-8" />
          </div>
          <h3 className="font-bold text-lg text-foreground mb-1">لا توجد مساجد مسجلة</h3>
          <p className="text-xs text-muted-foreground mb-6 max-w-md mx-auto">
            {searchQuery
              ? "لا توجد نتائج مطابقة للبحث."
              : "قم بتسجيل مسجدك الإلكتروني لتمكن من طلب كافة الخدمات المتاحة."}
          </p>
          <Link href="/requester/mosques/new">
            <Button className="gradient-primary text-white font-bold rounded-2xl shadow-md gap-2 px-6">
              <Plus className="w-4 h-4" />
              <span>تسجيل مسجد جديد</span>
            </Button>
          </Link>
        </Card>
      )}
    </BeneficiaryLayout>
  );
}

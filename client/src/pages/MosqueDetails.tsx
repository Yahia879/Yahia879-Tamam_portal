import DashboardLayout from "@/components/DashboardLayout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { 
  ArrowRight, 
  Building2, 
  MapPin, 
  Users, 
  Phone,
  Mail,
  FileText,
  Edit,
  CheckCircle,
  Clock,
  ExternalLink,
  Copy,
  Plus,
} from "lucide-react";
import { Link, useParams, useLocation } from "wouter";
import { trpc } from "@/lib/trpc";
import { useAuth } from "@/_core/hooks/useAuth";
import { PROGRAM_LABELS, STAGE_LABELS } from "@shared/constants";
import { toast } from "sonner";
import { PermissionGuard } from "@/components/PermissionGuard";
import { mosqueHasImam } from "@shared/mosquePermissions";
import { getRequestLifecycleCategory } from "@shared/mosqueRequests";

const approvalLabels: Record<string, string> = {
  pending: "قيد المراجعة",
  approved: "معتمد",
  rejected: "مرفوض",
};

const stageVariant = (stage: string): "default" | "secondary" | "destructive" | "outline" => {
  if (stage === "closed") return "secondary";
  if (stage === "initial_review") return "outline";
  return "default";
};

export default function MosqueDetails() {
  const params = useParams<{ id: string }>();
  const [, setLocation] = useLocation();
  const { user } = useAuth();
  const mosqueId = parseInt(params.id || "0");

  const { data: mosque, isLoading } = trpc.mosques.getById.useQuery({ id: mosqueId });
  const hasImam = mosque ? mosqueHasImam(mosque) : false;
  const { data: requestsData } = trpc.requests.search.useQuery(
    { mosqueId, page: 1, limit: 50 },
    { enabled: !!mosqueId }
  );
  const mosqueRequests = requestsData?.requests || [];

  if (isLoading) {
    return (
      <DashboardLayout tabletNavigation>
        <div className="flex items-center justify-center h-64">
          <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin" />
        </div>
      </DashboardLayout>
    );
  }

  if (!mosque) {
    return (
      <DashboardLayout tabletNavigation>
        <div className="text-center py-12 px-4">
          <Building2 className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
          <p className="text-muted-foreground">المسجد غير موجود</p>
          <Link href="/mosques">
            <Button variant="outline" className="mt-4 max-lg:min-h-11 pointer-coarse:min-h-11">العودة للمساجد</Button>
          </Link>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout tabletNavigation>
      <div className="min-w-0 space-y-4 sm:space-y-6 max-w-full overflow-x-hidden">
        {/* العنوان */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 sm:gap-4">
          <div className="flex items-start sm:items-center gap-2.5 sm:gap-4 min-w-0 flex-1">
            <Link href={user?.role === "service_requester" ? "/my-mosques" : "/mosques"} className="shrink-0">
              <Button
                variant="ghost"
                size="icon"
                type="button"
                className="size-11 lg:size-9 pointer-coarse:size-11 shrink-0"
                aria-label="العودة للمساجد"
              >
                <ArrowRight className="w-5 h-5" />
              </Button>
            </Link>
            <div className="flex items-center gap-3 min-w-0 flex-1">
              <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
                <Building2 className="w-5 h-5 sm:w-6 sm:h-6 text-primary" />
              </div>
              <div className="min-w-0 flex-1">
                <h1 className="text-lg sm:text-xl md:text-2xl font-bold text-foreground break-words leading-snug">{mosque.name}</h1>
                <p className="text-xs sm:text-sm text-muted-foreground flex items-center gap-1.5 mt-0.5 min-w-0">
                  <MapPin className="w-3.5 h-3.5 sm:w-4 sm:h-4 shrink-0" />
                  <span className="truncate">{mosque.city} {mosque.district ? `- ${mosque.district}` : ""}</span>
                </p>
              </div>
            </div>
          </div>
          <div className="flex items-center justify-between sm:justify-end gap-2.5 flex-wrap shrink-0">
            <span className={`px-3 py-1 rounded-full text-xs sm:text-sm font-medium shrink-0 ${
              mosque.approvalStatus === "approved" ? "bg-green-100 text-green-800 dark:bg-green-950/50 dark:text-green-300" :
              mosque.approvalStatus === "rejected" ? "bg-red-100 text-red-800 dark:bg-red-950/50 dark:text-red-300" :
              "bg-yellow-100 text-yellow-800 dark:bg-yellow-950/50 dark:text-yellow-300"
            }`}>
              {approvalLabels[mosque.approvalStatus || 'pending']}
            </span>
            <PermissionGuard permission="mosques.edit">
              <Button
                variant="outline"
                onClick={() => setLocation(`/mosques/${mosqueId}/edit`)}
                className="h-10 max-lg:min-h-11 pointer-coarse:min-h-11 shrink-0"
              >
                <Edit className="w-4 h-4 ml-2 shrink-0" />
                تعديل
              </Button>
            </PermissionGuard>
          </div>
        </div>

        {/* بطاقات الملخص */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-2.5 sm:gap-4">
          <Card className="border-0 shadow-sm py-0">
            <CardContent className="p-3.5 sm:p-5">
              <div className="flex items-center justify-between gap-2">
                <div className="min-w-0">
                  <p className="text-xs sm:text-sm text-muted-foreground truncate">نوع المسجد</p>
                  <p className="text-base sm:text-xl font-bold text-foreground mt-1 truncate">مسجد</p>
                </div>
                <div className="w-9 h-9 sm:w-11 sm:h-11 shrink-0 rounded-lg bg-primary/10 flex items-center justify-center">
                  <Building2 className="w-4 h-4 sm:w-5 sm:h-5 text-primary" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="border-0 shadow-sm py-0">
            <CardContent className="p-3.5 sm:p-5">
              <div className="flex items-center justify-between gap-2">
                <div className="min-w-0">
                  <p className="text-xs sm:text-sm text-muted-foreground truncate">المحافظة</p>
                  <p className="text-base sm:text-xl font-bold text-foreground mt-1 truncate">{mosque.governorate || "-"}</p>
                </div>
                <div className="w-9 h-9 sm:w-11 sm:h-11 shrink-0 rounded-lg bg-blue-100 dark:bg-blue-950/40 flex items-center justify-center">
                  <MapPin className="w-4 h-4 sm:w-5 sm:h-5 text-blue-600 dark:text-blue-400" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="border-0 shadow-sm py-0">
            <CardContent className="p-3.5 sm:p-5">
              <div className="flex items-center justify-between gap-2">
                <div className="min-w-0">
                  <p className="text-xs sm:text-sm text-muted-foreground truncate">عمر المسجد</p>
                  <p className="text-base sm:text-xl font-bold text-foreground mt-1 truncate">{mosque.mosqueAge ? `${mosque.mosqueAge} سنة` : "-"}</p>
                </div>
                <div className="w-9 h-9 sm:w-11 sm:h-11 shrink-0 rounded-lg bg-green-100 dark:bg-green-950/40 flex items-center justify-center">
                  <Clock className="w-4 h-4 sm:w-5 sm:h-5 text-green-600 dark:text-green-400" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="border-0 shadow-sm py-0">
            <CardContent className="p-3.5 sm:p-5">
              <div className="flex items-center justify-between gap-2">
                <div className="min-w-0">
                  <p className="text-xs sm:text-sm text-muted-foreground truncate">السعة</p>
                  <p className="text-base sm:text-xl font-bold text-foreground mt-1 truncate">
                    {mosque.capacity ? `${mosque.capacity} مصلي` : "-"}
                  </p>
                </div>
                <div className="w-9 h-9 sm:w-11 sm:h-11 shrink-0 rounded-lg bg-yellow-100 dark:bg-yellow-950/40 flex items-center justify-center">
                  <Users className="w-4 h-4 sm:w-5 sm:h-5 text-yellow-600 dark:text-yellow-400" />
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 sm:gap-6">
          {/* المعلومات الرئيسية */}
          <div className="lg:col-span-2 space-y-4 sm:space-y-6 min-w-0">
            <Tabs defaultValue="info" className="space-y-4">
              <TabsList className="w-full sm:w-auto grid grid-cols-2 sm:inline-flex h-auto p-1">
                <TabsTrigger value="info" className="min-h-10 max-lg:min-h-11 pointer-coarse:min-h-11 text-xs sm:text-sm">المعلومات</TabsTrigger>
                <TabsTrigger value="requests" className="min-h-10 max-lg:min-h-11 pointer-coarse:min-h-11 text-xs sm:text-sm">
                  الطلبات
                  {mosqueRequests.length > 0 && (
                    <span className="mr-2 bg-primary text-primary-foreground text-xs rounded-full px-2 py-0.5">
                      {mosqueRequests.length}
                    </span>
                  )}
                </TabsTrigger>
              </TabsList>

              <TabsContent value="info">
                <Card className="border-0 shadow-sm max-lg:py-4">
                  <CardHeader className="px-4 sm:px-6">
                    <CardTitle className="text-base sm:text-lg">معلومات المسجد</CardTitle>
                    <CardDescription className="text-xs sm:text-sm">البيانات التفصيلية للمسجد</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-3 sm:space-y-4 px-4 sm:px-6">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
                      <div className="p-3 bg-muted/50 rounded-lg min-w-0">
                        <p className="text-xs sm:text-sm text-muted-foreground">المدينة</p>
                        <p className="font-medium text-sm sm:text-base break-words mt-0.5">{mosque.city}</p>
                      </div>
                      <div className="p-3 bg-muted/50 rounded-lg min-w-0">
                        <p className="text-xs sm:text-sm text-muted-foreground">الحي</p>
                        <p className="font-medium text-sm sm:text-base break-words mt-0.5">{mosque.district || "-"}</p>
                      </div>
                      <div className="p-3 bg-muted/50 rounded-lg min-w-0">
                        <p className="text-xs sm:text-sm text-muted-foreground">المساحة (م²)</p>
                        <p className="font-medium text-sm sm:text-base break-words mt-0.5 tabular-nums">{mosque.area ? `${mosque.area} م²` : "-"}</p>
                      </div>
                      <div className="p-3 bg-muted/50 rounded-lg min-w-0">
                        <p className="text-xs sm:text-sm text-muted-foreground">تاريخ التسجيل</p>
                        <p className="font-medium text-sm sm:text-base mt-0.5">{new Date(mosque.createdAt).toLocaleDateString("ar-SA")}</p>
                      </div>
                    </div>
                    
                    {mosque.address && (
                      <div className="p-3 bg-muted/50 rounded-lg min-w-0">
                        <p className="text-xs sm:text-sm text-muted-foreground">العنوان</p>
                        <p className="font-medium text-sm sm:text-base break-words mt-0.5">{mosque.address}</p>
                      </div>
                    )}

                    {(() => {
                      const dims = (mosque as any).prayerHallDimensions as {
                        men?: { lengthCm: number; widthCm: number } | null;
                        women?: { lengthCm: number; widthCm: number } | null;
                      } | null | undefined;
                      const men = dims?.men;
                      const women = dims?.women;
                      return (
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
                          <div className="p-3 bg-muted/50 rounded-lg min-w-0 space-y-1">
                            <p className="text-xs sm:text-sm text-muted-foreground">قياسات مصلى الرجال (الطول × العرض)</p>
                            {men ? (
                              <>
                                <p className="font-medium text-sm sm:text-base tabular-nums">
                                  {men.lengthCm / 100} م × {men.widthCm / 100} م
                                  {" · "}
                                  {((men.lengthCm * men.widthCm) / 10000).toLocaleString("ar-SA", { maximumFractionDigits: 2 })} م²
                                </p>
                                <p className="text-xs text-muted-foreground tabular-nums">
                                  الطول بالمتر: {men.lengthCm / 100} م · العرض بالمتر: {men.widthCm / 100} م
                                </p>
                              </>
                            ) : (
                              <p className="text-xs text-muted-foreground tabular-nums">
                                الطول بالمتر: غير محدد · العرض بالمتر: غير محدد
                                {mosque.area ? ` · المساحة: ${Number(mosque.area).toLocaleString("ar-SA", { maximumFractionDigits: 2 })} م²` : ""}
                              </p>
                            )}
                          </div>
                          {(women || mosque.hasPrayerHall) && (
                            <div className="p-3 bg-muted/50 rounded-lg min-w-0 space-y-1">
                              <p className="text-xs sm:text-sm text-muted-foreground">قياسات مصلى النساء (الطول × العرض)</p>
                              {women ? (
                                <>
                                  <p className="font-medium text-sm sm:text-base tabular-nums">
                                    {women.lengthCm / 100} م × {women.widthCm / 100} م
                                    {" · "}
                                    {((women.lengthCm * women.widthCm) / 10000).toLocaleString("ar-SA", { maximumFractionDigits: 2 })} م²
                                  </p>
                                  <p className="text-xs text-muted-foreground tabular-nums">
                                    الطول بالمتر: {women.lengthCm / 100} م · العرض بالمتر: {women.widthCm / 100} م
                                  </p>
                                </>
                              ) : (
                                <p className="text-xs text-muted-foreground">
                                  الطول بالمتر: غير محدد · العرض بالمتر: غير محدد
                                </p>
                              )}
                            </div>
                          )}
                        </div>
                      );
                    })()}
                  </CardContent>
                </Card>
              </TabsContent>

              <TabsContent value="requests">
                <Card className="border-0 shadow-sm py-0">
                  <CardContent className="p-3 sm:p-4">
                    {mosqueRequests.length === 0 ? (
                      <div className="p-8 text-center">
                        <FileText className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                        <p className="text-muted-foreground text-sm">لا توجد طلبات لهذا المسجد</p>
                      </div>
                    ) : (
                      <div className="space-y-3">
                        {mosqueRequests.length > 1 && (
                          <div className="p-3 rounded-xl bg-indigo-50/80 dark:bg-indigo-950/30 border border-indigo-200 dark:border-indigo-800 text-xs font-medium text-indigo-900 dark:text-indigo-200 leading-relaxed">
                            ملاحظة: يرتبط بهذا المسجد ({mosqueRequests.length}) طلبات منفصلة؛ كل طلب يُعالج بمساره الخاص.
                          </div>
                        )}
                        {mosqueRequests.map((req: any) => {
                          const cat = getRequestLifecycleCategory(req);
                          return (
                            <div
                              key={req.id}
                              onClick={() => setLocation(`/requests/${req.id}`)}
                              className="flex flex-col sm:flex-row sm:items-center justify-between p-3.5 sm:p-4 border rounded-xl hover:border-primary/40 hover:bg-muted/30 transition-colors cursor-pointer gap-3"
                            >
                              <div className="space-y-1 min-w-0">
                                <div className="flex items-center gap-2 flex-wrap">
                                  <p className="font-mono text-sm font-bold text-foreground">{req.requestNumber}</p>
                                  <Badge className={`text-[10px] ${
                                    cat === "active"
                                      ? "bg-emerald-600 text-white"
                                      : cat === "rejected"
                                      ? "bg-rose-600 text-white"
                                      : "bg-slate-600 text-white"
                                  }`}>
                                    {cat === "active" ? "نشط" : cat === "rejected" ? "مرفوض / معتذر" : "مغلق / مكتمل"}
                                  </Badge>
                                </div>
                                <p className="font-medium text-sm break-words">{PROGRAM_LABELS[req.programType as keyof typeof PROGRAM_LABELS] || req.programType}</p>
                                <p className="text-xs text-muted-foreground">{new Date(req.createdAt).toLocaleDateString('ar-SA')}</p>
                              </div>
                              <div className="flex items-center justify-between sm:justify-end gap-2 shrink-0 pt-2 sm:pt-0 border-t sm:border-t-0 border-border/50">
                                <Badge variant="outline" className="text-xs">
                                  {STAGE_LABELS[req.currentStage as keyof typeof STAGE_LABELS] || req.currentStage}
                                </Badge>
                                <Button variant="ghost" size="sm" className="h-9 max-lg:min-h-10 pointer-coarse:min-h-10 gap-1 text-xs">
                                  <ExternalLink className="w-3.5 h-3.5" />
                                  عرض
                                </Button>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </CardContent>
                </Card>
              </TabsContent>
            </Tabs>
          </div>

          {/* الشريط الجانبي */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-1 gap-4 sm:gap-6 content-start min-w-0">
            {/* معلومات الإمام */}
            <Card className="border-0 shadow-sm max-lg:py-4">
              <CardHeader className="px-4 sm:px-6">
                <CardTitle className="flex items-center gap-2 text-base sm:text-lg">
                  <Users className="w-5 h-5 shrink-0" />
                  الإمام
                </CardTitle>
              </CardHeader>
              <CardContent className="px-4 sm:px-6">
                {mosque.imamName?.trim() ? (
                  <div className="space-y-3 text-sm">
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <span className="text-xs sm:text-sm text-muted-foreground">الاسم:</span>
                      <span className="font-medium break-words">{mosque.imamName}</span>
                    </div>
                    {mosque.imamPhone && (
                      <div className="flex items-center gap-2">
                        <Phone className="w-4 h-4 text-muted-foreground shrink-0" />
                        <span dir="ltr">{mosque.imamPhone}</span>
                      </div>
                    )}
                    {mosque.imamEmail && (
                      <div className="flex items-center gap-2 min-w-0">
                        <Mail className="w-4 h-4 text-muted-foreground shrink-0" />
                        <span className="break-all">{mosque.imamEmail}</span>
                      </div>
                    )}
                  </div>
                ) : (mosque.registeredByUser?.requesterType === "imam" || mosque.registeredByUser?.requesterType === "إمام") ? (
                  <div className="space-y-3 text-sm">
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <span className="text-xs sm:text-sm text-muted-foreground">الاسم:</span>
                      <span className="font-medium break-words">{mosque.registeredByUser.name}</span>
                    </div>
                    {mosque.registeredByUser.phone && (
                      <div className="flex items-center gap-2">
                        <Phone className="w-4 h-4 text-muted-foreground shrink-0" />
                        <span dir="ltr">{mosque.registeredByUser.phone}</span>
                      </div>
                    )}
                    {mosque.registeredByUser.email && (
                      <div className="flex items-center gap-2 min-w-0">
                        <Mail className="w-4 h-4 text-muted-foreground shrink-0" />
                        <span className="break-all">{mosque.registeredByUser.email}</span>
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="space-y-4">
                    <div className="p-4 bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 rounded-lg text-center">
                      <p className="text-sm text-amber-900 dark:text-amber-200 font-medium mb-2">لم يتم تسجيل بيانات الإمام</p>
                      <p className="text-xs text-amber-700 dark:text-amber-300 mb-4">أضف معلومات الإمام لإكمال بيانات المسجد</p>
                      <PermissionGuard permission="mosques.add_imam">
                        <Button
                          className="w-full bg-amber-600 hover:bg-amber-700 text-white max-lg:min-h-11 pointer-coarse:min-h-11"
                          onClick={() => setLocation(`/mosques/${mosqueId}/edit-imam`)}
                        >
                          <Plus className="w-4 h-4 ml-2" />
                          تسجيل بيانات الإمام
                        </Button>
                      </PermissionGuard>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* معلومات المؤذن (إذا كان مسجل المسجد مؤذناً) */}
            {(mosque.registeredByUser?.requesterType === "muezzin" || mosque.registeredByUser?.requesterType === "مؤذن") && (
              <Card className="border-0 shadow-sm max-lg:py-4">
                <CardHeader className="px-4 sm:px-6">
                  <CardTitle className="flex items-center gap-2 text-base sm:text-lg">
                    <Users className="w-5 h-5 text-teal-600 shrink-0" />
                    المؤذن
                  </CardTitle>
                </CardHeader>
                <CardContent className="px-4 sm:px-6">
                  <div className="space-y-3 text-sm">
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <span className="text-xs sm:text-sm text-muted-foreground">الاسم:</span>
                      <span className="font-medium break-words">{mosque.registeredByUser.name}</span>
                    </div>
                    {mosque.registeredByUser.phone && (
                      <div className="flex items-center gap-2">
                        <Phone className="w-4 h-4 text-muted-foreground shrink-0" />
                        <span dir="ltr">{mosque.registeredByUser.phone}</span>
                      </div>
                    )}
                    {mosque.registeredByUser.email && (
                      <div className="flex items-center gap-2 min-w-0">
                        <Mail className="w-4 h-4 text-muted-foreground shrink-0" />
                        <span className="break-all">{mosque.registeredByUser.email}</span>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            )}

            {/* معلومات إضافية للمسجد */}
            {(!hasImam || !mosque.address) && (
              <Card className="border-0 shadow-sm bg-blue-50 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-800 max-lg:py-4">
                <CardHeader className="px-4 sm:px-6">
                  <CardTitle className="text-blue-900 dark:text-blue-200 flex items-center gap-2 text-base sm:text-lg">
                    <FileText className="w-5 h-5 shrink-0" />
                    معلومات ناقصة
                  </CardTitle>
                </CardHeader>
                <CardContent className="px-4 sm:px-6">
                  <div className="space-y-2 text-sm text-blue-800 dark:text-blue-300">
                    {!hasImam && (
                      <div className="flex items-start gap-2">
                        <span className="text-lg leading-none">•</span>
                        <span>بيانات الإمام</span>
                      </div>
                    )}
                    {!mosque.address && (
                      <div className="flex items-start gap-2">
                        <span className="text-lg leading-none">•</span>
                        <span>العنوان التفصيلي</span>
                      </div>
                    )}
                  </div>
                  <PermissionGuard permission="mosques.edit">
                    <Button
                      variant="outline"
                      className="w-full mt-4 max-lg:min-h-11 pointer-coarse:min-h-11 border-blue-300 dark:border-blue-700 text-blue-700 dark:text-blue-200 hover:bg-blue-100 dark:hover:bg-blue-900/40"
                      onClick={() => setLocation(`/mosques/${mosqueId}/edit`)}
                    >
                      <Edit className="w-4 h-4 ml-2" />
                      إكمال البيانات
                    </Button>
                  </PermissionGuard>
                </CardContent>
              </Card>
            )}

            {/* إحصائيات الطلبات */}
            {mosqueRequests.length > 0 && (
              <Card className="border-0 shadow-sm max-lg:py-4">
                <CardHeader className="px-4 sm:px-6">
                  <CardTitle className="flex items-center gap-2 text-base sm:text-lg">
                    <FileText className="w-5 h-5 shrink-0" />
                    إحصائيات الطلبات
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-2.5 px-4 sm:px-6">
                  <div className="flex justify-between items-center">
                    <span className="text-xs sm:text-sm text-muted-foreground">إجمالي الطلبات</span>
                    <span className="font-bold text-sm sm:text-base">{mosqueRequests.length}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-xs sm:text-sm text-muted-foreground">المكتملة</span>
                    <span className="font-bold text-sm sm:text-base text-green-600">
                      {mosqueRequests.filter((r: any) => r.currentStage === 'closed').length}
                    </span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-xs sm:text-sm text-muted-foreground">قيد التنفيذ</span>
                    <span className="font-bold text-sm sm:text-base text-blue-600">
                      {mosqueRequests.filter((r: any) => r.currentStage !== 'closed').length}
                    </span>
                  </div>
                </CardContent>
              </Card>
            )}
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}

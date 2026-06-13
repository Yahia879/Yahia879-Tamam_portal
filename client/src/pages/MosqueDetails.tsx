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
  const { data: requestsData } = trpc.requests.search.useQuery(
    { mosqueId, page: 1, limit: 50 },
    { enabled: !!mosqueId }
  );
  const mosqueRequests = requestsData?.requests || [];

  if (isLoading) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center h-64">
          <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin" />
        </div>
      </DashboardLayout>
    );
  }

  if (!mosque) {
    return (
      <DashboardLayout>
        <div className="text-center py-12">
          <Building2 className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
          <p className="text-muted-foreground">المسجد غير موجود</p>
          <Link href="/mosques">
            <Button variant="outline" className="mt-4">العودة للمساجد</Button>
          </Link>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* العنوان */}
        <div className="flex items-center gap-4">
          <Link href={user?.role === "service_requester" ? "/my-mosques" : "/mosques"}>
            <Button variant="ghost" size="icon">
              <ArrowRight className="w-5 h-5" />
            </Button>
          </Link>
          <div className="flex-1">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-lg bg-primary/10 flex items-center justify-center">
                <Building2 className="w-6 h-6 text-primary" />
              </div>
              <div>
                <h1 className="text-2xl font-bold text-foreground">{mosque.name}</h1>
                <p className="text-muted-foreground flex items-center gap-2">
                  <MapPin className="w-4 h-4" />
                  {mosque.city} {mosque.district ? `- ${mosque.district}` : ""}
                </p>
              </div>
            </div>
          </div>
          <span className={`px-3 py-1 rounded-full text-sm font-medium ${
            mosque.approvalStatus === "approved" ? "bg-green-100 text-green-800" :
            mosque.approvalStatus === "rejected" ? "bg-red-100 text-red-800" :
            "bg-yellow-100 text-yellow-800"
          }`}>
            {approvalLabels[mosque.approvalStatus || 'pending']}
          </span>
          <PermissionGuard permission="mosques.edit">
            <Button variant="outline" onClick={() => toast.info("قريباً")}>
              <Edit className="w-4 h-4 ml-2" />
              تعديل
            </Button>
          </PermissionGuard>
        </div>

        {/* بطاقات الملخص */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <Card className="border-0 shadow-sm">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">نوع المسجد</p>
                  <p className="text-xl font-bold text-foreground mt-1">مسجد</p>
                </div>
                <div className="w-12 h-12 rounded-lg bg-primary/10 flex items-center justify-center">
                  <Building2 className="w-6 h-6 text-primary" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="border-0 shadow-sm">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">المحافظة</p>
                  <p className="text-xl font-bold text-foreground mt-1">{mosque.governorate || "-"}</p>
                </div>
                <div className="w-12 h-12 rounded-lg bg-blue-100 flex items-center justify-center">
                  <MapPin className="w-6 h-6 text-blue-600" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="border-0 shadow-sm">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">عمر المسجد</p>
                  <p className="text-xl font-bold text-foreground mt-1">{mosque.mosqueAge ? `${mosque.mosqueAge} سنة` : "-"}</p>
                </div>
                <div className="w-12 h-12 rounded-lg bg-green-100 flex items-center justify-center">
                  <Clock className="w-6 h-6 text-green-600" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="border-0 shadow-sm">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">السعة</p>
                  <p className="text-xl font-bold text-foreground mt-1">
                    {mosque.capacity ? `${mosque.capacity} مصلي` : "-"}
                  </p>
                </div>
                <div className="w-12 h-12 rounded-lg bg-yellow-100 flex items-center justify-center">
                  <Users className="w-6 h-6 text-yellow-600" />
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* المعلومات الرئيسية */}
          <div className="lg:col-span-2 space-y-6">
            <Tabs defaultValue="info" className="space-y-4">
              <TabsList>
                <TabsTrigger value="info">المعلومات</TabsTrigger>
                <TabsTrigger value="requests">
                  الطلبات
                  {mosqueRequests.length > 0 && (
                    <span className="mr-2 bg-primary text-primary-foreground text-xs rounded-full px-2 py-0.5">
                      {mosqueRequests.length}
                    </span>
                  )}
                </TabsTrigger>
              </TabsList>

              <TabsContent value="info">
                <Card className="border-0 shadow-sm">
                  <CardHeader>
                    <CardTitle>معلومات المسجد</CardTitle>
                    <CardDescription>البيانات التفصيلية للمسجد</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="p-3 bg-muted/50 rounded-lg">
                        <p className="text-sm text-muted-foreground">المدينة</p>
                        <p className="font-medium">{mosque.city}</p>
                      </div>
                      <div className="p-3 bg-muted/50 rounded-lg">
                        <p className="text-sm text-muted-foreground">الحي</p>
                        <p className="font-medium">{mosque.district || "-"}</p>
                      </div>
                      <div className="p-3 bg-muted/50 rounded-lg">
                        <p className="text-sm text-muted-foreground">المنطقة</p>
                        <p className="font-medium">{mosque.area || "-"}</p>
                      </div>
                      <div className="p-3 bg-muted/50 rounded-lg">
                        <p className="text-sm text-muted-foreground">تاريخ التسجيل</p>
                        <p className="font-medium">{new Date(mosque.createdAt).toLocaleDateString("ar-SA")}</p>
                      </div>
                    </div>
                    
                    {mosque.address && (
                      <div className="p-3 bg-muted/50 rounded-lg">
                        <p className="text-sm text-muted-foreground">العنوان</p>
                        <p className="font-medium">{mosque.address}</p>
                      </div>
                    )}


                  </CardContent>
                </Card>
              </TabsContent>

              <TabsContent value="requests">
                <Card className="border-0 shadow-sm">
                  <CardContent className="p-4">
                    {mosqueRequests.length === 0 ? (
                      <div className="p-8 text-center">
                        <FileText className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                        <p className="text-muted-foreground">لا توجد طلبات لهذا المسجد</p>
                      </div>
                    ) : (
                      <div className="space-y-3">
                        {mosqueRequests.map((req: any) => (
                          <div
                            key={req.id}
                            className="flex items-center justify-between p-4 border rounded-lg hover:bg-muted/50 cursor-pointer transition-colors"
                            onClick={() => setLocation(`/requests/${req.id}`)}
                          >
                            <div className="space-y-1">
                              <p className="font-mono text-sm font-semibold text-muted-foreground">{req.requestNumber}</p>
                              <p className="font-medium">{PROGRAM_LABELS[req.programType as keyof typeof PROGRAM_LABELS] || req.programType}</p>
                              <p className="text-xs text-muted-foreground">{new Date(req.createdAt).toLocaleDateString('ar-SA')}</p>
                            </div>
                            <div className="text-left">
                              <Badge variant="outline">
                                {STAGE_LABELS[req.currentStage as keyof typeof STAGE_LABELS] || req.currentStage}
                              </Badge>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </CardContent>
                </Card>
              </TabsContent>


            </Tabs>
          </div>

          {/* الشريط الجانبي */}
          <div className="space-y-6">
            {/* معلومات الإمام */}
            <Card className="border-0 shadow-sm">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Users className="w-5 h-5" />
                  الإمام
                </CardTitle>
              </CardHeader>
              <CardContent>
                {mosque.imamName ? (
                  <div className="space-y-3">
                    <div>
                      <p className="text-sm text-muted-foreground">الاسم</p>
                      <p className="font-medium">{mosque.imamName}</p>
                    </div>
                    {mosque.imamPhone && (
                      <div className="flex items-center gap-2">
                        <Phone className="w-4 h-4 text-muted-foreground" />
                        <span>{mosque.imamPhone}</span>
                      </div>
                    )}
                    {mosque.imamEmail && (
                      <div className="flex items-center gap-2">
                        <Mail className="w-4 h-4 text-muted-foreground" />
                        <span>{mosque.imamEmail}</span>
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="space-y-4">
                    <div className="p-4 bg-amber-50 border border-amber-200 rounded-lg text-center">
                      <p className="text-sm text-amber-900 font-medium mb-3">لم يتم تسجيل بيانات الإمام</p>
                      <p className="text-xs text-amber-700 mb-4">أضف معلومات الإمام لإكمال بيانات المسجد</p>
                      <Button 
                        className="w-full bg-amber-600 hover:bg-amber-700 text-white"
                        onClick={() => setLocation(`/mosques/${mosqueId}/edit-imam`)}
                      >
                        <Plus className="w-4 h-4 ml-2" />
                        تسجيل بيانات الإمام
                      </Button>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* معلومات إضافية للمسجد */}
            {(!mosque.imamName || !mosque.address) && (
              <Card className="border-0 shadow-sm bg-blue-50 border border-blue-200">
                <CardHeader>
                  <CardTitle className="text-blue-900 flex items-center gap-2">
                    <FileText className="w-5 h-5" />
                    معلومات ناقصة
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2 text-sm text-blue-800">
                    {!mosque.imamName && (
                      <div className="flex items-start gap-2">
                        <span className="text-lg">•</span>
                        <span>بيانات الإمام</span>
                      </div>
                    )}
                    {!mosque.address && (
                      <div className="flex items-start gap-2">
                        <span className="text-lg">•</span>
                        <span>العنوان التفصيلي</span>
                      </div>
                    )}
                  </div>
                  <Button 
                    variant="outline" 
                    className="w-full mt-4 border-blue-300 text-blue-700 hover:bg-blue-100"
                    onClick={() => setLocation(`/mosques/${mosqueId}/edit`)}
                  >
                    <Edit className="w-4 h-4 ml-2" />
                    إكمال البيانات
                  </Button>
                </CardContent>
              </Card>
            )}

            {/* إحصائيات الطلبات */}
            {mosqueRequests.length > 0 && (
              <Card className="border-0 shadow-sm">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <FileText className="w-5 h-5" />
                    إحصائيات الطلبات
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-2">
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-muted-foreground">إجمالي الطلبات</span>
                    <span className="font-bold">{mosqueRequests.length}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-muted-foreground">المكتملة</span>
                    <span className="font-bold text-green-600">
                      {mosqueRequests.filter((r: any) => r.currentStage === 'closed').length}
                    </span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-muted-foreground">قيد التنفيذ</span>
                    <span className="font-bold text-blue-600">
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

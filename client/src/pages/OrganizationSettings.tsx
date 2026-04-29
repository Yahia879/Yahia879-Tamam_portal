import { useState, useEffect } from "react";
import DashboardLayout from "@/components/DashboardLayout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "sonner";
import { trpc } from "@/lib/trpc";
import { useAuth } from "@/_core/hooks/useAuth";
import {
  Building2,
  User,
  Phone,
  Mail,
  MapPin,
  CreditCard,
  Save,
  Loader2,
  FileText,
  Settings,
  Plus,
  Trash2,
  Star,
  Edit2,
  Users,
} from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";

// مكون إدارة المفوضين
function SignatoriesSection() {
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [editingSignatory, setEditingSignatory] = useState<any>(null);
  const [formData, setFormData] = useState({
    name: "",
    title: "",
    nationalId: "",
    phone: "",
    email: "",
    isDefault: false,
  });

  // جلب المفوضين
  const { data: signatories, isLoading, refetch } = trpc.organization.getSignatories.useQuery();

  // إضافة مفوض
  const addMutation = trpc.organization.addSignatory.useMutation({
    onSuccess: () => {
      toast.success("تم إضافة المفوض بنجاح");
      setShowAddDialog(false);
      resetForm();
      refetch();
    },
    onError: (error: any) => {
      toast.error(error.message || "حدث خطأ أثناء إضافة المفوض");
    },
  });

  // تحديث مفوض
  const updateMutation = trpc.organization.updateSignatory.useMutation({
    onSuccess: () => {
      toast.success("تم تحديث بيانات المفوض بنجاح");
      setEditingSignatory(null);
      resetForm();
      refetch();
    },
    onError: (error: any) => {
      toast.error(error.message || "حدث خطأ أثناء تحديث المفوض");
    },
  });

  // حذف مفوض
  const deleteMutation = trpc.organization.deleteSignatory.useMutation({
    onSuccess: () => {
      toast.success("تم حذف المفوض بنجاح");
      refetch();
    },
    onError: (error: any) => {
      toast.error(error.message || "حدث خطأ أثناء حذف المفوض");
    },
  });

  // تعيين افتراضي
  const setDefaultMutation = trpc.organization.setDefaultSignatory.useMutation({
    onSuccess: () => {
      toast.success("تم تعيين المفوض الافتراضي بنجاح");
      refetch();
    },
    onError: (error: any) => {
      toast.error(error.message || "حدث خطأ");
    },
  });

  const resetForm = () => {
    setFormData({
      name: "",
      title: "",
      nationalId: "",
      phone: "",
      email: "",
      isDefault: false,
    });
  };

  const openEditDialog = (signatory: any) => {
    setEditingSignatory(signatory);
    setFormData({
      name: signatory.name,
      title: signatory.title,
      nationalId: signatory.nationalId || "",
      phone: signatory.phone || "",
      email: signatory.email || "",
      isDefault: signatory.isDefault || false,
    });
  };

  const handleSubmit = () => {
    if (!formData.name || !formData.title) {
      toast.error("يرجى إدخال اسم المفوض والمنصب");
      return;
    }

    if (editingSignatory) {
      updateMutation.mutate({
        id: editingSignatory.id,
        ...formData,
      });
    } else {
      addMutation.mutate(formData);
    }
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Users className="h-5 w-5" />
              مفوضو التوقيع
            </CardTitle>
            <CardDescription>
              إدارة الأشخاص المفوضين بالتوقيع على العقود نيابة عن الجمعية
            </CardDescription>
          </div>
          <Button onClick={() => setShowAddDialog(true)}>
            <Plus className="h-4 w-4 ml-2" />
            إضافة مفوض
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-6 w-6 animate-spin" />
          </div>
        ) : signatories && signatories.length > 0 ? (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>الاسم</TableHead>
                <TableHead>المنصب</TableHead>
                <TableHead>رقم الهوية</TableHead>
                <TableHead>الجوال</TableHead>
                <TableHead>الحالة</TableHead>
                <TableHead>الإجراءات</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {signatories.map((signatory: any) => (
                <TableRow key={signatory.id}>
                  <TableCell className="font-medium">{signatory.name}</TableCell>
                  <TableCell>{signatory.title}</TableCell>
                  <TableCell dir="ltr">{signatory.nationalId || "-"}</TableCell>
                  <TableCell dir="ltr">{signatory.phone || "-"}</TableCell>
                  <TableCell>
                    {signatory.isDefault ? (
                      <Badge className="bg-green-100 text-green-800">
                        <Star className="h-3 w-3 ml-1" />
                        افتراضي
                      </Badge>
                    ) : (
                      <Badge variant="outline">نشط</Badge>
                    )}
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => openEditDialog(signatory)}
                      >
                        <Edit2 className="h-4 w-4" />
                      </Button>
                      {!signatory.isDefault && (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => setDefaultMutation.mutate({ id: signatory.id })}
                          title="تعيين كافتراضي"
                        >
                          <Star className="h-4 w-4" />
                        </Button>
                      )}
                      <Button
                        variant="ghost"
                        size="sm"
                        className="text-red-600"
                        onClick={() => deleteMutation.mutate({ id: signatory.id })}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        ) : (
          <div className="text-center py-8 text-muted-foreground">
            <Users className="h-12 w-12 mx-auto mb-4 opacity-50" />
            <p>لا يوجد مفوضون مسجلون</p>
            <p className="text-sm">اضغط على "إضافة مفوض" لإضافة مفوض جديد</p>
          </div>
        )}

        <div className="mt-4 bg-blue-50 border border-blue-200 rounded-lg p-4">
          <p className="text-sm text-blue-800">
            <strong>ملاحظة:</strong> المفوض الافتراضي سيظهر تلقائياً في العقود الجديدة. يمكنك اختيار مفوض مختلف عند إنشاء كل عقد.
          </p>
        </div>
      </CardContent>

      {/* نافذة إضافة/تعديل مفوض */}
      <Dialog open={showAddDialog || !!editingSignatory} onOpenChange={(open) => {
        if (!open) {
          setShowAddDialog(false);
          setEditingSignatory(null);
          resetForm();
        }
      }}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>
              {editingSignatory ? "تعديل بيانات المفوض" : "إضافة مفوض جديد"}
            </DialogTitle>
            <DialogDescription>
              أدخل بيانات الشخص المفوض بالتوقيع على العقود
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>اسم المفوض *</Label>
              <Input
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="الاسم الكامل"
              />
            </div>
            <div className="space-y-2">
              <Label>المنصب *</Label>
              <Input
                value={formData.title}
                onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                placeholder="مثال: رئيس مجلس الإدارة، المدير التنفيذي"
              />
            </div>
            <div className="space-y-2">
              <Label>رقم الهوية</Label>
              <Input
                value={formData.nationalId}
                onChange={(e) => setFormData({ ...formData, nationalId: e.target.value })}
                placeholder="رقم الهوية الوطنية"
                dir="ltr"
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>رقم الجوال</Label>
                <Input
                  value={formData.phone}
                  onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                  placeholder="05XXXXXXXX"
                  dir="ltr"
                />
              </div>
              <div className="space-y-2">
                <Label>البريد الإلكتروني</Label>
                <Input
                  type="email"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  placeholder="email@example.com"
                  dir="ltr"
                />
              </div>
            </div>
            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                id="isDefault"
                checked={formData.isDefault}
                onChange={(e) => setFormData({ ...formData, isDefault: e.target.checked })}
                className="h-4 w-4"
              />
              <Label htmlFor="isDefault">تعيين كمفوض افتراضي</Label>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => {
              setShowAddDialog(false);
              setEditingSignatory(null);
              resetForm();
            }}>
              إلغاء
            </Button>
            <Button
              onClick={handleSubmit}
              disabled={addMutation.isPending || updateMutation.isPending}
            >
              {(addMutation.isPending || updateMutation.isPending) && (
                <Loader2 className="h-4 w-4 ml-2 animate-spin" />
              )}
              {editingSignatory ? "حفظ التعديلات" : "إضافة"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Card>
  );
}

export default function OrganizationSettings() {
  const { user } = useAuth();
  
  // بيانات الجمعية
  const [orgSettings, setOrgSettings] = useState({
    // معلومات الجمعية الأساسية
    name: "جمعية تمام للعناية بالمساجد",
    licenseNumber: "",
    address: "",
    city: "",
    phone: "",
    email: "",
    website: "",
    
    // جهات الإشراف
    administrativeSupervisor: "",
    technicalSupervisor: "",
    
    // أسماء المسؤولين
    boardChairmanName: "",
    executiveDirectorName: "",
    accountantName: "",
    
    // معلومات مفوض التوقيع
    authorizedSignatory: "",
    signatoryTitle: "",
    signatoryPhone: "",
    signatoryEmail: "",
    
    // معلومات البنك
    bankName: "",
    bankAccountName: "",
    iban: "",
    
    // إعدادات العقود
    contractPrefix: "CON",
    contractFooterText: "",
    contractTermsAndConditions: "",
  });

  // جلب إعدادات الجمعية
  const { data: settings, isLoading, refetch } = trpc.organization.getSettings.useQuery();

  // تحديث الإعدادات
  const updateMutation = trpc.organization.updateSettings.useMutation({
    onSuccess: () => {
      toast.success("تم حفظ الإعدادات بنجاح");
      refetch();
    },
    onError: (error: any) => {
      toast.error(error.message || "حدث خطأ أثناء حفظ الإعدادات");
    },
  });

  // تحميل الإعدادات عند الجلب
  useEffect(() => {
    if (settings) {
      setOrgSettings({
        name: settings.organizationName || "جمعية تمام للعناية بالمساجد",
        licenseNumber: settings.licenseNumber || "",
        address: settings.address || "",
        city: settings.city || "",
        phone: settings.phone || "",
        email: settings.email || "",
        website: settings.website || "",
        administrativeSupervisor: settings.administrativeSupervisor || "",
        technicalSupervisor: settings.technicalSupervisor || "",
        boardChairmanName: settings.boardChairmanName || "",
        executiveDirectorName: settings.executiveDirectorName || "",
        accountantName: settings.accountantName || "",
        authorizedSignatory: settings.authorizedSignatory || "",
        signatoryTitle: settings.signatoryTitle || "",
        signatoryPhone: settings.signatoryPhone || "",
        signatoryEmail: settings.signatoryEmail || "",
        bankName: settings.bankName || "",
        bankAccountName: settings.bankAccountName || "",
        iban: settings.iban || "",
        contractPrefix: settings.contractPrefix || "CON",
        contractFooterText: settings.contractFooterText || "",
        contractTermsAndConditions: settings.contractTermsAndConditions || "",
      });
    }
  }, [settings]);

  // حفظ الإعدادات
  const handleSave = () => {
    updateMutation.mutate({
      organizationName: orgSettings.name,
      licenseNumber: orgSettings.licenseNumber || undefined,
      address: orgSettings.address || undefined,
      city: orgSettings.city || undefined,
      phone: orgSettings.phone || undefined,
      email: orgSettings.email || undefined,
      website: orgSettings.website || undefined,
      administrativeSupervisor: orgSettings.administrativeSupervisor || undefined,
      technicalSupervisor: orgSettings.technicalSupervisor || undefined,
      boardChairmanName: orgSettings.boardChairmanName || undefined,
      executiveDirectorName: orgSettings.executiveDirectorName || undefined,
      accountantName: orgSettings.accountantName || undefined,
      authorizedSignatory: orgSettings.authorizedSignatory || undefined,
      signatoryTitle: orgSettings.signatoryTitle || undefined,
      signatoryPhone: orgSettings.signatoryPhone || undefined,
      signatoryEmail: orgSettings.signatoryEmail || undefined,
      bankName: orgSettings.bankName || undefined,
      bankAccountName: orgSettings.bankAccountName || undefined,
      iban: orgSettings.iban || undefined,
      contractPrefix: orgSettings.contractPrefix || undefined,
      contractFooterText: orgSettings.contractFooterText || undefined,
      contractTermsAndConditions: orgSettings.contractTermsAndConditions || undefined,
    });
  };

  if (isLoading) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center min-h-[400px]">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* العنوان */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold">إعدادات الجمعية</h1>
            <p className="text-muted-foreground">
              إدارة بيانات الجمعية الثابتة المستخدمة في العقود والمستندات الرسمية
            </p>
          </div>
          <Button onClick={handleSave} disabled={updateMutation.isPending}>
            {updateMutation.isPending ? (
              <Loader2 className="h-4 w-4 animate-spin ml-2" />
            ) : (
              <Save className="h-4 w-4 ml-2" />
            )}
            حفظ الإعدادات
          </Button>
        </div>

        <Tabs defaultValue="basic" className="space-y-6">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="basic">معلومات أساسية</TabsTrigger>
            <TabsTrigger value="signatory">مفوض التوقيع</TabsTrigger>
            <TabsTrigger value="bank">البيانات البنكية</TabsTrigger>
            <TabsTrigger value="contracts">إعدادات العقود</TabsTrigger>
          </TabsList>

          {/* معلومات الجمعية الأساسية */}
          <TabsContent value="basic">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Building2 className="h-5 w-5" />
                  معلومات الجمعية الأساسية
                </CardTitle>
                <CardDescription>
                  البيانات الأساسية للجمعية التي تظهر في العقود والمستندات الرسمية
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="name">اسم الجمعية</Label>
                    <Input
                      id="name"
                      value={orgSettings.name}
                      onChange={(e) => setOrgSettings({ ...orgSettings, name: e.target.value })}
                      placeholder="اسم الجمعية الرسمي"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="licenseNumber">رقم الترخيص</Label>
                    <Input
                      id="licenseNumber"
                      value={orgSettings.licenseNumber}
                      onChange={(e) => setOrgSettings({ ...orgSettings, licenseNumber: e.target.value })}
                      placeholder="رقم ترخيص الجمعية"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="address">العنوان</Label>
                  <Textarea
                    id="address"
                    value={orgSettings.address}
                    onChange={(e) => setOrgSettings({ ...orgSettings, address: e.target.value })}
                    placeholder="العنوان التفصيلي للجمعية"
                    rows={2}
                  />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="city">المدينة</Label>
                    <Input
                      id="city"
                      value={orgSettings.city}
                      onChange={(e) => setOrgSettings({ ...orgSettings, city: e.target.value })}
                      placeholder="المدينة"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="phone">رقم الهاتف</Label>
                    <Input
                      id="phone"
                      value={orgSettings.phone}
                      onChange={(e) => setOrgSettings({ ...orgSettings, phone: e.target.value })}
                      placeholder="رقم الهاتف"
                      dir="ltr"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="email">البريد الإلكتروني</Label>
                    <Input
                      id="email"
                      type="email"
                      value={orgSettings.email}
                      onChange={(e) => setOrgSettings({ ...orgSettings, email: e.target.value })}
                      placeholder="البريد الإلكتروني"
                      dir="ltr"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="website">الموقع الإلكتروني</Label>
                  <Input
                    id="website"
                    value={orgSettings.website}
                    onChange={(e) => setOrgSettings({ ...orgSettings, website: e.target.value })}
                    placeholder="https://www.example.com"
                    dir="ltr"
                  />
                </div>

                {/* جهات الإشراف */}
                <div className="border-t pt-4 mt-4">
                  <h3 className="font-semibold mb-4">جهات الإشراف</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="administrativeSupervisor">جهة الإشراف الإداري</Label>
                      <Input
                        id="administrativeSupervisor"
                        value={orgSettings.administrativeSupervisor}
                        onChange={(e) => setOrgSettings({ ...orgSettings, administrativeSupervisor: e.target.value })}
                        placeholder="مثال: وزارة الموارد البشرية والتنمية الاجتماعية"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="technicalSupervisor">جهة الإشراف الفني</Label>
                      <Input
                        id="technicalSupervisor"
                        value={orgSettings.technicalSupervisor}
                        onChange={(e) => setOrgSettings({ ...orgSettings, technicalSupervisor: e.target.value })}
                        placeholder="مثال: وزارة الشؤون الإسلامية"
                      />
                    </div>
                  </div>
                </div>

                {/* أسماء المسؤولين */}
                <div className="border-t pt-4 mt-4">
                  <h3 className="font-semibold mb-4">أسماء المسؤولين</h3>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="boardChairmanName">رئيس مجلس الإدارة</Label>
                      <Input
                        id="boardChairmanName"
                        value={orgSettings.boardChairmanName}
                        onChange={(e) => setOrgSettings({ ...orgSettings, boardChairmanName: e.target.value })}
                        placeholder="اسم رئيس مجلس الإدارة"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="executiveDirectorName">المدير التنفيذي</Label>
                      <Input
                        id="executiveDirectorName"
                        value={orgSettings.executiveDirectorName}
                        onChange={(e) => setOrgSettings({ ...orgSettings, executiveDirectorName: e.target.value })}
                        placeholder="اسم المدير التنفيذي"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="accountantName">المحاسب</Label>
                      <Input
                        id="accountantName"
                        value={orgSettings.accountantName}
                        onChange={(e) => setOrgSettings({ ...orgSettings, accountantName: e.target.value })}
                        placeholder="اسم المحاسب"
                      />
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* مفوضو التوقيع */}
          <TabsContent value="signatory">
            <SignatoriesSection />
          </TabsContent>

          {/* البيانات البنكية */}
          <TabsContent value="bank">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <CreditCard className="h-5 w-5" />
                  البيانات البنكية
                </CardTitle>
                <CardDescription>
                  معلومات الحساب البنكي للجمعية المستخدمة في العقود والتحويلات
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="bankName">اسم البنك</Label>
                    <Input
                      id="bankName"
                      value={orgSettings.bankName}
                      onChange={(e) => setOrgSettings({ ...orgSettings, bankName: e.target.value })}
                      placeholder="اسم البنك"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="bankAccountName">اسم الحساب</Label>
                    <Input
                      id="bankAccountName"
                      value={orgSettings.bankAccountName}
                      onChange={(e) => setOrgSettings({ ...orgSettings, bankAccountName: e.target.value })}
                      placeholder="اسم صاحب الحساب"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="iban">رقم الآيبان (IBAN)</Label>
                  <Input
                    id="iban"
                    value={orgSettings.iban}
                    onChange={(e) => {
                      let value = e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, "");
                      if (!value.startsWith("SA")) {
                        value = "SA" + value.replace(/^SA/i, "");
                      }
                      if (value.length > 24) value = value.slice(0, 24);
                      setOrgSettings({ ...orgSettings, iban: value });
                    }}
                    placeholder="SA0000000000000000000000"
                    dir="ltr"
                    maxLength={24}
                  />
                  <p className="text-xs text-muted-foreground">يجب أن يبدأ بـ SA متبوعاً بـ 22 رقم</p>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* إعدادات العقود */}
          <TabsContent value="contracts">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <FileText className="h-5 w-5" />
                  إعدادات العقود
                </CardTitle>
                <CardDescription>
                  تخصيص إعدادات العقود والنصوص الافتراضية
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="contractPrefix">بادئة رقم العقد</Label>
                  <Input
                    id="contractPrefix"
                    value={orgSettings.contractPrefix}
                    onChange={(e) => setOrgSettings({ ...orgSettings, contractPrefix: e.target.value })}
                    placeholder="CON"
                    className="max-w-xs"
                  />
                  <p className="text-xs text-muted-foreground">
                    سيكون رقم العقد بالشكل: {orgSettings.contractPrefix}-2024-0001
                  </p>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="contractFooterText">نص تذييل العقد</Label>
                  <Textarea
                    id="contractFooterText"
                    value={orgSettings.contractFooterText}
                    onChange={(e) => setOrgSettings({ ...orgSettings, contractFooterText: e.target.value })}
                    placeholder="النص الذي يظهر في نهاية كل عقد..."
                    rows={3}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="contractTermsAndConditions">الشروط والأحكام الافتراضية</Label>
                  <Textarea
                    id="contractTermsAndConditions"
                    value={orgSettings.contractTermsAndConditions}
                    onChange={(e) => setOrgSettings({ ...orgSettings, contractTermsAndConditions: e.target.value })}
                    placeholder="الشروط والأحكام الافتراضية للعقود..."
                    rows={6}
                  />
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </DashboardLayout>
  );
}

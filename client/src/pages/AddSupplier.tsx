import { useState } from "react";
import { useLocation } from "wouter";
import DashboardLayout from "@/components/DashboardLayout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { trpc } from "@/lib/trpc";
import { 
  Building2, 
  Phone, 
  Mail, 
  MapPin, 
  CreditCard, 
  User,
  ArrowRight,
  Loader2,
  Save,
  CheckCircle2
} from "lucide-react";

export default function AddSupplier() {
  const [, navigate] = useLocation();
  const [isSubmitting, setIsSubmitting] = useState(false);

  // جلب البنوك ديناميكياً من قاعدة البيانات
  const { data: allCategories = [] } = trpc.categories.getAllCategories.useQuery();
  const banks = allCategories
    .filter((cat: any) => cat.type === "bank")
    .map((cat: any) => cat.nameAr || cat.name);

  // حالة النموذج
  const [formData, setFormData] = useState({
    name: "",
    commercialRegister: "",
    contactPerson: "",
    phone: "",
    email: "",
    address: "",
    bankName: "",
    iban: "",
    status: "active" as "active" | "inactive" | "blacklisted",
    entityType: "establishment" as "company" | "establishment",
  });

  // Mutation لإضافة المورد
  const createMutation = trpc.suppliers.create.useMutation({
    onSuccess: () => {
      toast.success("تم إضافة المورد بنجاح");
      navigate("/suppliers");
    },
    onError: (error) => {
      toast.error(error.message || "حدث خطأ أثناء إضافة المورد");
      setIsSubmitting(false);
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    // التحقق من الحقول الأساسية
    if (!formData.name || !formData.commercialRegister || !formData.contactPerson || !formData.phone || !formData.email) {
      toast.error("يرجى ملء جميع الحقول المطلوبة");
      return;
    }

    setIsSubmitting(true);
    createMutation.mutate(formData);
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { id, value } = e.target;
    setFormData((prev) => ({ ...prev, [id]: value }));
  };

  return (
    <DashboardLayout>
      <div className="max-w-4xl mx-auto space-y-6 pb-12">
        {/* شريط المسار والرجوع */}
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => navigate("/suppliers")}>
            <ArrowRight className="h-5 w-5" />
          </Button>
          <div>
            <h1 className="text-2xl font-bold">إضافة مورد جديد</h1>
            <p className="text-muted-foreground text-sm">تعبئة بيانات المورد المعتمد يدوياً</p>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* معلومات الكيان */}
            <Card className="md:col-span-2">
              <CardHeader className="bg-primary/5">
                <CardTitle className="flex items-center gap-2 text-lg">
                  <Building2 className="h-5 w-5 text-primary" />
                  معلومات المنشأة
                </CardTitle>
                <CardDescription>البيانات الأساسية للمورد</CardDescription>
              </CardHeader>
              <CardContent className="pt-6 grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="name">اسم المورد / الكيان *</Label>
                  <Input 
                    id="name" 
                    value={formData.name} 
                    onChange={handleChange} 
                    placeholder="اسم الشركة أو المؤسسة" 
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="commercialRegister">رقم السجل التجاري *</Label>
                  <Input 
                    id="commercialRegister" 
                    value={formData.commercialRegister} 
                    onChange={handleChange} 
                    placeholder="1010XXXXXX" 
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="entityType">نوع الكيان</Label>
                  <Select 
                    value={formData.entityType} 
                    onValueChange={(val: any) => setFormData(p => ({ ...p, entityType: val }))}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="اختر نوع الكيان" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="company">شركة</SelectItem>
                      <SelectItem value="establishment">مؤسسة</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="status">حالة الحساب</Label>
                  <Select 
                    value={formData.status} 
                    onValueChange={(val: any) => setFormData(p => ({ ...p, status: val }))}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="اختر الحالة" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="active">نشط</SelectItem>
                      <SelectItem value="inactive">غير نشط</SelectItem>
                      <SelectItem value="blacklisted">القائمة السوداء</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </CardContent>
            </Card>

            {/* معلومات التواصل */}
            <Card>
              <CardHeader className="bg-primary/5">
                <CardTitle className="flex items-center gap-2 text-lg">
                  <User className="h-5 w-5 text-primary" />
                  مسؤول التواصل
                </CardTitle>
              </CardHeader>
              <CardContent className="pt-6 space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="contactPerson">اسم المسؤول *</Label>
                  <Input 
                    id="contactPerson" 
                    value={formData.contactPerson} 
                    onChange={handleChange} 
                    placeholder="الاسم الكامل" 
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="phone">رقم الجوال *</Label>
                  <Input 
                    id="phone" 
                    value={formData.phone} 
                    onChange={handleChange} 
                    placeholder="05XXXXXXXX" 
                    dir="ltr"
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="email">البريد الإلكتروني *</Label>
                  <Input 
                    id="email" 
                    type="email" 
                    value={formData.email} 
                    onChange={handleChange} 
                    placeholder="example@domain.com" 
                    dir="ltr"
                    required
                  />
                </div>
              </CardContent>
            </Card>

            {/* العنوان والبيانات البنكية */}
            <Card>
              <CardHeader className="bg-primary/5">
                <CardTitle className="flex items-center gap-2 text-lg">
                  <CreditCard className="h-5 w-5 text-primary" />
                  البيانات البنكية والعنوان
                </CardTitle>
              </CardHeader>
              <CardContent className="pt-6 space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="bankName">اسم البنك</Label>
                  <Select
                    value={formData.bankName}
                    onValueChange={(value) => setFormData((prev) => ({ ...prev, bankName: value }))}
                  >
                    <SelectTrigger className="h-10">
                      <SelectValue placeholder="اختر البنك" />
                    </SelectTrigger>
                    <SelectContent>
                      {banks.map((bank: string) => (
                        <SelectItem key={bank} value={bank}>
                          {bank}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="iban">رقم الآيبان (IBAN)</Label>
                  <Input 
                    id="iban" 
                    value={formData.iban} 
                    onChange={handleChange} 
                    placeholder="SAXXXXXXXXXXXXXXXXXXXXXXXX" 
                    dir="ltr"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="address">العنوان</Label>
                  <Textarea 
                    id="address" 
                    value={formData.address} 
                    onChange={handleChange} 
                    placeholder="المدينة، الحي، الشارع..." 
                    rows={2}
                  />
                </div>
              </CardContent>
            </Card>
          </div>

          <div className="flex items-center justify-end gap-3 pt-4 border-t">
            <Button 
              type="button" 
              variant="outline" 
              onClick={() => navigate("/suppliers")}
              disabled={isSubmitting}
            >
              إلغاء
            </Button>
            <Button 
              type="submit" 
              className="px-8 bg-teal-600 hover:bg-teal-700" 
              disabled={isSubmitting}
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="h-4 w-4 ml-2 animate-spin" />
                  جاري الحفظ...
                </>
              ) : (
                <>
                  <Save className="h-4 w-4 ml-2" />
                  حفظ المورد
                </>
              )}
            </Button>
          </div>
        </form>
      </div>
    </DashboardLayout>
  );
}

import { useState, useEffect } from "react";
import { useParams, useLocation } from "wouter";
import { trpc } from "@/lib/trpc";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import { Users, ArrowRight } from "lucide-react";
import { useAuth } from "@/_core/hooks/useAuth";

export default function AssignFinalReport() {
  const { requestId } = useParams();
  const [, setLocation] = useLocation();
  const { user, isAuthenticated, loading: authLoading } = useAuth();

  // التحقق من الصلاحيات وتسجيل الدخول
  useEffect(() => {
    if (!authLoading) {
      if (!isAuthenticated) {
        toast.error("يجب تسجيل الدخول للوصول لهذه الصفحة");
        setLocation("/login");
      } else if (user?.role === "corporate_comm" && !(user?.permissions as string[])?.includes("requests.upload_final_report")) {
        toast.error("ليس لديك صلاحية لتعيين المسؤول");
        setLocation(`/requests/${requestId}`);
      }
    }
  }, [authLoading, isAuthenticated, user, setLocation, requestId]);

  const [formData, setFormData] = useState({
    assignedUserId: "",
    notes: "",
    scheduledDate: "",
    scheduledTime: "",
  });

  // جلب قائمة المستخدمين وتصفيتهم ليظهر المسؤولون عن الرفع (الاتصال المؤسسي أو من يملك الصلاحية)
  const { data: allStaffUsers } = trpc.users.getStaffUsers.useQuery();
  const corpCommUsers = allStaffUsers?.filter((u: any) => 
    u.role === "corporate_comm" || 
    (u.permissions && u.permissions.includes("requests.upload_final_report"))
  ) || [];

  // جلب بيانات الطلب
  const { data: request, isLoading } = trpc.requests.getById.useQuery(
    { id: Number(requestId) },
    { enabled: !!requestId }
  );

  // حفظ موعد الزيارة
  const utils = trpc.useUtils();

  const TIME_SLOTS = [
    "08:00", "09:00", "10:00", "11:00", "12:00", "13:00", "14:00",
    "15:00", "16:00", "17:00", "18:00", "19:00", "20:00", "21:00", "22:00"
  ];

  // جلب المواعيد المحجوزة للموظف في تاريخ التقرير الختامي المحدد
  const { data: busySlots = [], isLoading: isLoadingBusySlots } = trpc.requests.getFinalReportBusySlots.useQuery(
    {
      userId: formData.assignedUserId ? Number(formData.assignedUserId) : undefined,
      date: formData.scheduledDate,
      excludeRequestId: Number(requestId),
    },
    {
      enabled: !!formData.assignedUserId && !!formData.scheduledDate,
      refetchOnWindowFocus: true,
    }
  );

  const assignMutation = trpc.requests.assignFinalReport.useMutation({
    onSuccess: () => {
      toast.success("تم تعيين المسؤول بنجاح");
      utils.requests.getById.invalidate({ id: Number(requestId) });
      setLocation(`/requests/${requestId}`);
    },
    onError: (err) => {
      toast.error(err.message || "حدث خطأ أثناء التعيين");
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.assignedUserId) {
      toast.error("يرجى اختيار موظف لإسناد المهمة");
      return;
    }

    if (!formData.scheduledDate) {
      toast.error("يرجى تحديد تاريخ التقرير الختامي");
      return;
    }

    if (formData.scheduledTime && busySlots.includes(formData.scheduledTime)) {
      toast.error(`عفواً، الوقت (${formData.scheduledTime}) محجوز مسبقاً لهذا الموظف في هذا اليوم. يرجى اختيار موعد آخر.`);
      return;
    }

    assignMutation.mutate({
      requestId: Number(requestId),
      userId: Number(formData.assignedUserId),
      scheduledDate: formData.scheduledDate,
      scheduledTime: formData.scheduledTime || undefined,
    });
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">جاري التحميل...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto py-8 max-w-3xl">
      <Button
        variant="ghost"
        onClick={() => setLocation(`/requests/${requestId}`)}
        className="mb-6 gap-2"
      >
        <ArrowRight className="h-4 w-4" />
        رجوع للطلب
      </Button>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Users className="h-6 w-6" />
            تعيين المسؤول
          </CardTitle>
          <CardDescription>
            تحديد المسؤول عن التقرير الختامي للطلب {(request as any)?.requestNumber}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* المسؤول عن الزيارة */}
            <div className="space-y-2">
              <Label htmlFor="assignedUser" className="flex items-center gap-2">
                <Users className="h-4 w-4" />
                تعيين المسؤول *
              </Label>
              <Select
                value={formData.assignedUserId}
                onValueChange={(value) => setFormData({ ...formData, assignedUserId: value })}
              >
                <SelectTrigger id="assignedUser">
                  <SelectValue placeholder="اختر المسؤول من القائمة" />
                </SelectTrigger>
                <SelectContent>
                  {corpCommUsers && corpCommUsers.length > 0 ? (
                    corpCommUsers.map((u: any) => (
                      <SelectItem key={u.id} value={String(u.id)}>
                        {u.name} ({u.email})
                      </SelectItem>
                    ))
                  ) : (
                    <SelectItem value="none" disabled>
                      لا يوجد موظفين متاحين
                    </SelectItem>
                  )}
                </SelectContent>
              </Select>
              <p className="text-sm text-muted-foreground">
                سيتم إسناد مهمة إعداد ورفع التقرير الختامي للمسؤول المختار
              </p>
            </div>

            {/* تاريخ ووقت التقرير الختامي */}
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="scheduledDate" className="font-bold">تاريخ التقرير الختامي *</Label>
                <Input
                  id="scheduledDate"
                  type="date"
                  value={formData.scheduledDate}
                  onChange={(e) => setFormData({ ...formData, scheduledDate: e.target.value, scheduledTime: "" })}
                  className="rounded-xl"
                />
              </div>

              {formData.scheduledDate && (
                <div className="space-y-2.5">
                  <div className="flex items-center justify-between text-sm font-medium">
                    <Label className="font-bold">وقت إعداد/رفع التقرير الختامي</Label>
                    {formData.assignedUserId && (
                      <div className="flex items-center gap-2 text-xs">
                        <span className="text-emerald-600 dark:text-emerald-400 font-bold">
                          {TIME_SLOTS.filter((s) => !busySlots.includes(s)).length} متاح
                        </span>
                        <span>•</span>
                        <span className="text-rose-600 dark:text-rose-400 font-medium">
                          {busySlots.filter((s) => TIME_SLOTS.includes(s)).length} محجوز
                        </span>
                      </div>
                    )}
                  </div>

                  {/* شبكة الأوقات التفاعلية */}
                  <div className="grid grid-cols-3 sm:grid-cols-5 gap-2 max-h-52 overflow-y-auto p-1.5 border rounded-2xl bg-muted/20">
                    {TIME_SLOTS.map((slot) => {
                      const isBusy = busySlots.includes(slot);
                      const isSelected = formData.scheduledTime === slot;

                      return (
                        <button
                          key={slot}
                          type="button"
                          disabled={isBusy}
                          onClick={() => setFormData({ ...formData, scheduledTime: slot })}
                          className={`p-2.5 rounded-xl border text-xs font-bold transition-all flex flex-col items-center justify-center gap-0.5 ${
                            isBusy
                              ? "bg-rose-50/80 dark:bg-rose-950/30 border-rose-200 dark:border-rose-900/50 text-rose-700 dark:text-rose-300 opacity-60 cursor-not-allowed line-through"
                              : isSelected
                              ? "bg-primary text-primary-foreground border-primary shadow-sm ring-2 ring-primary/20"
                              : "bg-card hover:bg-muted/60 border-border text-foreground cursor-pointer hover:border-primary/50 active:scale-95"
                          }`}
                        >
                          <span className="text-xs font-mono">{slot}</span>
                          <span className="text-[9px] font-normal">
                            {isBusy ? "محجوز" : isSelected ? "تم اختياره" : "متاح"}
                          </span>
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>

            {/* ملاحظات */}
            <div className="space-y-2">
              <Label htmlFor="notes">ملاحظات إضافية</Label>
              <Textarea
                id="notes"
                placeholder="أي ملاحظات أو تعليمات خاصة بمرحلة الاستلام..."
                value={formData.notes}
                onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                rows={4}
              />
            </div>

            {/* أزرار الإجراءات */}
            <div className="flex gap-3 justify-end">
              <Button
                type="button"
                variant="outline"
                onClick={() => setLocation(`/requests/${requestId}`)}
              >
                إلغاء
              </Button>
              <Button
                type="submit"
                disabled={assignMutation.isPending}
              >
                {assignMutation.isPending ? (
                  <>جاري الحفظ...</>
                ) : (
                  <>
                    حفظ التعيين
                    <ArrowRight className="mr-2 h-4 w-4" />
                  </>
                )}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}

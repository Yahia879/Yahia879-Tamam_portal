import { useState, useEffect } from "react";
import { useParams, useLocation } from "wouter";
import { trpc } from "@/lib/trpc";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { Calendar, Clock, Users, ArrowRight } from "lucide-react";
import { useAuth } from "@/_core/hooks/useAuth";

export default function FieldVisitSchedule() {
  const { requestId } = useParams();
  const [, setLocation] = useLocation();
  const { user, isAuthenticated, loading: authLoading } = useAuth();

  // التحقق من الصلاحيات وتسجيل الدخول
  useEffect(() => {
    if (!authLoading) {
      if (!isAuthenticated) {
        toast.error("يجب تسجيل الدخول للوصول لهذه الصفحة");
        setLocation("/login");
      } else if (user?.role === "field_team") {
        toast.error("ليس لديك صلاحية لجدولة الزيارة الميدانية");
        setLocation(`/requests/${requestId}`);
      }
    }
  }, [authLoading, isAuthenticated, user, setLocation, requestId]);

  const [formData, setFormData] = useState({
    visitDate: "",
    visitTime: "",
    assignedUserId: "",
    notes: "",
  });

  const TIME_SLOTS = [
    "08:00",
    "09:00",
    "10:00",
    "11:00",
    "12:00",
    "13:00",
    "14:00",
    "15:00",
    "16:00",
    "17:00",
    "18:00"
  ];

  // جلب الفترات المحجوزة للموظف المختار في اليوم المحدد
  const { data: busySlots = [], isLoading: isLoadingBusySlots } = trpc.fieldVisits.getBusySlots.useQuery(
    { 
      userId: Number(formData.assignedUserId), 
      date: formData.visitDate,
      excludeRequestId: Number(requestId)
    },
    { 
      enabled: !!formData.assignedUserId && !!formData.visitDate && formData.assignedUserId !== "none"
    }
  );

  const availableSlots = TIME_SLOTS.filter(slot => !busySlots.includes(slot));

  // تصفير وقت الزيارة عند تغيير المسؤول أو التاريخ لضمان اختيار وقت متاح متوافق
  useEffect(() => {
    setFormData(prev => ({ ...prev, visitTime: "" }));
  }, [formData.assignedUserId, formData.visitDate]);

  // إعادة تعيين الوقت المختار إذا أصبح غير متاح
  useEffect(() => {
    if (formData.visitTime && busySlots.includes(formData.visitTime)) {
      setFormData(prev => ({ ...prev, visitTime: "" }));
      toast.warning("الوقت المحدد مسبقاً لم يعد متاحاً لهذا الموظف بسبب حجز آخر");
    }
  }, [busySlots, formData.visitTime]);
  
  // جلب قائمة المستخدمين وتصفيتهم ليظهر فقط أعضاء الفريق الميداني (field_team) أو من يملك الصلاحية الخاصة
  const { data: allStaffUsers } = trpc.users.getStaffUsers.useQuery();
  const staffUsers = allStaffUsers?.filter((user: any) => 
    user.role === "field_team" || (user.permissions && user.permissions.includes("requests.manage_as_field_team"))
  );

  // جلب بيانات الطلب
  const { data: request, isLoading } = trpc.requests.getById.useQuery(
    { id: Number(requestId) },
    { enabled: !!requestId }
  );

  // حفظ موعد الزيارة
  const utils = trpc.useUtils();
  const scheduleMutation = trpc.fieldVisits.scheduleVisit.useMutation({
    onSuccess: () => {
      toast.success("تم جدولة الزيارة الميدانية بنجاح");
      utils.requests.getById.invalidate({ id: Number(requestId) });
      utils.fieldVisits.getBusySlots.invalidate();
      setLocation(`/requests/${requestId}`);
    },
    onError: (err) => {
      toast.error(err.message || "حدث خطأ أثناء جدولة الزيارة");
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.visitDate || !formData.visitTime) {
      toast.error("يرجى تحديد تاريخ ووقت الزيارة");
      return;
    }
    
    if (!formData.assignedUserId || formData.assignedUserId === "none") {
      toast.error("يرجى اختيار موظف لإسناد المهمة");
      return;
    }

    if (busySlots.includes(formData.visitTime)) {
      toast.error("عفواً، هذا الوقت محجوز مسبقاً لهذا الموظف، يرجى اختيار وقت آخر");
      return;
    }

    scheduleMutation.mutate({
      requestId: Number(requestId),
      visitDate: formData.visitDate,
      visitTime: formData.visitTime,
      assignedUserId: Number(formData.assignedUserId),
      notes: formData.notes,
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

  const selectedStaffUser = staffUsers?.find((u: any) => String(u.id) === formData.assignedUserId);

  return (
    <div className="container mx-auto py-8 max-w-3xl">
      <Button
        variant="ghost"
        onClick={() => setLocation(`/requests/${requestId}`)}
        className="mb-6 gap-1 text-xs font-bold"
      >
        <ArrowRight className="w-4 h-4" />
        العودة للطلب
      </Button>

      <Card className="rounded-3xl border border-border shadow-md">
        <CardHeader className="p-6 pb-4 border-b border-border/70">
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2.5 text-xl font-black">
                <div className="w-10 h-10 rounded-2xl bg-primary/10 text-primary flex items-center justify-center">
                  <Calendar className="h-5 w-5" />
                </div>
                <span>جدولة الزيارة الميدانية</span>
              </CardTitle>
              <CardDescription className="mt-1">
                تحديد وحجز موعد الزيارة الميدانية للطلب <strong className="text-foreground">{(request as any)?.requestNumber || `#${requestId}`}</strong>
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-6 space-y-6">
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* المسؤول عن الزيارة */}
            <div className="space-y-2">
              <Label htmlFor="assignedUser" className="flex items-center gap-2 font-bold text-xs sm:text-sm">
                <Users className="h-4 w-4 text-primary" />
                <span>المسؤول عن الزيارة *</span>
              </Label>
              <Select
                value={formData.assignedUserId}
                onValueChange={(value) => setFormData({ ...formData, assignedUserId: value })}
              >
                <SelectTrigger id="assignedUser" className="h-11 rounded-xl">
                  <SelectValue placeholder="اختر المسؤول من القائمة" />
                </SelectTrigger>
                <SelectContent className="rounded-xl">
                  {staffUsers && staffUsers.length > 0 ? (
                    staffUsers.map((user: any) => (
                      <SelectItem key={user.id} value={String(user.id)}>
                        {user.name} ({user.email})
                      </SelectItem>
                    ))
                  ) : (
                    <SelectItem value="none" disabled>
                      لا يوجد موظفين متاحين
                    </SelectItem>
                  )}
                </SelectContent>
              </Select>
              <p className="text-[11px] text-muted-foreground">
                سيتم إسناد مهمة الزيارة الميدانية للمسؤول المختار وحجز وقته في التقويم
              </p>
            </div>

            {/* تاريخ الزيارة */}
            <div className="space-y-2">
              <Label htmlFor="visitDate" className="flex items-center gap-2 font-bold text-xs sm:text-sm">
                <Calendar className="h-4 w-4 text-primary" />
                <span>تاريخ الزيارة *</span>
              </Label>
              <Input
                id="visitDate"
                type="date"
                value={formData.visitDate}
                onChange={(e) => setFormData({ ...formData, visitDate: e.target.value })}
                required
                disabled={!formData.assignedUserId || formData.assignedUserId === "none"}
                className="h-11 rounded-xl"
              />
              {(!formData.assignedUserId || formData.assignedUserId === "none") ? (
                <p className="text-xs text-amber-600 dark:text-amber-400 font-medium">
                  يرجى تحديد المسؤول عن الزيارة أولاً لتتمكن من اختيار التاريخ
                </p>
              ) : (
                <p className="text-[11px] text-muted-foreground">
                  حدد تاريخ إجراء الزيارة الميدانية لاستعراض الأوقات المتاحة والمحجوزة
                </p>
              )}
            </div>

            {/* وقت الزيارة والشبكة التفاعلية */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <Label htmlFor="visitTime" className="flex items-center gap-2 font-bold text-xs sm:text-sm">
                  <Clock className="h-4 w-4 text-primary" />
                  <span>الوقت المتوفر للزيارة *</span>
                </Label>
                {formData.visitDate && formData.assignedUserId && formData.assignedUserId !== "none" && !isLoadingBusySlots && (
                  <div className="flex items-center gap-2 text-xs">
                    <span className="text-emerald-600 dark:text-emerald-400 font-bold">
                      {availableSlots.length} متاح
                    </span>
                    <span>•</span>
                    <span className="text-rose-600 dark:text-rose-400 font-medium">
                      {busySlots.length} محجوز
                    </span>
                  </div>
                )}
              </div>

              {/* شبكة الأوقات التفاعلية */}
              {formData.visitDate && formData.assignedUserId && formData.assignedUserId !== "none" ? (
                isLoadingBusySlots ? (
                  <div className="p-6 text-center rounded-2xl bg-muted/40 border border-border">
                    <Clock className="w-6 h-6 animate-spin mx-auto text-primary mb-2" />
                    <p className="text-xs text-muted-foreground">جاري فحص المواعيد المحجوزة للمسؤول المختار...</p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2">
                      {TIME_SLOTS.map((slot) => {
                        const isBusy = busySlots.includes(slot);
                        const isSelected = formData.visitTime === slot;

                        return (
                          <button
                            key={slot}
                            type="button"
                            disabled={isBusy}
                            onClick={() => setFormData((prev) => ({ ...prev, visitTime: slot }))}
                            className={`p-2.5 sm:p-3 rounded-xl border text-xs font-bold transition-all flex flex-col items-center justify-center gap-1 ${
                              isBusy
                                ? "bg-rose-50/80 dark:bg-rose-950/30 border-rose-200 dark:border-rose-900/50 text-rose-700 dark:text-rose-300 opacity-60 cursor-not-allowed line-through"
                                : isSelected
                                ? "bg-primary text-primary-foreground border-primary shadow-sm ring-2 ring-primary/20"
                                : "bg-card hover:bg-muted/60 border-border text-foreground cursor-pointer hover:border-primary/50 active:scale-95"
                            }`}
                          >
                            <span className="text-sm font-mono tracking-tight">{slot}</span>
                            <span className="text-[10px] font-normal">
                              {isBusy ? "محجوز مسبقاً" : isSelected ? "تم اختياره" : "متاح للحجز"}
                            </span>
                          </button>
                        );
                      })}
                    </div>

                    {availableSlots.length === 0 && (
                      <p className="text-xs font-bold text-rose-600 dark:text-rose-400 p-3 rounded-xl bg-rose-50 dark:bg-rose-950/30 border border-rose-200 dark:border-rose-900/50 text-center">
                        ⚠️ كافة الأوقات محجوزة لهذا المسؤول في هذا اليوم. يرجى اختيار تاريخ آخر أو إسناد الزيارة لمسؤول آخر.
                      </p>
                    )}
                  </div>
                )
              ) : (
                <div className="p-4 rounded-2xl bg-muted/30 border border-border text-center text-xs text-muted-foreground">
                  يرجى اختيار المسؤول وتاريخ الزيارة أولاً لعرض الفترات المتاحة
                </div>
              )}
            </div>

            {/* ملاحظات */}
            <div className="space-y-2">
              <Label htmlFor="notes" className="font-bold text-xs sm:text-sm">ملاحظات إضافية</Label>
              <Textarea
                id="notes"
                placeholder="أي ملاحظات أو تعليمات خاصة بالزيارة..."
                value={formData.notes}
                onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                rows={3}
                className="rounded-xl"
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
                disabled={scheduleMutation.isPending}
              >
                {scheduleMutation.isPending ? (
                  <>جاري الحفظ...</>
                ) : (
                  <>
                    حفظ الموعد
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

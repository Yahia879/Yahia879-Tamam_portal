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

export default function FieldVisitSchedule() {
  const { requestId } = useParams();
  const [, setLocation] = useLocation();

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
  const { data: busySlots, isLoading: isLoadingBusySlots } = trpc.fieldVisits.getBusySlots.useQuery(
    { 
      userId: Number(formData.assignedUserId), 
      date: formData.visitDate 
    },
    { 
      enabled: !!formData.assignedUserId && !!formData.visitDate && formData.assignedUserId !== "none"
    }
  );

  const availableSlots = TIME_SLOTS.filter(slot => !busySlots?.includes(slot));

  // تصفير وقت الزيارة عند تغيير المسؤول أو التاريخ لضمان اختيار وقت متاح متوافق
  useEffect(() => {
    setFormData(prev => ({ ...prev, visitTime: "" }));
  }, [formData.assignedUserId, formData.visitDate]);

  // إعادة تعيين الوقت المختار إذا أصبح غير متاح
  useEffect(() => {
    if (formData.visitTime && busySlots?.includes(formData.visitTime)) {
      setFormData(prev => ({ ...prev, visitTime: "" }));
      toast.warning("الوقت المحدد مسبقاً لم يعد متاحاً لهذا الموظف بسبب حجز آخر");
    }
  }, [busySlots, formData.visitTime]);
  
  // جلب قائمة المستخدمين وتصفيتهم ليظهر فقط أعضاء الفريق الميداني (field_team)
  const { data: allStaffUsers } = trpc.users.getStaffUsers.useQuery();
  const staffUsers = allStaffUsers?.filter((user: any) => user.role === "field_team");

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
      setLocation(`/requests/${requestId}`);
    },
    onError: () => {
      toast.error("حدث خطأ أثناء جدولة الزيارة");
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.visitDate || !formData.visitTime) {
      toast.error("يرجى تحديد تاريخ ووقت الزيارة");
      return;
    }
    
    if (!formData.assignedUserId) {
      toast.error("يرجى اختيار موظف لإسناد المهمة");
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

  return (
    <div className="container mx-auto py-8 max-w-3xl">
      <Button
        variant="ghost"
        onClick={() => setLocation(`/requests/${requestId}`)}
        className="mb-6"
      >
        ← رجوع للطلب
      </Button>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Calendar className="h-6 w-6" />
            جدولة الزيارة الميدانية
          </CardTitle>
          <CardDescription>
            تحديد موعد الزيارة الميدانية للطلب {(request as any)?.requestNumber}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* المسؤول عن الزيارة */}
            <div className="space-y-2">
              <Label htmlFor="assignedUser" className="flex items-center gap-2">
                <Users className="h-4 w-4" />
                المسؤول عن الزيارة *
              </Label>
              <Select
                value={formData.assignedUserId}
                onValueChange={(value) => setFormData({ ...formData, assignedUserId: value })}
              >
                <SelectTrigger id="assignedUser">
                  <SelectValue placeholder="اختر المسؤول من القائمة" />
                </SelectTrigger>
                <SelectContent>
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
              <p className="text-sm text-muted-foreground">
                سيتم إسناد مهمة الزيارة الميدانية للمسؤول المختار
              </p>
            </div>

            {/* تاريخ الزيارة */}
            <div className="space-y-2">
              <Label htmlFor="visitDate" className="flex items-center gap-2">
                <Calendar className="h-4 w-4" />
                تاريخ الزيارة *
              </Label>
              <Input
                id="visitDate"
                type="date"
                value={formData.visitDate}
                onChange={(e) => setFormData({ ...formData, visitDate: e.target.value })}
                required
                disabled={!formData.assignedUserId || formData.assignedUserId === "none"}
              />
              {(!formData.assignedUserId || formData.assignedUserId === "none") ? (
                <p className="text-sm text-amber-500 font-medium">
                  يرجى تحديد المسؤول عن الزيارة أولاً لتتمكن من اختيار التاريخ
                </p>
              ) : (
                <p className="text-sm text-muted-foreground">
                  حدد تاريخ إجراء الزيارة الميدانية
                </p>
              )}
            </div>

            {/* وقت الزيارة */}
            <div className="space-y-2">
              <Label htmlFor="visitTime" className="flex items-center gap-2">
                <Clock className="h-4 w-4" />
                الوقت المتوفر للزيارة *
              </Label>
              <Select
                value={formData.visitTime}
                onValueChange={(value) => setFormData({ ...formData, visitTime: value })}
                disabled={!formData.visitDate || !formData.assignedUserId || formData.assignedUserId === "none"}
              >
                <SelectTrigger id="visitTime">
                  <SelectValue placeholder={
                    !formData.assignedUserId || formData.assignedUserId === "none"
                      ? "يرجى تحديد المسؤول عن الزيارة أولاً"
                      : !formData.visitDate
                        ? "يرجى تحديد تاريخ الزيارة أولاً"
                        : isLoadingBusySlots
                          ? "جاري التحميل..."
                          : "اختر وقت الزيارة"
                  } />
                </SelectTrigger>
                <SelectContent>
                  {formData.visitDate && formData.assignedUserId && formData.assignedUserId !== "none" ? (
                    isLoadingBusySlots ? (
                      <SelectItem value="loading" disabled>جاري تحميل الأوقات المتاحة...</SelectItem>
                    ) : availableSlots.length > 0 ? (
                      availableSlots.map((slot) => (
                        <SelectItem key={slot} value={slot}>
                          الساعة {slot}
                        </SelectItem>
                      ))
                    ) : (
                      <SelectItem value="none" disabled>
                        لا توجد أوقات متاحة في هذا اليوم
                      </SelectItem>
                    )
                  ) : (
                    <SelectItem value="none" disabled>
                      يرجى اختيار المسؤول والتاريخ أولاً
                    </SelectItem>
                  )}
                </SelectContent>
              </Select>
              {formData.visitDate && formData.assignedUserId && formData.assignedUserId !== "none" && !isLoadingBusySlots && availableSlots.length === 0 && (
                <p className="text-sm font-bold text-red-500 mt-1">
                  لا توجد أوقات متاحة لهذا المسؤول في هذا اليوم. يرجى تغيير التاريخ أو المسؤول المختار.
                </p>
              )}
            </div>

            {/* ملاحظات */}
            <div className="space-y-2">
              <Label htmlFor="notes">ملاحظات إضافية</Label>
              <Textarea
                id="notes"
                placeholder="أي ملاحظات أو تعليمات خاصة بالزيارة..."
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

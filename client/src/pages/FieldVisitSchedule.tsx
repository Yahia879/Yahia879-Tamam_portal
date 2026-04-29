import { useState } from "react";
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
  
  // جلب قائمة المستخدمين الموظفين
  const { data: staffUsers } = trpc.users.getStaffUsers.useQuery();

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
              />
            </div>

            {/* وقت الزيارة */}
            <div className="space-y-2">
              <Label htmlFor="visitTime" className="flex items-center gap-2">
                <Clock className="h-4 w-4" />
                وقت الزيارة *
              </Label>
              <Input
                id="visitTime"
                type="time"
                value={formData.visitTime}
                onChange={(e) => setFormData({ ...formData, visitTime: e.target.value })}
                required
              />
            </div>

            {/* إسناد المهمة */}
            <div className="space-y-2">
              <Label htmlFor="assignedUser" className="flex items-center gap-2">
                <Users className="h-4 w-4" />
                إسناد المهمة إلى *
              </Label>
              <Select
                value={formData.assignedUserId}
                onValueChange={(value) => setFormData({ ...formData, assignedUserId: value })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="اختر موظف من القائمة" />
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
                سيتم إسناد مهمة الزيارة الميدانية للموظف المختار
              </p>
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

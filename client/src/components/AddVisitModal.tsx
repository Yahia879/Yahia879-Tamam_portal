import { useState, useEffect } from "react";
import { trpc } from "@/lib/trpc";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";
import { Calendar as CalendarIcon, Clock, Users, MapPin, Search, AlertCircle } from "lucide-react";
import { format, isPast, isToday } from "date-fns";
import { ar } from "date-fns/locale";

interface AddVisitModalProps {
  isOpen: boolean;
  onClose: () => void;
  selectedDate: Date;
  onSuccess?: () => void;
}

export function AddVisitModal({ isOpen, onClose, selectedDate, onSuccess }: AddVisitModalProps) {
  const [formData, setFormData] = useState({
    requestId: "",
    visitTime: "09:00",
    assignedUserId: "",
    notes: "",
  });

  const [searchQuery, setSearchQuery] = useState("");

  const isDateInPast = isPast(selectedDate) && !isToday(selectedDate);

  // Get requests that need field visit
  const { data: requests = [], isLoading: isLoadingRequests } = trpc.requests.getPendingVisits.useQuery({
    search: searchQuery,
  });

  // Get staff users
  const { data: staffUsers } = trpc.requests.getFieldTeamMembers.useQuery();

  const utils = trpc.useUtils();
  const scheduleMutation = trpc.fieldVisits.scheduleVisit.useMutation({
    onSuccess: () => {
      toast.success("تم جدولة الزيارة بنجاح");
      utils.requests.getScheduledVisits.invalidate();
      onSuccess?.();
      onClose();
    },
    onError: (error) => {
      toast.error("حدث خطأ: " + error.message);
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.requestId) {
      toast.error("يرجى اختيار الطلب");
      return;
    }
    if (!formData.visitTime) {
      toast.error("يرجى تحديد الوقت");
      return;
    }

    scheduleMutation.mutate({
      requestId: Number(formData.requestId),
      visitDate: format(selectedDate, 'yyyy-MM-dd'),
      visitTime: formData.visitTime,
      assignedUserId: formData.assignedUserId ? Number(formData.assignedUserId) : undefined,
      notes: formData.notes,
    });
  };

  const selectedRequest = requests.find(r => String(r.id) === formData.requestId);

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[500px]" dir="rtl">
        <DialogHeader>
          <DialogTitle className="text-xl flex items-center gap-2">
            <CalendarIcon className="h-5 w-5 text-primary" />
            جدولة زيارة جديدة
          </DialogTitle>
          <DialogDescription>
            تحديد موعد زيارة ميدانية ليوم {format(selectedDate, 'PPP', { locale: ar })}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4 py-4">
          {isDateInPast && (
            <div className="bg-amber-50 border border-amber-200 p-3 rounded-lg flex items-start gap-3 text-amber-800 text-sm">
              <AlertCircle className="h-5 w-5 shrink-0" />
              <p>تنبيه: لقد اخترت تاريخاً في الماضي. سيتم الجدولة لأغراض التوثيق فقط.</p>
            </div>
          )}
          {/* Select Request */}
          <div className="space-y-2">
            <Label htmlFor="request">الطلب المرتبط *</Label>
            <Select
              value={formData.requestId}
              onValueChange={(val) => setFormData({ ...formData, requestId: val })}
            >
              <SelectTrigger id="request" className="w-full">
                <SelectValue placeholder="اختر الطلب" />
              </SelectTrigger>
              <SelectContent>
                <div className="p-2">
                  <div className="relative">
                    <Search className="absolute right-2 top-2.5 h-4 w-4 text-muted-foreground" />
                    <Input
                      placeholder="بحث..."
                      className="pr-8"
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                    />
                  </div>
                </div>
                {isLoadingRequests ? (
                  <div className="p-4 text-center text-sm text-muted-foreground">جاري التحميل...</div>
                ) : requests.length === 0 ? (
                  <div className="p-4 text-center text-sm text-muted-foreground">لا توجد طلبات في مرحلة الزيارة</div>
                ) : (
                  requests.map((r) => (
                    <SelectItem key={r.id} value={String(r.id)}>
                      {r.requestNumber} - {r.mosqueName || 'بدون مسجد'}
                    </SelectItem>
                  ))
                )}
              </SelectContent>
            </Select>
          </div>

          {/* Location Info (Display only) */}
          {selectedRequest && (
            <div className="bg-muted/50 p-3 rounded-lg border border-border flex items-start gap-3">
              <MapPin className="h-5 w-5 text-primary mt-0.5" />
              <div>
                <p className="text-sm font-semibold">المكان/المسجد:</p>
                <p className="text-sm text-muted-foreground">
                  {selectedRequest.mosqueName} - {selectedRequest.mosqueCity}
                </p>
              </div>
            </div>
          )}

          {/* Visit Time */}
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

          {/* Assign To */}
          <div className="space-y-2">
            <Label htmlFor="assignedUser" className="flex items-center gap-2">
              <Users className="h-4 w-4" />
              إسناد المهمة إلى
            </Label>
            <Select
              value={formData.assignedUserId}
              onValueChange={(val) => setFormData({ ...formData, assignedUserId: val })}
            >
              <SelectTrigger id="assignedUser">
                <SelectValue placeholder="اختر موظف" />
              </SelectTrigger>
              <SelectContent>
                {staffUsers?.map((user) => (
                  <SelectItem key={user.id} value={String(user.id)}>
                    {user.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Notes */}
          <div className="space-y-2">
            <Label htmlFor="notes">ملاحظات</Label>
            <Textarea
              id="notes"
              placeholder="أي ملاحظات إضافية..."
              value={formData.notes}
              onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
            />
          </div>

          <DialogFooter className="gap-2 sm:gap-0">
            <Button type="button" variant="outline" onClick={onClose}>
              إلغاء
            </Button>
            <Button type="submit" disabled={scheduleMutation.isPending}>
              {scheduleMutation.isPending ? "جاري الحفظ..." : "حفظ الموعد"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

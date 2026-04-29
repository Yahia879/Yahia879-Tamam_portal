import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { PROGRAM_DATA_LABELS, PROGRAM_LABELS } from "../../../shared/constants";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { 
  Building2, 
  User, 
  Calendar, 
  FileText, 
  Paperclip, 
  MessageSquare,
  Send,
  Download,
  ExternalLink
} from "lucide-react";
import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { format } from "date-fns";
import { ar } from "date-fns/locale";

interface RequestDetailsModalProps {
  requestId: number;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function RequestDetailsModal({ requestId, open, onOpenChange }: RequestDetailsModalProps) {
  const [newComment, setNewComment] = useState("");
  const [showSuccessMessage, setShowSuccessMessage] = useState(false);
  
  // Fetch request details
  const { data: request, isLoading } = trpc.requests.getById.useQuery(
    { id: requestId },
    { enabled: open && requestId > 0 }
  );

  // Add comment mutation
  const addCommentMutation = trpc.requests.addComment.useMutation({
    onSuccess: (data) => {
      setNewComment("");
      // Invalidate request query to refetch
      trpc.useUtils().requests.getById.invalidate({ id: requestId });
      // Show success message
      setShowSuccessMessage(true);
      setTimeout(() => setShowSuccessMessage(false), 3000);
      alert(data.message || "تم إضافة التعليق بنجاح");
    },
    onError: (error) => {
      alert("خطأ: " + (error.message || "فشل إضافة التعليق"));
    },
  });

  const handleAddComment = () => {
    if (!newComment.trim()) return;
    
    addCommentMutation.mutate({
      requestId: requestId,
      comment: newComment,
    });
  };

  if (isLoading || !request) {
    return (
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-4xl max-h-[90vh]">
          <div className="flex items-center justify-center h-64">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
          </div>
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] p-0">
        <DialogHeader className="px-6 pt-6 pb-4 border-b">
          <div className="flex items-start justify-between">
            <div className="space-y-2">
              <DialogTitle className="text-2xl font-bold">
                تفاصيل الطلب
              </DialogTitle>
              <div className="flex items-center gap-2">
                <Badge variant="outline" className="font-mono">
                  {request.requestNumber}
                </Badge>
                <Badge variant={
                  request.currentStage === 'closed' ? 'default' :
                  request.status === 'rejected' ? 'destructive' :
                  'secondary'
                }>
                  {request.currentStage}
                </Badge>
              </div>
            </div>
          </div>
        </DialogHeader>

        <ScrollArea className="h-[calc(90vh-120px)]">
          <div className="px-6 py-4 space-y-6">
            {/* معلومات المسجد */}
            <Card className="border-2 border-teal-200 bg-gradient-to-br from-teal-50 to-teal-100/50 dark:from-teal-950/30 dark:to-teal-900/20 dark:border-teal-800">
              <CardHeader className="bg-teal-600 dark:bg-teal-700 text-white rounded-t-lg">
                <CardTitle className="flex items-center gap-2 text-lg">
                  <Building2 className="h-5 w-5" />
                  معلومات المسجد
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3 pt-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="bg-white dark:bg-gray-800 p-3 rounded-lg shadow-sm">
                    <p className="text-sm text-muted-foreground mb-1">اسم المسجد</p>
                    <p className="font-bold text-teal-700 dark:text-teal-300">{request.mosque?.name || 'غير محدد'}</p>
                  </div>
                  <div className="bg-white dark:bg-gray-800 p-3 rounded-lg shadow-sm">
                    <p className="text-sm text-muted-foreground mb-1">رقم الطلب</p>
                    <p className="font-bold text-teal-700 dark:text-teal-300 font-mono">{request.requestNumber}</p>
                  </div>
                  <div className="bg-white dark:bg-gray-800 p-3 rounded-lg shadow-sm">
                    <p className="text-sm text-muted-foreground mb-1">المدينة</p>
                    <p className="font-medium">{request.mosque?.city || 'غير محدد'}</p>
                  </div>
                  <div className="bg-white dark:bg-gray-800 p-3 rounded-lg shadow-sm">
                    <p className="text-sm text-muted-foreground mb-1">الحي</p>
                    <p className="font-medium">{request.mosque?.district || 'غير محدد'}</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* معلومات مقدم الطلب */}
            <Card className="border-2 border-amber-200 bg-gradient-to-br from-amber-50 to-amber-100/50 dark:from-amber-950/30 dark:to-amber-900/20 dark:border-amber-800">
              <CardHeader className="bg-amber-600 dark:bg-amber-700 text-white rounded-t-lg">
                <CardTitle className="flex items-center gap-2 text-lg">
                  <User className="h-5 w-5" />
                  معلومات مقدم الطلب
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3 pt-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="bg-white dark:bg-gray-800 p-3 rounded-lg shadow-sm">
                    <p className="text-sm text-muted-foreground mb-1">الاسم</p>
                    <p className="font-bold text-amber-700 dark:text-amber-300">{request.requester?.name || 'غير محدد'}</p>
                  </div>
                  <div className="bg-white dark:bg-gray-800 p-3 rounded-lg shadow-sm">
                    <p className="text-sm text-muted-foreground mb-1">البريد الإلكتروني</p>
                    <p className="font-medium">{request.requester?.email || 'غير محدد'}</p>
                  </div>
                  <div className="bg-white dark:bg-gray-800 p-3 rounded-lg shadow-sm">
                    <p className="text-sm text-muted-foreground mb-1">رقم الجوال</p>
                    <p className="font-medium">{request.requester?.phone || 'غير محدد'}</p>
                  </div>
                  <div className="bg-white dark:bg-gray-800 p-3 rounded-lg shadow-sm">
                    <p className="text-sm text-muted-foreground mb-1">تاريخ التقديم</p>
                    <p className="font-medium">
                      {request.createdAt 
                        ? format(new Date(request.createdAt), 'dd MMMM yyyy', { locale: ar })
                        : 'غير محدد'
                      }
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* تفاصيل الطلب */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-lg">
                  <FileText className="h-5 w-5" />
                  تفاصيل الطلب
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div>
                  <p className="text-sm text-muted-foreground mb-2 font-semibold">تفاصيل البرنامج</p>
                  {request.programData && typeof request.programData === 'object' ? (
                    <div className="grid grid-cols-1 gap-2">
                      {Object.entries(request.programData as Record<string, unknown>).map(([key, value]) => {
                        const label = PROGRAM_DATA_LABELS[key] || key;
                        const displayValue = value === true ? 'نعم'
                          : value === false ? 'لا'
                          : String(value ?? '');
                        if (!displayValue) return null;
                        return (
                          <div key={key} className="flex gap-2 bg-muted/50 p-2 rounded-md">
                            <span className="text-sm text-muted-foreground min-w-[180px]">{label}:</span>
                            <span className="text-sm font-medium">{displayValue}</span>
                          </div>
                        );
                      })}
                    </div>
                  ) : (
                    <p className="text-sm text-muted-foreground">لا توجد تفاصيل</p>
                  )}
                </div>
                <div className="grid grid-cols-2 gap-4 pt-2">
                  <div>
                    <p className="text-sm text-muted-foreground">البرنامج</p>
                    <p className="font-medium">{PROGRAM_LABELS[request.programType as keyof typeof PROGRAM_LABELS] || request.programType || 'غير محدد'}</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">الأولوية</p>
                    <Badge variant={
                      request.priority === 'urgent' ? 'destructive' :
                      request.priority === 'medium' ? 'default' :
                      'secondary'
                    }>
                      {request.priority === 'urgent' ? 'عاجل' :
                       request.priority === 'medium' ? 'متوسطة' :
                       'عادية'}
                    </Badge>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* المرفقات */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-lg">
                  <Paperclip className="h-5 w-5" />
                  المرفقات
                  {request.attachments && request.attachments.length > 0 && (
                    <Badge variant="secondary" className="mr-2">
                      {request.attachments.length}
                    </Badge>
                  )}
                </CardTitle>
              </CardHeader>
              <CardContent>
                {request.attachments && request.attachments.length > 0 ? (
                  <div className="space-y-2">
                    {request.attachments.map((attachment: any, index: number) => (
                      <div
                        key={index}
                        className="flex items-center justify-between p-3 border rounded-lg hover:bg-muted/50 transition-colors"
                      >
                        <div className="flex items-center gap-3">
                          <Paperclip className="h-4 w-4 text-muted-foreground" />
                          <div>
                            <p className="text-sm font-medium">{attachment.name || `مرفق ${index + 1}`}</p>
                            <p className="text-xs text-muted-foreground">
                              {attachment.size ? `${(attachment.size / 1024).toFixed(2)} KB` : 'حجم غير معروف'}
                            </p>
                          </div>
                        </div>
                        <div className="flex gap-2">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => window.open(attachment.url, '_blank')}
                          >
                            <ExternalLink className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => {
                              const a = document.createElement('a');
                              a.href = attachment.url;
                              a.download = attachment.name || `attachment-${index + 1}`;
                              a.click();
                            }}
                          >
                            <Download className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-sm text-muted-foreground text-center py-4">
                    لا توجد مرفقات
                  </p>
                )}
              </CardContent>
            </Card>

            {/* التعليقات */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-lg">
                  <MessageSquare className="h-5 w-5" />
                  التعليقات
                  {request.comments && request.comments.length > 0 && (
                    <Badge variant="secondary" className="mr-2">
                      {request.comments.length}
                    </Badge>
                  )}
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* قائمة التعليقات */}
                <ScrollArea className="h-[300px] pr-4">
                  {request.comments && request.comments.length > 0 ? (
                    <div className="space-y-3">
                      {request.comments.map((comment: any) => (
                        <div
                          key={comment.id}
                          className="p-3 border rounded-lg bg-muted/30"
                        >
                          <div className="flex items-start justify-between mb-2">
                            <div className="flex items-center gap-2">
                              <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center">
                                <User className="h-4 w-4 text-primary" />
                              </div>
                              <div>
                                <p className="text-sm font-medium">
                                  {comment.userName || 'مستخدم'}
                                </p>
                                <p className="text-xs text-muted-foreground">
                                  {comment.createdAt
                                    ? format(new Date(comment.createdAt), 'dd MMM yyyy, HH:mm', { locale: ar })
                                    : ''}
                                </p>
                              </div>
                            </div>
                          </div>
                          <p className="text-sm leading-relaxed pr-10 mt-2 whitespace-pre-wrap">
                            {comment.comment || 'لا يوجد محتوى'}
                          </p>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-sm text-muted-foreground text-center py-8">
                      لا توجد تعليقات بعد
                    </p>
                  )}
                </ScrollArea>

                <Separator />

                {/* إضافة تعليق جديد */}
                <div className="space-y-2">
                  <Textarea
                    placeholder="اكتب تعليقك هنا..."
                    value={newComment}
                    onChange={(e) => setNewComment(e.target.value)}
                    rows={3}
                    className="resize-none"
                  />
                  <div className="flex justify-end">
                    <Button
                      onClick={handleAddComment}
                      disabled={!newComment.trim() || addCommentMutation.isPending}
                      size="sm"
                    >
                      <Send className="h-4 w-4 ml-2" />
                      إرسال التعليق
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
}

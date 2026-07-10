import React, { useState } from "react";
import { trpc } from "@/lib/trpc";
import { useAuth } from "@/_core/hooks/useAuth";
import DashboardLayout from "@/components/DashboardLayout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { toast } from "sonner";
import {
  LifeBuoy,
  Plus,
  MessageSquare,
  Paperclip,
  CheckCircle2,
  AlertCircle,
  Clock,
  Send,
  Trash2,
  User,
  Image as ImageIcon,
  Loader2,
  FileQuestion,
  ShieldAlert,
  FileText,
} from "lucide-react";

const getSafeAttachments = (attachments: any): string[] => {
  if (!attachments) return [];
  if (Array.isArray(attachments)) return attachments;
  if (typeof attachments === "string") {
    try {
      const parsed = JSON.parse(attachments);
      if (Array.isArray(parsed)) return parsed;
    } catch {
      if (attachments.startsWith("http")) {
        return [attachments];
      }
    }
  }
  return [];
};

const getSafeReplies = (replies: any): any[] => {
  if (!replies) return [];
  if (Array.isArray(replies)) return replies;
  if (typeof replies === "string") {
    try {
      const parsed = JSON.parse(replies);
      if (Array.isArray(parsed)) return parsed;
    } catch {
      return [];
    }
  }
  return [];
};

const renderFileThumbnail = (url: string) => {
  const extension = url.split(".").pop()?.toLowerCase() || "";
  const isImage = ["png", "jpg", "jpeg", "webp", "gif"].includes(extension);
  const isVideo = ["mp4", "mov", "avi", "mkv", "webm"].includes(extension);

  if (isImage) {
    return <img src={url} alt="attachment" className="w-full h-full object-cover" />;
  }

  if (isVideo) {
    return (
      <div className="w-full h-full bg-slate-950 flex items-center justify-center relative">
        <video src={url} className="w-full h-full object-cover opacity-80" muted />
        <span className="absolute bottom-1 right-1 text-[9px] bg-black/60 text-white px-1 rounded">فيديو</span>
      </div>
    );
  }

  return (
    <div className="w-full h-full bg-slate-50 flex flex-col items-center justify-center p-2 border border-slate-100">
      <FileText className="w-8 h-8 text-slate-400 mb-1" />
      <span className="text-[10px] text-slate-500 font-medium truncate max-w-full uppercase">{extension}</span>
    </div>
  );
};

export default function SupportTickets() {
  const { user } = useAuth();
  const utils = trpc.useUtils();

  const userPermissions = (user as any)?.permissions ?? [];
  const hasCreate = userPermissions.includes("Create_Ticket") || userPermissions.includes("*");
  const hasView = userPermissions.includes("View_Tickets") || userPermissions.includes("*");

  // State
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [ticketType, setTicketType] = useState<"technical_issue" | "suggestion">("technical_issue");
  const [description, setDescription] = useState("");
  const [attachments, setAttachments] = useState<string[]>([]);
  const [uploading, setUploading] = useState(false);
  const [selectedTicketId, setSelectedTicketId] = useState<number | null>(null);
  const [replyMessage, setReplyMessage] = useState("");

  // Queries
  const { data: myTickets, isLoading: loadingMyTickets } = trpc.supportTickets.getMyTickets.useQuery(undefined, {
    enabled: hasCreate && !hasView,
  });

  const { data: allTickets, isLoading: loadingAllTickets } = trpc.supportTickets.getAllTickets.useQuery(undefined, {
    enabled: hasView,
  });

  const { data: selectedTicket, isLoading: loadingTicketDetails } = trpc.supportTickets.getTicketById.useQuery(
    { id: selectedTicketId || 0 },
    { enabled: !!selectedTicketId }
  );

  // Mutations
  const createTicketMutation = trpc.supportTickets.createTicket.useMutation({
    onSuccess: () => {
      toast.success("تم تقديم تذكرة الدعم الفني بنجاح.");
      setIsCreateOpen(false);
      setDescription("");
      setAttachments([]);
      utils.supportTickets.getMyTickets.invalidate();
    },
    onError: (err) => {
      toast.error(err.message || "فشل إنشاء التذكرة");
    },
  });

  const addReplyMutation = trpc.supportTickets.addReply.useMutation({
    onSuccess: () => {
      setReplyMessage("");
      utils.supportTickets.getTicketById.invalidate({ id: selectedTicketId || 0 });
      utils.supportTickets.getAllTickets.invalidate();
      utils.supportTickets.getMyTickets.invalidate();
    },
    onError: (err) => {
      toast.error(err.message || "فشل إرسال الرد");
    },
  });

  const updateStatusMutation = trpc.supportTickets.updateStatus.useMutation({
    onSuccess: () => {
      toast.success("تم تحديث حالة التذكرة بنجاح.");
      utils.supportTickets.getTicketById.invalidate({ id: selectedTicketId || 0 });
      utils.supportTickets.getAllTickets.invalidate();
    },
    onError: (err) => {
      toast.error(err.message || "فشل تحديث الحالة");
    },
  });

  // File Upload Handlers
  const uploadFile = async (file: File) => {
    // Client-side validation: accept images, videos, and files, prevent executables
    const executableExtensions = [
      "exe", "bat", "cmd", "sh", "msi", "dll", "scr", "vbs", "com", "bin", "jar", "app", "dmg", "elf"
    ];
    const fileExtension = file.name.split(".").pop()?.toLowerCase() || "";
    if (executableExtensions.includes(fileExtension)) {
      toast.error("نوع الملف غير مدعوم أو غير آمن. يُمنع رفع الملفات البرمجية والتنفيذية.");
      return;
    }

    if (file.size > 50 * 1024 * 1024) {
      toast.error("حجم الملف كبير جداً، الحد الأقصى المسموح به هو 50 ميجابايت");
      return;
    }

    setUploading(true);
    try {
      const formData = new FormData();
      formData.append("file", file);
      formData.append("folder", "support-tickets");

      const response = await fetch("/api/upload", {
        method: "POST",
        body: formData,
      });

      if (!response.ok) {
        const errData = await response.json();
        throw new Error(errData.error || "فشل رفع الملف");
      }

      const data = await response.json();
      setAttachments((prev) => [...prev, data.url]);
      toast.success("تم رفع الصورة بنجاح");
    } catch (error: any) {
      toast.error(error.message || "حدث خطأ أثناء رفع الملف");
    } finally {
      setUploading(false);
    }
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      await uploadFile(e.target.files[0]);
    }
  };

  const handlePaste = async (e: React.ClipboardEvent) => {
    const items = e.clipboardData.items;
    for (let i = 0; i < items.length; i++) {
      if (items[i].type.indexOf("image") !== -1) {
        const file = items[i].getAsFile();
        if (file) {
          const renamedFile = new File([file], `screenshot-${Date.now()}.png`, { type: file.type });
          await uploadFile(renamedFile);
        }
      }
    }
  };

  const removeAttachment = (indexToRemove: number) => {
    setAttachments((prev) => prev.filter((_, idx) => idx !== indexToRemove));
  };

  const handleSubmitTicket = (e: React.FormEvent) => {
    e.preventDefault();
    if (!description.trim() || description.length < 10) {
      toast.error("وصف المشكلة يجب ألا يقل عن 10 أحرف");
      return;
    }
    createTicketMutation.mutate({
      ticketType,
      description,
      attachments,
    });
  };

  const handleSendReply = (e: React.FormEvent) => {
    e.preventDefault();
    if (!replyMessage.trim() || !selectedTicketId) return;
    addReplyMutation.mutate({
      ticketId: selectedTicketId,
      message: replyMessage,
    });
  };

  const handleStatusChange = (status: "pending" | "resolved" | "needs_clarification") => {
    if (!selectedTicketId) return;
    updateStatusMutation.mutate({
      ticketId: selectedTicketId,
      status,
    });
  };

  // Status badge renderer
  const renderStatusBadge = (status: string) => {
    switch (status) {
      case "pending":
        return (
          <Badge variant="outline" className="bg-yellow-50 text-yellow-700 border-yellow-200 gap-1 font-normal">
            <Clock className="w-3.5 h-3.5" />
            قيد الانتظار
          </Badge>
        );
      case "resolved":
        return (
          <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200 gap-1 font-normal">
            <CheckCircle2 className="w-3.5 h-3.5" />
            تم الحل
          </Badge>
        );
      case "needs_clarification":
        return (
          <Badge variant="outline" className="bg-red-50 text-red-700 border-red-200 gap-1 font-normal">
            <AlertCircle className="w-3.5 h-3.5" />
            تحتاج توضيح
          </Badge>
        );
      default:
        return <Badge variant="secondary">{status}</Badge>;
    }
  };

  // FAQ Items
  const faqItems = [
    {
      q: "كيف يمكنني تقديم طلب خدمة لمسجد؟",
      a: "يمكنك ذلك بالذهاب إلى صفحة 'الطلبات' من القائمة الجانبية، ثم النقر على زر 'طلب خدمة جديد' واختيار نوع الخدمة وتعبئة البيانات المطلوبة الخاصة بالمسجد.",
    },
    {
      q: "ما هي الفترة الزمنية المتوقعة لمعالجة التذاكر الفنية؟",
      a: "يعمل فريق الاستجابة والدعم الفني على حل المشكلات الطارئة خلال 24 ساعة، والمقترحات العامة يتم تحويلها للإدارات المختصة لدراستها ومراجعتها.",
    },
    {
      q: "كيف يمكنني إرفاق لقطة الشاشة (Screenshot) للتوضيح؟",
      a: "عند تعبئة نموذج التذكرة، يمكنك ببساطة الضغط على حقل 'وصف المشكلة' ثم الضغط على Ctrl+V (أو Paste) للصق لقطة الشاشة مباشرة، وسيتم رفعها تلقائياً.",
    },
    {
      q: "هل يمكنني تعديل بيانات التذكرة بعد إرسالها؟",
      a: "لا يمكن تعديل التذكرة مباشرة بعد الإرسال، ولكن يمكنك كتابة رد توضيحي إضافي داخل التذكرة للتواصل مع الدعم الفني.",
    },
  ];

  if (!user) {
    return (
      <DashboardLayout>
        <div className="flex flex-col items-center justify-center min-h-[60vh] text-center p-6">
          <Loader2 className="w-12 h-12 animate-spin text-primary mb-4" />
          <p className="text-gray-500">جاري تحميل البيانات والتحقق منها...</p>
        </div>
      </DashboardLayout>
    );
  }

  if (!hasCreate && !hasView) {
    return (
      <DashboardLayout>
        <div className="flex flex-col items-center justify-center min-h-[60vh] text-center p-6">
          <ShieldAlert className="w-16 h-16 text-destructive mb-4" />
          <h2 className="text-2xl font-bold text-gray-800 mb-2">غير مصرح لك بالوصول</h2>
          <p className="text-gray-600">ليس لديك صلاحية لعرض أو تقديم تذاكر الدعم الفني.</p>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="space-y-6 p-1 md:p-4 dir-rtl text-right">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-gray-100 pb-5">
          <div>
            <h1 className="text-3xl font-extrabold text-gray-900 tracking-tight flex items-center gap-2">
              <LifeBuoy className="w-8 h-8 text-primary" />
              الدعم الفني
            </h1>
            <p className="text-gray-500 mt-1 text-sm">
              {hasView
                ? "إدارة تذاكر الدعم الفني والردود وتحديث الحالات والشكاوى الواردة"
                : "تواصل مع فريق الدعم الفني واطلع على الأسئلة الشائعة والمقترحات"}
            </p>
          </div>

          {/* User Create Ticket Button */}
          {hasCreate && !hasView && (
            <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
              <DialogTrigger asChild>
                <Button className="gap-2 font-bold px-5">
                  <Plus className="w-5 h-5" />
                  تواصل مع الدعم الفني
                </Button>
              </DialogTrigger>
              <DialogContent className="fixed top-0 left-0 translate-x-0 translate-y-0 w-screen h-screen max-w-none max-h-none rounded-none border-none p-0 m-0 flex flex-col bg-background overflow-hidden" onOpenAutoFocus={(e) => e.preventDefault()}>
                <ScrollArea className="flex-1 w-full">
                  <div className="w-full px-6 py-10 md:px-10 flex flex-col space-y-6 text-right">
                    <DialogHeader className="text-right">
                      <DialogTitle className="text-3xl font-extrabold flex items-center gap-2 text-gray-900">
                        <LifeBuoy className="w-8 h-8 text-primary" />
                        إنشاء تذكرة دعم جديدة
                      </DialogTitle>
                      <DialogDescription className="text-sm text-gray-500 mt-1">
                        يرجى تعبئة النموذج أدناه وتوضيح المشكلة أو المقترح بأكبر قدر ممكن من التفاصيل.
                      </DialogDescription>
                    </DialogHeader>

                    <form onSubmit={handleSubmitTicket} className="space-y-6 pt-4 text-right">
                      <div className="space-y-2">
                        <label className="text-sm font-semibold text-gray-700 block">نوع التذكرة</label>
                        <Select
                          value={ticketType}
                          onValueChange={(val: any) => setTicketType(val)}
                        >
                          <SelectTrigger className="w-full text-right justify-between flex-row-reverse h-11">
                            <SelectValue placeholder="اختر نوع الطلب" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="technical_issue">مشكلة فنية</SelectItem>
                            <SelectItem value="suggestion">مقترح</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>

                      <div className="space-y-2">
                        <label className="text-sm font-semibold text-gray-700 block">الوصف والتفاصيل</label>
                        <Textarea
                          placeholder="اكتب تفاصيل المشكلة الفنية أو المقترح هنا... (الحد الأدنى 10 أحرف)"
                          value={description}
                          onChange={(e) => setDescription(e.target.value)}
                          onPaste={handlePaste}
                          className="min-h-[220px] text-right text-base leading-relaxed p-4"
                          required
                        />
                        <p className="text-xs text-gray-400">
                          💡 نصيحة: يمكنك نسخ أي لقطة شاشة ولصقها مباشرة (Ctrl+V) في هذا الحقل لرفعها كمرفق.
                        </p>
                      </div>

                      {/* Attachments Section */}
                      <div className="space-y-3">
                        <label className="text-sm font-semibold text-gray-700 block">المرفقات والملفات</label>
                        
                        {/* Thumbnails of already uploaded files */}
                        {attachments.length > 0 && (
                          <div className="grid grid-cols-4 md:grid-cols-6 gap-3 p-4 bg-gray-50 rounded-xl border border-gray-100">
                            {attachments.map((url, idx) => (
                              <div key={idx} className="relative group aspect-square rounded-lg overflow-hidden border border-gray-200 bg-white">
                                {renderFileThumbnail(url)}
                                <button
                                  type="button"
                                  onClick={() => removeAttachment(idx)}
                                  className="absolute top-1 right-1 bg-red-600 hover:bg-red-700 text-white rounded-full p-1 shadow-sm opacity-90 transition-opacity"
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                </button>
                              </div>
                            ))}
                          </div>
                        )}

                        <div className="flex items-center gap-3">
                          <Button
                            type="button"
                            variant="outline"
                            className="gap-2 text-gray-600 h-11 px-5"
                            disabled={uploading}
                            onClick={() => document.getElementById("support-file-input")?.click()}
                          >
                            {uploading ? (
                              <Loader2 className="w-4 h-4 animate-spin text-primary" />
                            ) : (
                              <ImageIcon className="w-4 h-4 text-gray-500" />
                            )}
                            إرفاق ملف / صورة / فيديو
                          </Button>
                          <input
                            id="support-file-input"
                            type="file"
                            accept="image/*,video/*,application/pdf,.doc,.docx,.xls,.xlsx,.txt"
                            className="hidden"
                            onChange={handleFileChange}
                            disabled={uploading}
                          />
                          {uploading && <span className="text-xs text-gray-500 animate-pulse">جاري معالجة الملف ورفعه...</span>}
                        </div>
                      </div>

                      <DialogFooter className="gap-2 sm:justify-start pt-6 border-t border-gray-100 flex-row-reverse">
                        <Button type="submit" disabled={createTicketMutation.isPending || uploading} className="font-bold px-8 h-11 text-base">
                          {createTicketMutation.isPending ? "جاري الإرسال..." : "إرسال التذكرة"}
                        </Button>
                        <Button
                          type="button"
                          variant="outline"
                          onClick={() => setIsCreateOpen(false)}
                          disabled={createTicketMutation.isPending}
                          className="px-8 h-11 text-base"
                        >
                          إلغاء
                        </Button>
                      </DialogFooter>
                    </form>
                  </div>
                </ScrollArea>
              </DialogContent>
            </Dialog>
          )}
        </div>

        {/* ======================================================== */}
        {/* 1. واجهة المستخدمين (طالبي الخدمة) */}
        {/* ======================================================== */}
        {hasCreate && !hasView && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* My Tickets List (2/3 width) */}
            <div className="lg:col-span-2 space-y-4">
              <h2 className="text-xl font-bold text-gray-900 flex items-center gap-2">
                <MessageSquare className="w-5 h-5 text-gray-600" />
                تذاكرك الحالية
              </h2>

              {loadingMyTickets ? (
                <div className="space-y-3">
                  {[1, 2].map((i) => (
                    <Card key={i} className="animate-pulse">
                      <CardContent className="h-24 bg-gray-50 rounded-xl" />
                    </Card>
                  ))}
                </div>
              ) : myTickets && myTickets.length > 0 ? (
                <div className="space-y-3">
                  {myTickets.map((ticket) => (
                    <Card
                      key={ticket.id}
                      className={`cursor-pointer transition-all border hover:border-primary/50 hover:shadow-sm ${
                        selectedTicketId === ticket.id ? "border-primary bg-primary/5 ring-1 ring-primary/30" : "border-gray-200"
                      }`}
                      onClick={() => setSelectedTicketId(ticket.id)}
                    >
                      <CardHeader className="p-4 pb-2">
                        <div className="flex justify-between items-start">
                          <span className="text-xs text-gray-400">
                            #{ticket.id} • {new Date(ticket.createdAt).toLocaleDateString("ar-SA")}
                          </span>
                          {renderStatusBadge(ticket.status)}
                        </div>
                        <CardTitle className="text-base font-bold text-gray-800 mt-2">
                          {ticket.ticketType === "technical_issue" ? "⚠️ مشكلة فنية" : "💡 مقترح وتحسين"}
                        </CardTitle>
                      </CardHeader>
                      <CardContent className="p-4 pt-0">
                        <p className="text-sm text-gray-600 line-clamp-2 leading-relaxed">
                          {ticket.description}
                        </p>
                        {ticket.replies && (ticket.replies as any[]).length > 0 && (
                          <div className="mt-3 text-xs text-primary flex items-center gap-1.5 font-semibold">
                            <MessageSquare className="w-3.5 h-3.5" />
                            يوجد {(ticket.replies as any[]).length} ردود ومراسلات
                          </div>
                        )}
                      </CardContent>
                    </Card>
                  ))}
                </div>
              ) : (
                <Card className="border-dashed border-2 border-gray-200 bg-gray-50/50">
                  <CardContent className="flex flex-col items-center justify-center py-12 text-center">
                    <FileQuestion className="w-12 h-12 text-gray-300 mb-3" />
                    <p className="font-bold text-gray-700">لا توجد تذاكر دعم فني بعد</p>
                    <p className="text-sm text-gray-400 max-w-md mt-1">
                      إذا واجهت أي عطل أو أردت تقديم مقترح، انقر على زر "تواصل مع الدعم الفني" لتقديم تذكرتك الأولى.
                    </p>
                  </CardContent>
                </Card>
              )}
            </div>

            {/* FAQ & Quick Support (1/3 width) */}
            <div className="space-y-4">
              <h2 className="text-xl font-bold text-gray-900 flex items-center gap-2">
                <FileQuestion className="w-5 h-5 text-gray-600" />
                الأسئلة الشائعة
              </h2>
              <Card className="border border-gray-200 overflow-hidden shadow-sm">
                <CardContent className="p-4">
                  <Accordion type="single" collapsible className="w-full">
                    {faqItems.map((item, idx) => (
                      <AccordionItem key={idx} value={`item-${idx}`} className="border-b border-gray-100 last:border-0 py-1">
                        <AccordionTrigger className="text-right hover:no-underline font-semibold text-gray-800 text-sm py-3 leading-relaxed">
                          {item.q}
                        </AccordionTrigger>
                        <AccordionContent className="text-gray-600 text-xs leading-relaxed pt-1 pb-3">
                          {item.a}
                        </AccordionContent>
                      </AccordionItem>
                    ))}
                  </Accordion>
                </CardContent>
              </Card>
            </div>
          </div>
        )}

        {/* ======================================================== */}
        {/* 2. لوحة تحكم المسؤول (Admins) */}
        {/* ======================================================== */}
        {hasView && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Tickets List Table (1.2/3 width) */}
            <div className="lg:col-span-1.5 space-y-4">
              <h2 className="text-xl font-bold text-gray-900 flex items-center gap-2">
                <MessageSquare className="w-5 h-5 text-gray-600" />
                قائمة التذاكر الواردة
              </h2>

              {loadingAllTickets ? (
                <div className="space-y-3">
                  {[1, 2, 3].map((i) => (
                    <Card key={i} className="animate-pulse">
                      <CardContent className="h-20 bg-gray-50 rounded-xl" />
                    </Card>
                  ))}
                </div>
              ) : allTickets && allTickets.length > 0 ? (
                <div className="space-y-2 max-h-[70vh] overflow-y-auto pr-1">
                  {allTickets.map((ticket) => (
                    <Card
                      key={ticket.id}
                      className={`cursor-pointer transition-all border hover:border-primary/50 ${
                        selectedTicketId === ticket.id ? "border-primary bg-primary/5" : "border-gray-200"
                      }`}
                      onClick={() => setSelectedTicketId(ticket.id)}
                    >
                      <CardContent className="p-4">
                        <div className="flex justify-between items-start gap-2">
                          <div className="space-y-1 text-right">
                            <span className="text-xs text-gray-400">
                              #{ticket.id} • {new Date(ticket.createdAt).toLocaleDateString("ar-SA")}
                            </span>
                            <h3 className="font-bold text-gray-900 text-sm">
                              {ticket.ticketType === "technical_issue" ? "⚠️ مشكلة فنية" : "💡 مقترح وتحسين"}
                            </h3>
                            <p className="text-xs text-gray-500 font-semibold">{ticket.userName || "مستفيد"}</p>
                          </div>
                          {renderStatusBadge(ticket.status)}
                        </div>
                        <p className="text-xs text-gray-600 line-clamp-1 mt-2">{ticket.description}</p>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              ) : (
                <Card className="border-dashed border-2 border-gray-200 bg-gray-50">
                  <CardContent className="flex flex-col items-center justify-center py-16 text-center">
                    <CheckCircle2 className="w-12 h-12 text-gray-300 mb-3" />
                    <p className="font-bold text-gray-700">لا توجد تذاكر دعم فني واردة</p>
                    <p className="text-sm text-gray-400 mt-1">كل شيء على ما يرام! لا توجد طلبات معلقة.</p>
                  </CardContent>
                </Card>
              )}
            </div>

            {/* Selected Ticket Conversation Panel (1.8/3 width) */}
            <div className="lg:col-span-2 space-y-4">
              <h2 className="text-xl font-bold text-gray-900 flex items-center gap-2">
                <MessageSquare className="w-5 h-5 text-gray-600" />
                معاينة التذكرة والرد عليها
              </h2>

              {selectedTicketId ? (
                loadingTicketDetails ? (
                  <Card className="animate-pulse h-[60vh] bg-gray-50 border border-gray-200 rounded-2xl" />
                ) : selectedTicket ? (
                  <Card className="border border-gray-200 rounded-2xl overflow-hidden shadow-sm flex flex-col min-h-[65vh]">
                    {/* Header */}
                    <div className="p-4 bg-gray-50 border-b border-gray-200 flex flex-col md:flex-row justify-between items-start md:items-center gap-3">
                      <div>
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="text-xs text-gray-400 font-mono">#{selectedTicket.id}</span>
                          <span className="font-bold text-gray-900">
                            {selectedTicket.ticketType === "technical_issue" ? "⚠️ مشكلة فنية" : "💡 مقترح وتحسين"}
                          </span>
                          {renderStatusBadge(selectedTicket.status)}
                        </div>
                        <div className="text-xs text-gray-500 mt-1 font-semibold">
                          المرسل: {selectedTicket.userName} ({selectedTicket.userEmail}) •{" "}
                          {new Date(selectedTicket.createdAt).toLocaleString("ar-SA")}
                        </div>
                      </div>

                      {/* Status select for Admin */}
                      {hasView && (
                        <div className="flex items-center gap-2">
                          <span className="text-xs text-gray-500 font-semibold shrink-0">تحديث الحالة:</span>
                          <Select
                            value={selectedTicket.status}
                            onValueChange={handleStatusChange}
                          >
                            <SelectTrigger className="w-[140px] text-right justify-between flex-row-reverse h-9">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="pending">قيد الانتظار</SelectItem>
                              <SelectItem value="resolved">تم الحل</SelectItem>
                              <SelectItem value="needs_clarification">تحتاج توضيح</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                      )}
                    </div>

                    {/* Content Scroll Area */}
                    <ScrollArea className="flex-1 p-5 bg-white space-y-4">
                      {/* Ticket Description */}
                      <div className="bg-gray-50/70 border border-gray-100 rounded-2xl p-4 space-y-3">
                        <div className="font-bold text-gray-800 text-sm border-b border-gray-200/60 pb-1.5 flex items-center gap-1.5">
                          <User className="w-4 h-4 text-primary" />
                          نص المشكلة / المقترح الوارد:
                        </div>
                        <p className="text-gray-700 text-sm leading-relaxed whitespace-pre-wrap">
                          {selectedTicket.description}
                        </p>

                        {/* Attachments */}
                        {getSafeAttachments(selectedTicket.attachments).length > 0 && (
                          <div className="pt-3 border-t border-gray-200/50">
                            <span className="text-xs font-bold text-gray-500 block mb-2 flex items-center gap-1">
                              <Paperclip className="w-3.5 h-3.5" />
                              المرفقات:
                            </span>
                            <div className="grid grid-cols-4 gap-2">
                              {getSafeAttachments(selectedTicket.attachments).map((url, index) => (
                                <a
                                  key={index}
                                  href={url}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="block border border-gray-200 rounded-lg overflow-hidden hover:opacity-90 transition-opacity bg-white aspect-square shadow-sm"
                                >
                                  {renderFileThumbnail(url)}
                                </a>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>

                      <Separator className="my-5" />

                      {/* Chat / Replies Section */}
                      <div className="space-y-4">
                        <div className="text-xs font-bold text-gray-400 uppercase tracking-wider">الردود والمراسلات</div>
                        
                        {getSafeReplies(selectedTicket.replies).length > 0 ? (
                          <div className="space-y-3">
                            {getSafeReplies(selectedTicket.replies).map((reply) => {
                              const isMe = reply.senderId === user?.id;
                              return (
                                <div
                                  key={reply.id}
                                  className={`flex gap-2.5 max-w-[85%] ${isMe ? "mr-auto flex-row-reverse" : "ml-auto"}`}
                                >
                                  <div className="w-8 h-8 rounded-full bg-gray-100 border border-gray-200 flex items-center justify-center shrink-0">
                                    <User className="w-4 h-4 text-gray-600" />
                                  </div>
                                  <div
                                    className={`rounded-2xl p-3 text-sm leading-relaxed ${
                                      isMe ? "bg-primary text-primary-foreground rounded-tr-none" : "bg-gray-100 text-gray-800 rounded-tl-none"
                                    }`}
                                  >
                                    <span className="text-[10px] font-bold block mb-1 opacity-80">
                                      {reply.senderName} • {new Date(reply.createdAt).toLocaleTimeString("ar-SA", { hour: "numeric", minute: "2-digit" })}
                                    </span>
                                    {reply.message}
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        ) : (
                          <div className="text-center text-xs text-gray-400 py-6">
                            لا توجد ردود على هذه التذكرة بعد.
                          </div>
                        )}
                      </div>
                    </ScrollArea>

                    {/* Footer - Send message */}
                    <form onSubmit={handleSendReply} className="p-4 bg-gray-50 border-t border-gray-200 flex items-center gap-3">
                      <Input
                        value={replyMessage}
                        onChange={(e) => setReplyMessage(e.target.value)}
                        placeholder="اكتب ردك أو استفسارك هنا..."
                        className="flex-grow bg-white text-right h-10 rounded-xl"
                        required
                      />
                      <Button type="submit" size="icon" className="h-10 w-10 shrink-0 rounded-xl" disabled={addReplyMutation.isPending}>
                        <Send className="w-4 h-4" />
                      </Button>
                    </form>
                  </Card>
                ) : null
              ) : (
                <Card className="border border-gray-200 bg-gray-50/50 rounded-2xl min-h-[400px] flex flex-col items-center justify-center text-center p-6 shadow-inner">
                  <MessageSquare className="w-12 h-12 text-gray-300 mb-3" />
                  <p className="font-bold text-gray-700">لم يتم تحديد تذكرة</p>
                  <p className="text-sm text-gray-400 mt-1 max-w-sm">
                    الرجاء اختيار إحدى التذاكر من القائمة الجانبية لمعاينة تفاصيلها، وقراءة المراسلات، وإرسال الردود.
                  </p>
                </Card>
              )}
            </div>
          </div>
        )}

        {/* Selected Ticket Viewer for User (Drawer-like or Modal-like layout if selected) */}
        {hasCreate && !hasView && selectedTicketId && selectedTicket && (
          <Dialog open={!!selectedTicketId} onOpenChange={(open) => !open && setSelectedTicketId(null)}>
            <DialogContent className="max-w-3xl sm:rounded-2xl flex flex-col max-h-[90vh] overflow-hidden p-0">
              <DialogHeader className="p-5 border-b border-gray-100 text-right">
                <div className="flex justify-between items-center gap-2 flex-wrap flex-row-reverse">
                  {renderStatusBadge(selectedTicket.status)}
                  <DialogTitle className="text-xl font-bold">
                    #{selectedTicket.id} • {selectedTicket.ticketType === "technical_issue" ? "⚠️ مشكلة فنية" : "💡 مقترح وتحسين"}
                  </DialogTitle>
                </div>
                <DialogDescription className="text-xs mt-1 text-right">
                  تاريخ التقديم: {new Date(selectedTicket.createdAt).toLocaleString("ar-SA")}
                </DialogDescription>
              </DialogHeader>

              <ScrollArea className="flex-grow p-5 space-y-4">
                {/* Description */}
                <div className="bg-gray-50 rounded-xl p-4 text-right">
                  <div className="font-bold text-gray-800 text-xs mb-1.5">تفاصيل التذكرة:</div>
                  <p className="text-gray-700 text-sm leading-relaxed whitespace-pre-wrap">{selectedTicket.description}</p>
                  
                  {/* Attachments */}
                  {getSafeAttachments(selectedTicket.attachments).length > 0 && (
                    <div className="mt-4 pt-3 border-t border-gray-200/60">
                      <span className="text-xs font-bold text-gray-500 block mb-2">المرفقات:</span>
                      <div className="grid grid-cols-4 gap-2">
                        {getSafeAttachments(selectedTicket.attachments).map((url, idx) => (
                          <a
                            key={idx}
                            href={url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="block border border-gray-200 rounded-lg overflow-hidden hover:opacity-90 bg-white aspect-square shadow-sm"
                          >
                            {renderFileThumbnail(url)}
                          </a>
                        ))}
                      </div>
                    </div>
                  )}
                </div>

                <Separator className="my-5" />

                {/* Conversation List */}
                <div className="space-y-4 text-right">
                  <span className="text-xs font-bold text-gray-400 uppercase tracking-wider">الردود والمراسلات</span>
                  
                  {getSafeReplies(selectedTicket.replies).length > 0 ? (
                    <div className="space-y-3">
                      {getSafeReplies(selectedTicket.replies).map((reply) => {
                        const isMe = reply.senderId === user?.id;
                        return (
                          <div
                            key={reply.id}
                            className={`flex gap-2.5 max-w-[85%] ${isMe ? "mr-auto flex-row-reverse" : "ml-auto"}`}
                          >
                            <div className="w-8 h-8 rounded-full bg-gray-100 border border-gray-200 flex items-center justify-center shrink-0">
                              <User className="w-4 h-4 text-gray-600" />
                            </div>
                            <div
                              className={`rounded-2xl p-3 text-sm leading-relaxed ${
                                isMe ? "bg-primary text-primary-foreground rounded-tr-none" : "bg-gray-100 text-gray-800 rounded-tl-none"
                              }`}
                            >
                              <span className="text-[10px] font-bold block mb-1 opacity-80">
                                {reply.senderName} • {new Date(reply.createdAt).toLocaleTimeString("ar-SA", { hour: "numeric", minute: "2-digit" })}
                              </span>
                              {reply.message}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  ) : (
                    <div className="text-center text-xs text-gray-400 py-6">لا توجد ردود على هذه التذكرة بعد.</div>
                  )}
                </div>
              </ScrollArea>

              {/* Send Reply Input */}
              <form onSubmit={handleSendReply} className="p-4 bg-gray-50 border-t border-gray-100 flex items-center gap-3">
                <Input
                  value={replyMessage}
                  onChange={(e) => setReplyMessage(e.target.value)}
                  placeholder="اكتب استفساراً أو رداً إضافياً..."
                  className="flex-grow bg-white text-right h-10 rounded-xl"
                  required
                />
                <Button type="submit" size="icon" className="h-10 w-10 shrink-0 rounded-xl" disabled={addReplyMutation.isPending}>
                  <Send className="w-4 h-4" />
                </Button>
              </form>
            </DialogContent>
          </Dialog>
        )}
      </div>
    </DashboardLayout>
  );
}

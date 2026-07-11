import React, { useState, useEffect, useRef } from "react";
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
  X,
  Search,
  Filter,
  Info,
  Lightbulb,
  Download
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
      <span className="text-[10px] text-slate-550 font-medium truncate max-w-full uppercase">{extension}</span>
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
  const [replyAttachments, setReplyAttachments] = useState<string[]>([]);
  const [replyUploading, setReplyUploading] = useState(false);
  const [previewDoc, setPreviewDoc] = useState<{ url: string; title: string } | null>(null);

  // Search & Filter State
  const [faqSearch, setFaqSearch] = useState("");
  const [adminStatusFilter, setAdminStatusFilter] = useState<string>("all");
  const [adminTypeFilter, setAdminTypeFilter] = useState<string>("all");
  const [adminSearchQuery, setAdminSearchQuery] = useState("");

  // Queries
  const { data: myTickets, isLoading: loadingMyTickets } = trpc.supportTickets.getMyTickets.useQuery(undefined, {
    enabled: hasCreate && !hasView,
    refetchInterval: 15000,
  });

  const { data: allTickets, isLoading: loadingAllTickets } = trpc.supportTickets.getAllTickets.useQuery(undefined, {
    enabled: hasView,
    refetchInterval: 15000,
  });

  const { data: selectedTicket, isLoading: loadingTicketDetails } = trpc.supportTickets.getTicketById.useQuery(
    { id: selectedTicketId || 0 },
    { enabled: !!selectedTicketId, refetchInterval: 15000 }
  );

  // Mutations
  const createTicketMutation = trpc.supportTickets.createTicket.useMutation({
    onSuccess: () => {
      toast.success("تم تقديم تذكرة الدعم الفني بنجاح.");
      setIsCreateOpen(false);
      setDescription("");
      setAttachments([]);
      utils.supportTickets.getMyTickets.invalidate();
      if (hasView) {
        utils.supportTickets.getAllTickets.invalidate();
      }
    },
    onError: (err) => {
      toast.error(err.message || "فشل إنشاء التذكرة");
    },
  });

  const addReplyMutation = trpc.supportTickets.addReply.useMutation({
    onSuccess: () => {
      setReplyMessage("");
      setReplyAttachments([]);
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

  // تنظيف الردود التالفة عند أول تحميل (للمسؤولين فقط)
  const cleanupMutation = trpc.supportTickets.cleanupReplies.useMutation({
    onSuccess: (data) => {
      if (data.fixedCount > 0) {
        console.log(`[Support] Cleaned up corrupted replies in ${data.fixedCount} tickets`);
        utils.supportTickets.getAllTickets.invalidate();
        utils.supportTickets.getMyTickets.invalidate();
        if (selectedTicketId) {
          utils.supportTickets.getTicketById.invalidate({ id: selectedTicketId });
        }
      }
    },
  });
  const cleanupRanRef = useRef(false);
  useEffect(() => {
    if (hasView && !cleanupRanRef.current) {
      cleanupRanRef.current = true;
      cleanupMutation.mutate();
    }
  }, [hasView]);

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
      toast.success("تم رفع الملف بنجاح");
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

  const uploadReplyFile = async (file: File) => {
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

    setReplyUploading(true);
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
      setReplyAttachments((prev) => [...prev, data.url]);
      toast.success("تم رفع الملف بنجاح");
    } catch (error: any) {
      toast.error(error.message || "حدث خطأ أثناء رفع الملف");
    } finally {
      setReplyUploading(false);
    }
  };

  const handleReplyFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      await uploadReplyFile(e.target.files[0]);
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
    if (!selectedTicketId) return;
    if (!replyMessage.trim() && replyAttachments.length === 0) return;
    addReplyMutation.mutate({
      ticketId: selectedTicketId,
      message: replyMessage.trim() || "تم إرفاق ملف/مستند",
      attachments: replyAttachments,
    });
  };

  const handleStatusChange = (status: "pending" | "resolved" | "needs_clarification") => {
    if (!selectedTicketId) return;
    updateStatusMutation.mutate({
      ticketId: selectedTicketId,
      status,
    });
  };

  const handleViewAttachment = (url: string) => {
    if (!url) return;
    const filename = decodeURIComponent(url.split("/").pop() || "مرفق");
    setPreviewDoc({ url, title: filename });
  };

  const getFileTypeFromUrl = (url: string) => {
    const ext = url.split("?")[0].split(".").pop()?.toLowerCase() || "";
    if (["jpg", "jpeg", "png", "webp", "gif"].includes(ext)) {
      return "image";
    }
    if (ext === "pdf") {
      return "pdf";
    }
    if (["doc", "docx"].includes(ext)) {
      return "word";
    }
    if (["xls", "xlsx"].includes(ext)) {
      return "excel";
    }
    return "other";
  };

  const handleDownloadPreview = () => {
    if (!previewDoc) return;
    const link = document.createElement("a");
    link.href = previewDoc.url;
    link.download = previewDoc.title;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    toast.success("تم تحميل الملف بنجاح");
  };

  // Status badge renderer
  const renderStatusBadge = (status: string) => {
    switch (status) {
      case "pending":
        return (
          <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-950/30 dark:text-blue-400 dark:border-blue-800 gap-1.5 font-bold rounded-full text-xs py-0.5 px-2.5 shrink-0">
            <Clock className="w-3.5 h-3.5 animate-spin" style={{ animationDuration: '6s' }} />
            قيد الانتظار
          </Badge>
        );
      case "resolved":
        return (
          <Badge variant="outline" className="bg-emerald-50 text-emerald-700 border-emerald-200 gap-1.5 font-bold rounded-full text-xs py-0.5 px-2.5 shrink-0">
            <CheckCircle2 className="w-3.5 h-3.5" />
            تم الحل
          </Badge>
        );
      case "needs_clarification":
        return (
          <Badge variant="outline" className="bg-rose-50 text-rose-700 border-rose-200 gap-1.5 font-bold rounded-full text-xs py-0.5 px-2.5 shrink-0">
            <AlertCircle className="w-3.5 h-3.5 animate-bounce" />
            تحتاج توضيح
          </Badge>
        );
      default:
        return <Badge variant="secondary" className="rounded-full text-xs py-0.5 px-2.5 shrink-0">{status}</Badge>;
    }
  };

  // User Ticket Stats Calculations
  const userTotal = myTickets?.length || 0;
  const userPending = myTickets?.filter(t => t.status === "pending").length || 0;
  const userResolved = myTickets?.filter(t => t.status === "resolved").length || 0;
  const userNeedsClarification = myTickets?.filter(t => t.status === "needs_clarification").length || 0;

  // Admin Ticket Stats Calculations
  const adminTotal = allTickets?.length || 0;
  const adminPending = allTickets?.filter(t => t.status === "pending").length || 0;
  const adminResolved = allTickets?.filter(t => t.status === "resolved").length || 0;
  const adminNeedsClarification = allTickets?.filter(t => t.status === "needs_clarification").length || 0;

  // FAQ Items
  const faqItems = [
    {
      q: "كيف يمكنني تقديم تذكرة دعم فني جديدة؟",
      a: "يمكنك تقديم تذكرة جديدة بالضغط على زر 'تواصل مع الدعم الفني' في أعلى الصفحة، ثم اختيار نوع الطلب (مشكلة فنية أو مقترح)، وكتابة التفاصيل وإرفاق الملفات اللازمة.",
    },
    {
      q: "ما هي الفترة الزمنية المتوقعة للرد على التذكرة؟",
      a: "يعمل فريق الدعم الفني على مراجعة التذاكر والرد عليها خلال 24 ساعة كحد أقصى. سيتم إرسال إشعار لك فور إضافة أي رد جديد من قبل الفريق المتابع.",
    },
    {
      q: "ماذا تعني الحالات المختلفة للتذكرة؟",
      a: "تتغير حالة التذكرة لتعبر عن تقدم العمل: (قيد الانتظار) تعني أن التذكرة تحت المراجعة، (تم الحل) تعني أنه تم معالجة المشكلة وإغلاق البلاغ بنجاح، (تحتاج توضيح) تعني أن الدعم يحتاج معلومات إضافية منك.",
    },
    {
      q: "هل يمكنني إعادة فتح التذكرة بعد إغلاقها؟",
      a: "نعم، إذا تم تحويل حالة التذكرة إلى 'تم الحل' ولكن المشكلة لا تزال مستمرة، يمكنك كتابة رد توضيحي إضافي داخل نفس التذكرة وسيعاد فتحها تلقائياً لمتابعتها مجدداً.",
    },
  ];

  // Filtered FAQs based on user search query
  const filteredFaqs = faqItems.filter((faq) => {
    if (!faqSearch.trim()) return true;
    const q = faqSearch.toLowerCase();
    return faq.q.toLowerCase().includes(q) || faq.a.toLowerCase().includes(q);
  });

  // Filtered tickets on admin dashboard
  const filteredTickets = allTickets?.filter((ticket) => {
    // Status filter
    if (adminStatusFilter !== "all" && ticket.status !== adminStatusFilter) {
      return false;
    }
    // Type filter
    if (adminTypeFilter !== "all" && ticket.ticketType !== adminTypeFilter) {
      return false;
    }
    // Search query
    if (adminSearchQuery.trim()) {
      const q = adminSearchQuery.toLowerCase();
      const matchId = ticket.id.toString().includes(q);
      const matchUser = ticket.userName?.toLowerCase().includes(q) || false;
      const matchDesc = ticket.description.toLowerCase().includes(q);
      return matchId || matchUser || matchDesc;
    }
    return true;
  });

  if (!user) {
    return (
      <DashboardLayout>
        <div className="flex flex-col items-center justify-center min-h-[60vh] text-center p-6">
          <Loader2 className="w-12 h-12 animate-spin text-primary mb-4" />
          <p className="text-gray-500 font-bold">جاري تحميل البيانات والتحقق منها...</p>
        </div>
      </DashboardLayout>
    );
  }

  if (!hasCreate && !hasView) {
    return (
      <DashboardLayout>
        <div className="flex flex-col items-center justify-center min-h-[60vh] text-center p-6">
          <ShieldAlert className="w-16 h-16 text-destructive mb-4 animate-pulse" />
          <h2 className="text-2xl font-black text-gray-800 mb-2">غير مصرح لك بالوصول</h2>
          <p className="text-gray-600 font-semibold">ليس لديك صلاحية لعرض أو تقديم تذاكر الدعم الفني.</p>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="space-y-6 p-1 md:p-4 text-right" dir="rtl">
        {/* Banner / Header */}
        <div className="relative overflow-hidden rounded-2xl bg-gradient-to-l from-teal-700 via-teal-800 to-[#09707e] text-white p-6 md:p-8 shadow-md">
          {/* Islamic pattern background overlay */}
          <div className="absolute inset-0 opacity-10 bg-cover bg-center islamic-pattern" />
          <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
            <div className="space-y-2">
              <h1 className="text-3xl md:text-4xl font-black tracking-tight flex items-center gap-3 !leading-normal py-1">
                <LifeBuoy className="w-9 h-9 text-teal-200 animate-pulse" />
                مركز الدعم الفني
              </h1>
              <p className="text-teal-50/90 max-w-xl text-sm md:text-base leading-relaxed font-medium">
                {hasView
                  ? "لوحة إدارة تذاكر الدعم الفني، متابعة بلاغات المستخدمين، الردود وتحديث حالات الطلبات والمقترحات الواردة."
                  : "مرحباً بك في مركز الدعم. نحن هنا لمساعدتك! يمكنك تقديم تذكرة لمشكلة فنية تواجهها، أو اقتراح ميزة ترغب بإضافتها."}
              </p>
            </div>

            {/* User Create Ticket Button */}
            {hasCreate && (
              <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
                <DialogTrigger asChild>
                  <Button className="bg-white hover:bg-teal-50 text-teal-900 gap-2 font-bold px-6 py-5 text-base shadow-lg hover:shadow-xl hover:scale-[1.02] transition-all shrink-0">
                    <Plus className="w-5 h-5" />
                    تواصل مع الدعم الفني
                  </Button>
                </DialogTrigger>
                <DialogContent
                  dir="rtl"
                  showCloseButton={false}
                  className="!fixed !top-0 !left-0 !translate-x-0 !translate-y-0 !w-screen !h-screen !max-w-none !max-h-none !rounded-none !border-none !p-0 !m-0 flex flex-col bg-slate-50 dark:bg-slate-950 overflow-hidden"
                  onOpenAutoFocus={(e) => e.preventDefault()}
                >
                  {/* Modal Header */}
                  <div className="w-full sticky top-0 z-50 bg-white/90 dark:bg-slate-900/90 backdrop-blur-md border-b border-slate-200/80 dark:border-slate-800/80 px-6 pt-6 pb-4 md:px-10 flex items-center justify-between shadow-xs">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center text-primary">
                        <LifeBuoy className="w-5 h-5" />
                      </div>
                      <div>
                        <DialogTitle className="text-xl font-black text-slate-900 dark:text-slate-50 !leading-normal py-0.5">
                          إنشاء تذكرة دعم جديدة
                        </DialogTitle>
                        <DialogDescription className="text-xs text-slate-500 dark:text-slate-400 mt-0.5 font-medium">
                          يرجى تعبئة النموذج أدناه وتوضيح التفاصيل بأكبر قدر ممكن.
                        </DialogDescription>
                      </div>
                    </div>
                    
                    {/* RTL Close button on left */}
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      onClick={() => setIsCreateOpen(false)}
                      className="w-10 h-10 rounded-full hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                    >
                      <X className="w-5 h-5 text-slate-500" />
                    </Button>
                  </div>

                  <div className="flex-1 w-full overflow-y-auto bg-slate-50/50 dark:bg-slate-900/10">
                    <div className="w-full max-w-4xl mx-auto px-6 py-8 md:py-12 flex flex-col space-y-8 text-right">
                      <form onSubmit={handleSubmitTicket} className="space-y-6 text-right bg-white dark:bg-slate-900 p-6 md:p-8 rounded-2xl border border-slate-200/60 dark:border-slate-800/60 shadow-sm">
                        
                        {/* Custom Ticket Type Chooser */}
                        <div className="space-y-3">
                          <label className="text-sm font-bold text-slate-700 dark:text-slate-300 block">نوع التذكرة</label>
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <button
                              type="button"
                              onClick={() => setTicketType("technical_issue")}
                              className={`p-4 rounded-xl border-2 text-right transition-all flex items-start gap-4 ${
                                ticketType === "technical_issue"
                                  ? "border-primary bg-primary/5 ring-2 ring-primary/20"
                                  : "border-slate-250 dark:border-slate-800 hover:border-slate-350 dark:hover:border-slate-700 bg-white dark:bg-slate-900"
                              }`}
                            >
                              <div className={`p-2.5 rounded-lg shrink-0 ${
                                ticketType === "technical_issue" ? "bg-primary/20 text-primary" : "bg-slate-100 dark:bg-slate-850 text-slate-500"
                              }`}>
                                <AlertCircle className="w-6 h-6" />
                              </div>
                              <div>
                                <div className="font-bold text-base text-slate-950 dark:text-white">مشكلة فنية</div>
                                <div className="text-xs text-slate-500 dark:text-slate-400 mt-1 font-medium leading-relaxed">عطل بالبوابة، مشكلة بالدخول، خطأ في البيانات أو مشكلة فنية أخرى</div>
                              </div>
                            </button>

                            <button
                              type="button"
                              onClick={() => setTicketType("suggestion")}
                              className={`p-4 rounded-xl border-2 text-right transition-all flex items-start gap-4 ${
                                ticketType === "suggestion"
                                  ? "border-primary bg-primary/5 ring-2 ring-primary/20"
                                  : "border-slate-250 dark:border-slate-800 hover:border-slate-350 dark:hover:border-slate-700 bg-white dark:bg-slate-900"
                              }`}
                            >
                              <div className={`p-2.5 rounded-lg shrink-0 ${
                                ticketType === "suggestion" ? "bg-primary/20 text-primary" : "bg-slate-100 dark:bg-slate-850 text-slate-500"
                              }`}>
                                <LifeBuoy className="w-6 h-6" />
                              </div>
                              <div>
                                <div className="font-bold text-base text-slate-950 dark:text-white">مقترح وتحسين</div>
                                <div className="text-xs text-slate-500 dark:text-slate-400 mt-1 font-medium leading-relaxed">فكرة لتحسين تجربة الاستخدام، ميزة جديدة ترغب بإضافتها أو ملاحظات عامة</div>
                              </div>
                            </button>
                          </div>
                        </div>

                        {/* Description field */}
                        <div className="space-y-2">
                          <label className="text-sm font-bold text-slate-700 dark:text-slate-300 block">الوصف والتفاصيل</label>
                          <div className="relative">
                            <Textarea
                              placeholder="يرجى وصف المشكلة الفنية أو المقترح بالتفصيل هنا... (الحد الأدنى 10 أحرف)"
                              value={description}
                              onChange={(e) => setDescription(e.target.value)}
                              onPaste={handlePaste}
                              className="min-h-[220px] text-right text-base leading-relaxed p-4 rounded-xl border border-slate-200 dark:border-slate-800 focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary shadow-xs transition-all bg-white dark:bg-slate-950 text-slate-800 dark:text-slate-200"
                              required
                            />
                            <span className="absolute bottom-3 left-3 text-xs text-slate-500 dark:text-slate-400 font-semibold bg-slate-100 dark:bg-slate-900 px-2 py-0.5 rounded border border-slate-200/50 dark:border-slate-800/50">
                              {description.length} حرف
                            </span>
                          </div>
                        </div>

                        {/* Attachments */}
                        <div className="space-y-4">
                          <label className="text-sm font-bold text-slate-700 dark:text-slate-300 block">المرفقات والملفات الداعمة</label>
                          
                          {attachments.length > 0 && (
                            <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-5 gap-4 p-4 bg-slate-50 dark:bg-slate-950 rounded-2xl border border-slate-200/60 dark:border-slate-800/60">
                              {attachments.map((url, idx) => (
                                <div key={idx} className="relative group aspect-square rounded-xl overflow-hidden border border-slate-200 dark:border-slate-850 bg-white dark:bg-slate-900 shadow-2xs hover:shadow-xs transition-all">
                                  {renderFileThumbnail(url)}
                                  <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                                    <button
                                      type="button"
                                      onClick={() => removeAttachment(idx)}
                                      className="bg-red-650 hover:bg-red-700 text-white rounded-full p-2 shadow-md transform scale-90 group-hover:scale-100 transition-all hover:scale-105"
                                      title="حذف الملف"
                                    >
                                      <Trash2 className="w-4 h-4" />
                                    </button>
                                  </div>
                                </div>
                              ))}
                            </div>
                          )}

                          <div className="flex items-center justify-center w-full">
                            <label
                              htmlFor="support-file-input"
                              className={`flex flex-col items-center justify-center w-full h-36 border-2 border-dashed rounded-2xl cursor-pointer transition-all ${
                                uploading
                                  ? "border-primary/50 bg-primary/5 cursor-not-allowed"
                                  : "border-slate-300 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-900 bg-white dark:bg-slate-950"
                              }`}
                            >
                              <div className="flex flex-col items-center justify-center pt-5 pb-6 text-center px-4">
                                {uploading ? (
                                  <>
                                    <Loader2 className="w-8 h-8 animate-spin text-primary mb-3" />
                                    <p className="text-sm font-bold text-slate-700 dark:text-slate-300">جاري معالجة الملف ورفعه...</p>
                                    <p className="text-xs text-slate-400 mt-1 font-semibold">الرجاء الانتظار قليلاً</p>
                                  </>
                                ) : (
                                  <>
                                    <div className="w-10 h-10 rounded-xl bg-slate-100 dark:bg-slate-850 flex items-center justify-center text-slate-550 mb-2">
                                      <ImageIcon className="w-5 h-5 text-slate-500" />
                                    </div>
                                    <p className="text-sm font-bold text-slate-700 dark:text-slate-300">
                                      اضغط لرفع ملف أو صورة أو فيديو
                                    </p>
                                    <p className="text-xs text-slate-400 mt-1 font-medium">
                                      يمكنك إرفاق صور، فيديوهات، أو ملفات PDF حتى 50 ميجابايت
                                    </p>
                                  </>
                                )}
                              </div>
                              <input
                                id="support-file-input"
                                type="file"
                                accept="image/*,video/*,application/pdf,.doc,.docx,.xls,.xlsx,.txt"
                                className="hidden"
                                onChange={handleFileChange}
                                disabled={uploading}
                              />
                            </label>
                          </div>
                        </div>

                        {/* Footer buttons */}
                        <div className="flex items-center justify-start gap-3 pt-6 border-t border-slate-200 dark:border-slate-800 flex-row-reverse">
                          <Button
                            type="submit"
                            disabled={createTicketMutation.isPending || uploading}
                            className="font-bold px-8 h-11 text-base bg-primary hover:bg-primary/90 text-primary-foreground shadow-sm hover:shadow-md transition-all rounded-xl"
                          >
                            {createTicketMutation.isPending ? (
                              <>
                                <Loader2 className="w-4 h-4 animate-spin shrink-0 ml-2" />
                                جاري الإرسال...
                              </>
                            ) : (
                              "إرسال التذكرة"
                            )}
                          </Button>
                          <Button
                            type="button"
                            variant="outline"
                            onClick={() => setIsCreateOpen(false)}
                            disabled={createTicketMutation.isPending}
                            className="px-8 h-11 text-base rounded-xl border-slate-200 dark:border-slate-800 hover:bg-slate-100 dark:hover:bg-slate-900 transition-colors"
                          >
                            إلغاء
                          </Button>
                        </div>
                      </form>
                    </div>
                  </div>
                </DialogContent>
              </Dialog>
            )}
          </div>
        </div>

        {/* ======================================================== */}
        {/* 1. واجهة المستخدمين (طالبي الخدمة) */}
        {/* ======================================================== */}
        {hasCreate && !hasView && (
          <div className="space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6" style={{ minHeight: selectedTicketId ? '70vh' : 'auto' }}>
              {/* My Tickets List (1/3 width - right side in RTL) */}
              <div className="lg:col-span-1 space-y-4">
                <div className="flex items-center justify-between flex-wrap gap-2">
                  <h2 className="text-xl font-bold text-slate-800 dark:text-slate-200 flex items-center gap-2 !leading-normal py-1">
                    <MessageSquare className="w-5 h-5 text-slate-500" />
                    تذاكرك الحالية
                    {myTickets && myTickets.length > 0 && (
                      <span className="px-2.5 py-0.5 rounded-full text-xs bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 font-bold border border-slate-200 dark:border-slate-700">
                        {myTickets.length}
                      </span>
                    )}
                  </h2>
                </div>

                {loadingMyTickets ? (
                  <div className="space-y-3">
                    {[1, 2].map((i) => (
                      <Card key={i} className="animate-pulse bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800">
                        <CardContent className="h-28 rounded-xl" />
                      </Card>
                    ))}
                  </div>
                ) : myTickets && myTickets.length > 0 ? (
                  <div className="space-y-3 max-h-[65vh] overflow-y-auto pr-1">
                    {myTickets.map((ticket) => (
                      <div
                        key={ticket.id}
                        className={`cursor-pointer transition-all border p-4 rounded-xl relative shadow-2xs hover:shadow-xs text-right ${
                          selectedTicketId === ticket.id
                            ? "border-primary bg-primary/5 ring-1 ring-primary/10"
                            : "border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 hover:border-slate-300 dark:hover:border-slate-700"
                        } ${
                          ticket.status === "pending"
                            ? "border-r-4 border-r-blue-500"
                            : ticket.status === "resolved"
                            ? "border-r-4 border-r-emerald-500"
                            : "border-r-4 border-r-rose-500"
                        }`}
                        onClick={() => setSelectedTicketId(ticket.id)}
                      >
                        <div className="flex justify-between items-start gap-2 flex-row-reverse">
                          {renderStatusBadge(ticket.status)}
                          <div className="space-y-1 text-right">
                            <div className="flex items-center gap-1.5">
                              <span className="text-[10px] text-slate-400 font-mono">#{ticket.id}</span>
                              <span className="text-[10px] text-slate-400 font-medium">
                                • {new Date(ticket.createdAt).toLocaleDateString("ar-SA")}
                              </span>
                            </div>
                            <h3 className="font-bold text-slate-800 dark:text-slate-200 text-sm !leading-normal py-0.5 flex items-center gap-1.5 justify-end">
                              <span>{ticket.ticketType === "technical_issue" ? "مشكلة فنية" : "مقترح وتحسين"}</span>
                              {ticket.ticketType === "technical_issue" ? (
                                <AlertCircle className="w-3.5 h-3.5 text-rose-500 shrink-0" />
                              ) : (
                                <Lightbulb className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
                              )}
                            </h3>
                          </div>
                        </div>
                        <p className="text-xs text-slate-605 dark:text-slate-400 truncate mt-2 font-medium">{ticket.description}</p>
                        {getSafeReplies(ticket.replies).length > 0 && (
                          <div className="mt-2 text-xs text-primary flex items-center gap-1.5 font-bold justify-end">
                            <span>يوجد {getSafeReplies(ticket.replies).length} ردود ومراسلات</span>
                            <MessageSquare className="w-3.5 h-3.5" />
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="flex flex-col items-center justify-center p-12 text-center bg-white dark:bg-slate-900 border-2 border-dashed border-slate-200 dark:border-slate-800 rounded-2xl shadow-3xs">
                    <div className="w-16 h-16 rounded-2xl bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-slate-400 dark:text-slate-500 mb-4 animate-bounce">
                      <FileQuestion className="w-8 h-8" />
                    </div>
                    <h3 className="text-lg font-bold text-slate-800 dark:text-slate-200 mb-1">لا توجد تذاكر دعم فني بعد</h3>
                    <p className="text-sm text-slate-500 dark:text-slate-400 max-w-md mb-6 leading-relaxed font-medium">
                      إذا واجهت أي مشكلة فنية أو أردت تقديم اقتراح لتحسين البوابة، يمكنك إنشاء تذكرة دعم فني جديدة في أي وقت.
                    </p>
                    <Button onClick={() => setIsCreateOpen(true)} className="btn-primary flex items-center gap-2 px-6">
                      <Plus className="w-4 h-4" />
                      إنشاء تذكرتك الأولى
                    </Button>
                  </div>
                )}
              </div>

              {/* Ticket Detail & Replies Panel (2/3 width - left side in RTL) */}
              <div className="lg:col-span-2">
                {selectedTicketId && selectedTicket ? (
                  <div className="flex flex-col bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-xs overflow-hidden" style={{ height: '70vh' }}>
                    {/* Panel Header */}
                    <div className="pt-5 pb-3.5 px-5 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between bg-slate-50/50 dark:bg-slate-950/50 shrink-0">
                      <div className="space-y-1 text-right">
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-mono bg-slate-200 dark:bg-slate-850 px-2 py-0.5 rounded text-slate-500">#{selectedTicket.id}</span>
                          <h3 className="text-base font-bold text-slate-900 dark:text-white !leading-normal py-0.5 flex items-center gap-1.5">
                            {selectedTicket.ticketType === "technical_issue" ? (
                              <AlertCircle className="w-4 h-4 text-rose-500 shrink-0" />
                            ) : (
                              <Lightbulb className="w-4 h-4 text-emerald-500 shrink-0" />
                            )}
                            <span>{selectedTicket.ticketType === "technical_issue" ? "مشكلة فنية" : "مقترح وتحسين"}</span>
                          </h3>
                          {renderStatusBadge(selectedTicket.status)}
                        </div>
                        <p className="text-[10px] text-slate-500 dark:text-slate-400 font-medium">
                          تاريخ التقديم: {new Date(selectedTicket.createdAt).toLocaleString("ar-SA")}
                        </p>
                      </div>
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        onClick={() => setSelectedTicketId(null)}
                        className="w-8 h-8 rounded-full hover:bg-slate-200/80 dark:hover:bg-slate-800/80"
                      >
                        <X className="w-4 h-4 text-slate-500" />
                      </Button>
                    </div>

                    {/* Scrollable Content */}
                    <div className="flex-1 overflow-y-auto p-5 bg-slate-50/10 dark:bg-slate-900/10">
                      <div className="space-y-5">
                        {/* Description Card */}
                        <div className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800/80 rounded-xl p-4 text-right space-y-3 shadow-2xs">
                          <div className="font-bold text-slate-800 dark:text-slate-200 text-xs pb-1.5 border-b border-slate-100 dark:border-slate-850 flex items-center gap-1.5">
                            <User className="w-3.5 h-3.5 text-primary" />
                            <span>تفاصيل بلاغك:</span>
                          </div>
                          <p className="text-slate-700 dark:text-slate-350 text-sm leading-relaxed whitespace-pre-wrap font-medium break-words [word-break:break-word]">
                            {selectedTicket.description}
                          </p>
                          
                          {/* Attachments */}
                          {getSafeAttachments(selectedTicket.attachments).length > 0 && (
                            <div className="mt-4 pt-3 border-t border-slate-100 dark:border-slate-850">
                              <span className="text-xs font-bold text-slate-450 dark:text-slate-500 block mb-2 flex items-center gap-1.5">
                                <Paperclip className="w-3.5 h-3.5" />
                                المرفقات ({getSafeAttachments(selectedTicket.attachments).length})
                              </span>
                              <div className="grid grid-cols-4 gap-2">
                                {getSafeAttachments(selectedTicket.attachments).map((url, idx) => (
                                  <button
                                    key={idx}
                                    type="button"
                                    onClick={() => handleViewAttachment(url)}
                                    className="block border border-slate-200 dark:border-slate-800 rounded-lg overflow-hidden hover:opacity-90 bg-white dark:bg-slate-900 aspect-square shadow-2xs w-full text-right p-0 focus:outline-none"
                                  >
                                    {renderFileThumbnail(url)}
                                  </button>
                                ))}
                              </div>
                            </div>
                          )}
                        </div>

                        <div className="relative flex items-center justify-center my-4">
                          <Separator className="w-full" />
                          <span className="absolute bg-slate-50 dark:bg-slate-900 px-3 text-[9px] font-bold text-slate-400 tracking-wider">
                            الردود والمراسلات
                          </span>
                        </div>

                        {/* Conversation List */}
                        <div className="space-y-4">
                          {getSafeReplies(selectedTicket.replies).length > 0 ? (
                            <div className="space-y-4">
                              {getSafeReplies(selectedTicket.replies).map((reply) => {
                                const isMe = reply.senderId === user?.id;
                                return (
                                  <div
                                    key={reply.id}
                                    className={`flex gap-3 max-w-[85%] ${isMe ? "mr-auto flex-row-reverse" : "ml-auto"}`}
                                  >
                                    <div className="w-8 h-8 rounded-xl bg-slate-100 dark:bg-slate-800 border border-slate-200 flex items-center justify-center shrink-0">
                                      <User className="w-4 h-4 text-slate-500" />
                                    </div>
                                    <div className="space-y-1">
                                      <div
                                        className={`rounded-2xl p-3.5 text-sm leading-relaxed shadow-2xs ${
                                          isMe
                                            ? "bg-teal-600 text-white rounded-tr-none"
                                            : "bg-white dark:bg-slate-950 text-slate-800 dark:text-slate-200 border border-slate-200/60 dark:border-slate-800/60 rounded-tl-none"
                                        }`}
                                      >
                                        <p className="whitespace-pre-wrap font-medium break-words [word-break:break-word]">{reply.message}</p>
                                        {getSafeAttachments((reply as any).attachments).length > 0 && (
                                          <div className={`mt-3 pt-2.5 border-t ${isMe ? 'border-white/20' : 'border-slate-100 dark:border-slate-800'} grid grid-cols-2 gap-1.5 min-w-[180px]`}>
                                            {getSafeAttachments((reply as any).attachments).map((url, index) => (
                                              <button
                                                key={index}
                                                type="button"
                                                onClick={() => handleViewAttachment(url)}
                                                className="block border border-slate-200/50 dark:border-slate-800/50 rounded-lg overflow-hidden hover:opacity-90 bg-white dark:bg-slate-900 aspect-square shadow-3xs w-full text-right p-0 focus:outline-none"
                                              >
                                                {renderFileThumbnail(url)}
                                              </button>
                                            ))}
                                          </div>
                                        )}
                                      </div>
                                      <span className={`text-[9px] font-bold block ${isMe ? "text-left" : "text-right"} text-slate-400`}>
                                        {reply.senderName} • {new Date(reply.createdAt).toLocaleTimeString("ar-SA", { hour: "numeric", minute: "2-digit" })}
                                      </span>
                                    </div>
                                  </div>
                                );
                              })}
                            </div>
                          ) : (
                            <div className="text-center text-xs text-slate-400 dark:text-slate-500 py-8">
                              لا توجد ردود على هذه التذكرة بعد. سيقوم فريق الدعم بالرد عليك قريباً.
                            </div>
                          )}
                        </div>
                      </div>
                    </div>

                    <div className="border-t border-slate-100 dark:border-slate-850 bg-slate-50 dark:bg-slate-900 flex flex-col shrink-0">
                      {/* Attached files preview list */}
                      {replyAttachments.length > 0 && (
                        <div className="flex flex-wrap gap-2 p-3 bg-slate-100/50 dark:bg-slate-950/50 border-b border-slate-150 dark:border-slate-850">
                          {replyAttachments.map((url, idx) => (
                            <div key={idx} className="relative group w-14 h-14 rounded-lg overflow-hidden border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-2xs">
                              {renderFileThumbnail(url)}
                              <button
                                type="button"
                                onClick={() => setReplyAttachments(prev => prev.filter((_, i) => i !== idx))}
                                className="absolute top-0 right-0 bg-red-650 hover:bg-red-700 text-white rounded-bl-lg p-1 transition-all"
                              >
                                <X className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          ))}
                        </div>
                      )}
                      
                      <form onSubmit={handleSendReply} className="p-4 flex items-center gap-3">
                        <input
                          type="file"
                          id="user-reply-file-input"
                          accept="image/*,video/*,application/pdf,.doc,.docx,.xls,.xlsx,.txt"
                          className="hidden"
                          onChange={handleReplyFileChange}
                          disabled={replyUploading}
                        />
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          onClick={() => document.getElementById("user-reply-file-input")?.click()}
                          disabled={replyUploading}
                          className="h-11 w-11 shrink-0 rounded-xl hover:bg-slate-200 dark:hover:bg-slate-800 bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-850"
                        >
                          {replyUploading ? (
                            <Loader2 className="w-4 h-4 animate-spin text-primary" />
                          ) : (
                            <Paperclip className="w-4 h-4 text-slate-500 dark:text-slate-400" />
                          )}
                        </Button>

                        <Input
                          value={replyMessage}
                          onChange={(e) => setReplyMessage(e.target.value)}
                          placeholder="اكتب استفساراً أو رداً إضافياً لفريق الدعم..."
                          className="flex-grow bg-white dark:bg-slate-900 text-right h-11 rounded-xl border-slate-200 dark:border-slate-800 pr-4 text-sm"
                          required={replyAttachments.length === 0}
                        />
                        <Button type="submit" size="icon" className="h-11 w-11 shrink-0 rounded-xl bg-primary hover:bg-primary/90 text-primary-foreground shadow-sm" disabled={addReplyMutation.isPending || replyUploading}>
                          {addReplyMutation.isPending ? (
                            <Loader2 className="w-4 h-4 animate-spin" />
                          ) : (
                            <Send className="w-4 h-4 transform rotate-180" />
                          )}
                        </Button>
                      </form>
                    </div>
                  </div>
                ) : (
                  /* Placeholder when no ticket is selected */
                  <div className="flex flex-col items-center justify-center h-full min-h-[40vh] text-center bg-white dark:bg-slate-900 border-2 border-dashed border-slate-200 dark:border-slate-800 rounded-2xl p-8">
                    <div className="w-16 h-16 rounded-2xl bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-slate-400 dark:text-slate-500 mb-4">
                      <MessageSquare className="w-8 h-8" />
                    </div>
                    <h3 className="text-lg font-bold text-slate-700 dark:text-slate-300 mb-1">اختر تذكرة لعرض التفاصيل</h3>
                    <p className="text-sm text-slate-500 dark:text-slate-400 max-w-sm leading-relaxed font-medium">
                      اضغط على أي تذكرة من القائمة لعرض تفاصيلها والردود والمراسلات المتعلقة بها.
                    </p>
                  </div>
                )}
              </div>
            </div>

            {/* FAQ Section - Below the main grid */}
            <div className="space-y-4">
              <h2 className="text-xl font-bold text-slate-800 dark:text-slate-200 flex items-center gap-2 !leading-normal py-1">
                <FileQuestion className="w-5 h-5 text-slate-550" />
                الأسئلة الشائعة
              </h2>
              <Card className="border border-slate-200 dark:border-slate-800 overflow-hidden shadow-2xs bg-white dark:bg-slate-900 rounded-2xl">
                <div className="p-4 bg-slate-50/50 dark:bg-slate-950/50 border-b border-slate-100 dark:border-slate-850">
                  <div className="relative max-w-md">
                    <Input
                      value={faqSearch}
                      onChange={(e) => setFaqSearch(e.target.value)}
                      placeholder="ابحث في الأسئلة الشائعة..."
                      className="pr-10 pl-4 h-9 text-right rounded-lg bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 text-xs"
                    />
                    <Search className="w-4 h-4 text-slate-400 absolute top-2.5 right-3" />
                  </div>
                </div>
                <CardContent className="p-4 pt-1 text-right">
                  {filteredFaqs.length > 0 ? (
                    <Accordion type="single" collapsible className="w-full">
                      {filteredFaqs.map((item, idx) => (
                        <AccordionItem key={idx} value={`item-${idx}`} className="border-b border-slate-100 dark:border-slate-850 last:border-0 py-1">
                          <AccordionTrigger className="text-right hover:no-underline font-bold text-slate-700 dark:text-slate-350 text-sm py-3.5 leading-relaxed hover:text-primary transition-colors">
                            {item.q}
                          </AccordionTrigger>
                          <AccordionContent className="text-slate-650 dark:text-slate-400 text-xs leading-relaxed pt-1 pb-3.5 font-medium text-right">
                            {item.a}
                          </AccordionContent>
                        </AccordionItem>
                      ))}
                    </Accordion>
                  ) : (
                    <div className="text-center py-8 text-slate-400 dark:text-slate-500 text-xs font-semibold">
                      لا توجد نتائج بحث مطابقة.
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
          </div>
        )}

        {/* ======================================================== */}
        {/* 2. لوحة تحكم المسؤول (Admins) */}
        {/* ======================================================== */}
        {hasView && (
          <div className="space-y-6">
            {/* Advanced Admin Filters (Like /pending-reports) */}
            <Card className="border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-sm rounded-2xl">
              <CardContent className="p-4 text-right">
                <div className="flex flex-col md:flex-row gap-4">
                  {/* Search Input */}
                  <div className="flex-1 relative">
                    <Search className="absolute right-3.5 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                    <Input
                      value={adminSearchQuery}
                      onChange={(e) => setAdminSearchQuery(e.target.value)}
                      placeholder="ابحث برقم التذكرة، اسم المرسل، أو محتوى التذكرة..."
                      className="pr-11 pl-4 h-11 text-right rounded-xl bg-white dark:bg-slate-950 border-slate-200 dark:border-slate-800 text-sm font-medium"
                    />
                  </div>
                  
                  {/* Dropdowns */}
                  <div className="flex flex-col sm:flex-row gap-4">
                    {/* Status Dropdown */}
                    <Select value={adminStatusFilter} onValueChange={(val) => setAdminStatusFilter(val)}>
                      <SelectTrigger className="w-full sm:w-56 h-11 rounded-xl bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 text-right justify-between flex-row-reverse text-sm font-semibold">
                        <SelectValue placeholder="حالة التذكرة" />
                      </SelectTrigger>
                      <SelectContent className="text-sm font-semibold">
                        <SelectItem value="all">جميع الحالات ({allTickets?.length || 0})</SelectItem>
                        <SelectItem value="pending">قيد الانتظار ({allTickets?.filter(t => t.status === "pending").length || 0})</SelectItem>
                        <SelectItem value="resolved">تم الحل ({allTickets?.filter(t => t.status === "resolved").length || 0})</SelectItem>
                        <SelectItem value="needs_clarification">تحتاج توضيح ({allTickets?.filter(t => t.status === "needs_clarification").length || 0})</SelectItem>
                      </SelectContent>
                    </Select>

                    {/* Type Dropdown */}
                    <Select value={adminTypeFilter} onValueChange={(val) => setAdminTypeFilter(val)}>
                      <SelectTrigger className="w-full sm:w-56 h-11 rounded-xl bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 text-right justify-between flex-row-reverse text-sm font-semibold">
                        <SelectValue placeholder="نوع التذكرة" />
                      </SelectTrigger>
                      <SelectContent className="text-sm font-semibold">
                        <SelectItem value="all">جميع الأنواع ({allTickets?.length || 0})</SelectItem>
                        <SelectItem value="technical_issue">مشاكل فنية ({allTickets?.filter(t => t.ticketType === "technical_issue").length || 0})</SelectItem>
                        <SelectItem value="suggestion">مقترحات ({allTickets?.filter(t => t.ticketType === "suggestion").length || 0})</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </CardContent>
            </Card>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* Tickets List Column (1/3 width) */}
              <div className="lg:col-span-1 space-y-4">
              <h2 className="text-xl font-bold text-slate-800 dark:text-slate-200 flex items-center gap-2 !leading-normal py-1">
                <MessageSquare className="w-5 h-5 text-slate-550" />
                قائمة التذاكر الواردة
              </h2>



              {/* Tickets List */}
              {loadingAllTickets ? (
                <div className="space-y-3">
                  {[1, 2, 3].map((i) => (
                    <Card key={i} className="animate-pulse bg-white dark:bg-slate-900 border border-slate-200">
                      <CardContent className="h-20 rounded-xl" />
                    </Card>
                  ))}
                </div>
              ) : filteredTickets && filteredTickets.length > 0 ? (
                <div className="space-y-2.5 max-h-[70vh] overflow-y-auto pr-1">
                  {filteredTickets.map((ticket) => (
                    <div
                      key={ticket.id}
                      className={`cursor-pointer transition-all border p-4 rounded-xl relative shadow-2xs hover:shadow-xs text-right ${
                        selectedTicketId === ticket.id
                          ? "border-primary bg-primary/5 ring-1 ring-primary/10"
                          : "border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 hover:border-slate-300 dark:hover:border-slate-700"
                      } ${
                        ticket.status === "pending"
                          ? "border-r-4 border-r-blue-500"
                          : ticket.status === "resolved"
                          ? "border-r-4 border-r-emerald-500"
                          : "border-r-4 border-r-rose-500"
                      }`}
                      onClick={() => setSelectedTicketId(ticket.id)}
                    >
                      <div className="flex justify-between items-start gap-2 flex-row-reverse">
                        {renderStatusBadge(ticket.status)}
                        <div className="space-y-1 text-right">
                          <div className="flex items-center gap-1.5">
                            <span className="text-[10px] text-slate-400 font-mono">#{ticket.id}</span>
                            <span className="text-[10px] text-slate-400 font-medium">
                              • {new Date(ticket.createdAt).toLocaleDateString("ar-SA")}
                            </span>
                          </div>
                          <h3 className="font-bold text-slate-800 dark:text-slate-200 text-sm !leading-normal py-0.5 flex items-center gap-1.5 justify-end">
                            <span>{ticket.ticketType === "technical_issue" ? "مشكلة فنية" : "مقترح وتحسين"}</span>
                            {ticket.ticketType === "technical_issue" ? (
                              <AlertCircle className="w-3.5 h-3.5 text-rose-500 shrink-0" />
                            ) : (
                              <Lightbulb className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
                            )}
                          </h3>
                          <p className="text-xs text-slate-500 dark:text-slate-400 font-bold">{ticket.userName || "مستفيد"}</p>
                        </div>
                      </div>
                      <p className="text-xs text-slate-600 dark:text-slate-400 truncate mt-2 font-medium">{ticket.description}</p>
                    </div>
                  ))}
                </div>
              ) : (
                <Card className="border-dashed border-2 border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/50">
                  <CardContent className="flex flex-col items-center justify-center py-16 text-center">
                    <CheckCircle2 className="w-12 h-12 text-slate-300 dark:text-slate-700 mb-3" />
                    <p className="font-bold text-slate-700 dark:text-slate-300">لا توجد تذاكر دعم فني واردة</p>
                    <p className="text-sm text-slate-400 mt-1 font-medium">كل شيء على ما يرام! لا توجد طلبات مطابقة.</p>
                  </CardContent>
                </Card>
              )}
            </div>

            {/* Selected Ticket Conversation Panel (2/3 width) */}
            <div className="lg:col-span-2 space-y-4">
              <h2 className="text-xl font-bold text-slate-800 dark:text-slate-200 flex items-center gap-2 !leading-normal py-1">
                <MessageSquare className="w-5 h-5 text-slate-550" />
                معاينة التذكرة والرد عليها
              </h2>

              {selectedTicketId ? (
                loadingTicketDetails ? (
                  <Card className="animate-pulse h-[65vh] bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl" />
                ) : selectedTicket ? (
                  <Card className="border border-slate-200 dark:border-slate-800 rounded-2xl overflow-hidden shadow-sm flex flex-col min-h-[68vh] bg-white dark:bg-slate-900">
                    {/* Panel Header */}
                    <div className="p-4 bg-slate-50 dark:bg-slate-950 border-b border-slate-200 dark:border-slate-800 flex flex-col md:flex-row justify-between items-start md:items-center gap-3">
                      <div className="space-y-1">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="text-xs font-mono bg-slate-250 dark:bg-slate-800 px-2 py-0.5 rounded text-slate-500 dark:text-slate-400">#{selectedTicket.id}</span>
                          <span className="font-bold text-slate-900 dark:text-white !leading-normal py-0.5 flex items-center gap-1.5">
                            {selectedTicket.ticketType === "technical_issue" ? (
                              <AlertCircle className="w-4 h-4 text-rose-500 shrink-0" />
                            ) : (
                              <Lightbulb className="w-4 h-4 text-emerald-500 shrink-0" />
                            )}
                            <span>{selectedTicket.ticketType === "technical_issue" ? "مشكلة فنية" : "مقترح وتحسين"}</span>
                          </span>
                          {renderStatusBadge(selectedTicket.status)}
                        </div>
                        <div className="text-xs text-slate-500 dark:text-slate-400 font-bold text-right">
                          المرسل: {selectedTicket.userName} ({selectedTicket.userEmail}) •{" "}
                          {new Date(selectedTicket.createdAt).toLocaleString("ar-SA")}
                        </div>
                      </div>

                      {/* Status select for Admin */}
                      <div className="flex items-center gap-2">
                        <span className="text-xs text-slate-500 dark:text-slate-400 font-bold shrink-0">تحديث الحالة:</span>
                        <Select
                          value={selectedTicket.status}
                          onValueChange={handleStatusChange}
                        >
                          <SelectTrigger className="w-[140px] text-right justify-between flex-row-reverse h-9 rounded-lg border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-xs font-bold">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent className="text-xs font-semibold">
                            <SelectItem value="pending">قيد الانتظار</SelectItem>
                            <SelectItem value="resolved">تم الحل</SelectItem>
                            <SelectItem value="needs_clarification">تحتاج توضيح</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </div>

                    {/* Content Scroll Area */}
                    <div className="flex-1 overflow-y-auto p-5 bg-slate-50/20 dark:bg-slate-900/10">
                      <div className="space-y-6">
                        {/* Ticket Description */}
                        <div className="bg-white dark:bg-slate-950 border border-slate-200/80 dark:border-slate-800/80 rounded-2xl p-5 shadow-xs space-y-4 text-right">
                          <div className="font-bold text-slate-850 dark:text-slate-200 text-sm border-b border-slate-100 dark:border-slate-850 pb-2 flex items-center gap-2">
                            <div className="w-7 h-7 rounded-lg bg-primary/10 flex items-center justify-center text-primary shrink-0">
                              <User className="w-4 h-4" />
                            </div>
                            <span>شرح المشكلة / المقترح الوارد:</span>
                          </div>
                          <p className="text-slate-700 dark:text-slate-350 text-sm leading-relaxed whitespace-pre-wrap font-medium break-words [word-break:break-word]">
                            {selectedTicket.description}
                          </p>

                          {/* Attachments */}
                          {getSafeAttachments(selectedTicket.attachments).length > 0 && (
                            <div className="pt-4 border-t border-slate-100 dark:border-slate-850">
                              <span className="text-xs font-bold text-slate-400 dark:text-slate-500 block mb-2.5 flex items-center gap-1.5">
                                <Paperclip className="w-3.5 h-3.5" />
                                الملفات المرفقة ({getSafeAttachments(selectedTicket.attachments).length})
                              </span>
                              <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 gap-3">
                                {getSafeAttachments(selectedTicket.attachments).map((url, index) => (
                                  <button
                                    key={index}
                                    type="button"
                                    onClick={() => handleViewAttachment(url)}
                                    className="block border border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden hover:opacity-90 transition-opacity bg-white dark:bg-slate-955 aspect-square shadow-2xs hover:shadow-xs w-full text-right p-0 focus:outline-none"
                                  >
                                    {renderFileThumbnail(url)}
                                  </button>
                                ))}
                              </div>
                            </div>
                          )}
                        </div>

                        <div className="relative flex items-center justify-center my-6">
                          <Separator className="w-full" />
                          <span className="absolute bg-slate-50 dark:bg-slate-900 px-3 text-[10px] font-bold text-slate-400 tracking-wider">
                            المراسلات والردود
                          </span>
                        </div>

                        {/* Chat / Replies Section */}
                        <div className="space-y-4">
                          {getSafeReplies(selectedTicket.replies).length > 0 ? (
                            <div className="space-y-4">
                              {getSafeReplies(selectedTicket.replies).map((reply) => {
                                const isMe = reply.senderId === user?.id;
                                return (
                                  <div
                                    key={reply.id}
                                    className={`flex gap-3 max-w-[85%] ${isMe ? "mr-auto flex-row-reverse" : "ml-auto"}`}
                                  >
                                    <div className="w-8 h-8 rounded-xl bg-slate-200 dark:bg-slate-800 border border-slate-350 dark:border-slate-705 flex items-center justify-center shrink-0">
                                      <User className="w-4 h-4 text-slate-600 dark:text-slate-405" />
                                    </div>
                                    <div className="space-y-1">
                                      <div
                                        className={`rounded-2xl p-4 text-sm leading-relaxed shadow-2xs ${
                                          isMe
                                            ? "bg-teal-600 text-white rounded-tr-none"
                                            : "bg-white dark:bg-slate-955 text-slate-800 dark:text-slate-200 border border-slate-200/60 dark:border-slate-800/60 rounded-tl-none"
                                        }`}
                                      >
                                        <p className="whitespace-pre-wrap font-medium break-words [word-break:break-word]">{reply.message}</p>
                                        {getSafeAttachments((reply as any).attachments).length > 0 && (
                                          <div className={`mt-3 pt-2.5 border-t ${isMe ? 'border-white/20' : 'border-slate-100 dark:border-slate-800'} grid grid-cols-2 gap-1.5 min-w-[180px]`}>
                                            {getSafeAttachments((reply as any).attachments).map((url, index) => (
                                              <button
                                                key={index}
                                                type="button"
                                                onClick={() => handleViewAttachment(url)}
                                                className="block border border-slate-200/50 dark:border-slate-800/50 rounded-lg overflow-hidden hover:opacity-90 bg-white dark:bg-slate-900 aspect-square shadow-3xs w-full text-right p-0 focus:outline-none"
                                              >
                                                {renderFileThumbnail(url)}
                                              </button>
                                            ))}
                                          </div>
                                        )}
                                      </div>
                                      <span className={`text-[9px] font-bold block ${isMe ? "text-left" : "text-right"} text-slate-400`}>
                                        {reply.senderName} • {new Date(reply.createdAt).toLocaleTimeString("ar-SA", { hour: "numeric", minute: "2-digit" })}
                                      </span>
                                    </div>
                                  </div>
                                );
                              })}
                            </div>
                          ) : (
                            <div className="text-center text-xs text-slate-400 dark:text-slate-550 py-10">
                              لا توجد ردود على هذه التذكرة بعد. يمكنك كتابة أول رد في الحقل أدناه.
                            </div>
                          )}
                        </div>
                      </div>
                    </div>

                    <div className="border-t border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900 flex flex-col shrink-0">
                      {/* Attached files preview list */}
                      {replyAttachments.length > 0 && (
                        <div className="flex flex-wrap gap-2 p-3 bg-slate-100/50 dark:bg-slate-950/50 border-b border-slate-150 dark:border-slate-850">
                          {replyAttachments.map((url, idx) => (
                            <div key={idx} className="relative group w-14 h-14 rounded-lg overflow-hidden border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-2xs">
                              {renderFileThumbnail(url)}
                              <button
                                type="button"
                                onClick={() => setReplyAttachments(prev => prev.filter((_, i) => i !== idx))}
                                className="absolute top-0 right-0 bg-red-650 hover:bg-red-700 text-white rounded-bl-lg p-1 transition-all"
                              >
                                <X className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          ))}
                        </div>
                      )}

                      <form onSubmit={handleSendReply} className="p-4 flex items-center gap-3">
                        <input
                          type="file"
                          id="admin-reply-file-input"
                          accept="image/*,video/*,application/pdf,.doc,.docx,.xls,.xlsx,.txt"
                          className="hidden"
                          onChange={handleReplyFileChange}
                          disabled={replyUploading}
                        />
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          onClick={() => document.getElementById("admin-reply-file-input")?.click()}
                          disabled={replyUploading}
                          className="h-11 w-11 shrink-0 rounded-xl hover:bg-slate-200 dark:hover:bg-slate-800 bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-850"
                        >
                          {replyUploading ? (
                            <Loader2 className="w-4 h-4 animate-spin text-primary" />
                          ) : (
                            <Paperclip className="w-4 h-4 text-slate-500 dark:text-slate-400" />
                          )}
                        </Button>

                        <Input
                          value={replyMessage}
                          onChange={(e) => setReplyMessage(e.target.value)}
                          placeholder="اكتب ردك هنا وسيجري إرساله للمستفيد..."
                          className="flex-grow bg-white dark:bg-slate-900 text-right h-11 rounded-xl border-slate-200 dark:border-slate-800 pr-4 text-sm"
                          required={replyAttachments.length === 0}
                        />
                        <Button type="submit" size="icon" className="h-11 w-11 shrink-0 rounded-xl bg-primary hover:bg-primary/90 text-primary-foreground shadow-sm hover:shadow-md" disabled={addReplyMutation.isPending || replyUploading}>
                          {addReplyMutation.isPending ? (
                            <Loader2 className="w-4 h-4 animate-spin" />
                          ) : (
                            <Send className="w-4 h-4 transform rotate-180" />
                          )}
                        </Button>
                      </form>
                    </div>
                  </Card>
                ) : null
              ) : (
                <Card className="border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/50 rounded-2xl min-h-[450px] flex flex-col items-center justify-center text-center p-6 shadow-inner">
                  <MessageSquare className="w-12 h-12 text-slate-300 dark:text-slate-700 mb-3" />
                  <p className="font-bold text-slate-700 dark:text-slate-300">لم يتم تحديد تذكرة</p>
                  <p className="text-sm text-slate-400 mt-1 max-w-sm font-medium">
                    الرجاء اختيار إحدى التذاكر من القائمة الجانبية لمعاينة تفاصيلها، وقراءة المراسلات، وإرسال الردود.
                  </p>
                </Card>
              )}
            </div>
          </div>
        </div>
      )}

      {/* نافذة معاينة الصور والمرفقات الفاخرة (Lightbox Modal) */}
      {previewDoc && (() => {
        const fileType = getFileTypeFromUrl(previewDoc.url);
        const isImage = fileType === "image";
        const isPdf = fileType === "pdf";

        return (
          <div 
            className="fixed inset-0 z-[9999] flex items-center justify-center bg-slate-950/90 backdrop-blur-md p-4 animate-in fade-in duration-200"
            onClick={() => setPreviewDoc(null)}
          >
            <div 
              className="relative max-w-5xl w-full h-[90vh] flex flex-col items-center bg-slate-900/95 border border-slate-800 rounded-2xl p-2 sm:p-4 shadow-2xl overflow-hidden"
              onClick={(e) => e.stopPropagation()}
            >
              {/* Close button */}
              <button 
                onClick={() => setPreviewDoc(null)}
                className="absolute top-4 right-4 bg-slate-800/80 hover:bg-red-600/80 text-white rounded-full p-2.5 transition-all z-10 shadow-lg cursor-pointer"
                title="إغلاق"
              >
                <X className="w-5 h-5" />
              </button>
 
              {/* Download button */}
              <button 
                onClick={handleDownloadPreview}
                className="absolute top-4 left-4 bg-slate-800/80 hover:bg-primary/80 text-white rounded-full p-2.5 transition-all flex items-center gap-1.5 px-4 z-10 shadow-lg cursor-pointer"
                title="تحميل"
              >
                <Download className="w-4 h-4" />
                <span className="text-xs font-bold hidden sm:inline">تحميل</span>
              </button>

              {/* Document/Image container */}
              <div className="w-full flex-1 flex items-center justify-center p-2 overflow-hidden mt-12 mb-2 min-h-[50vh]">
                {isImage ? (
                  <div className="w-full h-full flex items-center justify-center overflow-auto">
                    <img 
                      src={previewDoc.url} 
                      alt={previewDoc.title} 
                      className="max-w-full max-h-[70vh] object-contain rounded-lg shadow-md border border-slate-800 bg-white"
                    />
                  </div>
                ) : isPdf ? (
                  <iframe 
                    src={previewDoc.url} 
                    title={previewDoc.title} 
                    className="w-full h-full border border-slate-800 rounded-lg bg-white shadow-lg"
                  />
                ) : (
                  <div className="flex flex-col items-center justify-center p-8 bg-slate-850 border border-slate-700/60 rounded-2xl max-w-md w-full text-center shadow-lg">
                    <div className="p-4 bg-slate-800 rounded-full mb-4">
                      <FileText className="w-12 h-12 text-primary" />
                    </div>
                    <h3 className="text-base font-bold text-slate-100 mb-2">{previewDoc.title}</h3>
                    <p className="text-xs text-slate-400 mb-6 max-w-xs leading-relaxed">
                      هذا الملف لا يمكن معاينته مباشرة في المتصفح. يرجى تحميله لفتحه واستعراض محتواه.
                    </p>
                    <Button 
                      onClick={handleDownloadPreview}
                      className="w-full flex items-center justify-center gap-2"
                    >
                      <Download className="w-4 h-4" />
                      تحميل المستند
                    </Button>
                  </div>
                )}
              </div>

              {/* Caption/Name */}
              <div className="mt-2 text-center px-4 py-2.5 w-full border-t border-slate-800/80 bg-slate-950/20 flex justify-between items-center text-slate-300">
                <p className="text-xs font-medium flex items-center gap-1.5">
                  <Info className="h-4 w-4 text-slate-400" />
                  معاينة المرفق - {previewDoc.title}
                </p>
                <p className="text-xs font-bold truncate max-w-[200px]" dir="ltr">{previewDoc.title}</p>
              </div>
            </div>
          </div>
        );
      })()}

      </div>
    </DashboardLayout>
  );
}

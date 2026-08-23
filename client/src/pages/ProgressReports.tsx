import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import { trpc } from "@/lib/trpc";
import { useAuth } from "@/_core/hooks/useAuth";
import { usePermission } from "@/hooks/usePermission";
import DashboardLayout from "@/components/DashboardLayout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Progress } from "@/components/ui/progress";
import { Separator } from "@/components/ui/separator";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  Plus,
  Eye,
  FileText,
  CheckCircle,
  Clock,
  AlertCircle,
  TrendingUp,
  TrendingDown,
  Minus,
  Search,
  Filter,
  Calendar,
  Building2,
  Printer,
  Send,
  Edit,
  BarChart3,
  Check,
  Coins,
  CreditCard,
  ArrowRight,
  ChevronLeft,
  MoreVertical,
  Upload,
  X,
  Loader2,
  ShieldAlert,
  XCircle,
  Info,
} from "lucide-react";
import { toast } from "sonner";
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
} from "@/components/ui/dropdown-menu";

const STATUS_MAP: Record<string, { label: string; variant: "default" | "secondary" | "destructive" | "outline" }> = {
  draft: { label: "مسودة", variant: "secondary" },
  submitted: { label: "بانتظار اعتماد مدير المشروع", variant: "default" },
  pending: { label: "بانتظار اعتماد مدير المشروع", variant: "default" },
  pending_executive: { label: "بانتظار اعتماد المدير التنفيذي", variant: "default" },
  reviewed: { label: "تمت المراجعة", variant: "outline" },
  approved: { label: "معتمد", variant: "outline" },
  rejected: { label: "مرفوض", variant: "destructive" },
};

const statusConfig: Record<string, { label: string; color: string; bg: string; icon: React.ReactNode; badgeIcon: React.ReactNode; iconBg: string }> = {
  draft: {
    label: "مسودة",
    color: "text-slate-600 dark:text-slate-400",
    bg: "bg-slate-50 dark:bg-slate-900/30 border-slate-200 dark:border-slate-800",
    icon: <FileText className="w-5 h-5 text-slate-500" />,
    badgeIcon: <FileText className="w-3 h-3" />,
    iconBg: "bg-slate-100 text-slate-600 dark:bg-slate-900/30 dark:text-slate-400 border-slate-200 dark:border-slate-800",
  },
  submitted: {
    label: "بانتظار اعتماد مدير المشروع",
    color: "text-amber-700 dark:text-amber-400",
    bg: "bg-amber-50 dark:bg-amber-950/30 border-amber-200 dark:border-amber-800",
    icon: <Clock className="w-5 h-5 text-amber-500" />,
    badgeIcon: <Clock className="w-3 h-3" />,
    iconBg: "bg-amber-100 text-amber-600 dark:bg-amber-950/40 dark:text-amber-400 border-amber-200 dark:border-amber-800",
  },
  pending: {
    label: "بانتظار اعتماد مدير المشروع",
    color: "text-amber-700 dark:text-amber-400",
    bg: "bg-amber-50 dark:bg-amber-950/30 border-amber-200 dark:border-amber-800",
    icon: <Clock className="w-5 h-5 text-amber-500" />,
    badgeIcon: <Clock className="w-3 h-3" />,
    iconBg: "bg-amber-100 text-amber-600 dark:bg-amber-950/40 dark:text-amber-400 border-amber-200 dark:border-amber-800",
  },
  pending_executive: {
    label: "بانتظار اعتماد المدير التنفيذي",
    color: "text-amber-800 dark:text-amber-300",
    bg: "bg-amber-50 dark:bg-amber-950/40 border-amber-300 dark:border-amber-700",
    icon: <Clock className="w-5 h-5 text-amber-600" />,
    badgeIcon: <Clock className="w-3 h-3" />,
    iconBg: "bg-amber-100 text-amber-700 dark:bg-amber-950/50 dark:text-amber-300 border-amber-300 dark:border-amber-700",
  },
  reviewed: {
    label: "تمت المراجعة",
    color: "text-blue-700 dark:text-blue-400",
    bg: "bg-blue-50 dark:bg-blue-950/30 border-blue-200 dark:border-blue-800",
    icon: <TrendingUp className="w-5 h-5 text-blue-500" />,
    badgeIcon: <TrendingUp className="w-3 h-3" />,
    iconBg: "bg-blue-100 text-blue-600 dark:bg-blue-950/40 dark:text-blue-400 border-blue-200 dark:border-blue-800",
  },
  approved: {
    label: "معتمد",
    color: "text-emerald-700 dark:text-emerald-400",
    bg: "bg-emerald-50 dark:bg-emerald-950/30 border-emerald-200 dark:border-emerald-800",
    icon: <CheckCircle className="w-5 h-5 text-emerald-500" />,
    badgeIcon: <CheckCircle className="w-3 h-3" />,
    iconBg: "bg-emerald-100 text-emerald-600 dark:bg-emerald-950/40 dark:text-emerald-400 border-emerald-200 dark:border-emerald-800",
  },
  rejected: {
    label: "مرفوض",
    color: "text-rose-700 dark:text-rose-400",
    bg: "bg-rose-50 dark:bg-rose-950/30 border-rose-200 dark:border-rose-800",
    icon: <XCircle className="w-5 h-5 text-rose-500" />,
    badgeIcon: <XCircle className="w-3 h-3" />,
    iconBg: "bg-rose-100 text-rose-600 dark:bg-rose-950/40 dark:text-rose-400 border-rose-200 dark:border-rose-800",
  },
};

const PAYMENT_TYPE_MAP: Record<string, string> = {
  advance: "دفعة مقدمة",
  progress: "دفعة إنجاز",
  final: "دفعة ختامية",
  retention: "ضمان مسترجع",
};

const PAYMENT_STATUS_MAP: Record<string, { label: string; variant: "default" | "secondary" | "destructive" | "outline" }> = {
  paid: { label: "مدفوعة", variant: "outline" },
  pending: { label: "مستحقة", variant: "secondary" },
  draft: { label: "مسودة", variant: "secondary" },
  submitted: { label: "قيد المراجعة", variant: "default" },
  approved: { label: "معتمدة", variant: "outline" },
};

const getPaymentStatusStyles = (status: string) => {
  switch (status) {
    case "paid":
      return "bg-green-50 text-green-700 border-green-200 dark:bg-green-950/30 dark:text-green-400 dark:border-green-900/50";
    case "pending":
      return "bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/30 dark:text-amber-400 dark:border-amber-900/50";
    case "submitted":
    case "approved":
      return "bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-950/30 dark:text-blue-400 dark:border-blue-900/50";
    default:
      return "bg-gray-50 text-gray-700 border-gray-200 dark:bg-gray-800 dark:text-gray-400 dark:border-gray-700";
  }
};
function formatErrorMessage(message: string): string {
  try {
    if (message.startsWith('[') && message.endsWith(']')) {
      const parsed = JSON.parse(message);
      if (Array.isArray(parsed) && parsed.length > 0) {
        return parsed.map((err: any) => err.message || "خطأ في المدخلات").join(" \n");
      }
    }
  } catch (e) {
    // ignore
  }
  return message;
}

const compressImage = (
  base64: string,
  maxImageDimension = 800,
  imageQuality = 0.5
): Promise<{ base64: string; size: number }> => {
  return new Promise((resolve) => {
    const img = new window.Image();
    img.onload = () => {
      const canvas = document.createElement("canvas");
      let width = img.width;
      let height = img.height;
      const maxDimension = maxImageDimension;

      if (width > maxDimension || height > maxDimension) {
        if (width > height) {
          height = Math.round((height * maxDimension) / width);
          width = maxDimension;
        } else {
          width = Math.round((width * maxDimension) / height);
          height = maxDimension;
        }
      }

      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext("2d");
      ctx?.drawImage(img, 0, 0, width, height);

      const compressedBase64 = canvas.toDataURL("image/webp", imageQuality);
      const justBase64 = compressedBase64.split(",")[1];
      const approxSize = Math.round((justBase64.length * 3) / 4);
      
      resolve({
        base64: compressedBase64,
        size: approxSize,
      });
    };
    img.onerror = () => {
      resolve({
        base64,
        size: Math.round((base64.split(",")[1]?.length * 3) / 4 || 0),
      });
    };
    img.src = base64;
  });
};

const uploadFile = async (fileObj: { name: string; base64: string }): Promise<string> => {
  if (!fileObj.base64.startsWith("data:")) {
    return fileObj.base64; // It is already a URL (e.g. from an existing report)
  }
  
  try {
    const parts = fileObj.base64.split(",");
    const mime = parts[0].match(/:(.*?);/)?.[1] || "application/octet-stream";
    const bstr = atob(parts[1]);
    let n = bstr.length;
    const u8arr = new Uint8Array(n);
    
    while (n--) {
      u8arr[n] = bstr.charCodeAt(n);
    }
    
    const file = new File([u8arr], fileObj.name, { type: mime });
    const formData = new FormData();
    formData.append("file", file);
    
    const response = await fetch("/api/upload?folder=progress-reports", {
      method: "POST",
      body: formData,
    });
    
    if (!response.ok) {
      const errText = await response.text();
      throw new Error(`فشل رفع الملف: ${errText}`);
    }
    
    const data = await response.json();
    return data.url;
  } catch (err: any) {
    throw new Error(err.message || `حدث خطأ أثناء معالجة الملف ${fileObj.name}`);
  }
};

export default function ProgressReports() {
  const { user } = useAuth();
  const [, navigate] = useLocation();
  const [activeTab, setActiveTab] = useState("list");
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [page, setPage] = useState(1);
  const limit = 10;
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  // نوافذ الحوار والاعتمادات
  const [showDetailsDialog, setShowDetailsDialog] = useState(false);
  const [selectedReport, setSelectedReport] = useState<any>(null);
  const [selectedPaymentId, setSelectedPaymentId] = useState<string | null>(null);
  const [uploadedFiles, setUploadedFiles] = useState<{ name: string; size: number; base64: string; type: string }[]>([]);
  
  const [showApproveDialog, setShowApproveDialog] = useState(false);
  const [approvalNotes, setApprovalNotes] = useState("");
  const [showExceptionDialog, setShowExceptionDialog] = useState(false);
  const [exceptionNotes, setExceptionNotes] = useState("");
  const [showViewExceptionDialog, setShowViewExceptionDialog] = useState(false);
  const [showRejectDialog, setShowRejectDialog] = useState(false);
  const [rejectionReason, setRejectionReason] = useState("");
  const [showViewRejectionDialog, setShowViewRejectionDialog] = useState(false);
  const [viewRejectionReasonText, setViewRejectionReasonText] = useState("");

  const userPermissionsList = user?.permissions || [];
  const isExecutiveDirector = 
    user?.role === "general_manager" || 
    user?.role === "executive_director" || 
    (user as any)?.customRole?.nameAr === "المدير التنفيذي" ||
    (user as any)?.customRole?.nameEn?.toLowerCase() === "executive director";

  const canExceptionApprove = 
    user?.role === "super_admin" || 
    userPermissionsList.includes("progress_reports.exception_approve") || 
    userPermissionsList.includes("disbursements.exception_approve");
  
  const [newReport, setNewReport] = useState({
    projectId: 0,
    title: "",
    reportDate: new Intl.DateTimeFormat('en-CA', { year: 'numeric', month: '2-digit', day: '2-digit' }).format(new Date()),
    reportPeriodStart: "",
    reportPeriodEnd: "",
    overallProgress: 0,
    plannedProgress: 0,
    actualProgress: 0,
    workSummary: "",
    challenges: "",
    nextSteps: "",
    recommendations: "",
    budgetSpent: "",
    budgetRemaining: "",
    agreedPaymentAmount: "",
    actualWorkDone: "",
  });

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const filesList = e.target.files;
    if (!filesList) return;

    // حساب الحجم الإجمالي الحالي للملفات المضافة مسبقاً
    const currentTotalSize = uploadedFiles.reduce((sum, f) => sum + f.size, 0);
    let runningTotalSize = currentTotalSize;
    const maxTotalSizeBytes = 10 * 1024 * 1024; // 10MB

    const newFiles = Array.from(filesList);
    setIsSubmitting(true);

    try {
      for (const file of newFiles) {
        const fileName = file.name;
        const ext = fileName.split('.').pop()?.toLowerCase();

        // التحقق من صيغة HEIC/HEIF للآيفون ومنعها مع إظهار تنبيه واضح للعميل
        const isHeic = ext === "heic" || ext === "heif" || file.type === "image/heic" || file.type === "image/heif";
        if (isHeic) {
          toast.error(`عذراً، صيغة الملف HEIC/HEIF (الخاصة بأجهزة آيفون) غير مدعومة.`);
          continue;
        }

        const forbiddenExts = ['exe', 'bat', 'cmd', 'sh', 'msi', 'scr', 'pif', 'com', 'hta', 'vbs', 'js', 'jar', 'vbe', 'jse', 'wsf', 'wsh', 'ps1'];
        
        if (forbiddenExts.includes(ext || '')) {
          toast.error(`عذراً، لا يُسمح برفع الملفات التنفيذية (${fileName}) لحماية خوادم النظام.`);
          continue;
        }

        if (file.size > 10 * 1024 * 1024) {
          toast.error(`حجم الملف كبير جداً (${fileName}). الحد الأقصى هو 10 ميجابايت.`);
          continue;
        }

        if (runningTotalSize + file.size > maxTotalSizeBytes) {
          toast.error(`إجمالي حجم الملفات المرفقة يتجاوز الحد الأقصى المسموح به وهو 10 ميجابايت.`);
          break; // وقف الرفع لتجنب تجاوز الحد
        }

        // قراءة الملف كـ Base64
        const base64Data = await new Promise<string>((resolve, reject) => {
          const reader = new FileReader();
          reader.onload = (event) => resolve(event.target?.result as string);
          reader.onerror = (err) => reject(err);
          reader.readAsDataURL(file);
        });

        let finalBase64 = base64Data;
        let finalSize = file.size;
        let finalType = file.type;
        let finalName = file.name;

        // ضغط الصور فقط (باستثناء gif)
        if (file.type.startsWith("image/") && file.type !== "image/gif") {
          try {
            const compressed = await compressImage(base64Data, 800, 0.5);
            finalBase64 = compressed.base64;
            finalSize = compressed.size;
            finalType = "image/webp";
            finalName = file.name.replace(/\.[^/.]+$/, "") + ".webp";
          } catch (compressErr) {
            console.error("خطأ أثناء ضغط الصورة:", compressErr);
          }
        }

        if (runningTotalSize + finalSize > maxTotalSizeBytes) {
          toast.error(`إجمالي حجم الملفات المرفقة يتجاوز الحد الأقصى المسموح به وهو 10 ميجابايت بعد ضغط الملف ${file.name}.`);
          break;
        }

        runningTotalSize += finalSize;

        setUploadedFiles(prev => {
          if (prev.some(f => f.name === finalName)) return prev;
          return [...prev, {
            name: finalName,
            size: finalSize,
            base64: finalBase64,
            type: finalType
          }];
        });
      }
    } catch (err) {
      console.error(err);
      toast.error("حدث خطأ أثناء معالجة الملفات");
    } finally {
      setIsSubmitting(false);
    }
  };

  // استعلام لكافة تقارير الإنجاز لحساب الإحصائيات العامة بشكل دائم
  const { data: allReportsData, refetch: refetchAllReports } = trpc.progressReports.list.useQuery();

  // استعلام تقارير الإنجاز المفلترة والمبحوثة من الـ backend
  const { data: reportsData, refetch: refetchReports } = trpc.progressReports.list.useQuery({
    status: statusFilter !== "all" ? statusFilter as any : undefined,
    search: searchTerm ? searchTerm : undefined,
  });

  // استعلام طلبات الصرف للتحقق من التقارير المحولة
  const { data: disbursementRequestsData, refetch: refetchDisbursementRequests } = trpc.disbursements.listRequests.useQuery({
    limit: 1000,
  });
  
  const isExcludedProjectReport = (r: any) => {
    const titleLower = (r.title || "").toLowerCase();
    const reportNumUpper = (r.reportNumber || "").toUpperCase();
    return (
      titleLower.includes("زيارة") ||
      titleLower.includes("visit") ||
      reportNumUpper.includes("VISIT") ||
      titleLower.includes("نصف") ||
      titleLower.includes("شهري") ||
      titleLower.includes("ربعي") ||
      titleLower.includes("semi") ||
      titleLower.includes("monthly") ||
      titleLower.includes("quarterly") ||
      reportNumUpper.includes("SEMI") ||
      reportNumUpper.includes("MONTH") ||
      reportNumUpper.includes("Q")
    );
  };

  // إحصائيات تقارير الإنجاز (باستثناء تقارير المشاريع الدورية وتقارير الزيارات التي تتبع لمركز تقارير المشاريع)
  const statsData = (() => {
    const validReports = (allReportsData || []).filter((r: any) => !isExcludedProjectReport(r));
    if (validReports.length === 0) {
      return { total: 0, draft: 0, submitted: 0, reviewed: 0, approved: 0, avgProgress: 0 };
    }
    const total = validReports.length;
    const draft = validReports.filter((r: any) => r.status === "draft").length;
    const submitted = validReports.filter((r: any) => r.status === "submitted").length;
    const reviewed = validReports.filter((r: any) => r.status === "reviewed").length;
    const approved = validReports.filter((r: any) => r.status === "approved").length;
    
    const sumProgress = validReports.reduce((sum: number, r: any) => sum + (r.overallProgress || 0), 0);
    const avgProgress = Math.round(sumProgress / total);

    return { total, draft, submitted, reviewed, approved, avgProgress };
  })();

  const { data: projectsData } = trpc.projects.getAll.useQuery({});

  // جلب تفاصيل المشروع المحدد للتحقق من جدولة الدفعات
  const { data: projectDetails, isLoading: isProjectDetailsLoading } = trpc.projects.getById.useQuery(
    { id: newReport.projectId },
    { enabled: newReport.projectId > 0 }
  );

  const totalContractAmount = projectDetails?.contracts?.reduce((sum: number, c: any) => sum + parseFloat(c.amount || "0"), 0) || 0;
  const totalScheduledPayments = projectDetails?.payments?.reduce((sum: number, p: any) => sum + parseFloat(p.amount || "0"), 0) || 0;

  const hasIncompleteSchedule = newReport.projectId > 0 && !isProjectDetailsLoading && (totalContractAmount === 0 || Math.abs(totalContractAmount - totalScheduledPayments) > 0.01);

  // Mutations
  const createMutation = trpc.progressReports.create.useMutation({
    onSuccess: (data) => {
      toast.success(`تم إنشاء التقرير بنجاح - رقم ${data.reportNumber}`);
      setActiveTab("list");
      resetNewReport();
      refetchReports();
      refetchAllReports();
    },
    onError: (error) => {
      toast.error(formatErrorMessage(error.message) || "حدث خطأ أثناء إنشاء التقرير");
    },
  });

  const submitMutation = trpc.progressReports.submit.useMutation({
    onSuccess: () => {
      toast.success("تم تقديم التقرير للمراجعة");
      refetchReports();
      refetchAllReports();
    },
    onError: (error) => {
      toast.error(error.message || "حدث خطأ");
    },
  });

  const approveReportMutation = trpc.progressReports.approve.useMutation({
    onSuccess: (data) => {
      toast.success(data?.message || "تم اعتماد تقرير الإنجاز بنجاح");
      setShowApproveDialog(false);
      setShowDetailsDialog(false);
      refetchReports();
      refetchAllReports();
    },
    onError: (error) => {
      toast.error(error.message || "حدث خطأ أثناء اعتماد التقرير");
    },
  });

  const exceptionApproveReportMutation = trpc.progressReports.exceptionApprove.useMutation({
    onSuccess: (data) => {
      toast.success(data?.message || "تم تنفيذ استثناء الاعتماد بنجاح وتوثيق مبرراتك بدلاً من مدير المشروع");
      setShowExceptionDialog(false);
      setShowDetailsDialog(false);
      refetchReports();
      refetchAllReports();
    },
    onError: (error) => {
      toast.error(error.message || "حدث خطأ أثناء تنفيذ استثناء الاعتماد");
    },
  });

  const rejectReportMutation = trpc.progressReports.reject.useMutation({
    onSuccess: (data) => {
      toast.success(data?.message || "تم إلغاء/رفض التقرير بنجاح");
      setShowRejectDialog(false);
      setShowDetailsDialog(false);
      refetchReports();
      refetchAllReports();
    },
    onError: (error) => {
      toast.error(error.message || "حدث خطأ أثناء إلغاء التقرير");
    },
  });

  const reviewMutation = trpc.progressReports.review.useMutation({
    onSuccess: () => {
      toast.success("تمت المراجعة بنجاح");
      setShowDetailsDialog(false);
      refetchReports();
      refetchAllReports();
    },
    onError: (error) => {
      toast.error(error.message || "حدث خطأ");
    },
  });

  const [editingReportId, setEditingReportId] = useState<number | null>(null);

  const updateMutation = trpc.progressReports.update.useMutation({
    onSuccess: () => {
      toast.success("تم تحديث تقرير الإنجاز بنجاح");
      setActiveTab("list");
      resetNewReport();
      refetchReports();
      refetchAllReports();
    },
    onError: (error) => {
      toast.error(formatErrorMessage(error.message) || "حدث خطأ أثناء تحديث التقرير");
    },
  });

  const convertToDisbursementMutation = trpc.disbursements.createRequest.useMutation({
    onSuccess: () => {
      toast.success("تم تحويل تقرير الإنجاز بنجاح إلى طلب صرف ونقله إلى قسم طلبات الصرف!");
      refetchReports();
      refetchAllReports();
      refetchDisbursementRequests();
    },
    onError: (error) => {
      toast.error(error.message || "حدث خطأ أثناء التحويل إلى طلب صرف");
    },
  });

  // إعادة تعيين النموذج
  const resetNewReport = () => {
    setSelectedPaymentId(null);
    setEditingReportId(null);
    setUploadedFiles([]);
    setNewReport({
      projectId: 0,
      title: "",
      reportDate: new Intl.DateTimeFormat('en-CA', { year: 'numeric', month: '2-digit', day: '2-digit' }).format(new Date()),
      reportPeriodStart: "",
      reportPeriodEnd: "",
      overallProgress: 0,
      plannedProgress: 0,
      actualProgress: 0,
      workSummary: "",
      challenges: "",
      nextSteps: "",
      recommendations: "",
      budgetSpent: "",
      budgetRemaining: "",
      agreedPaymentAmount: "",
      actualWorkDone: "",
    });
  };

  // تحديث المبلغ المتبقي تلقائياً عند تغيير الحقول أو تفاصيل المشروع
  useEffect(() => {
    if (newReport.projectId > 0) {
      const budget = parseFloat(projectDetails?.budget || "0") || 0;
      const otherReports = allReportsData?.filter((r: any) => 
        r.projectId === newReport.projectId && 
        r.id !== editingReportId &&
        !isExcludedProjectReport(r)
      ) || [];
      const spentInOtherReports = otherReports.reduce((sum: number, r: any) => sum + (parseFloat(r.budgetSpent || "0") || 0), 0);
      const spentOnThisReport = parseFloat(newReport.budgetSpent || "0") || 0;
      const remaining = Math.max(0, budget - spentInOtherReports - spentOnThisReport);
      
      setNewReport(prev => {
        if (prev.budgetRemaining !== remaining.toString()) {
          return { ...prev, budgetRemaining: remaining.toString() };
        }
        return prev;
      });
    }
  }, [projectDetails, allReportsData, newReport.budgetSpent, newReport.projectId, editingReportId]);

  // معالجة اختيار الدفعة وملء الحقول تلقائياً
  const handleSelectPayment = (payment: any) => {

    const isIncomplete = payment.source !== "manual" && (
      payment.completionPercentage === null || 
      payment.completionPercentage === undefined || 
      payment.completionPercentage === 0 ||
      !payment.workDescription || 
      payment.workDescription.trim() === ""
    );

    if (isIncomplete) {
      toast.error("عذراً، لا يمكن اختيار هذه الدفعة لعدم اكتمال بياناتها (وصف الأعمال ونسبة الإنجاز المطلوبة) في تفاصيل المشروع.");
      return;
    }

    const paymentTitle = `تقرير إنجاز - ${payment.description || payment.paymentNumber}`;
    const paymentKey = payment.description || payment.paymentNumber;
    const isAlreadyReported = reportsData?.some((report: any) => {
      if (report.projectId !== newReport.projectId) return false;
      const hasPaymentIdTag = report.workSummary && report.workSummary.includes("[معرف الدفعة:");
      if (hasPaymentIdTag) {
        return !!(payment.id && report.workSummary.includes(`[معرف الدفعة: ${payment.id}]`));
      }
      return !!(paymentKey && paymentKey.trim() !== "" && report.title === paymentTitle);
    });

    if (isAlreadyReported) {
      toast.error("عذراً، تم تقديم تقرير إنجاز سابق لهذه الدفعة بالفعل ولا يمكن تكراره.");
      return;
    }

    setSelectedPaymentId(payment.id);
    
    const completionPercentage = Math.min(100, Math.max(0, payment.completionPercentage || 0));
    setNewReport(prev => ({
      ...prev,
      title: paymentTitle,
      plannedProgress: completionPercentage,
      actualProgress: completionPercentage,
      overallProgress: completionPercentage,
      budgetSpent: payment.amount?.toString() || "0",
      workSummary: payment.workDescription || payment.description || "",
      agreedPaymentAmount: payment.amount?.toString() || "0",
    }));

    toast.success("تم اختيار الدفعة وملء البيانات تلقائياً");
  };

  // تحليل ملخص الأعمال المنفذة
  const parseWorkSummary = (combined: string) => {
    const paymentIdMatch = combined.match(/\[معرف الدفعة:\s*([^\]]+)\]/);
    const paymentId = paymentIdMatch ? paymentIdMatch[1] : null;

    let scheduled = "";
    let actual = "";

    const regex = /الأعمال المجدولة للدفعة:\r?\n([\s\S]*?)\r?\n\r?الأعمال المنفذة فعلياً:\r?\n([\s\S]*?)(?:\r?\n\r?\[معرف الدفعة:|$)/;
    const match = combined.match(regex);

    if (match) {
      scheduled = match[1].trim();
      actual = match[2].trim();
    } else {
      const schedMatch = combined.match(/الأعمال المجدولة للدفعة:\r?\n([\s\S]*?)(?:\r?\n\r?الأعمال المنفذة فعلياً:|\r?\n\r?\[معرف الدفعة:|$)/);
      const actualMatch = combined.match(/الأعمال المنفذة فعلياً:\r?\n([\s\S]*?)(?:\r?\n\r?\[معرف الدفعة:|$)/);
      
      scheduled = schedMatch ? schedMatch[1].trim() : combined.replace(/\[معرف الدفعة:\s*[^\]]+\]/g, "").trim();
      actual = actualMatch ? actualMatch[1].trim() : "";
    }

    return { scheduled, actual, paymentId };
  };

  // فتح صفحة التعديل وملء البيانات
  const handleEditReportClick = (report: any) => {
    if (!canEditReport) {
      toast.error("ليس لديك صلاحية لتعديل تقارير الإنجاز");
      return;
    }
    if (isReportConverted(report)) {
      toast.error("لا يمكن تعديل تقرير الإنجاز بعد تحويله إلى طلب صرف.");
      return;
    }
    if (report.status === "approved") {
      toast.error("لا يمكن تعديل تقرير الإنجاز بعد اعتماده.");
      return;
    }
    if (isDisbursementApproved(report)) {
      toast.error("لا يمكن تعديل تقرير الإنجاز بعد اعتماد طلب الصرف المرتبط.");
      return;
    }
    const { scheduled, actual, paymentId } = parseWorkSummary(report.workSummary || "");
    setSelectedPaymentId(paymentId);
    setNewReport({
      projectId: report.projectId,
      title: report.title,
      reportDate: report.reportDate ? new Intl.DateTimeFormat('en-CA', { year: 'numeric', month: '2-digit', day: '2-digit' }).format(new Date(report.reportDate)) : new Intl.DateTimeFormat('en-CA', { year: 'numeric', month: '2-digit', day: '2-digit' }).format(new Date()),
      reportPeriodStart: report.reportPeriodStart ? new Intl.DateTimeFormat('en-CA', { year: 'numeric', month: '2-digit', day: '2-digit' }).format(new Date(report.reportPeriodStart)) : "",
      reportPeriodEnd: report.reportPeriodEnd ? new Intl.DateTimeFormat('en-CA', { year: 'numeric', month: '2-digit', day: '2-digit' }).format(new Date(report.reportPeriodEnd)) : "",
      overallProgress: report.overallProgress || 0,
      plannedProgress: report.plannedProgress || 0,
      actualProgress: report.actualProgress || 0,
      workSummary: scheduled,
      challenges: report.challenges || "",
      nextSteps: report.nextSteps || "",
      recommendations: report.recommendations || "",
      budgetSpent: report.budgetSpent || "",
      budgetRemaining: report.budgetRemaining || "",
      agreedPaymentAmount: report.budgetSpent || "",
      actualWorkDone: actual,
    });

    try {
      if (report.photos) {
        let parsedPhotos = report.photos;
        while (typeof parsedPhotos === "string") {
          parsedPhotos = JSON.parse(parsedPhotos);
        }
        if (Array.isArray(parsedPhotos)) {
          setUploadedFiles(parsedPhotos.map((photo, i) => ({
            name: photo.startsWith("data:") ? `مرفق_${i + 1}` : photo.split("/").pop() || `مرفق_${i + 1}`,
            size: 0,
            base64: photo,
            type: (photo.startsWith("data:image/") || /\.(png|jpe?g|webp)$/i.test(photo)) ? "image/png" : "application/pdf"
          })));
        } else {
          setUploadedFiles([]);
        }
      } else {
        setUploadedFiles([]);
      }
    } catch (e) {
      console.error(e);
      setUploadedFiles([]);
    }

    setEditingReportId(report.id);
    setActiveTab("edit");
  };

  // إنشاء أو تعديل تقرير
  const handleCreateReport = async () => {
    if (!newReport.projectId) {
      toast.error("يرجى اختيار المشروع");
      return;
    }
    if (!newReport.title.trim()) {
      toast.error("يرجى إدخال عنوان التقرير");
      return;
    }
    if (!newReport.actualWorkDone.trim()) {
      toast.error("يرجى إدخال الأعمال المنجزة فعلياً");
      return;
    }
    if (newReport.actualProgress > 100 || newReport.plannedProgress > 100 || newReport.overallProgress > 100) {
      toast.error("نسبة الإنجاز لا يمكن أن تتجاوز 100%");
      return;
    }

    const combinedWorkSummary = `الأعمال المجدولة للدفعة:\n${newReport.workSummary}\n\nالأعمال المنفذة فعلياً:\n${newReport.actualWorkDone}\n\n[معرف الدفعة: ${selectedPaymentId}]`;
    
    setIsSubmitting(true);
    try {
      // 1. رفع كافة المرفقات الجديدة للـ OneDrive عبر REST API
      const uploadedUrls: string[] = [];
      for (const fileObj of uploadedFiles) {
        if (fileObj.base64.startsWith("data:")) {
          try {
            const url = await uploadFile(fileObj);
            uploadedUrls.push(url);
          } catch (uploadErr: any) {
            toast.error(uploadErr.message || `حدث خطأ أثناء رفع الملف ${fileObj.name}`);
            setIsSubmitting(false);
            return;
          }
        } else {
          uploadedUrls.push(fileObj.base64);
        }
      }

      if (editingReportId) {
        await updateMutation.mutateAsync({
          id: editingReportId,
          title: newReport.title,
          overallProgress: newReport.overallProgress,
          plannedProgress: newReport.plannedProgress,
          actualProgress: newReport.actualProgress,
          workSummary: combinedWorkSummary,
          challenges: newReport.challenges,
          nextSteps: newReport.nextSteps,
          recommendations: newReport.recommendations,
          budgetSpent: "0",
          budgetRemaining: "0",
          photos: uploadedUrls,
        });
      } else {
        if (hasIncompleteSchedule) {
          toast.error("لا يمكن صرف تقرير إنجاز حتى تجدول كل دفعات المشروع");
          setIsSubmitting(false);
          return;
        }

        await createMutation.mutateAsync({
          ...newReport,
          budgetSpent: "0",
          budgetRemaining: "0",
          workSummary: combinedWorkSummary,
          photos: uploadedUrls,
        });
      }
    } catch (error) {
      console.error("Error creating/updating report:", error);
    } finally {
      setIsSubmitting(false);
    }
  };

  // عرض تفاصيل التقرير
  const handleViewDetails = (report: any) => {
    setSelectedReport(report);
    setShowDetailsDialog(true);
  };

  // التحقق مما إذا كان تقرير الإنجاز قد تم تحويله بالفعل إلى طلب صرف
  const isReportConverted = (report: any) => {
    if (!report || !disbursementRequestsData?.requests) return false;
    const paymentIdMatch = (report.workSummary || "").match(/\[معرف الدفعة:\s*([^\]]+)\]/);
    if (!paymentIdMatch) return false;
    const paymentIdRaw = paymentIdMatch[1];
    const isManual = paymentIdRaw.startsWith("manual-");
    const paymentIdNumeric = parseInt(paymentIdRaw.replace(/^(cp-|disb-|manual-)/i, "")) || 0;
    
    return disbursementRequestsData.requests.some((req: any) => {
      if (req.status === "rejected") return false;
      return isManual 
        ? req.paymentId === paymentIdNumeric 
        : req.contractPaymentId === paymentIdNumeric;
    });
  };

  // التحقق مما إذا كان طلب الصرف المرتبط معتمداً أو مصروفاً
  const isDisbursementApproved = (report: any) => {
    if (!report || !disbursementRequestsData?.requests) return false;
    const paymentIdMatch = (report.workSummary || "").match(/\[معرف الدفعة:\s*([^\]]+)\]/);
    if (!paymentIdMatch) return false;
    const paymentIdRaw = paymentIdMatch[1];
    const isManual = paymentIdRaw.startsWith("manual-");
    const paymentIdNumeric = parseInt(paymentIdRaw.replace(/^(cp-|disb-|manual-)/i, "")) || 0;
    
    const associatedReq = disbursementRequestsData.requests.find((req: any) => {
      return isManual 
        ? req.paymentId === paymentIdNumeric 
        : req.contractPaymentId === paymentIdNumeric;
    });
    return associatedReq ? (associatedReq.status === "approved" || associatedReq.status === "paid") : false;
  };

  // اعتماد التقرير والتحويل المباشر لطلب صرف
  const handleApproveAndConvert = (report: any) => {
    const paymentIdMatch = (report.workSummary || "").match(/\[معرف الدفعة:\s*([^\]]+)\]/);
    if (!paymentIdMatch) return;
    const paymentIdRaw = paymentIdMatch[1];
    const isManual = paymentIdRaw.startsWith("manual-");
    const parsedPaymentId = parseInt(paymentIdRaw.replace(/^(cp-|disb-|manual-)/i, "")) || 0;
    const amountVal = parseFloat(report.budgetSpent || "0");
    const amount = amountVal > 0 ? amountVal : 1;

    const performConversion = () => {
      convertToDisbursementMutation.mutate({
        projectId: report.projectId,
        title: report.title, // اسم الدفعة
        amount: amount,
        paymentType: "progress",
        completionPercentage: report.plannedProgress || report.overallProgress || 0,
        contractPaymentId: isManual ? undefined : parsedPaymentId,
        paymentId: isManual ? parsedPaymentId : undefined,
        description: report.workSummary || "",
      });
    };

    if (report.status === "approved") {
      performConversion();
    } else {
      reviewMutation.mutate({ id: report.id, status: "approved" }, {
        onSuccess: () => {
          performConversion();
        }
      });
    }
  };

  // حساب الانحراف
  const getVarianceIcon = (variance: number) => {
    if (variance > 0) return <TrendingUp className="w-4 h-4 text-green-600" />;
    if (variance < 0) return <TrendingDown className="w-4 h-4 text-red-600" />;
    return <Minus className="w-4 h-4 text-gray-400" />;
  };

  const getVarianceColor = (variance: number) => {
    if (variance > 0) return "text-green-600";
    if (variance < 0) return "text-red-600";
    return "text-gray-500";
  };

  const checkPendingMyAction = (report: any) => {
    if (!user || !report) return false;
    if (report.status === "pending" || report.status === "submitted" || report.status === "draft") {
      return !!(report.projectManagerId && report.projectManagerId === user.id);
    }
    if (report.status === "pending_executive") {
      return isExecutiveDirector;
    }
    return false;
  };

  // تصفية وفرز التقارير (إظهار تقارير الإنجاز فقط ووضع التقارير التي بانتظار اعتماد المستخدم في البداية)
  const filteredReports = (reportsData || []).filter((r: any) => !isExcludedProjectReport(r));
  const sortedReports = [...filteredReports].sort((a: any, b: any) => {
    const aPending = checkPendingMyAction(a) ? 1 : 0;
    const bPending = checkPendingMyAction(b) ? 1 : 0;
    return bPending - aPending;
  });
  const total = sortedReports.length;
  const totalPages = Math.ceil(total / limit);
  const paginatedReports = sortedReports.slice((page - 1) * limit, page * limit);

  const handlePageChange = (newPage: number) => {
    setPage(newPage);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  // التحقق من الصلاحيات
  const hasAddPermission = usePermission("progress_reports.add");
  const hasEditPermission = usePermission("progress_reports.edit");
  const hasApprovePermission = usePermission("progress_reports.approve");
  const canCreateReport = ["super_admin", "system_admin"].includes(user?.role || "") || hasAddPermission;
  const canEditReport = ["super_admin", "system_admin"].includes(user?.role || "") || hasEditPermission;
  const canReviewReport = ["super_admin", "system_admin"].includes(user?.role || "") || hasApprovePermission;

  if (activeTab === "create" || activeTab === "edit") {
    return (
      <DashboardLayout>
        <div className="space-y-6 max-w-4xl mx-auto">
          {/* Page Header */}
          <div className="flex items-center justify-between border-b pb-4">
            <div className="flex items-center gap-3">
              <Button
                variant="outline"
                size="icon"
                onClick={() => {
                  setActiveTab("list");
                  resetNewReport();
                }}
                className="rounded-full hover:bg-muted"
              >
                <ArrowRight className="w-4 h-4" />
              </Button>
              <div>
                <h1 className="text-2xl font-bold text-foreground">
                  {activeTab === "edit" ? "تعديل تقرير الإنجاز" : "إنشاء تقرير إنجاز جديد"}
                </h1>
                <p className="text-sm text-muted-foreground">
                  {activeTab === "edit" ? "تحديث تفاصيل التقرير والنسب المالية للمشروع" : "أدخل تفاصيل التقرير والنسب المالية للمشروع"}
                </p>
              </div>
            </div>
          </div>

          {/* Form Body - Premium Styled Cards */}
          <div className="grid grid-cols-1 gap-6">
            {/* Card 1: Project & Payments */}
            <Card className="border-border/60 shadow-sm">
              <CardHeader className="bg-muted/30 border-b border-border/40 py-4">
                <CardTitle className="text-base font-bold flex items-center gap-2 text-foreground">
                  <Building2 className="w-4.5 h-4.5 text-primary" />
                  المشروع وجدولة الدفعات
                </CardTitle>
                <CardDescription>اختر المشروع أولاً ثم حدد الدفعة المالية المجدولة المرتبطة</CardDescription>
              </CardHeader>
              <CardContent className="pt-6 space-y-6">
                <div className="space-y-2">
                  <Label className="font-semibold text-foreground">المشروع <span className="text-red-500">*</span></Label>
                  <Select
                    value={newReport.projectId.toString()}
                    disabled={!!editingReportId}
                    onValueChange={(v) => {
                      const nextProjectId = parseInt(v);
                      setSelectedPaymentId(null);
                      setNewReport(prev => ({
                        ...prev,
                        projectId: nextProjectId,
                        title: "",
                        plannedProgress: 0,
                        actualProgress: 0,
                        overallProgress: 0,
                        budgetSpent: "",
                        budgetRemaining: "",
                        workSummary: "",
                        agreedPaymentAmount: "",
                        actualWorkDone: "",
                      }));
                    }}
                  >
                    <SelectTrigger className="h-11 text-right" disabled={!!editingReportId}>
                      <SelectValue placeholder="اختر المشروع المراد رفع تقرير له" />
                    </SelectTrigger>
                    <SelectContent>
                      {projectsData?.map((project: any) => (
                        <SelectItem key={project.id} value={project.id.toString()}>
                          {project.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {/* Payments Section */}
                {newReport.projectId > 0 && (
                  <div className="space-y-3 pt-4 border-t border-dashed border-border/80">
                    <Label className="text-sm font-bold text-foreground flex items-center gap-2">
                      <CreditCard className="w-4 h-4 text-primary" />
                      الدفعات وجدولة الإنجاز المرتبطة للمشروع
                    </Label>
                    <p className="text-xs text-muted-foreground">
                      اختر الدفعة التي ترغب بإنشاء تقرير إنجاز لها لملء البيانات والمبالغ تلقائياً:
                    </p>
                    {isProjectDetailsLoading ? (
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                        <div className="h-28 rounded-xl border border-dashed border-muted-foreground/20 animate-pulse bg-muted/40" />
                        <div className="h-28 rounded-xl border border-dashed border-muted-foreground/20 animate-pulse bg-muted/40" />
                      </div>
                    ) : projectDetails?.payments && projectDetails.payments.length > 0 ? (
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-3 max-h-[300px] overflow-y-auto p-1.5 bg-muted/30 rounded-xl border border-border/60">
                        {projectDetails.payments.map((payment: any) => {
                          const isSelected = selectedPaymentId === payment.id;
                          const isIncomplete = payment.source !== "manual" && (
                            payment.completionPercentage === null || 
                            payment.completionPercentage === undefined || 
                            payment.completionPercentage === 0 ||
                            !payment.workDescription || 
                            payment.workDescription.trim() === ""
                          );
                          const paymentKey = payment.description || payment.paymentNumber;
                          const isAlreadyReported = reportsData?.some((report: any) => {
                            if (report.projectId !== newReport.projectId) return false;
                            const hasPaymentIdTag = report.workSummary && report.workSummary.includes("[معرف الدفعة:");
                            if (hasPaymentIdTag) {
                              return !!(payment.id && report.workSummary.includes(`[معرف الدفعة: ${payment.id}]`));
                            }
                            const expectedTitle = `تقرير إنجاز - ${paymentKey}`;
                            return !!(paymentKey && paymentKey.trim() !== "" && report.title === expectedTitle);
                          });
                          
                          const statusStyles = isIncomplete
                            ? "bg-destructive/10 text-destructive border-destructive/20 animate-pulse"
                            : isAlreadyReported
                            ? "bg-green-50 text-green-700 border-green-200 dark:bg-green-950/30 dark:text-green-400 dark:border-green-900/50 font-bold"
                            : getPaymentStatusStyles(payment.status);
                            
                          const statusLabel = isIncomplete 
                            ? "بيانات غير مكتملة" 
                            : isAlreadyReported
                            ? "تم تقديم تقرير"
                            : (PAYMENT_STATUS_MAP[payment.status]?.label || payment.status);
                          
                          return (
                            <div
                              key={payment.id}
                              onClick={() => {
                                if (editingReportId) return;
                                handleSelectPayment(payment);
                              }}
                              className={`relative p-4 rounded-xl border-2 text-right cursor-pointer transition-all duration-300 flex flex-col justify-between gap-3 ${
                                isSelected
                                  ? "border-primary bg-primary/5 dark:bg-primary/10 shadow-sm ring-1 ring-primary/20"
                                  : isIncomplete
                                  ? "border-destructive/20 bg-destructive/[0.02] hover:border-destructive/40 hover:bg-destructive/[0.04] opacity-75 cursor-not-allowed"
                                  : isAlreadyReported
                                  ? "border-green-200 bg-green-50/10 hover:border-green-400 opacity-90 cursor-not-allowed font-bold"
                                  : editingReportId
                                  ? "border-transparent bg-background opacity-60 cursor-not-allowed"
                                  : "border-transparent bg-background hover:border-primary/40 hover:bg-accent/10 hover:shadow-sm"
                              }`}
                            >
                              {isSelected && (
                                <div className="absolute top-2 left-2 bg-primary text-primary-foreground rounded-full p-1 shadow-sm animate-in zoom-in duration-200">
                                  <Check className="w-3 h-3" />
                                </div>
                              )}
                              
                              <div className="flex items-start justify-between gap-2">
                                <div className="flex items-center gap-2">
                                  <div className={`p-1.5 rounded-lg ${isSelected ? "bg-primary/20 text-primary" : "bg-muted text-muted-foreground"}`}>
                                    <Coins className="w-4 h-4" />
                                  </div>
                                  <span className="font-bold text-sm leading-none block text-foreground">
                                    {payment.description || payment.paymentNumber}
                                  </span>
                                </div>
                                <span className={`text-[10px] px-2 py-0.5 rounded-full font-semibold border ${statusStyles}`}>
                                  {statusLabel}
                                </span>
                              </div>
                              
                              <div className="flex items-baseline justify-between mt-1 border-t border-dashed border-border/40 pt-2">
                                <span className="text-[11px] text-muted-foreground">قيمة الدفعة:</span>
                                <span className="font-extrabold text-base text-foreground">
                                  {parseFloat(payment.amount || "0").toLocaleString()} <span className="text-[10px] font-medium text-muted-foreground">ريال</span>
                                </span>
                              </div>

                              <div className="space-y-1">
                                <div className="flex items-center justify-between text-[11px]">
                                  <span className="text-muted-foreground">نسبة الإنجاز المطلوبة:</span>
                                  <span className="font-bold text-primary">{payment.completionPercentage || 0}%</span>
                                </div>
                                <Progress value={payment.completionPercentage || 0} className="h-1.5 bg-muted/60" />
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    ) : (
                      <div className="p-6 rounded-xl border border-dashed border-muted-foreground/30 text-center bg-muted/10">
                        <AlertCircle className="w-8 h-8 text-muted-foreground mx-auto mb-2" />
                        <p className="text-sm font-medium text-muted-foreground">لا توجد دفعات أو جدولة إنجاز معرفة لهذا المشروع.</p>
                      </div>
                    )}
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Card 2: Report Info & Progress */}
            {newReport.projectId > 0 && (
              <>
                 {hasIncompleteSchedule && (
                  <div className="bg-amber-50/80 border border-amber-200/60 dark:bg-amber-950/20 dark:border-amber-900/40 rounded-xl p-4 flex items-start gap-3 text-right backdrop-blur-sm animate-in fade-in">
                    <AlertCircle className="w-5 h-5 text-amber-600 dark:text-amber-500 mt-0.5 flex-shrink-0" />
                    <div className="space-y-1.5 flex-1">
                      <h4 className="font-bold text-amber-900 dark:text-amber-400 text-sm">لا يمكن صرف تقرير إنجاز للمشروع</h4>
                      <p className="text-xs text-amber-800 dark:text-amber-300 leading-relaxed">
                        لا يمكن صرف تقرير إنجاز حتى تجدول كل دفعات المشروع. يرجى الذهاب إلى تفاصيل المشروع وجدولة جميع الدفعات.
                      </p>
                      <div className="flex items-center gap-4 mt-2 text-xs font-semibold text-amber-900 dark:text-amber-400 bg-amber-100/50 dark:bg-amber-950/40 px-3 py-1.5 rounded-lg border border-amber-200/40 w-fit">
                        <span>قيمة العقد: <span className="font-bold">{totalContractAmount.toLocaleString()} ريال</span></span>
                        <span className="w-1 h-1 bg-amber-400 rounded-full"></span>
                        <span>الدفعات المجدولة: <span className="font-bold">{totalScheduledPayments.toLocaleString()} ريال</span></span>
                      </div>
                    </div>
                  </div>
                )}

                <Card className="border-border/60 shadow-sm">
                  <CardHeader className="bg-muted/30 border-b border-border/40 py-4">
                    <CardTitle className="text-base font-bold flex items-center gap-2 text-foreground">
                      <FileText className="w-4.5 h-4.5 text-primary" />
                      بيانات التقرير ونسب الإنجاز
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="pt-6 space-y-6">
                    <div className="space-y-2">
                      <Label className="font-semibold text-foreground">عنوان التقرير <span className="text-red-500">*</span></Label>
                      <Input
                        value={newReport.title}
                        onChange={(e) => setNewReport({ ...newReport, title: e.target.value })}
                        placeholder="مثال: تقرير إنجاز دفعة الإنجاز الأولى"
                        className="h-11 text-foreground"
                      />
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                      <div className="space-y-2">
                        <Label className="font-semibold text-foreground">نسبة الإنجاز المخططة <span className="text-red-500">*</span></Label>
                        <div className="relative">
                          <Input
                            type="number"
                            value={newReport.plannedProgress}
                            readOnly
                            className="bg-muted/40 font-extrabold border-muted-foreground/20 text-slate-900 dark:text-slate-100 cursor-not-allowed h-11 pl-10 text-right focus-visible:ring-0"
                          />
                          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground font-bold">%</span>
                        </div>
                        <p className="text-[10px] text-muted-foreground mt-1">حقل تلقائي يأتي من الدفعة المختارة</p>
                      </div>

                      <div className="space-y-2">
                        <Label className="font-semibold text-foreground">نسبة الإنجاز الفعلية <span className="text-red-500">*</span></Label>
                        <div className="relative">
                          <Input
                            type="number"
                            min="0"
                            max="100"
                            value={newReport.actualProgress}
                            onChange={(e) => {
                              const val = Math.min(100, Math.max(0, parseInt(e.target.value) || 0));
                              setNewReport(prev => ({
                                ...prev,
                                actualProgress: val,
                                overallProgress: val,
                              }));
                            }}
                            className="h-11 font-bold text-foreground pl-10 text-right"
                          />
                          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground font-bold">%</span>
                        </div>
                        <p className="text-[10px] text-muted-foreground mt-1">أدخل نسبة إنجاز العمل الحالية بالموقع</p>
                      </div>

                      <div className="space-y-2">
                        <Label className="font-semibold text-foreground">نسبة الإنجاز الإجمالية <span className="text-red-500">*</span></Label>
                        <div className="relative">
                          <Input
                            type="number"
                            value={newReport.overallProgress}
                            readOnly
                            className="bg-muted/40 font-extrabold border-muted-foreground/20 text-slate-900 dark:text-slate-100 cursor-not-allowed h-11 pl-10 text-right focus-visible:ring-0"
                          />
                          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground font-bold">%</span>
                        </div>
                        <p className="text-[10px] text-muted-foreground mt-1">تطابق نسبة الإنجاز الفعلية تلقائياً</p>
                      </div>
                    </div>

                    {/* Progress Deviation Display */}
                    <div className={`p-4 rounded-xl border flex items-center gap-3 ${
                      newReport.actualProgress - newReport.plannedProgress > 0 
                        ? "bg-green-50/50 border-green-200/60 dark:bg-green-950/20 dark:border-green-900/40" 
                        : newReport.actualProgress - newReport.plannedProgress < 0
                        ? "bg-red-50/50 border-red-200/60 dark:bg-red-950/20 dark:border-red-900/40"
                        : "bg-gray-50/50 border-gray-200/60 dark:bg-gray-800/40 dark:border-gray-700/40"
                    }`}>
                      <div className="p-1 rounded-full bg-background border">
                        {getVarianceIcon(newReport.actualProgress - newReport.plannedProgress)}
                      </div>
                      <span className={`font-bold text-sm ${getVarianceColor(newReport.actualProgress - newReport.plannedProgress)}`}>
                        الانحراف عن الخطة المحددة للدفعة: {newReport.actualProgress - newReport.plannedProgress > 0 ? "+" : ""}
                        {newReport.actualProgress - newReport.plannedProgress}%
                        {newReport.actualProgress - newReport.plannedProgress > 0 
                          ? " (متقدم عن النسبة المخططة للدفعة)" 
                          : newReport.actualProgress - newReport.plannedProgress < 0
                          ? " (متأخر عن النسبة المخططة للدفعة)"
                          : " (مطابق للنسبة المخططة للدفعة)"}
                      </span>
                    </div>
                  </CardContent>
                </Card>

                {/* Card 3: Completed Works */}
                <Card className="border-border/60 shadow-sm">
                  <CardHeader className="bg-muted/30 border-b border-border/40 py-4">
                    <CardTitle className="text-base font-bold flex items-center gap-2 text-foreground">
                      <FileText className="w-4.5 h-4.5 text-primary" />
                      الأعمال والملاحظات الفنية
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="pt-6 space-y-6">
                    <div className="space-y-2">
                      <Label className="font-semibold text-foreground flex items-center gap-1.5">
                        الأعمال المنجزة المجدولة للدفعة <span className="text-xs text-muted-foreground">(غير قابلة للتعديل)</span>
                      </Label>
                      <Textarea
                        value={newReport.workSummary}
                        readOnly
                        placeholder="الأعمال المخططة التي تأتي تلقائياً من الدفعة..."
                        className="bg-muted/40 border-muted-foreground/20 text-slate-900 dark:text-slate-100 font-semibold cursor-not-allowed min-h-[100px] leading-relaxed resize-none text-right focus-visible:ring-0"
                      />
                    </div>

                    <div className="space-y-2">
                      <Label className="font-semibold text-foreground">الأعمال المنجزة فعلياً بالموقع <span className="text-red-500">*</span></Label>
                      <Textarea
                        value={newReport.actualWorkDone}
                        onChange={(e) => setNewReport({ ...newReport, actualWorkDone: e.target.value })}
                        placeholder="اذكر بالتفصيل ما تم إنجازه وتنفيذه فعلياً على أرض الواقع..."
                        className="min-h-[120px] leading-relaxed text-foreground text-right"
                      />
                    </div>
                  </CardContent>
                </Card>

                {/* Card 4: Upload Attachments Section */}
                <Card className="border-border/60 shadow-sm">
                  <CardHeader className="bg-muted/30 border-b border-border/40 py-4">
                    <CardTitle className="text-base font-bold flex items-center gap-2 text-foreground">
                      <Upload className="w-4.5 h-4.5 text-primary" />
                      قسم المرفقات
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="pt-6 space-y-6">
                    <div className="space-y-4">
                      <Label className="font-semibold text-foreground">تحميل الصور والمستندات (الحد الأقصى 10 ميجابايت)</Label>
                      
                      {/* Dropzone design */}
                      <div className="border-2 border-dashed border-border hover:border-primary/50 rounded-xl p-6 transition-colors bg-muted/5 flex flex-col items-center justify-center cursor-pointer relative group">
                        <input
                          type="file"
                          multiple
                          onChange={handleFileChange}
                          className="absolute inset-0 opacity-0 cursor-pointer w-full h-full"
                          accept="image/*,.heic,.heif,application/pdf"
                        />
                        <Upload className="w-8 h-8 text-muted-foreground group-hover:text-primary transition-colors mb-2" />
                        <p className="text-sm font-semibold text-foreground mb-1">اسحب وأفلت الملفات هنا، أو انقر للتصفح</p>
                        <p className="text-xs text-muted-foreground">يدعم ملفات الصور ومستندات PDF فقط. يمنع تماماً رفع الملفات التنفيذية.</p>
                      </div>

                      {/* File preview list */}
                      {uploadedFiles.length > 0 && (
                        <div className="space-y-2 pt-2">
                          <h4 className="text-xs font-bold text-muted-foreground">الملفات المرفوعة ({uploadedFiles.length})</h4>
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                            {uploadedFiles.map((file, idx) => (
                              <div key={idx} className="flex items-center justify-between border border-border/80 bg-background rounded-lg p-2.5 shadow-xs relative">
                                <div className="flex items-center gap-2.5 min-w-0 flex-1">
                                  {file.type.startsWith("image/") || file.type === "" ? (
                                    <img src={file.base64} alt={file.name} className="w-10 h-10 object-cover rounded-md flex-shrink-0" />
                                  ) : (
                                    <div className="w-10 h-10 flex items-center justify-center bg-primary/5 text-primary rounded-md flex-shrink-0">
                                      <FileText className="w-5 h-5" />
                                    </div>
                                  )}
                                  <div className="min-w-0 flex-1">
                                    <p className="text-xs font-bold text-foreground truncate">{file.name}</p>
                                    <p className="text-[10px] text-muted-foreground font-mono">
                                      {file.size > 0 ? `${(file.size / (1024 * 1024)).toFixed(2)} MB` : "مرفق جاهز"}
                                    </p>
                                  </div>
                                </div>
                                <Button
                                  type="button"
                                  variant="ghost"
                                  size="icon"
                                  className="h-7 w-7 text-muted-foreground hover:text-destructive hover:bg-destructive/5 shrink-0 rounded-full"
                                  onClick={() => setUploadedFiles(prev => prev.filter((_, i) => i !== idx))}
                                >
                                  <X className="w-4 h-4" />
                                </Button>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  </CardContent>
                </Card>

                {/* Form Actions */}
                <div className="flex justify-end gap-3 pt-4 border-t border-border/40">
                  <Button
                    variant="outline"
                    size="lg"
                    onClick={() => {
                      setActiveTab("list");
                      resetNewReport();
                    }}
                    className="px-6 h-12"
                  >
                    إلغاء وتراجع
                  </Button>
                   <Button
                    size="lg"
                    onClick={handleCreateReport}
                    disabled={
                      isSubmitting || 
                      (editingReportId 
                        ? updateMutation.isPending 
                        : (createMutation.isPending || hasIncompleteSchedule || !selectedPaymentId)
                      ) || 
                      !newReport.projectId ||
                      !newReport.title.trim() || 
                      !newReport.actualWorkDone.trim()
                    }
                    className="px-8 h-12 shadow-sm font-bold bg-primary hover:bg-primary/90 flex items-center gap-2"
                  >
                    {(isSubmitting || (editingReportId ? updateMutation.isPending : createMutation.isPending)) ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin" />
                        <span>{editingReportId ? "جاري حفظ التعديلات..." : "جاري الحفظ والإنشاء..."}</span>
                      </>
                    ) : (
                      <span>{editingReportId ? "حفظ التعديلات" : "حفظ وإنشاء التقرير"}</span>
                    )}
                  </Button>
                </div>
              </>
            )}
          </div>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* العنوان والإجراءات */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold">تقارير الإنجاز</h1>
            <p className="text-muted-foreground">متابعة وتوثيق تقدم المشاريع</p>
          </div>
          {canCreateReport && (
            <Button onClick={() => setActiveTab("create")}>
              <Plus className="w-4 h-4 ml-2" />
              تقرير جديد
            </Button>
          )}
        </div>

        {/* الإحصائيات - بطاقات عصرية خلفية بيضاء مطابقة لصفحة الطلبات */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 md:gap-4">
          {[
            {
              label: "إجمالي التقارير",
              value: statsData.total,
              icon: <FileText className="w-4 h-4 md:w-5 md:h-5" />,
              iconBg: "bg-primary/10 text-primary",
            },
            {
              label: "مسودات",
              value: statsData.draft,
              icon: <Edit className="w-4 h-4 md:w-5 md:h-5" />,
              iconBg: "bg-slate-100 dark:bg-slate-900/40 text-slate-600 dark:text-slate-400",
            },
            {
              label: "معتمدة",
              value: statsData.approved,
              icon: <CheckCircle className="w-4 h-4 md:w-5 md:h-5" />,
              iconBg: "bg-emerald-100 dark:bg-emerald-950/40 text-emerald-600",
            },
            {
              label: "متوسط الإنجاز",
              value: `${statsData.avgProgress}%`,
              icon: <BarChart3 className="w-4 h-4 md:w-5 md:h-5" />,
              iconBg: "bg-purple-100 dark:bg-purple-950/40 text-purple-600",
            },
          ].map((stat) => (
            <Card key={stat.label} className="border-0 shadow-sm overflow-hidden bg-background">
              <CardContent className="p-3 md:p-4">
                <div className="flex items-center gap-2 md:gap-3">
                  <div className={`w-8 h-8 md:w-10 md:h-10 rounded-lg flex items-center justify-center flex-shrink-0 ${stat.iconBg}`}>
                    {stat.icon}
                  </div>
                  <div className="min-w-0">
                    <p className="text-[10px] md:text-xs text-muted-foreground truncate">{stat.label}</p>
                    <p className="text-lg md:text-xl font-bold text-foreground truncate">{stat.value}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* أدوات البحث والتصفية */}
        <div className="flex flex-col md:flex-row gap-4">
          <div className="relative flex-1">
            <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder="بحث برقم التقرير أو العنوان..."
              value={searchTerm}
              onChange={(e) => {
                setSearchTerm(e.target.value);
                setPage(1);
              }}
              className="pr-10"
            />
          </div>
          <Select value={statusFilter} onValueChange={(v) => {
            setStatusFilter(v);
            setPage(1);
          }}>
            <SelectTrigger className="w-[180px]">
              <Filter className="w-4 h-4 ml-2" />
              <SelectValue placeholder="الحالة" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">جميع الحالات</SelectItem>
              <SelectItem value="draft">مسودة</SelectItem>
              <SelectItem value="pending">بانتظار اعتماد مدير المشروع</SelectItem>
              <SelectItem value="pending_executive">بانتظار اعتماد المدير التنفيذي</SelectItem>
              <SelectItem value="approved">معتمد</SelectItem>
              <SelectItem value="rejected">مرفوض</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* قائمة التقارير - تصميم مطابق لصفحة الطلبات */}
        <Card className="border-0 shadow-sm overflow-hidden">
          <CardContent className="p-0">
            {filteredReports.length > 0 ? (
              <div>
                {/* Table Header (Desktop Only) */}
                <div className="hidden md:grid grid-cols-[auto_1.2fr_1fr_1fr_1fr_auto] gap-4 px-5 py-3 bg-muted/40 border-b text-[11px] font-bold text-muted-foreground uppercase tracking-wider text-right">
                  <div className="w-10"></div>
                  <div>التقرير</div>
                  <div>المشروع</div>
                  <div>نسبة الإنجاز</div>
                  <div>الحالة</div>
                  <div className="w-20 text-center">الإجراءات</div>
                </div>

                {/* Rows / Cards */}
                <div className="divide-y divide-border">
                  {paginatedReports.map((report: any) => {
                    const variance = report.variance || 0;
                    const status = statusConfig[report.status] || statusConfig.draft;
                    const isPendingMyAction = checkPendingMyAction(report);
                    const isProjectManager = report.projectManagerId === user?.id;

                    const renderDropdownContent = () => (
                      <DropdownMenuContent align="end" className="w-56 text-right font-medium bg-background border border-border shadow-md rounded-lg p-1 z-50">
                        {/* عرض التقرير PDF */}
                        <DropdownMenuItem 
                          onClick={() => {
                            navigate(`/progress-reports/${report.id}/print`);
                          }}
                          className="flex items-center justify-start gap-2.5 cursor-pointer text-xs py-2 px-3 hover:bg-muted/50 rounded-md transition-colors text-slate-700"
                        >
                          <Printer className="w-3.5 h-3.5 text-[#1a5f4a]" />
                          <span>عرض تقرير الإنجاز</span>
                        </DropdownMenuItem>

                        {/* تعديل التقرير */}
                        {!isReportConverted(report) && report.status !== "approved" && !isDisbursementApproved(report) && canEditReport && (
                          <DropdownMenuItem 
                            onClick={() => {
                              handleEditReportClick(report);
                            }}
                            className="flex items-center justify-start gap-2.5 cursor-pointer text-xs py-2 px-3 hover:bg-muted/50 rounded-md transition-colors"
                          >
                            <Edit className="w-3.5 h-3.5 text-blue-600" />
                            <span>تعديل تقرير الإنجاز</span>
                          </DropdownMenuItem>
                        )}

                        {/* عرض سبب الإلغاء */}
                        {report.status === "rejected" && (
                          <DropdownMenuItem
                            onClick={() => {
                              setSelectedReport(report);
                              setViewRejectionReasonText(report.rejectionReason || "");
                              setShowViewRejectionDialog(true);
                            }}
                            className="flex items-center justify-start gap-2.5 cursor-pointer text-xs py-2 px-3 hover:bg-muted/50 rounded-md transition-colors text-rose-600 font-bold"
                          >
                            <AlertCircle className="w-3.5 h-3.5 text-rose-500" />
                            <span>عرض سبب إلغاء التقرير</span>
                          </DropdownMenuItem>
                        )}

                        {/* استثناء اعتماد مدير المشروع (Super Admin) */}
                        {canExceptionApprove && !isProjectManager && (report.status === "pending" || report.status === "submitted" || report.status === "draft") && (
                          <DropdownMenuItem
                            onClick={() => {
                              setSelectedReport(report);
                              setExceptionNotes("");
                              setShowExceptionDialog(true);
                            }}
                            className="flex items-center justify-start gap-2.5 cursor-pointer text-xs py-2 px-3 hover:bg-amber-50 dark:hover:bg-amber-950/30 rounded-md transition-colors font-bold text-amber-700 dark:text-amber-400"
                          >
                            <ShieldAlert className="w-3.5 h-3.5 text-amber-600" />
                            <span>استثناء اعتماد مدير المشروع</span>
                          </DropdownMenuItem>
                        )}

                        {/* عرض مبررات استثناء الاعتماد */}
                        {report.isException && (
                          <DropdownMenuItem
                            onClick={() => {
                              setSelectedReport(report);
                              setShowViewExceptionDialog(true);
                            }}
                            className="flex items-center justify-start gap-2.5 cursor-pointer text-xs py-2 px-3 hover:bg-amber-50 dark:hover:bg-amber-950/30 rounded-md transition-colors text-amber-800 dark:text-amber-300 font-medium"
                          >
                            <Info className="w-3.5 h-3.5 text-amber-600" />
                            <span>عرض مبررات استثناء الاعتماد</span>
                          </DropdownMenuItem>
                        )}

                        {/* اعتماد وتراجع المرحلة الأولى: مدير المشروع */}
                        {(report.status === "pending" || report.status === "submitted" || report.status === "draft") && isProjectManager && (
                          <>
                            <DropdownMenuItem
                              onClick={() => {
                                setSelectedReport(report);
                                setApprovalNotes("");
                                setShowApproveDialog(true);
                              }}
                              className="flex items-center justify-start gap-2.5 cursor-pointer text-xs py-2 px-3 hover:bg-emerald-50 dark:hover:bg-emerald-950/30 rounded-md transition-colors text-emerald-600 font-bold"
                            >
                              <CheckCircle className="w-3.5 h-3.5 text-emerald-600" />
                              <span>اعتماد تقرير الإنجاز</span>
                            </DropdownMenuItem>

                            <DropdownMenuItem
                              onClick={() => {
                                setSelectedReport(report);
                                setRejectionReason("");
                                setShowRejectDialog(true);
                              }}
                              className="flex items-center justify-start gap-2.5 cursor-pointer text-xs py-2 px-3 hover:bg-rose-50 dark:hover:bg-rose-950/30 rounded-md transition-colors text-rose-600"
                            >
                              <XCircle className="w-3.5 h-3.5 text-rose-500" />
                              <span>إلغاء تقرير الإنجاز</span>
                            </DropdownMenuItem>
                          </>
                        )}

                        {/* اعتماد وتراجع المرحلة الثانية: المدير التنفيذي */}
                        {report.status === "pending_executive" && isExecutiveDirector && (
                          <>
                            <DropdownMenuItem
                              onClick={() => {
                                setSelectedReport(report);
                                setApprovalNotes("");
                                setShowApproveDialog(true);
                              }}
                              className="flex items-center justify-start gap-2.5 cursor-pointer text-xs py-2 px-3 hover:bg-emerald-50 dark:hover:bg-emerald-950/30 rounded-md transition-colors text-emerald-600 font-bold"
                            >
                              <CheckCircle className="w-3.5 h-3.5 text-emerald-600" />
                              <span>اعتماد تقرير الإنجاز</span>
                            </DropdownMenuItem>

                            <DropdownMenuItem
                              onClick={() => {
                                setSelectedReport(report);
                                setRejectionReason("");
                                setShowRejectDialog(true);
                              }}
                              className="flex items-center justify-start gap-2.5 cursor-pointer text-xs py-2 px-3 hover:bg-rose-50 dark:hover:bg-rose-950/30 rounded-md transition-colors text-rose-600"
                            >
                              <XCircle className="w-3.5 h-3.5 text-rose-500" />
                              <span>إلغاء تقرير الإنجاز</span>
                            </DropdownMenuItem>
                          </>
                        )}
                      </DropdownMenuContent>
                    );

                    return (
                      <div
                        key={report.id}
                        className={`grid grid-cols-1 md:grid-cols-[auto_1.2fr_1fr_1fr_1fr_auto] gap-3 md:gap-4 px-5 py-4 hover:bg-muted/30 transition-all cursor-pointer items-center text-right ${
                          isPendingMyAction ? "bg-emerald-100/75 dark:bg-emerald-950/60 hover:bg-emerald-200/70 dark:hover:bg-emerald-900/70 border-r-4 border-r-emerald-700 dark:border-r-emerald-400 shadow-xs" : ""
                        }`}
                        onClick={() => handleViewDetails(report)}
                      >
                        {/* Desktop: Report Icon */}
                        <div className="hidden md:flex w-10 justify-center">
                          {isPendingMyAction ? (
                            <TooltipProvider>
                              <Tooltip delayDuration={50}>
                                <TooltipTrigger asChild>
                                  <div className="relative inline-flex items-center justify-center shrink-0 cursor-pointer">
                                    <div className="relative flex items-center justify-center w-8 h-8 rounded-full bg-gradient-to-tr from-[#1a5f4a] via-emerald-600 to-teal-500 text-white shadow-sm border border-emerald-400/40 transition-transform duration-200 hover:scale-110">
                                      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-60"></span>
                                      <Clock className="w-4 h-4 text-amber-200 animate-spin relative z-10" style={{ animationDuration: '4s' }} />
                                    </div>
                                  </div>
                                </TooltipTrigger>
                                <TooltipContent side="top" className="bg-slate-900 text-white text-[11px] font-bold px-2.5 py-1 rounded-md shadow-xl border border-slate-700/60 flex items-center gap-1.5 z-50">
                                  <span className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-pulse"></span>
                                  <span>{report.status === "pending_executive" ? "بانتظار اعتمادك (المدير التنفيذي)" : "بانتظار اعتمادك (مدير المشروع)"}</span>
                                </TooltipContent>
                              </Tooltip>
                            </TooltipProvider>
                          ) : (
                            <div className={`w-10 h-10 rounded-lg flex items-center justify-center border ${status.iconBg}`}>
                              {status.icon}
                            </div>
                          )}
                        </div>

                        {/* Report Info (Mobile & Desktop) */}
                        <div className="flex items-start justify-between md:block gap-3">
                          <div className="flex items-center gap-3 md:block min-w-0">
                            <div className="md:hidden shrink-0">
                              {isPendingMyAction ? (
                                <div className="relative flex items-center justify-center w-8 h-8 rounded-full bg-gradient-to-tr from-[#1a5f4a] via-emerald-600 to-teal-500 text-white">
                                  <Clock className="w-4 h-4 text-amber-200 animate-spin" style={{ animationDuration: '4s' }} />
                                </div>
                              ) : (
                                <div className={`w-8 h-8 rounded-lg flex items-center justify-center border ${status.iconBg}`}>
                                  {status.icon}
                                </div>
                              )}
                            </div>
                            <div className="min-w-0">
                              <div className="flex items-center gap-1.5">
                                <p className="font-bold text-foreground text-sm">{report.reportNumber}</p>
                                {report.isException && (
                                  <TooltipProvider>
                                    <Tooltip delayDuration={100}>
                                      <TooltipTrigger asChild>
                                        <span className="inline-flex items-center justify-center p-0.5 rounded bg-amber-100/80 text-amber-700 dark:bg-amber-950/50 dark:text-amber-400 shrink-0 cursor-help">
                                          <ShieldAlert className="w-3.5 h-3.5 text-amber-600" />
                                        </span>
                                      </TooltipTrigger>
                                      <TooltipContent side="top" className="bg-amber-900 text-amber-50 text-[11px] font-medium px-2.5 py-1 rounded-md shadow-lg border border-amber-700 z-50">
                                        تم اعتماد المرحلة الأولى باستثناء اعتماد مدير المشروع
                                      </TooltipContent>
                                    </Tooltip>
                                  </TooltipProvider>
                                )}
                              </div>
                              <p className="text-xs text-muted-foreground mt-0.5 truncate break-words line-clamp-1">
                                {report.title}
                              </p>
                            </div>
                          </div>
                          <div className="text-left md:text-right shrink-0 md:mt-1 flex items-center gap-1">
                            <div className="md:hidden" onClick={(e) => e.stopPropagation()}>
                              <DropdownMenu>
                                <DropdownMenuTrigger asChild>
                                  <Button
                                    variant="ghost"
                                    size="icon"
                                    className="h-8 w-8 hover:bg-muted p-0 text-muted-foreground hover:text-foreground"
                                  >
                                    <MoreVertical className="w-4 h-4" />
                                  </Button>
                                </DropdownMenuTrigger>
                                {renderDropdownContent()}
                              </DropdownMenu>
                            </div>
                            <p className="text-[10px] md:text-xs text-muted-foreground">
                              {new Date(report.reportDate).toLocaleDateString("ar-SA")}
                            </p>
                          </div>
                        </div>

                        {/* Project Name (Desktop & Tablet) */}
                        <div className="hidden md:flex items-center gap-2 min-w-0">
                          <Building2 className="w-4 h-4 text-muted-foreground shrink-0" />
                          <span className="text-sm text-foreground truncate font-medium">{report.projectName || "—"}</span>
                        </div>

                        {/* Progress (Desktop) */}
                        <div className="hidden md:block min-w-0">
                          <div className="flex items-center gap-2">
                            <Progress value={report.overallProgress} className="w-16 h-2 bg-muted shrink-0" />
                            <span className="text-xs font-bold text-foreground">{report.overallProgress}%</span>
                          </div>
                          <div className={`flex items-center gap-1 text-[10px] font-semibold mt-1 ${getVarianceColor(variance)}`}>
                            {getVarianceIcon(variance)}
                            <span>الانحراف: {variance > 0 ? "+" : ""}{variance}%</span>
                          </div>
                        </div>

                        {/* Status (Desktop) */}
                        <div className="hidden md:block shrink-0">
                          <span className={`inline-flex items-center gap-1.5 text-[10px] md:text-xs font-medium px-2.5 py-0.5 rounded-full border ${status.bg} ${status.color}`}>
                            {status.badgeIcon}
                            {status.label}
                          </span>
                        </div>

                        {/* Mobile Card Row: Project + Progress + Status */}
                        <div className="md:hidden flex flex-col gap-3">
                          <div className="flex items-center gap-1.5 text-xs text-foreground bg-muted/50 p-2 rounded-md">
                            <Building2 className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
                            <span className="truncate">{report.projectName || "—"}</span>
                          </div>
                          <div className="flex items-center justify-between gap-2">
                            <div className="flex items-center gap-2">
                              <Progress value={report.overallProgress} className="w-16 h-1.5 bg-muted shrink-0" />
                              <span className="text-[10px] font-bold text-foreground">{report.overallProgress}%</span>
                            </div>
                            <span className={`inline-flex items-center gap-1 text-[10px] font-medium px-2 py-0.5 rounded-full border ${status.bg} ${status.color}`}>
                              {status.badgeIcon}
                              {status.label}
                            </span>
                          </div>
                        </div>

                        {/* Actions (Desktop Only) */}
                        <div className="hidden md:flex justify-center" onClick={(e) => e.stopPropagation()}>
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-8 w-8 hover:bg-muted p-0 text-muted-foreground hover:text-foreground"
                              >
                                <MoreVertical className="w-4 h-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            {renderDropdownContent()}
                          </DropdownMenu>
                        </div>
                      </div>
                    );
                  })}
                </div>

                {/* Footer with Pagination */}
                <div className="px-4 py-4 bg-muted/20 border-t flex flex-col items-center justify-center gap-4">
                  <div className="text-[11px] md:text-xs text-muted-foreground text-center">
                    يعرض {(page - 1) * limit + 1} - {Math.min(page * limit, total)} من أصل {total} تقرير إنجاز
                  </div>
                  
                  {totalPages > 1 && (
                    <div className="flex items-center gap-1.5 overflow-x-auto max-w-full py-1 scrollbar-hide">
                      <Button
                        variant="outline"
                        size="icon"
                        className="h-8 w-8 shrink-0"
                        onClick={() => handlePageChange(page - 1)}
                        disabled={page === 1}
                      >
                        <ChevronLeft className="h-4 w-4 rotate-180" />
                      </Button>
                      
                      {Array.from({ length: totalPages }, (_, i) => i + 1).map((p) => {
                        if (
                          totalPages <= 5 ||
                          p === 1 ||
                          p === totalPages ||
                          (p >= page - 1 && p <= page + 1)
                        ) {
                          return (
                            <Button
                              key={p}
                              variant={page === p ? "default" : "outline"}
                              size="sm"
                              className={`h-8 min-w-[32px] px-2 text-[11px] shrink-0 ${page === p ? 'gradient-primary text-white border-0' : ''}`}
                              onClick={() => handlePageChange(p)}
                            >
                              {p}
                            </Button>
                          );
                        }
                        
                        if (p === 2 || p === totalPages - 1) {
                          return (
                            <span key={p} className="text-muted-foreground text-xs px-1">
                              ...
                            </span>
                          );
                        }
                        
                        return null;
                      })}
                      
                      <Button
                        variant="outline"
                        size="icon"
                        className="h-8 w-8 shrink-0"
                        onClick={() => handlePageChange(page + 1)}
                        disabled={page === totalPages}
                      >
                        <ChevronLeft className="h-4 w-4" />
                      </Button>
                    </div>
                  )}
                </div>
              </div>
            ) : (
              <div className="p-12 text-center text-muted-foreground">
                <FileText className="w-12 h-12 text-muted-foreground/30 mx-auto mb-3" />
                <p className="text-sm font-medium">لا توجد تقارير إنجاز حالياً.</p>
              </div>
            )}
          </CardContent>
        </Card>


        {/* نافذة تفاصيل التقرير */}
        <Dialog open={showDetailsDialog} onOpenChange={setShowDetailsDialog}>
          <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>تفاصيل تقرير الإنجاز</DialogTitle>
              <DialogDescription>
                {selectedReport?.reportNumber} - {selectedReport?.title}
              </DialogDescription>
            </DialogHeader>
            
            {selectedReport && (
              <div className="space-y-6 py-4">
                {/* المعلومات الأساسية */}
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-sm text-muted-foreground">المشروع</p>
                    <p className="font-medium">{selectedReport.projectName}</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">تاريخ التقرير</p>
                    <p className="font-medium">
                      {new Date(selectedReport.reportDate).toLocaleDateString("ar-SA")}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">الحالة</p>
                    <Badge variant={STATUS_MAP[selectedReport.status]?.variant || "secondary"}>
                      {STATUS_MAP[selectedReport.status]?.label || selectedReport.status}
                    </Badge>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">معد التقرير</p>
                    <p className="font-medium">{selectedReport.createdByName}</p>
                  </div>
                </div>
                
                <Separator />
                
                {/* نسب الإنجاز */}
                <div className="space-y-4">
                  <h3 className="font-semibold">نسب الإنجاز</h3>
                  <div className="grid grid-cols-3 gap-4">
                    <div className="p-4 bg-muted/50 rounded-lg text-center">
                      <p className="text-3xl font-bold">{selectedReport.overallProgress}%</p>
                      <p className="text-sm text-muted-foreground">الإنجاز الإجمالي</p>
                    </div>
                    <div className="p-4 bg-blue-50 rounded-lg text-center">
                      <p className="text-3xl font-bold text-blue-700">{selectedReport.plannedProgress}%</p>
                      <p className="text-sm text-blue-600">المخطط</p>
                    </div>
                    <div className="p-4 bg-green-50 rounded-lg text-center">
                      <p className="text-3xl font-bold text-green-700">{selectedReport.actualProgress}%</p>
                      <p className="text-sm text-green-600">الفعلي</p>
                    </div>
                  </div>
                  
                  <div className={`p-3 rounded-lg flex items-center gap-2 ${
                    selectedReport.variance > 0 
                      ? "bg-green-50 border border-green-200" 
                      : selectedReport.variance < 0
                      ? "bg-red-50 border border-red-200"
                      : "bg-gray-50 border border-gray-200"
                  }`}>
                    {getVarianceIcon(selectedReport.variance)}
                    <span className={getVarianceColor(selectedReport.variance)}>
                      الانحراف: {selectedReport.variance > 0 ? "+" : ""}{selectedReport.variance}%
                    </span>
                  </div>
                </div>
                
                <Separator />
                
                {/* ملخص الأعمال */}
                {selectedReport.workSummary && (
                  <div className="space-y-2">
                    <h3 className="font-semibold">الأعمال المنجزة</h3>
                    <p className="text-muted-foreground whitespace-pre-wrap">{selectedReport.workSummary}</p>
                  </div>
                )}
                
                {selectedReport.challenges && (
                  <div className="space-y-2">
                    <h3 className="font-semibold">التحديات والمعوقات</h3>
                    <p className="text-muted-foreground whitespace-pre-wrap">{selectedReport.challenges}</p>
                  </div>
                )}
                
                {selectedReport.nextSteps && (
                  <div className="space-y-2">
                    <h3 className="font-semibold">الخطوات القادمة</h3>
                    <p className="text-muted-foreground whitespace-pre-wrap">{selectedReport.nextSteps}</p>
                  </div>
                )}
                
                {selectedReport.recommendations && (
                  <div className="space-y-2">
                    <h3 className="font-semibold">التوصيات</h3>
                    <p className="text-muted-foreground whitespace-pre-wrap">{selectedReport.recommendations}</p>
                  </div>
                )}

                {/* المرفقات المرفوعة */}
                {selectedReport.photos && (() => {
                  try {
                    const photosArr = typeof selectedReport.photos === 'string' 
                      ? JSON.parse(selectedReport.photos) 
                      : selectedReport.photos;
                    
                    if (Array.isArray(photosArr) && photosArr.length > 0) {
                      return (
                        <div className="space-y-3">
                          <Separator />
                          <h3 className="font-semibold flex items-center gap-2">
                            <FileText className="w-4 h-4 text-primary" />
                            مرفقات التقرير
                          </h3>
                          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                            {photosArr.map((photo: string, index: number) => {
                              const isImage = photo.startsWith("data:image/") || (photo.startsWith("http") || photo.startsWith("/uploads")) && (photo.toLowerCase().endsWith(".png") || photo.toLowerCase().endsWith(".jpg") || photo.toLowerCase().endsWith(".jpeg") || photo.toLowerCase().endsWith(".webp") || photo.toLowerCase().includes("site_photo") || photo.toLowerCase().includes("proof-documents"));
                              return (
                                <div key={index} className="border rounded-lg p-2 flex flex-col items-center justify-center bg-muted/20 relative group hover:bg-muted/40 transition-colors">
                                  {isImage ? (
                                    <img src={photo} alt={`مرفق ${index + 1}`} className="w-full h-24 object-cover rounded-md mb-2" />
                                  ) : (
                                    <div className="w-full h-24 flex items-center justify-center rounded-md bg-background border border-dashed mb-2 text-primary font-bold text-xs">
                                      ملف مستند PDF
                                    </div>
                                  )}
                                  <a href={photo} download={`مرفق_${index + 1}`} className="text-xs text-primary font-semibold hover:underline">
                                    تحميل المرفق
                                  </a>
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      );
                    }
                  } catch (e) {
                    console.error("Error parsing photos", e);
                  }
                  return null;
                })()}
              </div>
            )}
            
            <DialogFooter className="gap-2 sm:gap-0">
              <Button variant="outline" onClick={() => setShowDetailsDialog(false)}>
                إغلاق
              </Button>

              {selectedReport && selectedReport.status !== "approved" && !isReportConverted(selectedReport) && !isDisbursementApproved(selectedReport) && canEditReport && (
                <Button
                  variant="outline"
                  onClick={() => {
                    setShowDetailsDialog(false);
                    handleEditReportClick(selectedReport);
                  }}
                  className="border-blue-200 hover:bg-blue-50 text-blue-600 font-medium"
                >
                  <Edit className="w-4 h-4 ml-1.5" />
                  تعديل التقرير
                </Button>
              )}
              
              {selectedReport?.status !== "approved" && (
                canReviewReport && (selectedReport?.status === "submitted" || selectedReport?.status === "reviewed" || selectedReport?.status === "pending" || selectedReport?.status === "pending_executive") && (
                  <Button
                    onClick={() => {
                      setShowDetailsDialog(false);
                      setApprovalNotes("");
                      setShowApproveDialog(true);
                    }}
                    className="gradient-primary text-white font-bold"
                  >
                    <CheckCircle className="w-4 h-4 ml-2" />
                    اعتماد التقرير
                  </Button>
                )
              )}
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* نافذة اعتماد تقرير الإنجاز */}
        <Dialog open={showApproveDialog} onOpenChange={setShowApproveDialog}>
          <DialogContent dir="rtl">
            <DialogHeader>
              <DialogTitle>
                {selectedReport?.status === "pending" || selectedReport?.status === "submitted" || selectedReport?.status === "draft"
                  ? "اعتماد تقرير الإنجاز (اعتماد مدير المشروع - المرحلة الأولى)"
                  : "اعتماد تقرير الإنجاز (اعتماد المدير التنفيذي - المرحلة الثانية)"}
              </DialogTitle>
              <DialogDescription>
                {selectedReport?.status === "pending" || selectedReport?.status === "submitted" || selectedReport?.status === "draft"
                  ? `هل تريد اعتماد تقرير الإنجاز رقم ${selectedReport?.reportNumber} وتحويله إلى (بانتظار اعتماد المدير التنفيذي)؟`
                  : `هل تريد الاعتماد النهائي لتقرير الإنجاز رقم ${selectedReport?.reportNumber} من قِبَل المدير التنفيذي؟`}
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <div className="rounded-lg bg-muted p-4 space-y-1">
                <p className="font-bold text-slate-800">{selectedReport?.title}</p>
                {selectedReport?.projectName && (
                  <p className="text-xs text-slate-500">المشروع: {selectedReport.projectName}</p>
                )}
                <p className="text-xs text-slate-500">نسبة الإنجاز: {selectedReport?.overallProgress}%</p>
              </div>
              <div className="space-y-2">
                <Label>ملاحظات الاعتماد (اختياري)</Label>
                <Textarea
                  value={approvalNotes}
                  onChange={(e) => setApprovalNotes(e.target.value)}
                  placeholder="أدخل أي ملاحظات..."
                />
              </div>
            </div>
            <DialogFooter className="gap-2">
              <Button variant="outline" onClick={() => setShowApproveDialog(false)}>
                إلغاء
              </Button>
              <Button
                className="bg-[#1a5f4a] hover:bg-[#154d3c] text-white font-bold"
                onClick={() =>
                  approveReportMutation.mutate({
                    id: selectedReport?.id,
                    notes: approvalNotes,
                  })
                }
                disabled={approveReportMutation.isPending}
              >
                {approveReportMutation.isPending ? "جاري الاعتماد..." : "اعتماد تقرير الإنجاز"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* نافذة إلغاء / رفض تقرير الإنجاز */}
        <Dialog open={showRejectDialog} onOpenChange={setShowRejectDialog}>
          <DialogContent dir="rtl">
            <DialogHeader>
              <DialogTitle>إلغاء / رفض تقرير الإنجاز</DialogTitle>
              <DialogDescription>
                هل تريد إلغاء تقرير الإنجاز رقم {selectedReport?.reportNumber}؟
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <div className="space-y-2">
                <Label>سبب الإلغاء *</Label>
                <Textarea
                  value={rejectionReason}
                  onChange={(e) => setRejectionReason(e.target.value)}
                  placeholder="يرجى توضيح سبب إلغاء التقرير (إجباري)..."
                />
              </div>
            </div>
            <DialogFooter className="gap-2">
              <Button variant="outline" onClick={() => setShowRejectDialog(false)}>
                إلغاء
              </Button>
              <Button
                variant="destructive"
                onClick={() =>
                  rejectReportMutation.mutate({
                    id: selectedReport?.id,
                    reason: rejectionReason,
                  })
                }
                disabled={!rejectionReason || !rejectionReason.trim() || rejectReportMutation.isPending}
              >
                {rejectReportMutation.isPending ? "جاري الإلغاء..." : "تأكيد الإلغاء"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* نافذة استثناء اعتماد مدير المشروع */}
        <Dialog open={showExceptionDialog} onOpenChange={setShowExceptionDialog}>
          <DialogContent dir="rtl">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2 text-amber-700 dark:text-amber-500">
                <ShieldAlert className="w-5 h-5 text-amber-600" />
                <span>استثناء اعتماد مدير المشروع</span>
              </DialogTitle>
              <DialogDescription>
                يتيح هذا الخيار للمدير الفائق اعتماد المرحلة الأولى نيابة عن مدير المشروع وتوثيق التوقيع والمبرر.
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <div className="space-y-2">
                <Label className="font-bold text-slate-800">سبب / مبرر الاستثناء *</Label>
                <Textarea
                  value={exceptionNotes}
                  onChange={(e) => setExceptionNotes(e.target.value)}
                  placeholder="اكتب سبب أو مبرر استثناء اعتماد مدير المشروع (إجباري)..."
                  className="min-h-[100px]"
                />
              </div>
            </div>
            <DialogFooter className="gap-2">
              <Button variant="outline" onClick={() => setShowExceptionDialog(false)}>
                إلغاء
              </Button>
              <Button
                className="bg-amber-600 hover:bg-amber-700 text-white font-bold"
                onClick={() => {
                  if (selectedReport?.id && exceptionNotes.trim()) {
                    exceptionApproveReportMutation.mutate({
                      id: selectedReport.id,
                      notes: exceptionNotes.trim(),
                    });
                  }
                }}
                disabled={!exceptionNotes || !exceptionNotes.trim() || exceptionApproveReportMutation.isPending}
              >
                {exceptionApproveReportMutation.isPending ? "جاري تنفيذ الاستثناء..." : "تأكيد استثناء الاعتماد"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* نافذة عرض مبررات استثناء الاعتماد */}
        <Dialog open={showViewExceptionDialog} onOpenChange={setShowViewExceptionDialog}>
          <DialogContent dir="rtl" className="max-w-md">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2 text-amber-800 dark:text-amber-400">
                <Info className="w-5 h-5 text-amber-600" />
                <span>مبررات استثناء اعتماد مدير المشروع</span>
              </DialogTitle>
            </DialogHeader>
            <div className="space-y-3">
              <div className="rounded-lg bg-amber-50/80 border border-amber-200 p-3.5 space-y-1 text-xs text-amber-900 dark:bg-amber-950/40 dark:border-amber-900 dark:text-amber-200">
                <p className="font-bold text-slate-800 dark:text-slate-100 text-sm">
                  تقرير رقم: <span className="font-mono">{selectedReport?.reportNumber}</span>
                </p>
                {selectedReport?.creatorSignatureName && (
                  <p className="text-slate-700 dark:text-slate-300">
                    منفذ الاستثناء: <span className="font-semibold">{selectedReport.creatorSignatureName}</span>
                  </p>
                )}
              </div>
              <div className="space-y-1.5">
                <Label className="font-bold text-slate-800 dark:text-slate-200 text-xs">سبب / مبرر الاستثناء:</Label>
                <div className="p-3 bg-slate-50 dark:bg-slate-900 border rounded-md text-xs text-slate-800 dark:text-slate-200 whitespace-pre-wrap min-h-[70px] font-sans leading-relaxed">
                  {selectedReport?.approvalNotes ? (
                    selectedReport.approvalNotes.replace(/^\[مبرر استثناء اعتماد مدير المشروع\]:\s*/, "")
                  ) : (
                    "لا يوجد مبرر مسجل"
                  )}
                </div>
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setShowViewExceptionDialog(false)}>
                إغلاق
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* نافذة عرض سبب إلغاء التقرير */}
        <Dialog open={showViewRejectionDialog} onOpenChange={setShowViewRejectionDialog}>
          <DialogContent dir="rtl" className="max-w-md">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2 text-rose-700 dark:text-rose-400">
                <AlertCircle className="w-5 h-5 text-rose-600" />
                <span>سبب إلغاء تقرير الإنجاز</span>
              </DialogTitle>
            </DialogHeader>
            <div className="space-y-3">
              <div className="rounded-lg bg-rose-50/80 border border-rose-200 p-3.5 space-y-1 text-xs text-rose-900 dark:bg-rose-950/40 dark:border-rose-900 dark:text-rose-200">
                <p className="font-bold text-slate-800 dark:text-slate-100 text-sm">
                  تقرير رقم: <span className="font-mono">{selectedReport?.reportNumber}</span>
                </p>
              </div>
              <div className="space-y-1.5">
                <Label className="font-bold text-slate-800 dark:text-slate-200 text-xs">سبب الإلغاء المسجل:</Label>
                <div className="p-3 bg-slate-50 dark:bg-slate-900 border rounded-md text-xs text-slate-800 dark:text-slate-200 whitespace-pre-wrap min-h-[70px] font-sans leading-relaxed">
                  {viewRejectionReasonText || "لا يوجد سبب مسجل"}
                </div>
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setShowViewRejectionDialog(false)}>
                إغلاق
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </DashboardLayout>
  );
}

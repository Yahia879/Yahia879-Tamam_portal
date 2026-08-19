import { useState, useMemo, useEffect } from "react";
import { trpc } from "@/lib/trpc";
import { useAuth } from "@/_core/hooks/useAuth";
import { useLocation } from "wouter";
import { motion } from "framer-motion";
import DashboardLayout from "@/components/DashboardLayout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent } from "@/components/ui/tabs";
import { toast } from "sonner";
import {
  DollarSign,
  FileText,
  ScrollText,
  Wallet,
  Download,
  Folder,
  Percent,
  Receipt,
  CheckCircle2,
  Clock,
  Printer,
  Search,
} from "lucide-react";
import { 
  AreaChart, 
  Area, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer, 
  PieChart, 
  Pie, 
  Cell 
} from "recharts";

const STATUS_MAP: Record<string, { label: string; color: string }> = {
  draft: { label: "مسودة", color: "bg-gray-100 text-gray-800" },
  pending: { label: "قيد الاعتماد", color: "bg-yellow-100 text-yellow-800" },
  approved: { label: "معتمد", color: "bg-blue-100 text-blue-800" },
  rejected: { label: "مرفوض", color: "bg-red-100 text-red-800" },
  executed: { label: "منفذ", color: "bg-green-100 text-green-800" },
  paid: { label: "مدفوع", color: "bg-emerald-100 text-emerald-800" },
  cancelled: { label: "ملغي", color: "bg-gray-100 text-gray-800" },
};

const CONTRACT_STATUS_MAP: Record<string, { label: string; color: string }> = {
  draft: { label: "مسودة", color: "#64748b" }, // Slate 500
  pending_approval: { label: "بانتظار الاعتماد", color: "#eab308" }, // Yellow 500
  approved: { label: "معتمد", color: "#3b82f6" }, // Blue 500
  completed: { label: "مكتمل", color: "#22c55e" }, // Green 500
  terminated: { label: "منتهي", color: "#ef4444" }, // Red 500
  cancelled: { label: "ملغي", color: "#94a3b8" }, // Slate 400
};

const REQUEST_STATUS_MAP: Record<string, { label: string; color: string }> = {
  pending: { label: "قيد الاعتماد", color: "#eab308" },
  approved: { label: "معتمد", color: "#3b82f6" },
  rejected: { label: "مرفوض", color: "#ef4444" },
};

const ORDER_STATUS_MAP: Record<string, { label: string; color: string }> = {
  pending: { label: "قيد الاعتماد", color: "#eab308" },
  pending_executive: { label: "قيد اعتماد الإدارة", color: "#f59e0b" },
  approved: { label: "معتمد", color: "#3b82f6" },
  executed: { label: "منفذ", color: "#10b981" },
  rejected: { label: "مرفوض", color: "#ef4444" },
  edited: { label: "تم التعديل", color: "#f97316" },
  draft: { label: "مسودة", color: "#64748b" },
};

const RECEIPT_STATUS_MAP: Record<string, { label: string; color: string }> = {
  approved: { label: "معتمد", color: "#10b981" },
  pending_approval: { label: "قيد الاعتماد", color: "#eab308" },
  approval_revoked: { label: "ملغى الاعتماد", color: "#f59e0b" },
  rejected: { label: "مرفوض", color: "#ef4444" },
};

const CustomReceiptTimelineTooltip = ({ active, payload, label }: any) => {
  if (active && payload && payload.length) {
    return (
      <div className="bg-card border border-border p-3 rounded-xl shadow-xl text-xs font-semibold text-foreground opacity-100" style={{ direction: 'rtl' }}>
        <p className="font-bold text-foreground mb-1">{label}</p>
        <div className="flex items-center gap-2">
          <div className="w-2 h-2 rounded-full bg-emerald-600 shrink-0" />
          <span className="text-muted-foreground">السندات المنشأة:</span>
          <span className="font-black text-foreground mr-auto">{payload[0].value} سند</span>
        </div>
      </div>
    );
  }
  return null;
};

const CustomPieReceiptStatusTooltip = ({ active, payload }: any) => {
  if (active && payload && payload.length) {
    const data = payload[0].payload;
    return (
      <div className="bg-card border border-border shadow-xl p-3 rounded-xl text-xs font-semibold text-foreground min-w-[150px] opacity-100" style={{ direction: 'rtl' }}>
        <p className="font-bold text-foreground mb-1">{data.name}</p>
        <div className="flex items-center gap-2 mt-1">
          <div className="w-2.5 h-2.5 rounded-full shrink-0 shadow-sm" style={{ backgroundColor: payload[0].color }} />
          <span className="text-muted-foreground">عدد السندات:</span>
          <span className="font-black text-foreground mr-auto">{data.value} سند</span>
        </div>
      </div>
    );
  }
  return null;
};

const CustomTimelineTooltip = ({ active, payload, label }: any) => {
  if (active && payload && payload.length) {
    return (
      <div className="bg-card border border-border p-3 rounded-xl shadow-xl text-xs font-semibold text-foreground opacity-100" style={{ direction: 'rtl' }}>
        <p className="font-bold text-foreground mb-1">{label}</p>
        <div className="flex items-center gap-2">
          <div className="w-2 h-2 rounded-full bg-teal-600 shrink-0" />
          <span className="text-muted-foreground">العقود المنشأة:</span>
          <span className="font-black text-foreground mr-auto">{payload[0].value} عقد</span>
        </div>
      </div>
    );
  }
  return null;
};

const CustomPieStatusTooltip = ({ active, payload }: any) => {
  if (active && payload && payload.length) {
    const data = payload[0].payload;
    return (
      <div className="bg-card border border-border shadow-xl p-3 rounded-xl text-xs font-semibold text-foreground min-w-[150px] opacity-100" style={{ direction: 'rtl' }}>
        <p className="font-bold text-foreground mb-1">{data.name}</p>
        <div className="flex items-center gap-2 mt-1">
          <div className="w-2.5 h-2.5 rounded-full shrink-0 shadow-sm" style={{ backgroundColor: payload[0].color }} />
          <span className="text-muted-foreground">عدد العقود:</span>
          <span className="font-black text-foreground mr-auto">{data.value} عقد</span>
        </div>
      </div>
    );
  }
  return null;
};

const CustomRequestsTimelineTooltip = ({ active, payload, label }: any) => {
  if (active && payload && payload.length) {
    return (
      <div className="bg-card border border-border p-3 rounded-xl shadow-xl text-xs font-semibold text-foreground opacity-100" style={{ direction: 'rtl' }}>
        <p className="font-bold text-foreground mb-1">{label}</p>
        <div className="flex items-center gap-2">
          <div className="w-2 h-2 rounded-full bg-blue-600 shrink-0" />
          <span className="text-muted-foreground">الطلبات المنشأة:</span>
          <span className="font-black text-foreground mr-auto">{payload[0].value} طلب</span>
        </div>
      </div>
    );
  }
  return null;
};

const CustomPieRequestsStatusTooltip = ({ active, payload }: any) => {
  if (active && payload && payload.length) {
    const data = payload[0].payload;
    return (
      <div className="bg-card border border-border shadow-xl p-3 rounded-xl text-xs font-semibold text-foreground min-w-[150px] opacity-100" style={{ direction: 'rtl' }}>
        <p className="font-bold text-foreground mb-1">{data.name}</p>
        <div className="flex items-center gap-2 mt-1">
          <div className="w-2.5 h-2.5 rounded-full shrink-0 shadow-sm" style={{ backgroundColor: payload[0].color }} />
          <span className="text-muted-foreground">عدد الطلبات:</span>
          <span className="font-black text-foreground mr-auto">{data.value} طلب</span>
        </div>
      </div>
    );
  }
  return null;
};

const CustomOrdersTimelineTooltip = ({ active, payload, label }: any) => {
  if (active && payload && payload.length) {
    return (
      <div className="bg-card border border-border p-3 rounded-xl shadow-xl text-xs font-semibold text-foreground opacity-100" style={{ direction: 'rtl' }}>
        <p className="font-bold text-foreground mb-1">{label}</p>
        <div className="flex items-center gap-2">
          <div className="w-2 h-2 rounded-full bg-purple-600 shrink-0" />
          <span className="text-muted-foreground">الأوامر المنشأة:</span>
          <span className="font-black text-foreground mr-auto">{payload[0].value} أمر</span>
        </div>
      </div>
    );
  }
  return null;
};

const CustomPieOrdersStatusTooltip = ({ active, payload }: any) => {
  if (active && payload && payload.length) {
    const data = payload[0].payload;
    return (
      <div className="bg-card border border-border shadow-xl p-3 rounded-xl text-xs font-semibold text-foreground min-w-[150px] opacity-100" style={{ direction: 'rtl' }}>
        <p className="font-bold text-foreground mb-1">{data.name}</p>
        <div className="flex items-center gap-2 mt-1">
          <div className="w-2.5 h-2.5 rounded-full shrink-0 shadow-sm" style={{ backgroundColor: payload[0].color }} />
          <span className="text-muted-foreground">عدد الأوامر:</span>
          <span className="font-black text-foreground mr-auto">{data.value} أمر</span>
        </div>
      </div>
    );
  }
  return null;
};

export default function FinancialReport() {
  const { user } = useAuth();
  const [, setLocation] = useLocation();
  const [activeTab, setActiveTab] = useState("projects");
  const [receiptVoucherSearch, setReceiptVoucherSearch] = useState<string>("");

  const userPermissions: string[] = (user as any)?.permissions ?? [];
  const isSuperOrSystemAdmin = ["super_admin", "system_admin"].includes(user?.role || "");
  const canView = isSuperOrSystemAdmin || userPermissions.includes("financial_reports.view");
  const canExport = isSuperOrSystemAdmin || userPermissions.includes("financial_reports.export");

  useEffect(() => {
    if (user && !canView) {
      setLocation("/403");
    }
  }, [user, canView, setLocation]);

  // جلب بيانات التقرير المالي
  const { data: reportData, isLoading } = trpc.disbursements.getFinancialReport.useQuery({});

  // جلب كافة سندات القبض للتبويب الجديد
  const { data: allReceiptVouchers = [] } = trpc.projects.getAllReceiptVouchers.useQuery();

  // تنسيق المبالغ
  const formatAmount = (amount: number) => {
    return new Intl.NumberFormat("ar-SA", {
      style: "decimal",
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount);
  };

  // تصدير التقرير المالي الشامل إلى ملف Excel (CSV مع BOM)
  const handleExportExcel = () => {
    if (!reportData) return;

    let csvContent = "\ufeff";

    // 1. الترويسة الرئيسية للتقرير
    csvContent += `"التقرير المالي الشامل - بوابة تمام"\n`;
    csvContent += `"تاريخ التصدير:","${new Date().toLocaleDateString("ar-SA")}"\n\n`;

    // 2. بطاقات الإحصائيات الرئيسية
    csvContent += `"ملخص الإحصائيات الرئيسية"\n`;
    csvContent += `"إجمالي طلبات الصرف","إجمالي العقود","إجمالي أوامر الصرف","المبالغ التي صرفت"\n`;
    csvContent += `"${summary?.totalRequests || 0}","${summary?.totalContracts || 0}","${summary?.totalOrders || 0}","${formatAmount(summary?.totalOrderAmount || 0)} ريال"\n\n`;

    // 3. المصروفات ونسب الجمعية حسب المشروع
    csvContent += `"المصروفات ونسب الجمعية حسب المشروع"\n`;
    csvContent += `"رقم المشروع","اسم المشروع","نسبة الجمعية (%)","قيمة الجمعية من المشروع (ريال)","قيمة العقد (ريال)","القيمة الاجمالية للمشروع (ريال)"\n`;
    if (reportData.byProject && reportData.byProject.length > 0) {
      reportData.byProject.forEach((project: any) => {
        const contractAmount = Number(project.contractAmount || 0);
        const associationValue = Number(project.associationValue || 0);
        const totalProjectValue = contractAmount + associationValue;
        csvContent += `"${project.projectNumber || "-"}","${project.projectName || "-"}","${project.managementPercentage || 0}%","${associationValue.toFixed(2)}","${contractAmount.toFixed(2)}","${totalProjectValue.toFixed(2)}"\n`;
      });
    } else {
      csvContent += `"لا توجد بيانات مشاريع"\n`;
    }
    csvContent += `\n`;



    // 4. جدول أوامر الصرف حسب الحالة
    csvContent += `"أوامر الصرف حسب الحالة"\n`;
    csvContent += `"الحالة","عدد أوامر الصرف","إجمالي المبالغ"\n`;
    const filteredOrders = (reportData.ordersByStatus || [])
      .filter((item: any) => ["approved", "pending", "rejected", "edited", "executed", "pending_executive"].includes(item.status));
    if (filteredOrders.length > 0) {
      filteredOrders.forEach((item: any) => {
        const label = ORDER_STATUS_MAP[item.status]?.label || item.status;
        csvContent += `"${label}","${item.count || 0}","${formatAmount(Number(item.totalAmount || 0))} ريال"\n`;
      });
    } else {
      csvContent += `"لا توجد بيانات أوامر صرف"\n`;
    }
    csvContent += `\n`;

    // 5. طلبات الصرف حسب الحالة
    csvContent += `"طلبات الصرف حسب الحالة"\n`;
    csvContent += `"الحالة","عدد الطلبات"\n`;
    const filteredRequests = (reportData.requestsByStatus || [])
      .filter((item: any) => ["pending", "approved", "rejected"].includes(item.status));
    if (filteredRequests.length > 0) {
      filteredRequests.forEach((item: any) => {
        const label = REQUEST_STATUS_MAP[item.status]?.label || item.status;
        csvContent += `"${label}","${item.count || 0}"\n`;
      });
    } else {
      csvContent += `"لا توجد بيانات طلبات صرف"\n`;
    }
    csvContent += `\n`;

    // 6. العقود حسب الحالة
    csvContent += `"العقود حسب الحالة"\n`;
    csvContent += `"الحالة","عدد العقود"\n`;
    const filteredContracts = (reportData.contractsByStatus || [])
      .filter((item: any) => item.status !== "active");
    if (filteredContracts.length > 0) {
      filteredContracts.forEach((item: any) => {
        const label = CONTRACT_STATUS_MAP[item.status]?.label || item.status;
        csvContent += `"${label}","${item.count || 0}"\n`;
      });
    } else {
      csvContent += `"لا توجد بيانات عقود"\n`;
    }
    csvContent += `\n`;

    // 7. سندات القبض
    csvContent += `"سندات القبض"\n`;
    csvContent += `"رقم السند","المشروع","الجهة الداعمة (المسدد)","تاريخ القبض","المبلغ (ريال)","الحالة","طريقة القبض / الحساب البنكي"\n`;
    if (allReceiptVouchers && allReceiptVouchers.length > 0) {
      allReceiptVouchers.forEach((v: any) => {
        const statusLabel = v.status === "approved" ? "معتمد" : v.status === "approval_revoked" ? "ملغى الاعتماد" : v.status === "rejected" ? "مرفوض" : "قيد الاعتماد";
        const rDate = v.receiptDate ? new Intl.DateTimeFormat("en-CA").format(new Date(v.receiptDate)) : "-";
        csvContent += `"${v.voucherNumber || `REC-${v.id}`}","${v.project?.name || "-"}","${v.payerName || "-"}","${rDate}","${v.amount || 0}","${statusLabel}","${v.bankName || "حوالة بنكية"}"\n`;
      });
    } else {
      csvContent += `"لا توجد بيانات سندات قبض"\n`;
    }

    // 8. إنشاء تحميل الملف وتنزيله تلقائياً
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", `financial-report-${new Intl.DateTimeFormat('en-CA').format(new Date())}.csv`);
    link.style.visibility = "hidden";
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    toast.success("تم تصدير التقرير المالي بصيغة Excel (CSV) بنجاح!");
  };

  const summary = reportData?.summary;

  const contractsByStatusData = useMemo(() => {
    if (!reportData?.contractsByStatus) return [];
    return reportData.contractsByStatus
      .filter((item: any) => item.status !== "active")
      .map((item: any) => {
        const statusInfo = CONTRACT_STATUS_MAP[item.status || "draft"] || { label: item.status, color: "#cbd5e1" };
        return {
          name: statusInfo.label,
          value: Number(item.count || 0),
          color: statusInfo.color,
          percentage: summary?.totalContracts ? Math.round((Number(item.count) / summary.totalContracts) * 100) : 0,
        };
      });
  }, [reportData?.contractsByStatus, summary?.totalContracts]);

  const requestsByStatusData = useMemo(() => {
    if (!reportData?.requestsByStatus) return [];
    return reportData.requestsByStatus
      .filter((item: any) => ["pending", "approved", "rejected"].includes(item.status))
      .map((item: any) => {
        const statusInfo = REQUEST_STATUS_MAP[item.status || "draft"] || { label: item.status, color: "#cbd5e1" };
        return {
          name: statusInfo.label,
          value: Number(item.count || 0),
          color: statusInfo.color,
          percentage: summary?.totalRequests ? Math.round((Number(item.count) / summary.totalRequests) * 100) : 0,
        };
      });
  }, [reportData?.requestsByStatus, summary?.totalRequests]);

  const ordersByStatusData = useMemo(() => {
    if (!reportData?.ordersByStatus) return [];
    return reportData.ordersByStatus
      .filter((item: any) => ["approved", "pending", "rejected", "edited", "executed", "pending_executive"].includes(item.status))
      .map((item: any) => {
        const statusInfo = ORDER_STATUS_MAP[item.status || "pending"] || { label: item.status, color: "#cbd5e1" };
        return {
          name: statusInfo.label,
          value: Number(item.count || 0),
          color: statusInfo.color,
          percentage: summary?.totalOrders ? Math.round((Number(item.count) / summary.totalOrders) * 100) : 0,
        };
      });
  }, [reportData?.ordersByStatus, summary?.totalOrders]);

  const receiptVouchersSummary = useMemo(() => {
    const totalCount = allReceiptVouchers.length;
    const approvedVouchers = allReceiptVouchers.filter((v: any) => v.status === "approved");
    const pendingVouchers = allReceiptVouchers.filter((v: any) => v.status === "pending_approval");
    const totalApprovedAmount = approvedVouchers.reduce((sum: number, v: any) => sum + (parseFloat(v.amount) || 0), 0);
    return {
      totalCount,
      approvedCount: approvedVouchers.length,
      pendingCount: pendingVouchers.length,
      totalApprovedAmount,
    };
  }, [allReceiptVouchers]);

  const filteredReceiptVouchers = useMemo(() => {
    if (!receiptVoucherSearch.trim()) return allReceiptVouchers;
    const q = receiptVoucherSearch.trim().toLowerCase();
    return allReceiptVouchers.filter((v: any) =>
      (v.voucherNumber && v.voucherNumber.toLowerCase().includes(q)) ||
      (v.payerName && v.payerName.toLowerCase().includes(q)) ||
      (v.bankName && v.bankName.toLowerCase().includes(q)) ||
      (v.notes && v.notes.toLowerCase().includes(q)) ||
      (v.project?.name && v.project.name.toLowerCase().includes(q))
    );
  }, [allReceiptVouchers, receiptVoucherSearch]);

  const receiptVouchersByStatusData = useMemo(() => {
    if (!allReceiptVouchers || allReceiptVouchers.length === 0) return [];
    const counts: Record<string, number> = {};
    allReceiptVouchers.forEach((v: any) => {
      const st = v.status || "pending_approval";
      counts[st] = (counts[st] || 0) + 1;
    });

    const total = allReceiptVouchers.length;
    return Object.keys(counts).map((st) => {
      const info = RECEIPT_STATUS_MAP[st] || { label: st, color: "#94a3b8" };
      return {
        name: info.label,
        value: counts[st],
        color: info.color,
        percentage: total ? Math.round((counts[st] / total) * 100) : 0,
      };
    });
  }, [allReceiptVouchers]);

  const receiptVouchersTimeline = useMemo(() => {
    if (!allReceiptVouchers || allReceiptVouchers.length === 0) return [];
    const dateMap: Record<string, number> = {};
    const sorted = [...allReceiptVouchers].sort((a: any, b: any) =>
      new Date(a.receiptDate || a.createdAt).getTime() - new Date(b.receiptDate || b.createdAt).getTime()
    );

    sorted.forEach((v: any) => {
      const d = v.receiptDate || v.createdAt;
      if (!d) return;
      const dt = new Date(d);
      const dateStr = `${dt.getDate()}/${dt.getMonth() + 1}/${dt.getFullYear()}`;
      dateMap[dateStr] = (dateMap[dateStr] || 0) + 1;
    });

    return Object.keys(dateMap).map((date) => ({
      date,
      count: dateMap[date],
    }));
  }, [allReceiptVouchers]);

  if (!user || !canView) {
    return null;
  }

  if (isLoading) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center h-64">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto"></div>
            <p className="mt-4 text-muted-foreground">جاري تحميل التقرير...</p>
          </div>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="space-y-6 print:space-y-4">
        {/* العنوان */}
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between print:hidden">
          <div>
            <h1 className="text-2xl font-bold">التقرير المالي الشامل</h1>
            <p className="text-muted-foreground">ملخص المصروفات وأوامر الصرف</p>
          </div>
          {canExport && (
            <div className="flex gap-2">
              <Button onClick={handleExportExcel} className="flex items-center gap-2 bg-emerald-600 hover:bg-emerald-700 text-white border-0 shadow-sm transition-all duration-200">
                <Download className="ml-2 h-4 w-4" />
                تصدير Excel
              </Button>
            </div>
          )}
        </div>

        {/* عنوان الطباعة */}
        <div className="hidden print:block text-center mb-6">
          <h1 className="text-2xl font-bold">التقرير المالي الشامل</h1>
          <p className="text-sm text-gray-600">تاريخ التقرير: {new Date().toLocaleDateString("ar-SA")}</p>
        </div>

        {/* بطاقات الإحصائيات الرئيسية */}
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
          {/* كرت إجمالي طلبات الصرف */}
          <Card className="border-0 shadow-md bg-gradient-to-br from-blue-50/50 to-indigo-50/30 dark:from-blue-950/20 dark:to-indigo-950/10 hover:shadow-lg transition-all duration-300 transform hover:-translate-y-1">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-3">
              <CardTitle className="text-sm font-semibold text-blue-900 dark:text-blue-200">إجمالي طلبات الصرف</CardTitle>
              <div className="p-2 bg-blue-100/80 dark:bg-blue-900/40 rounded-xl text-blue-600 dark:text-blue-300">
                <FileText className="h-5 w-5" />
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-extrabold text-blue-950 dark:text-blue-100 tracking-tight">
                {summary?.totalRequests || 0}
                <span className="text-xs font-normal text-muted-foreground mr-1.5">(طلب)</span>
              </div>
            </CardContent>
          </Card>

          {/* كرت إجمالي العقود */}
          <Card className="border-0 shadow-md bg-gradient-to-br from-amber-50/50 to-orange-50/30 dark:from-amber-950/20 dark:to-orange-950/10 hover:shadow-lg transition-all duration-300 transform hover:-translate-y-1">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-3">
              <CardTitle className="text-sm font-semibold text-amber-900 dark:text-amber-200">إجمالي العقود</CardTitle>
              <div className="p-2 bg-amber-100/80 dark:bg-amber-900/40 rounded-xl text-amber-600 dark:text-amber-300">
                <ScrollText className="h-5 w-5" />
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-extrabold text-amber-950 dark:text-amber-100 tracking-tight">
                {summary?.totalContracts || 0}
                <span className="text-xs font-normal text-muted-foreground mr-1.5">(عقد)</span>
              </div>
            </CardContent>
          </Card>

          {/* كرت إجمالي أوامر الصرف */}
          <Card className="border-0 shadow-md bg-gradient-to-br from-purple-50/50 to-violet-50/30 dark:from-purple-950/20 dark:to-violet-950/10 hover:shadow-lg transition-all duration-300 transform hover:-translate-y-1">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-3">
              <CardTitle className="text-sm font-semibold text-purple-900 dark:text-purple-200">إجمالي أوامر الصرف</CardTitle>
              <div className="p-2 bg-purple-100/80 dark:bg-purple-900/40 rounded-xl text-purple-600 dark:text-purple-300">
                <Wallet className="h-5 w-5" />
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-extrabold text-purple-950 dark:text-purple-100 tracking-tight">
                {summary?.totalOrders || 0}
                <span className="text-xs font-normal text-muted-foreground mr-1.5">(أمر)</span>
              </div>
            </CardContent>
          </Card>

          {/* كرت المبالغ التي صرفت */}
          <Card className="border-0 shadow-md bg-gradient-to-br from-emerald-50/50 to-teal-50/30 dark:from-emerald-950/20 dark:to-teal-950/10 hover:shadow-lg transition-all duration-300 transform hover:-translate-y-1">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-3">
              <CardTitle className="text-sm font-semibold text-emerald-900 dark:text-emerald-200">المبالغ التي صرفت</CardTitle>
              <div className="p-2 bg-emerald-100/80 dark:bg-emerald-900/40 rounded-xl text-emerald-600 dark:text-emerald-300">
                <DollarSign className="h-5 w-5" />
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-extrabold text-emerald-950 dark:text-emerald-100 tracking-tight flex items-baseline">
                {formatAmount(summary?.totalOrderAmount || 0)}
                <span className="text-xs font-bold text-emerald-700 dark:text-emerald-400 mr-1.5">ريال</span>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* أسلوب التبويبات الفاخر المطور */}
        <div className="flex justify-start mb-8 print:hidden">
          <div className="flex p-1.5 bg-slate-100/70 dark:bg-slate-900/50 backdrop-blur-xl rounded-2xl border border-slate-200/60 dark:border-slate-800/50 shadow-inner gap-1.5 max-w-full overflow-x-auto no-scrollbar">
            {[
              { id: "projects", label: "المشاريع", count: reportData?.byProject?.length || 0, icon: Folder, activeColor: "from-primary to-teal-600" },
              { id: "contracts", label: "العقود", count: summary?.totalContracts || 0, icon: ScrollText, activeColor: "from-primary to-teal-600" },
              { id: "requests", label: "طلبات الصرف", count: summary?.totalRequests || 0, icon: FileText, activeColor: "from-primary to-teal-600" },
              { id: "orders", label: "أوامر الصرف", count: summary?.totalOrders || 0, icon: Wallet, activeColor: "from-primary to-teal-600" },
              { id: "receipt_vouchers", label: "سندات القبض", count: receiptVouchersSummary.totalCount, icon: Receipt, activeColor: "from-emerald-600 to-teal-600" },
            ].map((tab) => {
              const IsActive = activeTab === tab.id;
              const Icon = tab.icon;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`relative flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-bold transition-all duration-300 focus:outline-none select-none shrink-0 ${
                    IsActive
                      ? "text-white shadow-md shadow-slate-950/10"
                      : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200 hover:bg-slate-200/40 dark:hover:bg-slate-800/30"
                  }`}
                >
                  {IsActive && (
                    <motion.div
                      layoutId="activeTabPill"
                      className={`absolute inset-0 rounded-xl bg-gradient-to-r ${tab.activeColor}`}
                      transition={{ type: "spring", stiffness: 350, damping: 28 }}
                    />
                  )}
                  <span className="relative z-10 flex items-center">
                    <Icon className={`h-4.5 w-4.5 ml-2 transition-transform duration-300 ${IsActive ? "scale-110" : "scale-100"}`} />
                    {tab.label}
                  </span>
                  <span
                    className={`relative z-10 text-[10px] px-2 py-0.5 rounded-full font-black transition-all duration-300 border ${
                      IsActive
                        ? "bg-white/20 border-white/10 text-white"
                        : "bg-slate-200/50 dark:bg-slate-800/50 border-slate-300/30 dark:border-slate-700/30 text-slate-700 dark:text-slate-300"
                    }`}
                  >
                    {tab.count}
                  </span>
                </button>
              );
            })}
          </div>
        </div>

        <Tabs dir="rtl" value={activeTab} onValueChange={setActiveTab} className="print:hidden">
          {/* تبويب المشاريع */}
          <TabsContent value="projects" className="space-y-6">
            <motion.div
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.35, ease: "easeOut" }}
              className="space-y-6"
            >
              <Card className="border-0 shadow-md bg-white dark:bg-slate-900 overflow-hidden">
                <CardHeader className="border-b border-slate-100 dark:border-slate-800/80 pb-4">
                  <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                    <div>
                      <CardTitle className="text-lg font-bold text-slate-800 dark:text-slate-100 flex items-center gap-2">
                        <Folder className="h-5.5 w-5.5 text-primary shrink-0" />
                        المصروفات ونسب الجمعية لكل مشروع
                      </CardTitle>
                      <CardDescription>عرض تفصيلي للمشاريع مع نسبة الإدارة/الإشراف وقيمة الجمعية والمصروفات الفعلية</CardDescription>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="p-0">
                  <div className="overflow-x-auto">
                    <table className="w-full text-right border-collapse">
                      <thead>
                        <tr className="bg-slate-50/75 dark:bg-slate-800/50 text-slate-700 dark:text-slate-300 text-xs font-bold border-b border-slate-100 dark:border-slate-800">
                          <th className="py-4 px-6">رقم المشروع</th>
                          <th className="py-4 px-6">اسم المشروع</th>
                          <th className="py-4 px-6 text-center">نسبة الجمعية</th>
                          <th className="py-4 px-6 text-left">قيمة الجمعية من المشروع</th>
                          <th className="py-4 px-6 text-left">قيمة العقد</th>
                          <th className="py-4 px-6 text-left">القيمة الاجمالية للمشروع</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60 text-sm">
                        {reportData?.byProject && reportData.byProject.length > 0 ? (
                          reportData.byProject.map((project: any) => {
                            const contractAmount = Number(project.contractAmount || 0);
                            const associationValue = Number(project.associationValue || 0);
                            const totalProjectValue = contractAmount + associationValue;
                            return (
                              <tr 
                                key={project.projectId} 
                                className="hover:bg-slate-50/50 dark:hover:bg-slate-800/30 transition-colors duration-150 group"
                              >
                                <td className="py-4 px-6 font-bold text-slate-500 dark:text-slate-400 group-hover:text-primary transition-colors">
                                  {project.projectNumber || "-"}
                                </td>
                                <td className="py-4 px-6 font-semibold text-slate-900 dark:text-slate-100">
                                  {project.projectName}
                                </td>
                                <td className="py-4 px-6 text-center">
                                  <Badge className="bg-indigo-50 dark:bg-indigo-950/40 text-indigo-700 dark:text-indigo-300 border border-indigo-200/50 dark:border-indigo-800/30 font-bold px-2.5 py-1 rounded-lg">
                                    {project.managementPercentage || 0}%
                                  </Badge>
                                </td>
                                <td className="py-4 px-6 text-left font-bold text-amber-600 dark:text-amber-400">
                                  {associationValue.toLocaleString("ar-SA", { minimumFractionDigits: 2, maximumFractionDigits: 2 })} ريال
                                </td>
                                <td className="py-4 px-6 text-left font-semibold text-slate-700 dark:text-slate-300">
                                  {contractAmount.toLocaleString("ar-SA", { minimumFractionDigits: 2, maximumFractionDigits: 2 })} ريال
                                </td>
                                <td className="py-4 px-6 text-left font-bold text-blue-600 dark:text-blue-400">
                                  {totalProjectValue.toLocaleString("ar-SA", { minimumFractionDigits: 2, maximumFractionDigits: 2 })} ريال
                                </td>
                              </tr>
                            );
                          })
                        ) : (
                          <tr>
                            <td colSpan={6} className="py-8 text-center text-muted-foreground">
                              لا توجد مشاريع مسجلة حالياً
                            </td>
                          </tr>
                        )}
                      </tbody>
                    </table>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          </TabsContent>

          {/* تبويب العقود */}
          <TabsContent value="contracts" className="space-y-6">
            <motion.div
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.35, ease: "easeOut" }}
              className="space-y-6"
            >
              {/* رسوم بيانية للعقود */}
              <div className="grid gap-6 md:grid-cols-2">
                {/* مخطط سير العقود عبر الأيام */}
                <Card className="border-0 shadow-sm bg-white dark:bg-slate-900 overflow-hidden">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-base font-bold text-slate-800 dark:text-slate-200">سير العقود المنشأة</CardTitle>
                    <CardDescription>عدد العقود التي تم عملها خلال الأيام الماضية</CardDescription>
                  </CardHeader>
                  <CardContent className="h-64 sm:h-72">
                    {reportData?.contractsTimeline && reportData.contractsTimeline.length > 0 ? (
                      <ResponsiveContainer width="100%" height="100%">
                        <AreaChart
                          data={reportData.contractsTimeline}
                          margin={{ top: 10, right: 10, left: -20, bottom: 0 }}
                        >
                          <defs>
                            <linearGradient id="colorContracts" x1="0" y1="0" x2="0" y2="1">
                              <stop offset="5%" stopColor="#0f766e" stopOpacity={0.2}/>
                              <stop offset="95%" stopColor="#0f766e" stopOpacity={0}/>
                            </linearGradient>
                          </defs>
                          <CartesianGrid strokeDasharray="3 3" vertical={false} className="stroke-muted/30" />
                          <XAxis 
                            dataKey="date" 
                            tickLine={false} 
                            axisLine={false} 
                            className="text-[10px] text-muted-foreground" 
                          />
                          <YAxis 
                            tickLine={false} 
                            axisLine={false} 
                            className="text-[10px] text-muted-foreground" 
                            allowDecimals={false}
                          />
                          <Tooltip content={<CustomTimelineTooltip />} />
                          <Area 
                            type="monotone" 
                            dataKey="count" 
                            stroke="#0f766e" 
                            strokeWidth={2.5} 
                            fillOpacity={1} 
                            fill="url(#colorContracts)" 
                          />
                        </AreaChart>
                      </ResponsiveContainer>
                    ) : (
                      <div className="flex h-full items-center justify-center text-muted-foreground text-sm">
                        لا توجد بيانات مخطط كافية حالياً
                      </div>
                    )}
                  </CardContent>
                </Card>

                {/* مخطط توزيع حالات العقود */}
                <Card className="border-0 shadow-sm bg-white dark:bg-slate-900 overflow-hidden">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-base font-bold text-slate-800 dark:text-slate-200">حالات العقود</CardTitle>
                    <CardDescription>توزيع العقود الإجمالي بين مسودة ومعتمد وغيرها</CardDescription>
                  </CardHeader>
                  <CardContent className="h-64 sm:h-72 flex flex-col sm:flex-row items-center justify-center gap-4">
                    {reportData?.contractsByStatus && reportData.contractsByStatus.length > 0 ? (
                      <>
                        <div className="relative w-44 h-44 flex-shrink-0">
                          <ResponsiveContainer width="100%" height="100%">
                            <PieChart>
                              <Tooltip content={<CustomPieStatusTooltip />} />
                              <Pie
                                data={contractsByStatusData}
                                cx="50%"
                                cy="50%"
                                innerRadius={55}
                                outerRadius={75}
                                paddingAngle={3}
                                dataKey="value"
                              >
                                {contractsByStatusData.map((entry: any, index: number) => (
                                  <Cell key={`cell-${index}`} fill={entry.color} />
                                ))}
                              </Pie>
                            </PieChart>
                          </ResponsiveContainer>
                          <div className="absolute inset-0 flex flex-col items-center justify-center leading-none">
                            <span className="text-2xl font-black text-slate-800 dark:text-slate-200">{summary?.totalContracts || 0}</span>
                            <span className="text-[10px] text-muted-foreground font-bold mt-1">إجمالي العقود</span>
                          </div>
                        </div>
                        
                        {/* الليجند الجانبي للتوزيع */}
                        <div className="flex-1 w-full space-y-2 max-h-[180px] overflow-y-auto pr-2">
                          {contractsByStatusData.map((item: any) => (
                            <div key={item.name} className="flex items-center justify-between text-xs font-semibold">
                              <div className="flex items-center gap-2">
                                <span className="w-2.5 h-2.5 rounded-full shrink-0 shadow-sm" style={{ backgroundColor: item.color }} />
                                <span className="text-muted-foreground">{item.name}</span>
                              </div>
                              <span className="text-slate-800 dark:text-slate-200 font-bold">{item.value} ({item.percentage}%)</span>
                            </div>
                          ))}
                        </div>
                      </>
                    ) : (
                      <div className="flex h-full items-center justify-center text-muted-foreground text-sm">
                        لا توجد بيانات حالات كافية
                      </div>
                    )}
                  </CardContent>
                </Card>
              </div>
            </motion.div>
          </TabsContent>

          {/* تبويب طلبات الصرف */}
          <TabsContent value="requests" className="space-y-6">
            <motion.div
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.35, ease: "easeOut" }}
              className="space-y-6"
            >
              {/* رسوم بيانية لطلبات الصرف */}
              <div className="grid gap-6 md:grid-cols-2">
                {/* مخطط سير طلبات الصرف عبر الأيام */}
                <Card className="border-0 shadow-sm bg-white dark:bg-slate-900 overflow-hidden">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-base font-bold text-slate-800 dark:text-slate-200">سير طلبات الصرف</CardTitle>
                    <CardDescription>عدد طلبات الصرف التي تم عملها خلال الأيام الماضية</CardDescription>
                  </CardHeader>
                  <CardContent className="h-64 sm:h-72">
                    {reportData?.requestsTimeline && reportData.requestsTimeline.length > 0 ? (
                      <ResponsiveContainer width="100%" height="100%">
                        <AreaChart
                          data={reportData.requestsTimeline}
                          margin={{ top: 10, right: 10, left: -20, bottom: 0 }}
                        >
                          <defs>
                            <linearGradient id="colorRequests" x1="0" y1="0" x2="0" y2="1">
                              <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.2}/>
                              <stop offset="95%" stopColor="#3b82f6" stopOpacity={0}/>
                            </linearGradient>
                          </defs>
                          <CartesianGrid strokeDasharray="3 3" vertical={false} className="stroke-muted/30" />
                          <XAxis 
                            dataKey="date" 
                            tickLine={false} 
                            axisLine={false} 
                            className="text-[10px] text-muted-foreground" 
                          />
                          <YAxis 
                            tickLine={false} 
                            axisLine={false} 
                            className="text-[10px] text-muted-foreground" 
                            allowDecimals={false}
                          />
                          <Tooltip content={<CustomRequestsTimelineTooltip />} />
                          <Area 
                            type="monotone" 
                            dataKey="count" 
                            stroke="#3b82f6" 
                            strokeWidth={2.5} 
                            fillOpacity={1} 
                            fill="url(#colorRequests)" 
                          />
                        </AreaChart>
                      </ResponsiveContainer>
                    ) : (
                      <div className="flex h-full items-center justify-center text-muted-foreground text-sm">
                        لا توجد بيانات مخطط كافية حالياً
                      </div>
                    )}
                  </CardContent>
                </Card>

                {/* مخطط توزيع حالات طلبات الصرف */}
                <Card className="border-0 shadow-sm bg-white dark:bg-slate-900 overflow-hidden">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-base font-bold text-slate-800 dark:text-slate-200">حالات طلبات الصرف</CardTitle>
                    <CardDescription>توزيع طلبات الصرف بين مسودة ومعتمد ومرفوض وقيد الاعتماد</CardDescription>
                  </CardHeader>
                  <CardContent className="h-64 sm:h-72 flex flex-col sm:flex-row items-center justify-center gap-4">
                    {reportData?.requestsByStatus && reportData.requestsByStatus.length > 0 ? (
                      <>
                        <div className="relative w-44 h-44 flex-shrink-0">
                          <ResponsiveContainer width="100%" height="100%">
                            <PieChart>
                              <Tooltip content={<CustomPieRequestsStatusTooltip />} />
                              <Pie
                                data={requestsByStatusData}
                                cx="50%"
                                cy="50%"
                                innerRadius={55}
                                outerRadius={75}
                                paddingAngle={3}
                                dataKey="value"
                              >
                                {requestsByStatusData.map((entry: any, index: number) => (
                                  <Cell key={`cell-${index}`} fill={entry.color} />
                                ))}
                              </Pie>
                            </PieChart>
                          </ResponsiveContainer>
                          <div className="absolute inset-0 flex flex-col items-center justify-center leading-none">
                            <span className="text-2xl font-black text-slate-800 dark:text-slate-200">{summary?.totalRequests || 0}</span>
                            <span className="text-[10px] text-muted-foreground font-bold mt-1">إجمالي الطلبات</span>
                          </div>
                        </div>
                        
                        {/* الليجند الجانبي للتوزيع */}
                        <div className="flex-1 w-full space-y-2 max-h-[180px] overflow-y-auto pr-2">
                          {requestsByStatusData.map((item: any) => (
                            <div key={item.name} className="flex items-center justify-between text-xs font-semibold">
                              <div className="flex items-center gap-2">
                                <span className="w-2.5 h-2.5 rounded-full shrink-0 shadow-sm" style={{ backgroundColor: item.color }} />
                                <span className="text-muted-foreground">{item.name}</span>
                              </div>
                              <span className="text-slate-800 dark:text-slate-200 font-bold">{item.value} ({item.percentage}%)</span>
                            </div>
                          ))}
                        </div>
                      </>
                    ) : (
                      <div className="flex h-full items-center justify-center text-muted-foreground text-sm">
                        لا توجد بيانات حالات كافية
                      </div>
                    )}
                  </CardContent>
                </Card>
              </div>
            </motion.div>
          </TabsContent>

          {/* تبويب أوامر الصرف */}
          <TabsContent value="orders" className="space-y-6">
            <motion.div
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.35, ease: "easeOut" }}
              className="space-y-6"
            >
              {/* رسوم بيانية لأوامر الصرف */}
              <div className="grid gap-6 md:grid-cols-2">
                {/* مخطط سير أوامر الصرف عبر الأيام */}
                <Card className="border-0 shadow-sm bg-white dark:bg-slate-900 overflow-hidden">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-base font-bold text-slate-800 dark:text-slate-200">سير أوامر الصرف</CardTitle>
                    <CardDescription>عدد أوامر الصرف التي تم عملها خلال الأيام الماضية</CardDescription>
                  </CardHeader>
                  <CardContent className="h-64 sm:h-72">
                    {reportData?.ordersTimeline && reportData.ordersTimeline.length > 0 ? (
                      <ResponsiveContainer width="100%" height="100%">
                        <AreaChart
                          data={reportData.ordersTimeline}
                          margin={{ top: 10, right: 10, left: -20, bottom: 0 }}
                        >
                          <defs>
                            <linearGradient id="colorOrders" x1="0" y1="0" x2="0" y2="1">
                              <stop offset="5%" stopColor="#8b5cf6" stopOpacity={0.2}/>
                              <stop offset="95%" stopColor="#8b5cf6" stopOpacity={0}/>
                            </linearGradient>
                          </defs>
                          <CartesianGrid strokeDasharray="3 3" vertical={false} className="stroke-muted/30" />
                          <XAxis 
                            dataKey="date" 
                            tickLine={false} 
                            axisLine={false} 
                            className="text-[10px] text-muted-foreground" 
                          />
                          <YAxis 
                            tickLine={false} 
                            axisLine={false} 
                            className="text-[10px] text-muted-foreground" 
                            allowDecimals={false}
                          />
                          <Tooltip content={<CustomOrdersTimelineTooltip />} />
                          <Area 
                            type="monotone" 
                            dataKey="count" 
                            stroke="#8b5cf6" 
                            strokeWidth={2.5} 
                            fillOpacity={1} 
                            fill="url(#colorOrders)" 
                          />
                        </AreaChart>
                      </ResponsiveContainer>
                    ) : (
                      <div className="flex h-full items-center justify-center text-muted-foreground text-sm">
                        لا توجد بيانات مخطط كافية حالياً
                      </div>
                    )}
                  </CardContent>
                </Card>

                {/* مخطط توزيع حالات أوامر الصرف */}
                <Card className="border-0 shadow-sm bg-white dark:bg-slate-900 overflow-hidden">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-base font-bold text-slate-800 dark:text-slate-200">حالات أوامر الصرف</CardTitle>
                    <CardDescription>توزيع أوامر الصرف بين مسودة ومعتمد ومرفوض وقيد الاعتماد ومعدل</CardDescription>
                  </CardHeader>
                  <CardContent className="h-64 sm:h-72 flex flex-col sm:flex-row items-center justify-center gap-4">
                    {reportData?.ordersByStatus && reportData.ordersByStatus.length > 0 ? (
                      <>
                        <div className="relative w-44 h-44 flex-shrink-0">
                          <ResponsiveContainer width="100%" height="100%">
                            <PieChart>
                              <Tooltip content={<CustomPieOrdersStatusTooltip />} />
                              <Pie
                                data={ordersByStatusData}
                                cx="50%"
                                cy="50%"
                                innerRadius={55}
                                outerRadius={75}
                                paddingAngle={3}
                                dataKey="value"
                              >
                                {ordersByStatusData.map((entry: any, index: number) => (
                                  <Cell key={`cell-${index}`} fill={entry.color} />
                                ))}
                              </Pie>
                            </PieChart>
                          </ResponsiveContainer>
                          <div className="absolute inset-0 flex flex-col items-center justify-center leading-none">
                            <span className="text-2xl font-black text-slate-800 dark:text-slate-200">{summary?.totalOrders || 0}</span>
                            <span className="text-[10px] text-muted-foreground font-bold mt-1">إجمالي الأوامر</span>
                          </div>
                        </div>
                        
                        {/* الليجند الجانبي للتوزيع */}
                        <div className="flex-1 w-full space-y-2 max-h-[180px] overflow-y-auto pr-2">
                          {ordersByStatusData.map((item: any) => (
                            <div key={item.name} className="flex items-center justify-between text-xs font-semibold">
                              <div className="flex items-center gap-2">
                                <span className="w-2.5 h-2.5 rounded-full shrink-0 shadow-sm" style={{ backgroundColor: item.color }} />
                                <span className="text-muted-foreground">{item.name}</span>
                              </div>
                              <span className="text-slate-800 dark:text-slate-200 font-bold">{item.value} ({item.percentage}%)</span>
                            </div>
                          ))}
                        </div>
                      </>
                    ) : (
                      <div className="flex h-full items-center justify-center text-muted-foreground text-sm">
                        لا توجد بيانات حالات كافية
                      </div>
                    )}
                  </CardContent>
                </Card>
              </div>
            </motion.div>
          </TabsContent>

          {/* تبويب سندات القبض */}
          <TabsContent value="receipt_vouchers" className="space-y-6">
            <motion.div
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.35, ease: "easeOut" }}
              className="space-y-6"
            >
              {/* رسوم بيانية لسندات القبض */}
              <div className="grid gap-6 md:grid-cols-2">
                {/* مخطط سير سندات القبض عبر الأيام */}
                <Card className="border-0 shadow-sm bg-white dark:bg-slate-900 overflow-hidden">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-base font-bold text-slate-800 dark:text-slate-200">سير سندات القبض</CardTitle>
                    <CardDescription>عدد سندات القبض التي تم عملها خلال الفترة الأخيرة</CardDescription>
                  </CardHeader>
                  <CardContent className="h-64 sm:h-72">
                    {receiptVouchersTimeline && receiptVouchersTimeline.length > 0 ? (
                      <ResponsiveContainer width="100%" height="100%">
                        <AreaChart
                          data={receiptVouchersTimeline}
                          margin={{ top: 10, right: 10, left: -20, bottom: 0 }}
                        >
                          <defs>
                            <linearGradient id="colorReceipts" x1="0" y1="0" x2="0" y2="1">
                              <stop offset="5%" stopColor="#10b981" stopOpacity={0.25}/>
                              <stop offset="95%" stopColor="#10b981" stopOpacity={0}/>
                            </linearGradient>
                          </defs>
                          <CartesianGrid strokeDasharray="3 3" vertical={false} className="stroke-muted/30" />
                          <XAxis 
                            dataKey="date" 
                            tickLine={false} 
                            axisLine={false} 
                            className="text-[10px] text-muted-foreground" 
                          />
                          <YAxis 
                            tickLine={false} 
                            axisLine={false} 
                            className="text-[10px] text-muted-foreground" 
                            allowDecimals={false}
                          />
                          <Tooltip content={<CustomReceiptTimelineTooltip />} />
                          <Area 
                            type="monotone" 
                            dataKey="count" 
                            stroke="#10b981" 
                            strokeWidth={2.5} 
                            fillOpacity={1} 
                            fill="url(#colorReceipts)" 
                          />
                        </AreaChart>
                      </ResponsiveContainer>
                    ) : (
                      <div className="flex h-full items-center justify-center text-muted-foreground text-sm">
                        لا توجد بيانات مخطط كافية حالياً
                      </div>
                    )}
                  </CardContent>
                </Card>

                {/* مخطط توزيع حالات سندات القبض */}
                <Card className="border-0 shadow-sm bg-white dark:bg-slate-900 overflow-hidden">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-base font-bold text-slate-800 dark:text-slate-200">حالات سندات القبض</CardTitle>
                    <CardDescription>توزيع سندات القبض بين معتمد وقيد الاعتماد وملغى ومرفوض</CardDescription>
                  </CardHeader>
                  <CardContent className="h-64 sm:h-72 flex flex-col sm:flex-row items-center justify-center gap-4">
                    {receiptVouchersByStatusData && receiptVouchersByStatusData.length > 0 ? (
                      <>
                        <div className="relative w-44 h-44 flex-shrink-0">
                          <ResponsiveContainer width="100%" height="100%">
                            <PieChart>
                              <Tooltip content={<CustomPieReceiptStatusTooltip />} />
                              <Pie
                                data={receiptVouchersByStatusData}
                                cx="50%"
                                cy="50%"
                                innerRadius={55}
                                outerRadius={75}
                                paddingAngle={3}
                                dataKey="value"
                              >
                                {receiptVouchersByStatusData.map((entry: any, index: number) => (
                                  <Cell key={`cell-${index}`} fill={entry.color} />
                                ))}
                              </Pie>
                            </PieChart>
                          </ResponsiveContainer>
                          <div className="absolute inset-0 flex flex-col items-center justify-center leading-none">
                            <span className="text-2xl font-black text-slate-800 dark:text-slate-200">{receiptVouchersSummary.totalCount}</span>
                            <span className="text-[10px] text-muted-foreground font-bold mt-1">إجمالي السندات</span>
                          </div>
                        </div>
                        
                        {/* الليجند الجانبي للتوزيع */}
                        <div className="flex-1 w-full space-y-2 max-h-[180px] overflow-y-auto pr-2">
                          {receiptVouchersByStatusData.map((item: any) => (
                            <div key={item.name} className="flex items-center justify-between text-xs font-semibold">
                              <div className="flex items-center gap-2">
                                <span className="w-2.5 h-2.5 rounded-full shrink-0 shadow-sm" style={{ backgroundColor: item.color }} />
                                <span className="text-muted-foreground">{item.name}</span>
                              </div>
                              <span className="text-slate-800 dark:text-slate-200 font-bold">{item.value} ({item.percentage}%)</span>
                            </div>
                          ))}
                        </div>
                      </>
                    ) : (
                      <div className="flex h-full items-center justify-center text-muted-foreground text-sm">
                        لا توجد بيانات حالات كافية
                      </div>
                    )}
                  </CardContent>
                </Card>
              </div>
            </motion.div>
          </TabsContent>
        </Tabs>

        {/* قسم الطباعة */}
        <div className="hidden print:block space-y-6">
          {/* المصروفات حسب المشروع */}
          <div>
            <h2 className="text-lg font-bold mb-2">المصروفات ونسب الجمعية حسب المشروع</h2>
            <table className="w-full border-collapse border text-sm">
              <thead>
                <tr className="bg-gray-100">
                  <th className="border p-2 text-right">المشروع</th>
                  <th className="border p-2 text-center">نسبة الجمعية</th>
                  <th className="border p-2 text-left">قيمة الجمعية من المشروع</th>
                  <th className="border p-2 text-left">قيمة العقد</th>
                  <th className="border p-2 text-left">القيمة الاجمالية للمشروع</th>
                </tr>
              </thead>
              <tbody>
                {reportData?.byProject?.map((project: any) => {
                  const contractAmount = Number(project.contractAmount || 0);
                  const associationValue = Number(project.associationValue || 0);
                  const totalProjectValue = contractAmount + associationValue;
                  return (
                    <tr key={project.projectId}>
                      <td className="border p-2">{project.projectName}</td>
                      <td className="border p-2 text-center">{project.managementPercentage || 0}%</td>
                      <td className="border p-2 text-left">{associationValue.toLocaleString("ar-SA", { minimumFractionDigits: 2, maximumFractionDigits: 2 })} ريال</td>
                      <td className="border p-2 text-left">{contractAmount.toLocaleString("ar-SA", { minimumFractionDigits: 2, maximumFractionDigits: 2 })} ريال</td>
                      <td className="border p-2 text-left">{totalProjectValue.toLocaleString("ar-SA", { minimumFractionDigits: 2, maximumFractionDigits: 2 })} ريال</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* حالة أوامر الصرف */}
          <div>
            <h2 className="text-lg font-bold mb-2">حالة أوامر الصرف</h2>
            <table className="w-full border-collapse border text-sm">
              <thead>
                <tr className="bg-gray-100">
                  <th className="border p-2 text-right">الحالة</th>
                  <th className="border p-2 text-right">العدد</th>
                  <th className="border p-2 text-right">المبلغ</th>
                </tr>
              </thead>
              <tbody>
                {reportData?.ordersByStatus?.map((item) => (
                  <tr key={item.status}>
                    <td className="border p-2">{STATUS_MAP[item.status || "draft"]?.label}</td>
                    <td className="border p-2">{item.count}</td>
                    <td className="border p-2">{formatAmount(Number(item.totalAmount))} ريال</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}

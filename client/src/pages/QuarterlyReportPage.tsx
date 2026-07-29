import { useState, useMemo, useEffect } from "react";
import { useLocation } from "wouter";
import DashboardLayout from "@/components/DashboardLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { FileUpload, UploadedFile } from "@/components/FileUpload";
import { ReportHeaderTabs } from "@/components/project-reports/ReportHeaderTabs";
import { RagIndicatorSelect } from "@/components/project-reports/RagIndicatorSelect";
import { DynamicArrayTable, ColumnDef } from "@/components/project-reports/DynamicArrayTable";
import { ReportPrintPreviewModal } from "@/components/project-reports/ReportPrintPreviewModal";
import { STAGE_LABELS } from "@shared/constants";
import { toast } from "sonner";
import { trpc } from "@/lib/trpc";
import { Building2, User, TrendingUp, TrendingDown, Minus, Calendar, Target, Award, ShieldAlert, BookOpen, Wand2, Layers, Sparkles, CheckCircle2, RefreshCw, Save, Eye, Printer, AlertCircle } from "lucide-react";

const formatToInputDate = (val: any): string => {
  if (!val) return "";
  try {
    if (typeof val === "string" && /^\d{4}-\d{2}-\d{2}$/.test(val.trim())) {
      return val.trim();
    }
    const d = new Date(val);
    if (isNaN(d.getTime())) return "";
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, "0");
    const day = String(d.getDate()).padStart(2, "0");
    return `${year}-${month}-${day}`;
  } catch {
    return "";
  }
};

const getArabicMonthName = (monthStr: string) => {
  const m = parseInt(monthStr, 10);
  const months = [
    "يناير", "فبراير", "مارس", "أبريل", "مايو", "يونيو",
    "يوليو", "أغسطس", "سبتمبر", "أكتوبر", "نوفمبر", "ديسمبر"
  ];
  return months[m - 1] || "";
};

const formatDateToReadableArabic = (dateVal: any): string => {
  if (!dateVal) return "";
  try {
    if (typeof dateVal === "string" && /^\d{4}-\d{2}-\d{2}$/.test(dateVal.trim())) {
      const [y, m, d] = dateVal.trim().split("-");
      const monthName = getArabicMonthName(m);
      return `${parseInt(d, 10)} ${monthName} ${y}`;
    }
    const d = new Date(dateVal);
    if (isNaN(d.getTime())) return String(dateVal);
    const day = d.getDate();
    const monthName = getArabicMonthName(String(d.getMonth() + 1));
    const year = d.getFullYear();
    return `${day} ${monthName} ${year}`;
  } catch {
    return String(dateVal);
  }
};

export default function QuarterlyReportPage({ showLayout = true }: { showLayout?: boolean }) {
  const [, setLocation] = useLocation();
  const createMutation = trpc.progressReports.create.useMutation();
  const updateMutation = trpc.progressReports.update.useMutation();
  const updateStatusMutation = trpc.progressReports.updateStatus.useMutation();

  const searchParams = new URLSearchParams(typeof window !== "undefined" ? window.location.search : "");
  const editIdParam = searchParams.get("editId");
  const editId = editIdParam ? parseInt(editIdParam, 10) : undefined;

  const { data: existingReport } = trpc.progressReports.getById.useQuery(
    { id: editId || 0 },
    { enabled: !!editId }
  );

  const { data: dbProjectsData } = trpc.projects.getAll.useQuery();
  const { data: dbReports } = trpc.progressReports.list.useQuery();

  const projectOptions = useMemo(() => {
    if (dbProjectsData && dbProjectsData.length > 0) {
      return dbProjectsData
        .filter((p: any) => {
          if (p.programType === "bunyan") return true;
          if (p.startDate && (p.expectedEndDate || p.endDate)) {
            const start = new Date(p.startDate).getTime();
            const end = new Date(p.expectedEndDate || p.endDate).getTime();
            if (!isNaN(start) && !isNaN(end)) {
              const days = (end - start) / (1000 * 60 * 60 * 24);
              if (days >= 365) return true;
            }
          }
          return false;
        })
        .map((p: any) => {
          const rawStage = p.requestStage || p.status || "execution";
          const arabicPhase = STAGE_LABELS[rawStage] || rawStage;
          let parsedMilestones: any[] = [];
          if (p.milestones) {
            try {
              parsedMilestones = typeof p.milestones === "string" ? JSON.parse(p.milestones) : p.milestones;
            } catch {}
          }
          return {
            id: String(p.id),
            name: p.name || `مشروع رقم ${p.projectNumber}`,
            manager: p.managerName || "غير محدد",
            department: "إدارة المشاريع",
            currentPhase: arabicPhase,
            plannedProgress: p.plannedProgress ?? 0,
            actualProgress: p.completionPercentage ?? 0,
            cumulativeBudget: Number(p.budget) || 3500000,
            cumulativeSpent: Number(p.actualCost) || 2450000,
            milestones: parsedMilestones,
          };
        });
    }
    return [];
  }, [dbProjectsData]);

  const [selectedProjectId, setSelectedProjectId] = useState<string>("");
  const [projectManager, setProjectManager] = useState<string>("غير محدد");
  const [periodFrom, setPeriodFrom] = useState<string>("");
  const [periodTo, setPeriodTo] = useState<string>("");
  const [quarter, setQuarter] = useState<string>("Q3");
  const [year, setYear] = useState<string>("2026");
  const [reportDate, setReportDate] = useState<string>(formatToInputDate(new Date()));
  const [currentPhase, setCurrentPhase] = useState<string>("التنفيذ");

  const selectedProjectObj = useMemo(() => {
    return dbProjectsData?.find((p: any) => String(p.id) === String(selectedProjectId));
  }, [dbProjectsData, selectedProjectId]);

  const existingProjectReportPeriods = useMemo(() => {
    if (!dbReports || !selectedProjectId) return new Set<string>();
    const set = new Set<string>();
    dbReports.forEach((r) => {
      if (Number(r.projectId) === Number(selectedProjectId) && r.reportPeriodStart && r.reportPeriodEnd) {
        const startIso = formatToInputDate(r.reportPeriodStart);
        const endIso = formatToInputDate(r.reportPeriodEnd);
        set.add(`${startIso}_${endIso}`);
      }
    });
    return set;
  }, [dbReports, selectedProjectId]);

  const projectQuarterlyPeriods = useMemo(() => {
    if (!selectedProjectObj) return [];

    const proj: any = selectedProjectObj;
    const startVal = proj.startDate;
    const endVal = proj.expectedEndDate || proj.actualEndDate || proj.endDate;

    let start: Date;
    if (startVal) {
      const parsedStart = new Date(startVal);
      if (!isNaN(parsedStart.getTime())) {
        start = new Date(parsedStart.getFullYear(), parsedStart.getMonth(), parsedStart.getDate());
      } else {
        start = new Date(new Date().getFullYear(), 0, 1);
      }
    } else {
      start = new Date(new Date().getFullYear(), 0, 1);
    }

    let end: Date;
    if (endVal) {
      const parsedEnd = new Date(endVal);
      if (!isNaN(parsedEnd.getTime())) {
        end = new Date(parsedEnd.getFullYear(), parsedEnd.getMonth(), parsedEnd.getDate());
      } else {
        end = new Date(start.getTime() + 365 * 24 * 60 * 60 * 1000);
      }
    } else {
      end = new Date(start.getTime() + 365 * 24 * 60 * 60 * 1000);
    }

    const periods = [];
    let currentStart = new Date(start);
    let index = 1;

    while (currentStart < end) {
      let currEnd = new Date(currentStart);
      currEnd.setDate(currEnd.getDate() + 89);

      if (currEnd > end) {
        break;
      }

      const fromIso = formatToInputDate(currentStart);
      const toIso = formatToInputDate(currEnd);

      const fromStr = formatDateToReadableArabic(fromIso);
      const toStr = formatDateToReadableArabic(toIso);

      periods.push({
        index,
        from: fromIso,
        to: toIso,
        fromStr,
        toStr,
        label: `الربع ${index} (من ${fromStr} إلى ${toStr})`,
      });

      currentStart = new Date(currEnd);
      currentStart.setDate(currentStart.getDate() + 1);
      index++;
    }

    return periods;
  }, [selectedProjectObj]);

  useEffect(() => {
    if (existingReport) {
      if (existingReport.projectId) setSelectedProjectId(String(existingReport.projectId));
      if (existingReport.plannedProgress !== null && existingReport.plannedProgress !== undefined) {
        setPlannedProgress(existingReport.plannedProgress);
      }
      if (existingReport.actualProgress !== null && existingReport.actualProgress !== undefined) {
        setActualProgress(existingReport.actualProgress);
      }
      if (existingReport.recommendations) setContinuationDecisions(existingReport.recommendations);
      if (existingReport.reportDate) setReportDate(formatToInputDate(existingReport.reportDate));
      if (existingReport.reportPeriodStart) setPeriodFrom(formatToInputDate(existingReport.reportPeriodStart));
      if (existingReport.reportPeriodEnd) setPeriodTo(formatToInputDate(existingReport.reportPeriodEnd));
    }
  }, [existingReport]);

  useEffect(() => {
    if (selectedProjectId && projectQuarterlyPeriods.length > 0 && !existingReport) {
      const availablePeriod = projectQuarterlyPeriods.find(
        (p) => !existingProjectReportPeriods.has(`${p.from}_${p.to}`)
      );
      if (availablePeriod) {
        setPeriodFrom(availablePeriod.from);
        setPeriodTo(availablePeriod.to);
        setReportDate(availablePeriod.to);
      } else {
        const first = projectQuarterlyPeriods[0];
        setPeriodFrom(first.from);
        setPeriodTo(first.to);
        setReportDate(first.to);
      }
    }
  }, [selectedProjectId, projectQuarterlyPeriods, existingReport, existingProjectReportPeriods]);

  const [entryMode, setEntryMode] = useState<"manual" | "from_monthly" | "from_semi">("manual");
  const [selectedMonthlyId, setSelectedMonthlyId] = useState<string>("");
  const [selectedSemiId, setSelectedSemiId] = useState<string>("");
  const [isAggregated, setIsAggregated] = useState<boolean>(false);

  const availableMonthlyReports = useMemo(() => {
    if (!dbReports) return [];
    return dbReports
      .filter((r) => {
        if (Number(r.projectId) !== Number(selectedProjectId)) return false;
        const titleLower = r.title.toLowerCase();
        const isMonthly = (titleLower.includes("شهري") || titleLower.includes("monthly"));
        const isSemi = (titleLower.includes("نصف") || titleLower.includes("semi"));
        return isMonthly && !isSemi;
      })
      .map((r) => {
        const startStr = r.reportPeriodStart ? String(r.reportPeriodStart).substring(0, 10) : "";
        const endStr = r.reportPeriodEnd ? String(r.reportPeriodEnd).substring(0, 10) : "";
        const monthYear = r.reportPeriodStart ? String(r.reportPeriodStart).substring(0, 7) : (r.reportDate ? String(r.reportDate).substring(0, 7) : "");
        
        let qVal = "";
        let yVal = "";
        if (monthYear && monthYear.includes("-")) {
          const parts = monthYear.split("-");
          yVal = parts[0];
          const m = parseInt(parts[1], 10);
          if (m >= 1 && m <= 3) qVal = "Q1";
          else if (m >= 4 && m <= 6) qVal = "Q2";
          else if (m >= 7 && m <= 9) qVal = "Q3";
          else if (m >= 10 && m <= 12) qVal = "Q4";
        }

        return {
          id: String(r.id),
          title: r.title,
          projectId: String(r.projectId),
          actualProgress: r.actualProgress || 0,
          plannedProgress: r.plannedProgress || 0,
          cumulativeBudget: Number(r.budgetSpent) || 0,
          cumulativeSpent: Number(r.budgetSpent) || 0,
          milestones: [],
          monthYear,
          quarter: qVal,
          year: yVal,
          period: startStr && endStr ? `${startStr} إلى ${endStr}` : "فترة غير محددة",
        };
      });
  }, [dbReports, selectedProjectId]);

  const availableSemiReports = useMemo(() => {
    if (!dbReports) return [];
    return dbReports
      .filter((r) => {
        if (Number(r.projectId) !== Number(selectedProjectId)) return false;
        const titleLower = r.title.toLowerCase();
        return (titleLower.includes("نصف") || titleLower.includes("semi")) && (titleLower.includes("شهري") || titleLower.includes("monthly"));
      })
      .map((r) => {
        const startStr = r.reportPeriodStart ? String(r.reportPeriodStart).substring(0, 10) : "";
        const endStr = r.reportPeriodEnd ? String(r.reportPeriodEnd).substring(0, 10) : "";
        const monthYear = r.reportPeriodStart ? String(r.reportPeriodStart).substring(0, 7) : (r.reportDate ? String(r.reportDate).substring(0, 7) : "");
        
        let qVal = "";
        let yVal = "";
        if (monthYear && monthYear.includes("-")) {
          const parts = monthYear.split("-");
          yVal = parts[0];
          const m = parseInt(parts[1], 10);
          if (m >= 1 && m <= 3) qVal = "Q1";
          else if (m >= 4 && m <= 6) qVal = "Q2";
          else if (m >= 7 && m <= 9) qVal = "Q3";
          else if (m >= 10 && m <= 12) qVal = "Q4";
        }

        return {
          id: String(r.id),
          title: r.title,
          projectId: String(r.projectId),
          actualProgress: r.actualProgress || 0,
          plannedProgress: r.plannedProgress || 0,
          cumulativeBudget: Number(r.budgetSpent) || 0,
          cumulativeSpent: Number(r.budgetSpent) || 0,
          milestones: [],
          monthYear,
          quarter: qVal,
          year: yVal,
          period: startStr && endStr ? `${startStr} إلى ${endStr}` : "فترة غير محددة",
        };
      });
  }, [dbReports, selectedProjectId]);

  const [selectedMonthlyBlockKey, setSelectedMonthlyBlockKey] = useState<string>("");
  const [selectedSemiBlockKey, setSelectedSemiBlockKey] = useState<string>("");

  // التقارير الربعية المسجلة سابقاً لهذا المشروع
  const existingQuarterlyReportKeys = useMemo(() => {
    if (!dbReports || !selectedProjectId) return new Set<string>();
    const keys = new Set<string>();
    dbReports.forEach((r) => {
      if (Number(r.projectId) === Number(selectedProjectId)) {
        const titleLower = r.title.toLowerCase();
        const isQuarterly = titleLower.includes("ربعي") || titleLower.includes("quarterly");
        if (isQuarterly) {
          if (r.challenges && r.challenges.includes("الربع: ")) {
            const qMatch = r.challenges.match(/الربع:\s*(Q\d)/);
            const yMatch = r.challenges.match(/السنة:\s*(\d{4})/);
            if (qMatch && yMatch) {
              keys.add(`${qMatch[1]}_${yMatch[1]}`);
            }
          }
        }
      }
    });
    return keys;
  }, [dbReports, selectedProjectId]);

const getQuarterMonthDisplay = (qStr: string, yearStr: string) => {
  const cleanQ = qStr.replace(/[^0-9]/g, "");
  const qMap: Record<string, string> = {
    "1": "الربع الأول (يناير - مارس)",
    "2": "الربع الثاني (أبريل - يونيو)",
    "3": "الربع الثالث (يوليو - سبتمبر)",
    "4": "الربع الرابع (أكتوبر - ديسمبر)",
  };
  const text = qMap[cleanQ] || `الربع ${qStr}`;
  return `${text} ${yearStr}`;
};

  // تقسيم التقارير الشهرية إلى فترات ربعية (كل فترة تتضمن 3 تقارير شهرية متتابعة للربع)
  const quarterMonthlyBlocks = useMemo(() => {
    if (!availableMonthlyReports || availableMonthlyReports.length === 0) return [];

    const groups: Record<string, typeof availableMonthlyReports> = {};
    availableMonthlyReports.forEach((r) => {
      const key = `${r.quarter}_${r.year}`;
      if (!groups[key]) groups[key] = [];
      groups[key].push(r);
    });

    return Object.entries(groups).map(([key, reports]) => {
      const [q, y] = key.split("_");
      const isComplete = reports.length >= 3;
      const alreadyUsed = existingQuarterlyReportKeys.has(key);
      const isDisabled = !isComplete || alreadyUsed;
      const titleDisplay = getQuarterMonthDisplay(q, y);

      let statusBadge = "";
      if (alreadyUsed) {
        statusBadge = `تم إنشاء تقرير ربعي سابقاً لهذا الربع`;
      } else if (!isComplete) {
        statusBadge = `غير مكتمل (${reports.length} من أصل 3 تقارير شهرية)`;
      } else {
        statusBadge = `جاهز للتجميع (3 تقارير شهرية مكتملة)`;
      }

      return {
        key,
        quarter: q,
        year: y,
        titleDisplay,
        reports,
        isComplete,
        alreadyUsed,
        isDisabled,
        statusBadge,
        label: `${titleDisplay} - ${statusBadge}`,
      };
    });
  }, [availableMonthlyReports, existingQuarterlyReportKeys]);

  // تقسيم التقارير النصف شهرية إلى فترات ربعية (كل فترة تتضمن 6 تقارير نصف شهرية للربع)
  const quarterSemiBlocks = useMemo(() => {
    if (!availableSemiReports || availableSemiReports.length === 0) return [];

    const groups: Record<string, typeof availableSemiReports> = {};
    availableSemiReports.forEach((r) => {
      const key = `${r.quarter}_${r.year}`;
      if (!groups[key]) groups[key] = [];
      groups[key].push(r);
    });

    return Object.entries(groups).map(([key, reports]) => {
      const [q, y] = key.split("_");
      const isComplete = reports.length >= 6;
      const alreadyUsed = existingQuarterlyReportKeys.has(key);
      const isDisabled = !isComplete || alreadyUsed;
      const titleDisplay = getQuarterMonthDisplay(q, y);

      let statusBadge = "";
      if (alreadyUsed) {
        statusBadge = `تم إنشاء تقرير ربعي سابقاً لهذا الربع`;
      } else if (!isComplete) {
        statusBadge = `غير مكتمل (${reports.length} من أصل 6 تقارير نصف شهرية)`;
      } else {
        statusBadge = `جاهز للتجميع (6 تقارير نصف شهرية مكتملة)`;
      }

      return {
        key,
        quarter: q,
        year: y,
        titleDisplay,
        reports,
        isComplete,
        alreadyUsed,
        isDisabled,
        statusBadge,
        label: `${titleDisplay} - ${statusBadge}`,
      };
    });
  }, [availableSemiReports, existingQuarterlyReportKeys]);

  const selectedMonthlyBlock = useMemo(() => {
    return quarterMonthlyBlocks.find((b) => b.key === selectedMonthlyBlockKey);
  }, [quarterMonthlyBlocks, selectedMonthlyBlockKey]);

  const selectedSemiBlock = useMemo(() => {
    return quarterSemiBlocks.find((b) => b.key === selectedSemiBlockKey);
  }, [quarterSemiBlocks, selectedSemiBlockKey]);

  const [plannedProgress, setPlannedProgress] = useState<number>(projectOptions[0]?.plannedProgress || 0);
  const [actualProgress, setActualProgress] = useState<number>(projectOptions[0]?.actualProgress || 0);

  const gap = useMemo(() => actualProgress - plannedProgress, [actualProgress, plannedProgress]);
  const delay = useMemo(() => plannedProgress - actualProgress, [plannedProgress, actualProgress]);

  const ragStatus = useMemo(() => {
    if (delay < 5) return "أخضر";
    if (delay < 25) return "أصفر";
    return "أحمر";
  }, [delay]);

  const [quarterMilestones, setQuarterMilestones] = useState<Record<string, any>[]>([]);

  const [cumulativeSpent, setCumulativeSpent] = useState<number>(projectOptions[0]?.cumulativeSpent || 2450000);
  const [cumulativeBudget, setCumulativeBudget] = useState<number>(projectOptions[0]?.cumulativeBudget || 3500000);

  const handleAggregateFromMonthly = async () => {
    if (!selectedMonthlyBlock) {
      toast.error("يرجى اختيار بلوك التقارير الشهرية للربع للبدء بالتجميع");
      return;
    }

    if (selectedMonthlyBlock.alreadyUsed) {
      toast.error(`لقد تم إنشاء تقرير ربعي سابقاً للربع ${selectedMonthlyBlock.quarter} لعام ${selectedMonthlyBlock.year}. لا يمكن تكرار التجميع لنفس الربع.`);
      return;
    }

    if (!selectedMonthlyBlock.isComplete) {
      toast.error(
        `لا يمكن تجميع التقرير الربعي: يلزم توفر 3 تقارير شهرية مكتملة لهذا الربع (متوفر ${selectedMonthlyBlock.reports.length} فقط).`
      );
      return;
    }

    const autoMatchedMonthlies = selectedMonthlyBlock.reports;
    const avgActual = Math.round(autoMatchedMonthlies.reduce((acc, r) => acc + r.actualProgress, 0) / autoMatchedMonthlies.length);
    const avgPlanned = Math.round(autoMatchedMonthlies.reduce((acc, r) => acc + r.plannedProgress, 0) / autoMatchedMonthlies.length);

    setActualProgress(avgActual);
    setPlannedProgress(avgPlanned);
    setQuarter(selectedMonthlyBlock.quarter);
    setYear(selectedMonthlyBlock.year);

    const latestBudget = autoMatchedMonthlies[autoMatchedMonthlies.length - 1]?.cumulativeBudget || cumulativeBudget;
    const latestSpent = autoMatchedMonthlies[autoMatchedMonthlies.length - 1]?.cumulativeSpent || cumulativeSpent;
    setCumulativeBudget(latestBudget);
    setCumulativeSpent(latestSpent);

    const combinedMilestones: any[] = [];
    autoMatchedMonthlies.forEach((r) => {
      if (r.milestones) combinedMilestones.push(...r.milestones);
    });
    if (combinedMilestones.length > 0) {
      setQuarterMilestones(combinedMilestones);
    }

    setIsAggregated(true);

    // إنشاء التقرير الربعي آلياً بقيد الاعتماد والتوجه للخارج
    try {
      setIsSubmitting(true);
      const res = await createMutation.mutateAsync({
        projectId: Number(selectedProjectId),
        title: `التقرير الربعي - ${selectedProjName}`,
        reportDate: reportDate || new Date().toISOString().split("T")[0],
        plannedProgress: avgPlanned,
        actualProgress: avgActual,
        overallProgress: avgActual,
        challenges: `الربع: ${selectedMonthlyBlock.quarter}\nالسنة: ${selectedMonthlyBlock.year}\nالمواءمة الاستراتيجية: ${strategicAlignment}`,
        recommendations: continuationDecisions,
        workSummary: `الأثر المتحقق: ${realizedImpact}\nالدروس المستفادة: ${lessonsLearned}\nالاتجاه العام: ${overallTrend}\nمرحلة دورة الحياة الحالية: ${currentPhase}`,
      });

      await updateStatusMutation.mutateAsync({
        id: res.id,
        status: "submitted",
      });

      toast.success(`تم إنشاء وتجميع التقرير الربعي بنجاح وهو الآن بقيد الاعتماد! (رقم التقرير: ${res.reportNumber})`);
      setLocation("/project-reports");
    } catch (err: any) {
      toast.error(err.message || "حدث خطأ أثناء تجميع التقرير الربعي");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleAggregateFromSemi = async () => {
    if (!selectedSemiBlock) {
      toast.error("يرجى اختيار بلوك التقارير النصف شهرية للربع للبدء بالتجميع");
      return;
    }

    if (selectedSemiBlock.alreadyUsed) {
      toast.error(`لقد تم إنشاء تقرير ربعي سابقاً للربع ${selectedSemiBlock.quarter} لعام ${selectedSemiBlock.year}. لا يمكن تكرار التجميع لنفس الربع.`);
      return;
    }

    if (!selectedSemiBlock.isComplete) {
      toast.error(
        `لا يمكن تجميع التقرير الربعي: يلزم توفر 6 تقارير نصف شهرية مكتملة لهذا الربع (متوفر ${selectedSemiBlock.reports.length} فقط).`
      );
      return;
    }

    const autoMatchedSemis = selectedSemiBlock.reports;
    const avgActual = Math.round(autoMatchedSemis.reduce((acc, r) => acc + r.actualProgress, 0) / autoMatchedSemis.length);
    const avgPlanned = Math.round(autoMatchedSemis.reduce((acc, r) => acc + r.plannedProgress, 0) / autoMatchedSemis.length);

    setActualProgress(avgActual);
    setPlannedProgress(avgPlanned);
    setQuarter(selectedSemiBlock.quarter);
    setYear(selectedSemiBlock.year);

    const combinedMilestones: any[] = [];
    autoMatchedSemis.forEach((r) => {
      if (r.milestones) combinedMilestones.push(...r.milestones);
    });
    if (combinedMilestones.length > 0) {
      setQuarterMilestones(combinedMilestones);
    }

    setIsAggregated(true);

    // إنشاء التقرير الربعي آلياً بقيد الاعتماد والتوجه للخارج
    try {
      setIsSubmitting(true);
      const res = await createMutation.mutateAsync({
        projectId: Number(selectedProjectId),
        title: `التقرير الربعي - ${selectedProjName}`,
        reportDate: reportDate || new Date().toISOString().split("T")[0],
        plannedProgress: avgPlanned,
        actualProgress: avgActual,
        overallProgress: avgActual,
        challenges: `الربع: ${selectedSemiBlock.quarter}\nالسنة: ${selectedSemiBlock.year}\nالمواءمة الاستراتيجية: ${strategicAlignment}`,
        recommendations: continuationDecisions,
        workSummary: `الأثر المتحقق: ${realizedImpact}\nالدروس المستفادة: ${lessonsLearned}\nالاتجاه العام: ${overallTrend}\nمرحلة دورة الحياة الحالية: ${currentPhase}`,
      });

      await updateStatusMutation.mutateAsync({
        id: res.id,
        status: "submitted",
      });

      toast.success(`تم إنشاء وتجميع التقرير الربعي بنجاح وهو الآن بقيد الاعتماد! (رقم التقرير: ${res.reportNumber})`);
      setLocation("/project-reports");
    } catch (err: any) {
      toast.error(err.message || "حدث خطأ أثناء تجميع التقرير الربعي");
    } finally {
      setIsSubmitting(false);
    }
  };

  const financialCommitmentPct = useMemo(() => {
    if (!cumulativeBudget || cumulativeBudget === 0) return 0;
    return Math.round((cumulativeSpent / cumulativeBudget) * 100);
  }, [cumulativeSpent, cumulativeBudget]);

  const [timeIndicator, setTimeIndicator] = useState<string>("أخضر");
  const [costIndicator, setCostIndicator] = useState<string>("أخضر");
  const [changeIndicator, setChangeIndicator] = useState<string>("أخضر");

  const [overallTrend, setOverallTrend] = useState<"متحسّن" | "ثابت" | "متراجع">("متحسّن");

  const [strategicAlignment, setStrategicAlignment] = useState<string>(
    "يتوافق المشروع بشكل مباشر مع المبادرة الاستراتيجية لعناية ورعاية مساجد المنطقة وحوكمة الصيانة."
  );

  const [realizedImpact, setRealizedImpact] = useState<string>(
    "تحسين تجربة المصلين ورفع كفاءة استهلاك الطاقة والمياه بنسبة 35% خلال الربع."
  );

  const [lessonsLearned, setLessonsLearned] = useState<string>("");

  const [continuationDecisions, setContinuationDecisions] = useState<string>(
    "التوصية بالاستمرار في تنفيذ المرحلة التالية مع ضخ الدفعة المالية المستحقة وتعديل جدول الضمان."
  );

  const [needEscalation, setNeedEscalation] = useState<boolean>(false);
  const [attachments, setAttachments] = useState<UploadedFile[]>([]);
  const [reportStatus, setReportStatus] = useState<string>("مسودة");

  const [showPreviewModal, setShowPreviewModal] = useState<boolean>(false);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);

  const handleProjectSelect = (projId: string) => {
    setSelectedProjectId(projId);
    const proj = projectOptions.find((p) => String(p.id) === String(projId));
    if (proj) {
      setProjectManager(proj.manager);
      setCurrentPhase(proj.currentPhase);
      if (proj.actualProgress !== undefined) setActualProgress(proj.actualProgress);
      if (proj.cumulativeBudget !== undefined) setCumulativeBudget(proj.cumulativeBudget);
      if (proj.cumulativeSpent !== undefined) setCumulativeSpent(proj.cumulativeSpent);
    }
  };

  useEffect(() => {
    const proj = projectOptions.find((p) => String(p.id) === String(selectedProjectId));
    if (proj) {
      if (proj.manager) setProjectManager(proj.manager);
      if (proj.currentPhase) setCurrentPhase(proj.currentPhase);
      if (proj.actualProgress !== undefined) setActualProgress(proj.actualProgress);
      if (proj.cumulativeBudget !== undefined) setCumulativeBudget(proj.cumulativeBudget);
      if (proj.cumulativeSpent !== undefined) setCumulativeSpent(proj.cumulativeSpent);
    }
  }, [projectOptions, selectedProjectId]);

  const selectedProjName = projectOptions.find((p) => String(p.id) === String(selectedProjectId))?.name || "";

  useEffect(() => {
    const hasRed =
      ragStatus === "أحمر" ||
      timeIndicator === "أحمر" ||
      costIndicator === "أحمر" ||
      changeIndicator === "أحمر";
    if (hasRed) {
      setNeedEscalation(true);
    }
  }, [ragStatus, timeIndicator, costIndicator, changeIndicator]);

  const handleSaveDraft = async (overrideStatus?: string) => {
    const finalStatus = overrideStatus || reportStatus || "مسودة";
    if (!selectedProjectId) {
      toast.error("يرجى اختيار المشروع أولاً من القائمة قبل حفظ التقرير");
      return;
    }
    if (!strategicAlignment.trim()) {
      toast.error("يرجى توضيح مدى المواءمة مع الأهداف الاستراتيجية");
      return;
    }
    if (!realizedImpact.trim()) {
      toast.error("يرجى توضيح القيمة والأثر المتحقق");
      return;
    }
    if (!continuationDecisions.trim()) {
      toast.error("يرجى تدوين التوصيات وقرارات الاستمرار/التعديل");
      return;
    }

    try {
      setIsSubmitting(true);
      let statusEnum: "draft" | "submitted" | "reviewed" | "approved" = "draft";
      if (finalStatus === "تم الاطلاع") {
        statusEnum = "submitted";
      } else if (finalStatus === "معتمد") {
        statusEnum = "approved";
      }

      if (editId) {
        await updateMutation.mutateAsync({
          id: editId,
          title: `التقرير الربعي - ${selectedProjName}`,
          plannedProgress: plannedProgress,
          actualProgress: actualProgress,
          overallProgress: actualProgress,
          challenges: `الربع: ${quarter}\nالسنة: ${year}\nالمواءمة الاستراتيجية: ${strategicAlignment}`,
          recommendations: continuationDecisions,
          workSummary: `الأثر المتحقق: ${realizedImpact}\nالدروس المستفادة: ${lessonsLearned}\nالاتجاه العام: ${overallTrend}\nمرحلة دورة الحياة الحالية: ${currentPhase}`,
        });

        await updateStatusMutation.mutateAsync({
          id: editId,
          status: statusEnum,
        });

        toast.success(finalStatus === "مسودة" ? "تم تحديث مسودة التقرير بنجاح" : "تم إكمال واعتماد التقرير بنجاح");
        setLocation("/project-reports");
        return;
      }

      const res = await createMutation.mutateAsync({
        projectId: Number(selectedProjectId),
        title: `التقرير الربعي - ${selectedProjName}`,
        reportDate: reportDate || new Date().toISOString().split("T")[0],
        plannedProgress: plannedProgress,
        actualProgress: actualProgress,
        overallProgress: actualProgress,
        challenges: `الربع: ${quarter}\nالسنة: ${year}\nالمواءمة الاستراتيجية: ${strategicAlignment}`,
        recommendations: continuationDecisions,
        workSummary: `الأثر المتحقق: ${realizedImpact}\nالدروس المستفادة: ${lessonsLearned}\nالاتجاه العام: ${overallTrend}\nمرحلة دورة الحياة الحالية: ${currentPhase}`,
      });

      await updateStatusMutation.mutateAsync({
        id: res.id,
        status: statusEnum,
      });

      toast.success(finalStatus === "مسودة" ? `تم حفظ التقرير كمسودة - رقم التقرير ${res.reportNumber}` : `تم اعتماد وحفظ التقرير بنجاح - رقم التقرير ${res.reportNumber}`);
      setLocation("/project-reports");
    } catch (error: any) {
      toast.error(error.message || "حدث خطأ أثناء حفظ التقرير");
    } finally {
      setIsSubmitting(false);
    }
  };

  const milestoneCols: ColumnDef[] = [
    { key: "title", label: "اسم المعلم المنجز خلال الربع", type: "text", placeholder: "وصف المعلم الاستراتيجي" },
    { key: "date", label: "تاريخ الإنجاز", type: "date" },
    {
      key: "status",
      label: "الحالة",
      type: "select",
      options: [
        { value: "منجز", label: "منجز بالكامل" },
        { value: "جارٍ", label: "جارٍ المتابعة" },
        { value: "متأخر", label: "متأخر" },
      ],
    },
  ];

  const content = (
    <div className="space-y-6 animate-in fade-in duration-300" dir="rtl">

        <div className="space-y-6">
          {/* بيانات التقرير */}
          <Card className="border-border/80 shadow-xs">
            <CardHeader className="pb-3 border-b border-border/60">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="w-2.5 h-2.5 rounded-full bg-teal-600" />
                  <CardTitle className="text-base font-bold text-foreground">بيانات التقرير والمشروع</CardTitle>
                </div>
                {reportStatus === "معتمد" && showLayout && (
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      const targetId = selectedProjectId || "1";
                      setLocation(`/project-reports/${targetId}/print`);
                    }}
                    className="gap-2 text-xs font-bold border-teal-600/40 text-teal-700 dark:text-teal-400 hover:bg-teal-50 dark:hover:bg-teal-950/30 h-9 rounded-lg"
                  >
                    <Printer className="w-4 h-4 text-teal-600" />
                    <span>معاينة وطباعة التقرير (PDF)</span>
                  </Button>
                )}
              </div>
            </CardHeader>
            <CardContent className="pt-5 space-y-4">
              {!selectedProjectId && (
                <div className="p-3.5 rounded-xl bg-amber-50 dark:bg-amber-950/40 border border-amber-500/30 text-amber-800 dark:text-amber-300 text-xs font-semibold flex items-center gap-2 mb-2">
                  <AlertCircle className="w-4.5 h-4.5 text-amber-600 shrink-0" />
                  <span>تنبيه: يرجى تحديد المشروع أولاً لتفعيل وإكمال تعبئة كافة بيانات وملاحظات التقرير.</span>
                </div>
              )}

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {/* 1. اختيار المشروع أولاً */}
                <div className="space-y-1.5 md:col-span-3">
                  <Label className="text-xs font-semibold flex items-center">
                    <span>اسم المشروع</span>
                    <span className="text-red-500 font-bold mr-1">*</span>
                  </Label>
                  <Select value={selectedProjectId} onValueChange={handleProjectSelect}>
                    <SelectTrigger className="h-10 border-border/80 bg-background font-medium">
                      <SelectValue placeholder="اختر المشروع من القائمة ليتم تعبئة البيانات تلقائياً" />
                    </SelectTrigger>
                    <SelectContent>
                      {projectOptions.map((p) => (
                        <SelectItem key={p.id} value={p.id} className="text-xs py-2">
                          <div className="flex items-center justify-between gap-4 w-full">
                            <span className="font-semibold">{p.name}</span>
                            <span className="text-muted-foreground text-[11px]">({p.department})</span>
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {/* 2. طريقة إعداد وتعبئة التقرير الربعي ثانياً (أسفل اختيار المشروع) */}
                <div className="space-y-1.5 md:col-span-3">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3 rounded-xl bg-teal-500/5 border border-teal-500/20 mb-1">
                    <div className="space-y-0.5">
                      <div className="flex items-center gap-2">
                        <Wand2 className="w-4 h-4 text-teal-600" />
                        <span className="text-xs font-bold text-foreground">طريقة إعداد وتعبئة التقرير الربعي الاستراتيجي</span>
                      </div>
                      <p className="text-[11px] text-muted-foreground">اختر الإدخال المباشر أو التجميع التلقائي من 3 تقارير شهرية أو 6 تقارير نصف شهرية لنفس المشروع</p>
                    </div>

                    <div className="flex items-center gap-1 bg-background p-1 rounded-lg border border-border/80 shrink-0">
                      <Button
                        type="button"
                        variant={entryMode === "manual" ? "default" : "ghost"}
                        size="sm"
                        onClick={() => setEntryMode("manual")}
                        className={`h-7 text-xs gap-1 rounded-md px-2.5 ${entryMode === "manual" ? "bg-teal-600 text-white font-bold" : "text-muted-foreground"}`}
                      >
                        <User className="w-3 h-3" />
                        إدخال يدوي
                      </Button>
                      <Button
                        type="button"
                        variant={entryMode === "from_monthly" ? "default" : "ghost"}
                        size="sm"
                        onClick={() => setEntryMode("from_monthly")}
                        className={`h-7 text-xs gap-1 rounded-md px-2.5 ${entryMode === "from_monthly" ? "bg-teal-600 text-white font-bold" : "text-muted-foreground"}`}
                      >
                        <Calendar className="w-3 h-3" />
                        تجميع من 3 شهرية
                      </Button>
                      <Button
                        type="button"
                        variant={entryMode === "from_semi" ? "default" : "ghost"}
                        size="sm"
                        onClick={() => setEntryMode("from_semi")}
                        className={`h-7 text-xs gap-1 rounded-md px-2.5 ${entryMode === "from_semi" ? "bg-teal-600 text-white font-bold" : "text-muted-foreground"}`}
                      >
                        <Layers className="w-3 h-3" />
                        تجميع من 6 نصف شهرية
                      </Button>
                    </div>
                  </div>

                  {entryMode === "from_monthly" && (
                    <div className="p-4 rounded-xl bg-card border border-teal-600/30 space-y-4 my-2 animate-in fade-in slide-in-from-top-2 duration-200">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <Sparkles className="w-4 h-4 text-teal-600" />
                          <span className="text-xs font-bold text-foreground">اختر بلوك التقارير الشهرية المكتملة للربع لتوليد وتجميع التقرير الربعي:</span>
                        </div>
                        {isAggregated && (
                          <Badge className="bg-emerald-500/15 text-emerald-700 dark:text-emerald-400 border-emerald-500/30 text-[11px] gap-1">
                            <CheckCircle2 className="w-3 h-3" />
                            تم تجميع وتوليد التقرير الربعي
                          </Badge>
                        )}
                      </div>

                      <div className="space-y-1.5">
                        <Label className="text-[11px] font-semibold">اختر الفترات الشهرية المتتابعة للربع</Label>
                        <Select value={selectedMonthlyBlockKey} onValueChange={setSelectedMonthlyBlockKey} disabled={!selectedProjectId}>
                          <SelectTrigger className="h-10 border-border/80 text-xs bg-background font-semibold">
                            <SelectValue placeholder={selectedProjectId ? "اختر فترة الربع الشهرية لهذا المشروع..." : "يرجى اختيار المشروع أولاً..."} />
                          </SelectTrigger>
                          <SelectContent>
                            {quarterMonthlyBlocks.length === 0 ? (
                              <SelectItem value="none" disabled className="text-xs">
                                لا يوجد تقارير شهرية مسجلة لهذا المشروع
                              </SelectItem>
                            ) : (
                              quarterMonthlyBlocks.map((b) => (
                                <SelectItem key={b.key} value={b.key} disabled={b.isDisabled} className="text-xs py-2 font-semibold">
                                  {b.label}
                                </SelectItem>
                              ))
                            )}
                          </SelectContent>
                        </Select>
                      </div>

                      {selectedMonthlyBlock && (
                        <div className="p-3.5 rounded-xl bg-card border border-teal-600/30 space-y-2.5">
                          <div className="flex items-center justify-between text-xs font-bold text-foreground border-b border-border/40 pb-2">
                            <span>{selectedMonthlyBlock.titleDisplay}</span>
                            <Badge className={selectedMonthlyBlock.alreadyUsed ? "bg-red-500/15 text-red-700" : selectedMonthlyBlock.isComplete ? "bg-emerald-600 text-white" : "bg-amber-500/15 text-amber-700"}>
                              {selectedMonthlyBlock.statusBadge}
                            </Badge>
                          </div>

                          <div className="flex flex-col gap-2">
                            {selectedMonthlyBlock.reports.map((r, idx) => (
                              <div key={r.id} className="p-2.5 rounded-lg bg-muted/30 border border-border/60 text-xs flex items-center justify-between">
                                <div className="flex flex-col gap-0.5 min-w-0 pr-1">
                                  <span className="font-bold text-foreground truncate">التقرير {idx + 1}: {r.title}</span>
                                  <span className="text-[11px] text-muted-foreground font-medium">الفترة: {r.period}</span>
                                </div>
                                <Badge variant="outline" className="text-[11px] text-teal-600 border-teal-600/40 font-bold shrink-0">
                                  إنجاز: {r.actualProgress}%
                                </Badge>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                      <div className="flex justify-end">
                        <Button
                          type="button"
                          size="sm"
                          onClick={handleAggregateFromMonthly}
                          disabled={!selectedMonthlyBlock || selectedMonthlyBlock.isDisabled || !selectedProjectId || isSubmitting}
                          className="h-9 text-xs gap-1.5 bg-teal-600 hover:bg-teal-700 text-white font-bold shadow-sm"
                        >
                          <RefreshCw className="w-3.5 h-3.5" />
                          تجميع وإرسال التقرير الربعي (بقيد الاعتماد)
                        </Button>
                      </div>
                    </div>
                  )}

                  {entryMode === "from_semi" && (
                    <div className="p-4 rounded-xl bg-card border border-teal-600/30 space-y-4 my-2 animate-in fade-in slide-in-from-top-2 duration-200">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <Sparkles className="w-4 h-4 text-teal-600" />
                          <span className="text-xs font-bold text-foreground">اختر الفترات النصف شهرية المكتملة (6 تقارير) لتوليد التقرير الربعي:</span>
                        </div>
                        {isAggregated && (
                          <Badge className="bg-emerald-500/15 text-emerald-700 dark:text-emerald-400 border-emerald-500/30 text-[11px] gap-1">
                            <CheckCircle2 className="w-3 h-3" />
                            تم تجميع وتوليد التقرير الربعي
                          </Badge>
                        )}
                      </div>

                      <div className="space-y-1.5">
                        <Label className="text-[11px] font-semibold">اختر الفترات النصف شهرية للربع</Label>
                        <Select value={selectedSemiBlockKey} onValueChange={setSelectedSemiBlockKey} disabled={!selectedProjectId}>
                          <SelectTrigger className="h-10 border-border/80 text-xs bg-background font-semibold">
                            <SelectValue placeholder={selectedProjectId ? "اختر فترة الأنصاف الشهرية لهذا المشروع..." : "يرجى اختيار المشروع أولاً..."} />
                          </SelectTrigger>
                          <SelectContent>
                            {quarterSemiBlocks.length === 0 ? (
                              <SelectItem value="none" disabled className="text-xs">
                                لا يوجد تقارير نصف شهرية مسجلة لهذا المشروع
                              </SelectItem>
                            ) : (
                              quarterSemiBlocks.map((b) => (
                                <SelectItem key={b.key} value={b.key} disabled={b.isDisabled} className="text-xs py-2 font-semibold">
                                  {b.label}
                                </SelectItem>
                              ))
                            )}
                          </SelectContent>
                        </Select>
                      </div>

                      {selectedSemiBlock && (
                        <div className="p-3.5 rounded-xl bg-card border border-teal-600/30 space-y-2.5">
                          <div className="flex items-center justify-between text-xs font-bold text-foreground border-b border-border/40 pb-2">
                            <span>{selectedSemiBlock.titleDisplay}</span>
                            <Badge className={selectedSemiBlock.alreadyUsed ? "bg-red-500/15 text-red-700" : selectedSemiBlock.isComplete ? "bg-emerald-600 text-white" : "bg-amber-500/15 text-amber-700"}>
                              {selectedSemiBlock.statusBadge}
                            </Badge>
                          </div>

                          <div className="flex flex-col gap-2">
                            {selectedSemiBlock.reports.map((r, idx) => (
                              <div key={r.id} className="p-2.5 rounded-lg bg-muted/30 border border-border/60 text-xs flex items-center justify-between">
                                <div className="flex flex-col gap-0.5 min-w-0 pr-1">
                                  <span className="font-bold text-foreground truncate">التقرير {idx + 1}: {r.title}</span>
                                  <span className="text-[11px] text-muted-foreground font-medium">الفترة: {r.period}</span>
                                </div>
                                <Badge variant="outline" className="text-[11px] text-teal-600 border-teal-600/40 font-bold shrink-0">
                                  إنجاز: {r.actualProgress}%
                                </Badge>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                      <div className="flex justify-end">
                        <Button
                          type="button"
                          size="sm"
                          onClick={handleAggregateFromSemi}
                          disabled={!selectedSemiBlock || selectedSemiBlock.isDisabled || !selectedProjectId || isSubmitting}
                          className="h-9 text-xs gap-1.5 bg-teal-600 hover:bg-teal-700 text-white font-bold shadow-sm"
                        >
                          <RefreshCw className="w-3.5 h-3.5" />
                          تجميع وإرسال التقرير الربعي (بقيد الاعتماد)
                        </Button>
                      </div>
                    </div>
                  )}
                </div>

                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold text-muted-foreground flex items-center gap-1">
                    <User className="w-3.5 h-3.5" />
                    <span>مدير المشروع</span>
                  </Label>
                  <Input value={projectManager} readOnly placeholder="مدير المشروع المرتبط" className="h-10 bg-muted/40 font-semibold border-border/60" />
                </div>

                <div className="space-y-1.5 md:col-span-2">
                  <Label className="text-xs font-semibold flex items-center gap-1">
                    <Calendar className="w-3.5 h-3.5 text-primary" />
                    <span>اختر فترة التقرير الربعي</span>
                    <span className="text-red-500 font-bold mr-1">*</span>
                  </Label>
                  <Select
                    value={periodFrom && periodTo ? `${periodFrom}_${periodTo}` : ""}
                    onValueChange={(val) => {
                      const [from, to] = val.split("_");
                      setPeriodFrom(from);
                      setPeriodTo(to);
                      setReportDate(to);
                    }}
                    disabled={!selectedProjectId}
                  >
                    <SelectTrigger className="h-10 border-border/80 text-xs bg-background font-semibold text-right">
                      <SelectValue placeholder={selectedProjectId ? "اختر فترة التقرير الربعي لهذا المشروع..." : "يرجى اختيار المشروع أولاً..."} />
                    </SelectTrigger>
                    <SelectContent dir="rtl">
                      {projectQuarterlyPeriods.length === 0 ? (
                        <SelectItem value="none" disabled className="text-xs">
                          لا توجد فترات ربعية كاملة متاحة للمشروع
                        </SelectItem>
                      ) : (
                        projectQuarterlyPeriods.map((p) => {
                          const isAlreadyRecorded = existingProjectReportPeriods.has(`${p.from}_${p.to}`);
                          return (
                            <SelectItem
                              key={`${p.from}_${p.to}`}
                              value={`${p.from}_${p.to}`}
                              disabled={isAlreadyRecorded}
                              className="text-xs py-2 font-semibold"
                            >
                              📅 {p.label} {isAlreadyRecorded ? "(مُسجّل مسبقاً ❌)" : ""}
                            </SelectItem>
                          );
                        })
                      )}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold flex items-center">
                    <span>تاريخ التقرير</span>
                    <span className="text-red-500 font-bold mr-1">*</span>
                  </Label>
                  <Input
                    type="date"
                    disabled={!selectedProjectId}
                    value={formatToInputDate(reportDate)}
                    onChange={(e) => setReportDate(e.target.value)}
                    className="h-10 border-border/80 font-medium"
                  />
                </div>

                <div className="space-y-1.5 md:col-span-2">
                  <Label className="text-xs font-semibold text-muted-foreground flex items-center gap-1">
                    <Layers className="w-3.5 h-3.5 text-primary" />
                    <span>المرحلة الحالية من دورة الحياة (تُنعكس من الطلب تلقائياً)</span>
                  </Label>
                  <Input value={currentPhase} readOnly placeholder="مرحلة دورة الحياة الحالية" className="h-10 bg-muted/40 font-semibold border-border/60" />
                </div>
              </div>
            </CardContent>
          </Card>

          {/* الأداء التراكمي */}
          <Card className="border-border/80 shadow-xs">
            <CardHeader className="pb-3 border-b border-border/60">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="w-2.5 h-2.5 rounded-full bg-teal-600" />
                  <CardTitle className="text-base font-bold text-foreground">الأداء التراكمي حتى نهاية الربع</CardTitle>
                </div>
              </div>
            </CardHeader>
            <CardContent className="pt-5 space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold flex items-center">
                    <span>نسبة الإنجاز المخطط التراكمية %</span>
                    <span className="text-red-500 font-bold mr-1">*</span>
                  </Label>
                  <Input
                    type="number"
                    disabled={!selectedProjectId}
                    value={plannedProgress === 0 ? "" : plannedProgress}
                    onFocus={(e) => e.target.select()}
                    onChange={(e) => setPlannedProgress(e.target.value === "" ? 0 : Number(e.target.value))}
                    placeholder="0"
                    className="h-10 border-border/80 font-bold"
                  />
                </div>

                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold">نسبة الإنجاز الفعلي التراكمية %</Label>
                  <Input
                    type="number"
                    value={actualProgress === 0 ? "" : actualProgress}
                    onFocus={(e) => e.target.select()}
                    onChange={(e) => setActualProgress(e.target.value === "" ? 0 : Number(e.target.value))}
                    placeholder="0"
                    className="h-10 border-border/80 font-bold"
                  />
                </div>

                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold">الحالة العامة (RAG)</Label>
                  <div className="h-10 rounded-lg border border-border/80 bg-muted/30 px-3 flex items-center justify-between font-bold">
                    <span className="text-xs text-muted-foreground">الفجوة (الفعلي − المخطط): <strong className={delay >= 25 ? "text-rose-600 dark:text-rose-400" : delay >= 5 ? "text-amber-600 dark:text-amber-400" : "text-emerald-600 dark:text-emerald-400"}>{gap > 0 ? `+${gap}%` : `${gap}%`}</strong></span>
                    <Badge
                      className={
                        ragStatus === "أخضر"
                          ? "bg-emerald-500 text-white font-bold"
                          : ragStatus === "أصفر"
                          ? "bg-amber-500 text-white font-bold"
                          : "bg-rose-500 text-white font-bold"
                      }
                    >
                      {ragStatus}
                    </Badge>
                  </div>
                </div>

                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold flex items-center justify-between">
                    <span>الالتزام المالي التراكمي</span>
                    <span className="text-primary font-bold">{financialCommitmentPct}%</span>
                  </Label>
                  <div className="flex items-center gap-2">
                    <Input
                      type="number"
                      disabled={!selectedProjectId}
                      placeholder="المصروف الفعلي"
                      value={cumulativeSpent}
                      onChange={(e) => setCumulativeSpent(Number(e.target.value))}
                      className="h-10 border-border/80 text-xs font-bold w-1/2"
                    />
                    <span className="text-xs text-muted-foreground">من</span>
                    <Input
                      type="number"
                      disabled={!selectedProjectId}
                      placeholder="المعتمد"
                      value={cumulativeBudget}
                      onChange={(e) => setCumulativeBudget(Number(e.target.value))}
                      className="h-10 border-border/80 text-xs font-bold w-1/2"
                    />
                  </div>
                </div>
              </div>

              <DynamicArrayTable
                title="المعالم المنجزة خلال الربع"
                description="مصفوفة المعالم الاستراتيجية المحققة خلال الربع الزمني"
                columns={milestoneCols}
                rows={quarterMilestones}
                onChange={setQuarterMilestones}
                disabled={!selectedProjectId}
                emptyLabel="اضغط إضافة صف جديد لإدراج معالم الربع المنجزة"
              />
            </CardContent>
          </Card>

          {/* المؤشرات والاتجاه */}
          <Card className="border-border/80 shadow-xs">
            <CardHeader className="pb-3 border-b border-border/60">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="w-2.5 h-2.5 rounded-full bg-teal-600" />
                  <CardTitle className="text-base font-bold text-foreground">المؤشرات والاتجاه العام</CardTitle>
                </div>
              </div>
            </CardHeader>
            <CardContent className="pt-5 space-y-5">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <RagIndicatorSelect label="مؤشر الوقت" disabled={!selectedProjectId} value={timeIndicator} onChange={setTimeIndicator} />
                <RagIndicatorSelect label="مؤشر التكلفة" disabled={!selectedProjectId} value={costIndicator} onChange={setCostIndicator} />
                <RagIndicatorSelect label="مؤشر التغيير" disabled={!selectedProjectId} value={changeIndicator} onChange={setChangeIndicator} />
              </div>

              <div className="p-4 rounded-xl bg-card border border-border/80 flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label className="text-xs font-bold text-foreground block">الاتجاه العام للربع (مقارنة بالربع السابق)</Label>
                </div>

                <div className="flex items-center gap-2">
                  <Button
                    type="button"
                    disabled={!selectedProjectId}
                    variant={overallTrend === "متحسّن" ? "default" : "outline"}
                    size="sm"
                    onClick={() => setOverallTrend("متحسّن")}
                    className={overallTrend === "متحسّن" ? "bg-emerald-600 text-white font-bold gap-1 text-xs" : "text-xs gap-1"}
                  >
                    <TrendingUp className="w-3.5 h-3.5" />
                    متحسّن (صاعد)
                  </Button>

                  <Button
                    type="button"
                    disabled={!selectedProjectId}
                    variant={overallTrend === "ثابت" ? "default" : "outline"}
                    size="sm"
                    onClick={() => setOverallTrend("ثابت")}
                    className={overallTrend === "ثابت" ? "bg-amber-600 text-white font-bold gap-1 text-xs" : "text-xs gap-1"}
                  >
                    <Minus className="w-3.5 h-3.5" />
                    ثابت
                  </Button>

                  <Button
                    type="button"
                    disabled={!selectedProjectId}
                    variant={overallTrend === "متراجع" ? "default" : "outline"}
                    size="sm"
                    onClick={() => setOverallTrend("متراجع")}
                    className={overallTrend === "متراجع" ? "bg-rose-600 text-white font-bold gap-1 text-xs" : "text-xs gap-1"}
                  >
                    <TrendingDown className="w-3.5 h-3.5" />
                    متراجع (هابط)
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* القيمة والأثر الاستراتيجي */}
          <Card className="border-border/80 shadow-xs">
            <CardHeader className="pb-3 border-b border-border/60">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="w-2.5 h-2.5 rounded-full bg-teal-600" />
                  <CardTitle className="text-base font-bold text-foreground">القيمة والأثر الاستراتيجي</CardTitle>
                </div>
              </div>
            </CardHeader>
            <CardContent className="pt-5 space-y-5">
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold flex items-center gap-1">
                  <Target className="w-3.5 h-3.5 text-primary" />
                  <span>مدى المواءمة مع الأهداف الاستراتيجية</span>
                </Label>
                <Textarea
                  disabled={!selectedProjectId}
                  rows={3}
                  value={strategicAlignment}
                  onChange={(e) => setStrategicAlignment(e.target.value)}
                  placeholder="اصف مدى ارتباط مخرجات المشروع بالأهداف الاستراتيجية للقطاع..."
                  className="border-border/80 text-xs leading-relaxed"
                />
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs font-semibold flex items-center gap-1">
                  <Award className="w-3.5 h-3.5 text-teal-600" />
                  <span>القيمة والأثر المتحقق على المستفيد</span>
                </Label>
                <Textarea
                  disabled={!selectedProjectId}
                  rows={3}
                  value={realizedImpact}
                  onChange={(e) => setRealizedImpact(e.target.value)}
                  placeholder="ما هو الأثر التراكمي الملموس على المستفيدين النهائيين والقطاع خلال الربع..."
                  className="border-border/80 text-xs leading-relaxed"
                />
              </div>


            </CardContent>
          </Card>

          {/* المخرجات والدروس والقرارات */}
          <Card className="border-border/80 shadow-xs">
            <CardHeader className="pb-3 border-b border-border/60">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="w-2.5 h-2.5 rounded-full bg-teal-600" />
                  <CardTitle className="text-base font-bold text-foreground">المخرجات والدروس والقرارات الاستراتيجية</CardTitle>
                </div>
              </div>
            </CardHeader>
            <CardContent className="pt-5 space-y-5">
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold flex items-center gap-1">
                  <BookOpen className="w-3.5 h-3.5 text-amber-500" />
                  <span>الدروس المستفادة خلال الربع</span>
                </Label>
                <Textarea
                  disabled={!selectedProjectId}
                  rows={3}
                  value={lessonsLearned}
                  onChange={(e) => setLessonsLearned(e.target.value)}
                  placeholder="أهم الدروس المستفادة التي تدعم التطوير والتحسين المستمر..."
                  className="border-border/80 text-xs leading-relaxed"
                />
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs font-semibold flex items-center gap-1">
                  <span>التوصيات وقرارات الاستمرار / التعديل / إعادة التوجيه</span>
                </Label>
                <Textarea
                  disabled={!selectedProjectId}
                  rows={3}
                  value={continuationDecisions}
                  onChange={(e) => setContinuationDecisions(e.target.value)}
                  placeholder="اكتب التوصيات الاستراتيجية والتوجيهات بشأن استمرار أو تعديل خطة المشروع..."
                  className="border-border/80 text-xs leading-relaxed"
                />
              </div>

              <div className="p-4 rounded-xl bg-card border border-border/80 flex items-center justify-between">
                <div className="space-y-0.5">
                  <div className="flex items-center gap-2">
                    <ShieldAlert className="w-4 h-4 text-amber-500" />
                    <Label className="text-xs font-bold text-foreground">تصعيد التقرير لمجلس الإدارة</Label>
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  <span className="text-xs font-bold">{needEscalation ? "نعم" : "لا"}</span>
                  <Switch disabled={!selectedProjectId} checked={needEscalation} onCheckedChange={setNeedEscalation} />
                </div>
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs font-semibold">المرفقات والوثائق</Label>
                <FileUpload
                  disabled={!selectedProjectId}
                  onFilesSelected={setAttachments}
                  existingFiles={attachments}
                  onRemoveFile={(idx) => setAttachments(attachments.filter((_, i) => i !== idx))}
                  label="تحميل المرفقات الاستراتيجية والتقارير المالية"
                />
              </div>


            </CardContent>
          </Card>

          {/* Footer Action Bar */}
          <div className="flex items-center justify-end gap-3 p-4 bg-card border border-border/80 rounded-xl shadow-xs">
            <Button
              type="button"
              variant="outline"
              disabled={!selectedProjectId || isSubmitting}
              onClick={() => handleSaveDraft("مسودة")}
              className="gap-2 text-xs font-bold border-amber-500/40 text-amber-700 dark:text-amber-400 hover:bg-amber-50 dark:hover:bg-amber-950/30 disabled:opacity-50"
            >
              <Save className="w-4 h-4" />
              حفظ كمسودة
            </Button>
            <Button
              type="button"
              disabled={!selectedProjectId || isSubmitting}
              onClick={() => handleSaveDraft("معتمد")}
              className="gap-2 text-xs font-bold bg-[#1a5f4a] hover:bg-[#154d3c] text-white disabled:opacity-50"
            >
              <CheckCircle2 className="w-4 h-4" />
              حفظ واعتماد التقرير
            </Button>
          </div>
        </div>

        <ReportPrintPreviewModal
          isOpen={showPreviewModal}
          onClose={() => setShowPreviewModal(false)}
          reportType="quarterly"
          reportTitle="التقرير الربعي الاستراتيجي للمشروع"
          data={{
            projectName: selectedProjName,
            projectManager,
            quarter,
            year,
            reportDate,
            plannedProgress,
            actualProgress,
            gap,
            ragStatus,
            valueImpact: realizedImpact,
            recommendations: continuationDecisions,
            needEscalation: needEscalation ? "نعم" : "لا",
            status: reportStatus,
          }}
        />
      </div>
    );

  return showLayout ? <DashboardLayout>{content}</DashboardLayout> : content;
}

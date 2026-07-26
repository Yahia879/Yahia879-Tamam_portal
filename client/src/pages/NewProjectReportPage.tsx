import React, { useState } from "react";
import DashboardLayout from "@/components/DashboardLayout";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Link } from "wouter";
import { 
  ArrowRight, 
  ArrowLeft,
  Clock, 
  Calendar, 
  BarChart3, 
  MapPin, 
  FileText,
  Layers,
  FileCheck
} from "lucide-react";

import SemiMonthlyReportPage from "./SemiMonthlyReportPage";
import MonthlyReportPage from "./MonthlyReportPage";
import QuarterlyReportPage from "./QuarterlyReportPage";
import VisitReportPage from "./VisitReportPage";

type ReportTypeKey = "semi-monthly" | "monthly" | "quarterly" | "visit";

export default function NewProjectReportPage() {
  const [currentStep, setCurrentStep] = useState<1 | 2>(1);
  const [selectedType, setSelectedType] = useState<ReportTypeKey | null>("semi-monthly");

  const reportTypes = [
    {
      key: "semi-monthly" as ReportTypeKey,
      title: "تقرير نصف شهري",
      description: "متابعة دورية كل أسبوعين لرصد نسبة الإنجاز والانحرافات الفنية",
      icon: Clock,
    },
    {
      key: "monthly" as ReportTypeKey,
      title: "تقرير شهري",
      description: "تقرير رصد شهري شامل يتضمن المعالم الرئيسية والانحرافات",
      icon: Calendar,
    },
    {
      key: "quarterly" as ReportTypeKey,
      title: "تقرير ربعي",
      description: "تقرير تقييمي ربع سنوي لقياس المواءمة والأثر المالي والدروس المستفادة",
      icon: BarChart3,
    },
    {
      key: "visit" as ReportTypeKey,
      title: "تقرير زيارة ميدانية",
      description: "رصد ميداني فوري وتوثيق صور الموقع والملاحظات الهندسية",
      icon: MapPin,
    },
  ];

  const getReportTitle = (key: ReportTypeKey | null) => {
    switch (key) {
      case "semi-monthly": return "تقرير نصف شهري";
      case "monthly": return "تقرير شهري";
      case "quarterly": return "تقرير ربعي";
      case "visit": return "تقرير زيارة ميدانية";
      default: return "";
    }
  };

  return (
    <DashboardLayout>
      <div className="w-full space-y-6 animate-in fade-in duration-300" dir="rtl">
        {/* Header Block */}
        <div className="flex items-center gap-3 sm:gap-4 mb-2">
          <Link href="/project-reports">
            <Button variant="ghost" size="icon" className="shrink-0 h-10 w-10">
              <ArrowRight className="w-5 h-5 text-foreground" />
            </Button>
          </Link>
          <div>
            <h1 className="text-xl sm:text-2xl font-bold text-foreground">إنشاء تقرير جديد</h1>
            <p className="text-xs sm:text-sm text-muted-foreground">قم بإعداد وتعبئة تقارير المشاريع والزيارات الميدانية</p>
          </div>
        </div>

        {/* 2-Step Progress Indicator Bar */}
        <div className="mb-6 overflow-x-auto pt-2 pb-2">
          <div className="flex items-center justify-center max-w-xs sm:max-w-sm mx-auto">
            {/* Step 1 */}
            <div 
              onClick={() => {
                if (currentStep === 2) setCurrentStep(1);
              }}
              className={`flex flex-col items-center shrink-0 cursor-pointer ${currentStep === 1 ? "opacity-100" : "opacity-80"}`}
            >
              <div className={`w-9 h-9 rounded-full flex items-center justify-center font-bold text-sm transition-all duration-300 ${
                currentStep === 2
                  ? "bg-teal-600 text-white"
                  : "bg-teal-600 text-white ring-4 ring-teal-600/20 scale-105"
              }`}>
                {currentStep === 2 ? "✓" : "1"}
              </div>
              <p className={`text-xs mt-1 font-bold ${currentStep === 1 ? "text-teal-700 font-bold" : "text-muted-foreground font-medium"}`}>
                اختيار نوع التقرير
              </p>
            </div>

            {/* Divider */}
            <div className={`flex-1 h-1 mx-4 rounded-full transition-colors duration-300 ${currentStep === 2 ? "bg-teal-600" : "bg-muted"}`} />

            {/* Step 2 */}
            <div className={`flex flex-col items-center shrink-0 ${currentStep === 2 ? "opacity-100" : "opacity-40"}`}>
              <div className={`w-9 h-9 rounded-full flex items-center justify-center font-bold text-sm transition-all duration-300 ${
                currentStep === 2
                  ? "bg-teal-600 text-white ring-4 ring-teal-600/20 scale-105"
                  : "bg-muted text-muted-foreground"
              }`}>
                2
              </div>
              <p className={`text-xs mt-1 font-bold ${currentStep === 2 ? "text-teal-700 font-bold" : "text-muted-foreground font-medium"}`}>
                تعبئة التقرير
              </p>
            </div>
          </div>
        </div>

        {/* Exact Card Design matching /disbursements/new-linked */}
        {currentStep === 1 ? (
          <Card className="border-border/60 shadow-sm rounded-xl overflow-hidden bg-white dark:bg-slate-900">
            <CardHeader className="bg-muted/30 border-b border-border/40 py-4 text-right">
              <CardTitle className="flex items-center gap-2 text-foreground text-base font-bold">
                <Layers className="h-4.5 w-4.5 text-teal-600" />
                الخطوة 1: اختيار نوع التقرير
              </CardTitle>
              <CardDescription className="text-right text-xs text-muted-foreground">
                حدد نوع التقرير المناسب للمتابعة إلى تعبئة البيانات والملاحظات
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6 pt-6 text-right">
              <div className="space-y-3 pb-2 border-b border-border/40">
                <Label className="text-right text-xs font-bold text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                  <Layers className="w-4 h-4 text-teal-600" />
                  نوع التقرير *
                </Label>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                  {reportTypes.map((item) => {
                    const Icon = item.icon;
                    const isSelected = selectedType === item.key;
                    return (
                      <button
                        key={item.key}
                        type="button"
                        onClick={() => setSelectedType(item.key)}
                        className={`flex items-start gap-3 p-3.5 rounded-xl border text-right transition-all duration-200 cursor-pointer relative overflow-hidden group ${
                          isSelected
                            ? "bg-teal-50/80 dark:bg-teal-950/30 border-teal-500/80 dark:border-teal-500/60 shadow-xs ring-2 ring-teal-500/20"
                            : "bg-background border-border hover:border-teal-300 dark:hover:border-teal-800 hover:bg-slate-50/60 dark:hover:bg-slate-900/60"
                        }`}
                      >
                        <div className={`p-2.5 rounded-lg shrink-0 transition-colors ${
                          isSelected
                            ? "bg-teal-600 text-white"
                            : "bg-teal-100 text-teal-700 dark:bg-teal-950/60 dark:text-teal-400 group-hover:bg-teal-200"
                        }`}>
                          <Icon className="w-5 h-5" />
                        </div>
                        <div className="space-y-1 min-w-0 flex-1">
                          <div className="flex items-center justify-between">
                            <span className={`text-xs sm:text-sm font-bold block ${isSelected ? "text-teal-900 dark:text-teal-200" : "text-foreground"}`}>
                              {item.title}
                            </span>
                            {isSelected && (
                              <span className="w-2.5 h-2.5 rounded-full bg-teal-600 animate-pulse shrink-0" />
                            )}
                          </div>
                          <p className={`text-[11px] leading-relaxed ${isSelected ? "text-teal-750 dark:text-teal-300" : "text-muted-foreground"}`}>
                            {item.description}
                          </p>
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>
            </CardContent>
            <CardFooter className="border-t border-border/40 pt-4 flex justify-end gap-2">
              <Button
                disabled={!selectedType}
                onClick={() => {
                  if (selectedType) setCurrentStep(2);
                }}
                className="bg-teal-600 hover:bg-teal-700 text-white font-bold px-6 h-11 rounded-xl shadow-sm flex items-center gap-2 disabled:opacity-50"
              >
                <span>التالي</span>
                <ArrowLeft className="h-4 w-4" />
              </Button>
            </CardFooter>
          </Card>
        ) : (
          /* Step 2 Form Card */
          <Card className="border-border/60 shadow-sm rounded-xl overflow-hidden bg-white dark:bg-slate-900">
            <CardHeader className="bg-muted/30 border-b border-border/40 py-4 text-right flex flex-row items-center justify-between">
              <div>
                <CardTitle className="flex items-center gap-2 text-foreground text-base font-bold">
                  <FileCheck className="h-4.5 w-4.5 text-teal-600" />
                  الخطوة 2: تعبئة {getReportTitle(selectedType)}
                </CardTitle>
                <CardDescription className="text-right text-xs text-muted-foreground mt-0.5">
                  قم بإدخال وتأكيد كافة بيانات وملاحظات التقرير
                </CardDescription>
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setCurrentStep(1)}
                className="gap-2 text-xs font-semibold h-8 rounded-lg border-border/80"
              >
                <ArrowRight className="w-3.5 h-3.5" />
                تغيير نوع التقرير
              </Button>
            </CardHeader>
            <CardContent className="p-4 sm:p-6 text-right">
              {selectedType === "semi-monthly" && <SemiMonthlyReportPage showLayout={false} />}
              {selectedType === "monthly" && <MonthlyReportPage showLayout={false} />}
              {selectedType === "quarterly" && <QuarterlyReportPage showLayout={false} />}
              {selectedType === "visit" && <VisitReportPage showLayout={false} />}
            </CardContent>
          </Card>
        )}
      </div>
    </DashboardLayout>
  );
}

import React, { useState } from "react";
import DashboardLayout from "@/components/DashboardLayout";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Link } from "wouter";
import { 
  ArrowRight, 
  Clock, 
  Calendar, 
  BarChart3, 
  MapPin, 
  FileText,
  ChevronLeft
} from "lucide-react";

import SemiMonthlyReportPage from "./SemiMonthlyReportPage";
import MonthlyReportPage from "./MonthlyReportPage";
import QuarterlyReportPage from "./QuarterlyReportPage";
import VisitReportPage from "./VisitReportPage";

type ReportTypeKey = "semi-monthly" | "monthly" | "quarterly" | "visit";

export default function NewProjectReportPage() {
  const [currentStep, setCurrentStep] = useState<1 | 2>(1);
  const [selectedType, setSelectedType] = useState<ReportTypeKey | null>(null);

  const reportTypes = [
    {
      key: "semi-monthly" as ReportTypeKey,
      title: "تقرير نصف شهري",
      icon: Clock,
    },
    {
      key: "monthly" as ReportTypeKey,
      title: "تقرير شهري",
      icon: Calendar,
    },
    {
      key: "quarterly" as ReportTypeKey,
      title: "تقرير ربعي",
      icon: BarChart3,
    },
    {
      key: "visit" as ReportTypeKey,
      title: "تقرير زيارة ميدانية",
      icon: MapPin,
    },
  ];

  const handleSelectReport = (key: ReportTypeKey) => {
    setSelectedType(key);
    setCurrentStep(2);
  };

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

        {/* 2-Step Progress Indicator Bar (matching /service-request style) */}
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
              <p className={`text-xs mt-1 font-bold ${currentStep === 1 ? "text-teal-700" : "text-muted-foreground"}`}>
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
              <p className={`text-xs mt-1 font-bold ${currentStep === 2 ? "text-teal-700" : "text-muted-foreground"}`}>
                تعبئة التقرير
              </p>
            </div>
          </div>
        </div>

        {/* Big Card Container - Full Width */}
        <Card className="w-full p-4 sm:p-8 shadow-xl border rounded-2xl sm:rounded-3xl bg-card">
          {currentStep === 1 ? (
            /* Phase 1: Clean Report Type Selection */
            <div className="space-y-6 animate-in fade-in duration-200">
              <div className="text-center space-y-1 pb-2 border-b border-border/40">
                <h2 className="text-lg font-bold text-foreground">اختر نوع التقرير المراد إنشاؤه</h2>
                <p className="text-xs text-muted-foreground">حدد النموذج المناسب للبدء في تعبئة البيانات</p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-2">
                {reportTypes.map((item) => {
                  const Icon = item.icon;
                  return (
                    <div
                      key={item.key}
                      onClick={() => handleSelectReport(item.key)}
                      className="p-6 sm:p-8 rounded-2xl border border-border/80 hover:border-teal-600/70 bg-background hover:bg-teal-500/5 cursor-pointer transition-all duration-200 flex items-center justify-between group shadow-xs hover:shadow-md"
                    >
                      <div className="flex items-center gap-4">
                        <div className="w-14 h-14 rounded-xl bg-teal-500/10 border border-teal-500/20 text-teal-600 flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform">
                          <Icon className="w-7 h-7" />
                        </div>
                        <span className="font-bold text-lg text-foreground group-hover:text-teal-600 transition-colors">
                          {item.title}
                        </span>
                      </div>
                      <ChevronLeft className="w-6 h-6 text-muted-foreground group-hover:text-teal-600 group-hover:-translate-x-1 transition-all" />
                    </div>
                  );
                })}
              </div>
            </div>
          ) : (
            /* Phase 2: Form filling inside the card container */
            <div className="space-y-6 animate-in fade-in duration-200">
              {/* Top bar inside Step 2 card */}
              <div className="flex items-center justify-between pb-4 border-b border-border/60">
                <div className="flex items-center gap-2">
                  <span className="w-3 h-3 rounded-full bg-teal-600" />
                  <h2 className="text-lg font-bold text-foreground">
                    تعبئة {getReportTitle(selectedType)}
                  </h2>
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
              </div>

              {/* Selected Report Form */}
              <div className="pt-2">
                {selectedType === "semi-monthly" && <SemiMonthlyReportPage showLayout={false} />}
                {selectedType === "monthly" && <MonthlyReportPage showLayout={false} />}
                {selectedType === "quarterly" && <QuarterlyReportPage showLayout={false} />}
                {selectedType === "visit" && <VisitReportPage showLayout={false} />}
              </div>
            </div>
          )}
        </Card>
      </div>
    </DashboardLayout>
  );
}

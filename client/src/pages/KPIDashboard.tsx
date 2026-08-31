import { useState } from "react";
import { trpc } from "@/lib/trpc";
import DashboardLayout from "@/components/DashboardLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, LineChart, Line, Legend
} from "recharts";
import {
  Building2, CheckCircle, Clock, Star, DollarSign, TrendingUp,
  FileText, Users, Activity, Target, BarChart2, RefreshCw
} from "lucide-react";

// ألوان البرامج
const PROGRAM_COLORS: Record<string, string> = {
  bunyan: "#6366f1",
  daaem: "#8b5cf6",
  enaya: "#10b981",
  emdad: "#f59e0b",
  ethraa: "#ef4444",
  sedana: "#3b82f6",
  taqa: "#f97316",
  miyah: "#06b6d4",
  suqya: "#14b8a6",
};

// تسميات البرامج
const PROGRAM_LABELS: Record<string, string> = {
  bunyan: "بنيان",
  daaem: "دعائم",
  enaya: "عناية",
  emdad: "إمداد",
  ethraa: "إثراء",
  sedana: "سدانة",
  taqa: "طاقة",
  miyah: "مياه",
  suqya: "سقيا",
};

// تسميات المراحل
const STAGE_LABELS: Record<string, string> = {
  submitted: "مُقدَّم",
  initial_review: "مراجعة أولية",
  field_inspection: "زيارة ميدانية",
  boq_preparation: "جدول الكميات",
  financial_eval_and_approval: "تقييم مالي",
  contracting: "تعاقد",
  execution: "تنفيذ",
  handover: "استلام",
  closed: "مغلق",
  technical_eval: "تقييم فني",
};

// ألوان المراحل
const STAGE_COLORS: Record<string, string> = {
  submitted: "#94a3b8",
  initial_review: "#3b82f6",
  field_inspection: "#8b5cf6",
  boq_preparation: "#14b8a6",
  financial_eval_and_approval: "#f59e0b",
  contracting: "#f97316",
  execution: "#10b981",
  handover: "#06b6d4",
  closed: "#6366f1",
  technical_eval: "#ef4444",
};

// مكوّن بطاقة الإحصاء
function StatCard({
  title, value, subtitle, icon: Icon, color, trend
}: {
  title: string;
  value: string | number;
  subtitle?: string;
  icon: React.ComponentType<{ className?: string }>;
  color: string;
  trend?: { value: number; label: string };
}) {
  return (
    <Card className="overflow-hidden">
      <CardContent className="p-6">
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <p className="text-sm text-gray-500 mb-1">{title}</p>
            <p className="text-3xl font-bold text-gray-800">{value}</p>
            {subtitle && <p className="text-xs text-gray-400 mt-1">{subtitle}</p>}
            {trend && (
              <div className={`flex items-center gap-1 mt-2 text-xs ${trend.value >= 0 ? 'text-emerald-600' : 'text-red-500'}`}>
                <TrendingUp className="w-3 h-3" />
                <span>{trend.value >= 0 ? '+' : ''}{trend.value}% {trend.label}</span>
              </div>
            )}
          </div>
          <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${color}`}>
            <Icon className="w-6 h-6 text-white" />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

// مكوّن نجوم التقييم
function StarDisplay({ rating }: { rating: number }) {
  return (
    <div className="flex items-center gap-1">
      {[1, 2, 3, 4, 5].map((star) => (
        <Star
          key={star}
          className={`w-4 h-4 ${star <= Math.round(rating) ? "fill-yellow-400 text-yellow-400" : "text-gray-200"}`}
        />
      ))}
      <span className="text-sm font-semibold text-gray-700 mr-1">{rating.toFixed(1)}</span>
    </div>
  );
}

// تنسيق العملة
function formatCurrency(amount: number): string {
  if (amount >= 1_000_000) return `${(amount / 1_000_000).toFixed(1)} م.ر`;
  if (amount >= 1_000) return `${(amount / 1_000).toFixed(0)} ألف ر.س`;
  return `${amount.toLocaleString('ar-SA')} ر.س`;
}

// تنسيق اسم الشهر
function formatMonth(yearMonth: string): string {
  const [year, month] = yearMonth.split('-');
  const date = new Date(parseInt(year), parseInt(month) - 1, 1);
  return date.toLocaleDateString('ar-SA', { month: 'short', year: '2-digit' });
}

export default function KPIDashboard({ embedded = false }: { embedded?: boolean }) {
  const [refreshKey, setRefreshKey] = useState(0);

  const { data: kpiData, isLoading, refetch } = trpc.analytics.getKPIs.useQuery(
    undefined
  );

  const handleRefresh = () => {
    setRefreshKey(k => k + 1);
    refetch();
  };

  if (isLoading) {
    const loadingContent = (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-emerald-500 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className="text-gray-500">جاري تحميل البيانات...</p>
        </div>
      </div>
    );
    return embedded ? loadingContent : <DashboardLayout>{loadingContent}</DashboardLayout>;
  }

  if (!kpiData) {
    const emptyContent = (
      <div className="text-center py-12 text-gray-500">
        لا توجد بيانات متاحة
      </div>
    );
    return embedded ? emptyContent : <DashboardLayout>{emptyContent}</DashboardLayout>;
  }

  const { summary, byProgram, byStage, recentReports, monthlyTrend } = kpiData;

  // تحضير بيانات الرسوم البيانية
  const programChartData = byProgram.map((item: any) => ({
    name: PROGRAM_LABELS[item.programType] || item.programType,
    value: item.count,
    color: PROGRAM_COLORS[item.programType] || "#94a3b8",
  }));

  const stageChartData = byStage
    .filter((item: any) => item.count > 0)
    .map((item: any) => ({
      name: STAGE_LABELS[item.stage] || item.stage,
      count: item.count,
      fill: STAGE_COLORS[item.stage] || "#94a3b8",
    }));

  const trendChartData = monthlyTrend.map((item: any) => ({
    month: formatMonth(item.month),
    طلبات: item.count,
  }));

  const content = (
    <div className="space-y-6" dir="rtl">
        {/* رأس الصفحة */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-800 flex items-center gap-3">
              <BarChart2 className="w-7 h-7 text-emerald-600" />
              لوحة مؤشرات الأداء
            </h1>
            <p className="text-gray-500 text-sm mt-1">
              إحصاءات وتحليلات شاملة لأداء المشاريع والطلبات
            </p>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={handleRefresh}
            className="flex items-center gap-2"
          >
            <RefreshCw className="w-4 h-4" />
            تحديث
          </Button>
        </div>

        {/* بطاقات الإحصاءات الرئيسية */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <StatCard
            title="إجمالي الطلبات"
            value={summary.totalRequests}
            subtitle="منذ البداية"
            icon={FileText}
            color="bg-blue-500"
          />
          <StatCard
            title="الطلبات المكتملة"
            value={summary.closedRequests}
            subtitle={`${summary.completionRate}% معدل الإنجاز`}
            icon={CheckCircle}
            color="bg-emerald-500"
          />
          <StatCard
            title="قيد التنفيذ"
            value={summary.activeRequests}
            subtitle="طلب نشط"
            icon={Activity}
            color="bg-amber-500"
          />
          <StatCard
            title="طلبات جديدة"
            value={summary.newRequests}
            subtitle="بانتظار المراجعة"
            icon={Clock}
            color="bg-purple-500"
          />
        </div>

        {/* بطاقات الأداء */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <StatCard
            title="متوسط تقييم الجودة"
            value={summary.avgRating > 0 ? `${summary.avgRating}/5` : "—"}
            subtitle="من التقارير الختامية"
            icon={Star}
            color="bg-yellow-500"
          />
          <StatCard
            title="إجمالي الإنفاق"
            value={formatCurrency(summary.totalCost)}
            subtitle="التكاليف الفعلية"
            icon={DollarSign}
            color="bg-teal-500"
          />
          <StatCard
            title="المساجد المستفيدة"
            value={summary.benefitedMosques}
            subtitle="مسجد تم خدمته"
            icon={Building2}
            color="bg-indigo-500"
          />
          <StatCard
            title="المشاريع المكتملة"
            value={summary.completedProjects}
            subtitle="مشروع منجز"
            icon={Target}
            color="bg-rose-500"
          />
        </div>

        {/* مؤشر معدل الإنجاز */}
        <Card className="border-0 shadow-sm">
          <CardContent className="p-4 sm:p-6">
            <div className="flex items-center justify-between mb-3">
              <h3 className="font-semibold text-gray-700 text-sm sm:text-base">معدل إنجاز الطلبات</h3>
              <Badge className="bg-emerald-100 text-emerald-700 border-emerald-200 text-[10px] sm:text-xs">
                {summary.completionRate}%
              </Badge>
            </div>
            <div className="w-full bg-gray-100 rounded-full h-3 sm:h-4 overflow-hidden">
              <div
                className="h-full rounded-full bg-gradient-to-l from-emerald-400 to-emerald-600 transition-all duration-500"
                style={{ width: `${summary.completionRate}%` }}
              />
            </div>
            <div className="flex justify-between text-[10px] sm:text-xs text-gray-400 mt-2">
              <span>0%</span>
              <span>50%</span>
              <span>100%</span>
            </div>
          </CardContent>
        </Card>

        {/* الرسوم البيانية */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* توزيع الطلبات حسب البرنامج */}
          <Card className="border-0 shadow-sm">
            <CardHeader className="p-4 sm:p-6 pb-2">
              <CardTitle className="text-sm sm:text-base font-semibold text-gray-700 flex items-center gap-2">
                <div className="w-1 h-5 bg-indigo-500 rounded-full" />
                توزيع الطلبات حسب البرنامج
              </CardTitle>
            </CardHeader>
            <CardContent className="p-4 sm:p-6 pt-0">
              {programChartData.length > 0 ? (
                <div className="flex flex-col sm:flex-row items-center gap-4 sm:gap-6">
                  <div className="w-full sm:w-1/2 aspect-square max-h-[200px]">
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie
                          data={programChartData}
                          cx="50%"
                          cy="50%"
                          innerRadius={50}
                          outerRadius={80}
                          dataKey="value"
                        >
                          {programChartData.map((entry: any, index: number) => (
                            <Cell key={`cell-${index}`} fill={entry.color} />
                          ))}
                        </Pie>
                        <Tooltip
                          formatter={(value: any, name: any) => [value, name]}
                          contentStyle={{ direction: 'rtl', fontFamily: 'inherit', borderRadius: '8px' }}
                        />
                      </PieChart>
                    </ResponsiveContainer>
                  </div>
                  <div className="w-full sm:flex-1 space-y-1.5">
                    {programChartData.map((item: any, index: number) => (
                      <div key={index} className="flex items-center justify-between text-xs sm:text-sm">
                        <div className="flex items-center gap-2 min-w-0">
                          <div
                            className="w-2.5 h-2.5 rounded-full shrink-0"
                            style={{ backgroundColor: item.color }}
                          />
                          <span className="text-gray-600 truncate">{item.name}</span>
                        </div>
                        <span className="font-bold text-gray-800 shrink-0">{item.value}</span>
                      </div>
                    ))}
                  </div>
                </div>
              ) : (
                <div className="text-center py-12 text-gray-400 text-sm">لا توجد بيانات</div>
              )}
            </CardContent>
          </Card>

          {/* توزيع الطلبات حسب المرحلة */}
          <Card className="border-0 shadow-sm">
            <CardHeader className="p-4 sm:p-6 pb-2">
              <CardTitle className="text-sm sm:text-base font-semibold text-gray-700 flex items-center gap-2">
                <div className="w-1 h-5 bg-amber-500 rounded-full" />
                توزيع الطلبات حسب المرحلة
              </CardTitle>
            </CardHeader>
            <CardContent className="p-4 sm:p-6 pt-0">
              {stageChartData.length > 0 ? (
                <div className="h-[220px] w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart
                      data={stageChartData}
                      layout="vertical"
                      margin={{ top: 10, right: 20, left: 60, bottom: 10 }}
                    >
                      <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#f0f0f0" />
                      <XAxis type="number" allowDecimals={false} />
                      <YAxis dataKey="name" type="category" tick={{ fontSize: 11 }} />
                      <Tooltip formatter={(value: any) => [value, "طلب"]} />
                      <Bar dataKey="count" radius={[0, 4, 4, 0]}>
                        {stageChartData.map((entry: any, index: number) => (
                          <Cell key={`cell-${index}`} fill={entry.fill} />
                        ))}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              ) : (
                <div className="flex items-center justify-center h-[220px] text-gray-400 text-sm">
                  لا توجد طلبات نشطة حالياً
                </div>
              )}
            </CardContent>
        </Card>
      </div>

      {/* رسم الاتجاه الشهري */}
      {trendChartData.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base font-bold text-gray-700 flex items-center gap-2">
              <TrendingUp className="w-5 h-5 text-blue-500" />
              حركة الطلبات الشهرية (آخر 6 أشهر)
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-56">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={trendChartData} margin={{ top: 10, right: 20, left: 10, bottom: 10 }}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="month" tick={{ fontSize: 12 }} />
                  <YAxis allowDecimals={false} />
                  <Tooltip formatter={(value: any) => [value, "طلب"]} />
                  <Line
                    type="monotone"
                    dataKey="طلبات"
                    stroke="#3b82f6"
                    strokeWidth={2}
                    dot={{ fill: "#3b82f6", r: 4 }}
                    activeDot={{ r: 6 }}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      )}

      {/* مؤشرات رضا المستفيدين */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base font-bold text-gray-700 flex items-center gap-2">
            <Star className="w-5 h-5 text-yellow-500" />
            مؤشرات رضا المستفيدين
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="flex flex-col items-center justify-center p-4 bg-yellow-50 rounded-xl">
              <p className="text-sm text-yellow-700 font-medium mb-1">التقييم العام</p>
              <p className="text-4xl font-bold text-yellow-600 mb-2">
                {((summary as any)?.avgQualityRating || summary.avgRating) > 0 ? ((summary as any)?.avgQualityRating || summary.avgRating) : "—"}
              </p>
              {((summary as any)?.avgQualityRating || summary.avgRating) > 0 && (
                <StarDisplay rating={(summary as any)?.avgQualityRating || summary.avgRating} />
              )}
              <p className="text-xs text-yellow-600 mt-2">من أصل 5 نجوم</p>
            </div>

            <div className="flex flex-col items-center justify-center p-4 bg-emerald-50 rounded-xl">
              <p className="text-sm text-emerald-700 font-medium mb-1">نسبة الرضا</p>
              <p className="text-4xl font-bold text-emerald-600 mb-2">
                {(summary as any)?.satisfactionRate || 0}%
              </p>
              <div className="w-full bg-emerald-200 rounded-full h-2 mt-2">
                <div
                  className="bg-emerald-500 h-2 rounded-full transition-all duration-500"
                  style={{ width: `${(summary as any)?.satisfactionRate || 0}%` }}
                />
              </div>
              <p className="text-xs text-emerald-600 mt-2">تقييم 4 نجوم فما فوق</p>
            </div>

            <div className="flex flex-col items-center justify-center p-4 bg-blue-50 rounded-xl">
              <p className="text-sm text-blue-700 font-medium mb-1">إجمالي التقييمات</p>
              <p className="text-4xl font-bold text-blue-600 mb-2">
                {(summary as any)?.totalEvaluated || 0}
              </p>
              <p className="text-xs text-blue-600 mt-1">تقرير ختامي تم تقييمه</p>
              <p className="text-xs text-gray-400 mt-2">
                من إجمالي {summary.closedRequests} طلب مكتمل
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* آخر التقارير الختامية */}
      {recentReports && recentReports.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base font-bold text-gray-700 flex items-center gap-2">
              <CheckCircle className="w-5 h-5 text-emerald-500" />
              آخر التقارير الختامية والتقييمات
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <table className="w-full text-sm text-right">
                <thead className="bg-gray-50 text-gray-500 text-xs border-b">
                  <tr>
                    <th className="py-3 px-4">رقم التقرير</th>
                    <th className="py-3 px-4">المسجد</th>
                    <th className="py-3 px-4">البرنامج</th>
                    <th className="py-3 px-4 hidden sm:table-cell">تاريخ الإنجاز</th>
                    <th className="py-3 px-4">التكلفة</th>
                    <th className="py-3 px-4">تقييم المستفيد</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {recentReports.map((report: any) => (
                    <tr key={report.id} className="hover:bg-gray-50 transition-colors">
                      <td className="py-3 px-4 font-mono font-medium text-gray-700">
                        {report.reportNumber}
                      </td>
                      <td className="py-3 px-4 font-medium text-gray-800">
                        {report.mosqueName}
                      </td>
                      <td className="py-3 px-4">
                        <Badge
                          style={{
                            backgroundColor: `${PROGRAM_COLORS[report.programType] || '#94a3b8'}20`,
                            color: PROGRAM_COLORS[report.programType] || '#64748b',
                            border: `1px solid ${PROGRAM_COLORS[report.programType] || '#94a3b8'}40`,
                          }}
                        >
                          {PROGRAM_LABELS[report.programType] || report.programType}
                        </Badge>
                      </td>
                      <td className="py-3 px-4 text-gray-500 hidden sm:table-cell">
                        {report.completionDate
                          ? new Date(report.completionDate).toLocaleDateString('ar-SA')
                          : new Date(report.createdAt).toLocaleDateString('ar-SA')}
                      </td>
                      <td className="py-3 px-4 text-gray-700">
                        {report.totalCost
                          ? formatCurrency(Number(report.totalCost))
                          : '—'}
                      </td>
                      <td className="py-3 px-4 min-w-[100px]">
                        {report.satisfactionRating ? (
                          <StarDisplay rating={report.satisfactionRating} />
                        ) : (
                          <span className="text-gray-400">—</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );

  if (embedded) {
    return content;
  }

  return (
    <DashboardLayout>
      {content}
    </DashboardLayout>
  );
}

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

export default function KPIDashboard() {
  const [refreshKey, setRefreshKey] = useState(0);

  const { data: kpiData, isLoading, refetch } = trpc.analytics.getKPIs.useQuery(
    undefined
  );

  const handleRefresh = () => {
    setRefreshKey(k => k + 1);
    refetch();
  };

  if (isLoading) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center h-64">
          <div className="text-center">
            <div className="w-12 h-12 border-4 border-emerald-500 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
            <p className="text-gray-500">جاري تحميل البيانات...</p>
          </div>
        </div>
      </DashboardLayout>
    );
  }

  if (!kpiData) {
    return (
      <DashboardLayout>
        <div className="text-center py-12 text-gray-500">
          لا توجد بيانات متاحة
        </div>
      </DashboardLayout>
    );
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

  return (
    <DashboardLayout>
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
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
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
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
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
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between mb-3">
              <h3 className="font-semibold text-gray-700">معدل إنجاز الطلبات</h3>
              <Badge className="bg-emerald-100 text-emerald-700 border-emerald-200">
                {summary.completionRate}%
              </Badge>
            </div>
            <div className="w-full bg-gray-100 rounded-full h-4 overflow-hidden">
              <div
                className="h-4 rounded-full bg-gradient-to-l from-emerald-400 to-emerald-600 transition-all duration-500"
                style={{ width: `${summary.completionRate}%` }}
              />
            </div>
            <div className="flex justify-between text-xs text-gray-400 mt-2">
              <span>0%</span>
              <span>50%</span>
              <span>100%</span>
            </div>
          </CardContent>
        </Card>

        {/* الرسوم البيانية */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* توزيع الطلبات حسب البرنامج */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base font-semibold text-gray-700 flex items-center gap-2">
                <div className="w-1 h-5 bg-indigo-500 rounded-full" />
                توزيع الطلبات حسب البرنامج
              </CardTitle>
            </CardHeader>
            <CardContent>
              {programChartData.length > 0 ? (
                <div className="flex items-center gap-4">
                  <ResponsiveContainer width="50%" height={200}>
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
                        contentStyle={{ direction: 'rtl', fontFamily: 'inherit' }}
                      />
                    </PieChart>
                  </ResponsiveContainer>
                  <div className="flex-1 space-y-2">
                    {programChartData.map((item: any, index: number) => (
                      <div key={index} className="flex items-center justify-between text-sm">
                        <div className="flex items-center gap-2">
                          <div
                            className="w-3 h-3 rounded-full"
                            style={{ backgroundColor: item.color }}
                          />
                          <span className="text-gray-600">{item.name}</span>
                        </div>
                        <span className="font-semibold text-gray-800">{item.value}</span>
                      </div>
                    ))}
                  </div>
                </div>
              ) : (
                <div className="text-center py-8 text-gray-400">لا توجد بيانات</div>
              )}
            </CardContent>
          </Card>

          {/* توزيع الطلبات حسب المرحلة */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base font-semibold text-gray-700 flex items-center gap-2">
                <div className="w-1 h-5 bg-amber-500 rounded-full" />
                توزيع الطلبات حسب المرحلة
              </CardTitle>
            </CardHeader>
            <CardContent>
              {stageChartData.length > 0 ? (
                <ResponsiveContainer width="100%" height={220}>
                  <BarChart data={stageChartData} layout="vertical" margin={{ right: 10, left: 10 }}>
                    <CartesianGrid strokeDasharray="3 3" horizontal={false} />
                    <XAxis type="number" tick={{ fontSize: 11 }} />
                    <YAxis
                      type="category"
                      dataKey="name"
                      tick={{ fontSize: 11, fontFamily: 'inherit' }}
                      width={80}
                    />
                    <Tooltip
                      formatter={(value: any) => [value, 'عدد الطلبات']}
                      contentStyle={{ direction: 'rtl', fontFamily: 'inherit' }}
                    />
                    <Bar dataKey="count" radius={[0, 4, 4, 0]}>
                      {stageChartData.map((entry: any, index: number) => (
                        <Cell key={`cell-${index}`} fill={entry.fill} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              ) : (
                <div className="text-center py-8 text-gray-400">لا توجد بيانات</div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* الاتجاه الشهري */}
        {trendChartData.length > 0 && (
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base font-semibold text-gray-700 flex items-center gap-2">
                <div className="w-1 h-5 bg-emerald-500 rounded-full" />
                الاتجاه الشهري للطلبات (آخر 12 شهر)
              </CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={200}>
                <LineChart data={trendChartData} margin={{ right: 10, left: 10 }}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="month" tick={{ fontSize: 11 }} />
                  <YAxis tick={{ fontSize: 11 }} />
                  <Tooltip
                    formatter={(value: any) => [value, 'عدد الطلبات']}
                    contentStyle={{ direction: 'rtl', fontFamily: 'inherit' }}
                  />
                  <Line
                    type="monotone"
                    dataKey="طلبات"
                    stroke="#10b981"
                    strokeWidth={2}
                    dot={{ fill: '#10b981', r: 4 }}
                    activeDot={{ r: 6 }}
                  />
                </LineChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        )}

        {/* آخر التقارير الختامية */}
        {recentReports.length > 0 && (
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base font-semibold text-gray-700 flex items-center gap-2">
                <div className="w-1 h-5 bg-purple-500 rounded-full" />
                آخر التقارير الختامية
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-gray-100">
                      <th className="text-right py-3 px-4 font-semibold text-gray-600">رقم الطلب</th>
                      <th className="text-right py-3 px-4 font-semibold text-gray-600">تاريخ الإنجاز</th>
                      <th className="text-right py-3 px-4 font-semibold text-gray-600">التكلفة الإجمالية</th>
                      <th className="text-right py-3 px-4 font-semibold text-gray-600">تقييم الجودة</th>
                    </tr>
                  </thead>
                  <tbody>
                    {recentReports.map((report: any) => (
                      <tr key={report.id} className="border-b border-gray-50 hover:bg-gray-50 transition-colors">
                        <td className="py-3 px-4 text-gray-700 font-medium">#{report.requestId}</td>
                        <td className="py-3 px-4 text-gray-500">
                          {report.completionDate
                            ? new Date(report.completionDate).toLocaleDateString('ar-SA')
                            : new Date(report.createdAt).toLocaleDateString('ar-SA')}
                        </td>
                        <td className="py-3 px-4 text-gray-700">
                          {report.totalCost
                            ? formatCurrency(Number(report.totalCost))
                            : '—'}
                        </td>
                        <td className="py-3 px-4">
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
    </DashboardLayout>
  );
}

import { useState } from "react";
import { useAuth } from "@/_core/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { 
  Building2, 
  FileText, 
  Plus,
  Clock,
  CheckCircle2,
  AlertCircle,
  ChevronLeft,
  Search,
  Filter,
  ArrowRight,
  Eye,
  Calendar,
  DollarSign,
  Users,
  Briefcase,
  BarChart3,
  FolderOpen,
  PauseCircle,
} from "lucide-react";
import { Link, useLocation } from "wouter";
import { trpc } from "@/lib/trpc";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import DashboardLayout from "@/components/DashboardLayout";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";

const statusColors: Record<string, string> = {
  planning: "bg-yellow-100 text-yellow-800 border-yellow-200",
  in_progress: "bg-yellow-100 text-yellow-800 border-yellow-200",
  on_hold: "bg-yellow-100 text-yellow-800 border-yellow-200",
  completed: "bg-green-100 text-green-800 border-green-200",
  cancelled: "bg-red-100 text-red-800 border-red-200",
};

const statusLabels: Record<string, string> = {
  planning: "تخطيط",
  in_progress: "قيد التنفيذ",
  on_hold: "متوقف",
  completed: "مكتمل",
  cancelled: "ملغي",
};

const statusIcons: Record<string, React.ReactNode> = {
  planning: <Clock className="w-4 h-4" />,
  in_progress: <AlertCircle className="w-4 h-4" />,
  on_hold: <PauseCircle className="w-4 h-4" />,
  completed: <CheckCircle2 className="w-4 h-4" />,
  cancelled: <AlertCircle className="w-4 h-4" />,
};

export default function ProjectManagement() {
  const { user } = useAuth();
  const [, navigate] = useLocation();
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  
  // جلب المشاريع
  const { data: projects, isLoading, refetch } = trpc.projects.getAll.useQuery({
    status: statusFilter !== "all" ? statusFilter as any : undefined,
  });

  // جلب إحصائيات المشاريع
  const { data: stats } = trpc.projects.getStats.useQuery();

  // تصفية المشاريع
  const filteredProjects = projects?.filter(project => {
    const matchesSearch = searchTerm === "" || 
      project.projectNumber.toLowerCase().includes(searchTerm.toLowerCase()) ||
      project.name.toLowerCase().includes(searchTerm.toLowerCase());
    return matchesSearch;
  }) || [];

  const formatCurrency = (amount: string | null) => {
    if (!amount) return "غير محدد";
    return new Intl.NumberFormat("ar-SA", {
      style: "currency",
      currency: "SAR",
      maximumFractionDigits: 0,
    }).format(parseFloat(amount));
  };

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* العنوان */}
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-foreground">إدارة المشاريع</h1>
            <p className="text-muted-foreground">متابعة وإدارة جميع المشاريع</p>
          </div>
        </div>

        {/* بطاقات الإحصائيات */}
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3 sm:gap-4">
          <Card className="border-0 shadow-sm cursor-pointer hover:shadow-md transition-shadow" onClick={() => setStatusFilter("all")}>
            <CardContent className="p-3 sm:p-4">
              <div className="flex items-center justify-between gap-2">
                <div className="min-w-0">
                  <p className="text-[10px] sm:text-xs text-muted-foreground truncate">إجمالي المشاريع</p>
                  <p className="text-xl sm:text-2xl font-bold text-foreground">{stats?.total || 0}</p>
                </div>
                <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                  <FolderOpen className="w-4 h-4 sm:w-5 sm:h-5 text-primary" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="border-0 shadow-sm cursor-pointer hover:shadow-md transition-shadow" onClick={() => setStatusFilter("planning")}>
            <CardContent className="p-3 sm:p-4">
              <div className="flex items-center justify-between gap-2">
                <div className="min-w-0">
                  <p className="text-[10px] sm:text-xs text-muted-foreground truncate">تخطيط</p>
                  <p className="text-xl sm:text-2xl font-bold text-yellow-600">{stats?.planning || 0}</p>
                </div>
                <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-lg bg-yellow-100 flex items-center justify-center shrink-0">
                  <Clock className="w-4 h-4 sm:w-5 sm:h-5 text-yellow-600" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="border-0 shadow-sm cursor-pointer hover:shadow-md transition-shadow" onClick={() => setStatusFilter("in_progress")}>
            <CardContent className="p-3 sm:p-4">
              <div className="flex items-center justify-between gap-2">
                <div className="min-w-0">
                  <p className="text-[10px] sm:text-xs text-muted-foreground truncate">قيد التنفيذ</p>
                  <p className="text-xl sm:text-2xl font-bold text-blue-600">{stats?.inProgress || 0}</p>
                </div>
                <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-lg bg-blue-100 flex items-center justify-center shrink-0">
                  <AlertCircle className="w-4 h-4 sm:w-5 sm:h-5 text-blue-600" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="border-0 shadow-sm cursor-pointer hover:shadow-md transition-shadow" onClick={() => setStatusFilter("completed")}>
            <CardContent className="p-3 sm:p-4">
              <div className="flex items-center justify-between gap-2">
                <div className="min-w-0">
                  <p className="text-[10px] sm:text-xs text-muted-foreground truncate">مكتمل</p>
                  <p className="text-xl sm:text-2xl font-bold text-green-600">{stats?.completed || 0}</p>
                </div>
                <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-lg bg-green-100 flex items-center justify-center shrink-0">
                  <CheckCircle2 className="w-4 h-4 sm:w-5 sm:h-5 text-green-600" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="border-0 shadow-sm col-span-2 md:col-span-1">
            <CardContent className="p-3 sm:p-4">
              <div className="flex items-center justify-between gap-2">
                <div className="min-w-0">
                  <p className="text-[10px] sm:text-xs text-muted-foreground truncate">إجمالي الميزانية</p>
                  <p className="text-base sm:text-lg font-bold text-foreground truncate">{formatCurrency(stats?.totalBudget?.toString() || null)}</p>
                </div>
                <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-lg bg-emerald-100 flex items-center justify-center shrink-0">
                  <DollarSign className="w-4 h-4 sm:w-5 sm:h-5 text-emerald-600" />
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* أدوات البحث والتصفية */}
        <Card className="border-0 shadow-sm">
          <CardContent className="p-4">
            <div className="flex flex-col sm:flex-row gap-4">
              <div className="relative flex-1">
                <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  placeholder="البحث برقم المشروع أو الاسم..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pr-10"
                />
              </div>
              
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-full sm:w-[180px]">
                  <SelectValue placeholder="حالة المشروع" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">جميع الحالات</SelectItem>
                  <SelectItem value="planning">تخطيط</SelectItem>
                  <SelectItem value="in_progress">قيد التنفيذ</SelectItem>
                  <SelectItem value="on_hold">متوقف</SelectItem>
                  <SelectItem value="completed">مكتمل</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>

        {/* قائمة المشاريع */}
        {isLoading ? (
          <div className="space-y-4">
            {[1, 2, 3].map((i) => (
              <Card key={i} className="border-0 shadow-sm">
                <CardContent className="p-6">
                  <div className="h-24 bg-muted animate-pulse rounded-lg" />
                </CardContent>
              </Card>
            ))}
          </div>
        ) : filteredProjects.length > 0 ? (
          <div className="space-y-4">
            {filteredProjects.map((project) => (
              <Link key={project.id} href={`/projects/${project.id}`}>
                <Card className="border-0 shadow-sm hover:shadow-md transition-all cursor-pointer overflow-hidden">
                  <CardContent className="p-4 sm:p-6">
                    <div className="flex flex-col lg:flex-row lg:items-center gap-4 sm:gap-6">
                      {/* معلومات المشروع */}
                      <div className="flex items-start gap-3 sm:gap-4 flex-1 min-w-0">
                        <div className="w-12 h-12 sm:w-14 sm:h-14 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
                          <Briefcase className="w-6 h-6 sm:w-7 sm:h-7 text-primary" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap mb-1">
                            <h3 className="font-bold text-foreground text-sm sm:text-base">{project.projectNumber}</h3>
                            <Badge variant="outline" className={`${statusColors[project.status || "planning"]} text-[10px] sm:text-xs py-0 sm:py-0.5 whitespace-nowrap`}>
                              {statusIcons[project.status || "planning"]}
                              <span className="mr-1">{project.currentPhaseName || statusLabels[project.status || "planning"]}</span>
                            </Badge>
                          </div>
                          <p className="text-muted-foreground text-xs sm:text-sm truncate">{project.name}</p>
                          <div className="flex items-center gap-3 sm:gap-4 mt-2 text-[10px] sm:text-xs text-muted-foreground flex-wrap">
                            <span className="flex items-center gap-1">
                              <Calendar className="w-3 h-3 sm:w-4 sm:h-4" />
                              {project.startDate 
                                ? new Date(project.startDate).toLocaleDateString("ar-SA")
                                : "لم يبدأ بعد"
                              }
                            </span>
                            <span className="flex items-center gap-1">
                              <DollarSign className="w-3 h-3 sm:w-4 sm:h-4" />
                              {formatCurrency(project.budget)}
                            </span>
                            {project.managerName && (
                              <span className="flex items-center gap-1">
                                <Users className="w-3 h-3 sm:w-4 sm:h-4" />
                                <span className="truncate max-w-[100px] sm:max-w-none">{project.managerName}</span>
                              </span>
                            )}
                          </div>
                        </div>
                      </div>

                      {/* نسبة الإنجاز */}
                      <div className="w-full lg:w-48 shrink-0">
                        <div className="flex items-center justify-between mb-1.5">
                          <span className="text-[10px] sm:text-xs text-muted-foreground">نسبة الإنجاز</span>
                          <span className="text-[10px] sm:text-xs font-medium">{project.completionPercentage || 0}%</span>
                        </div>
                        <Progress value={project.completionPercentage || 0} className="h-1.5 sm:h-2" />
                      </div>

                      {/* زر العرض - Hidden on small mobile, shown on tablet/desktop */}
                      <div className="hidden sm:flex items-center justify-center">
                        <Button variant="ghost" size="icon" className="shrink-0">
                          <ChevronLeft className="w-5 h-5" />
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </Link>
            ))}
          </div>
        ) : (
          <Card className="border-0 shadow-sm">
            <CardContent className="p-12 text-center">
              <FolderOpen className="w-16 h-16 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-lg font-medium text-foreground mb-2">لا توجد مشاريع</h3>
              <p className="text-muted-foreground mb-6">
                {searchTerm || statusFilter !== "all" 
                  ? "لا توجد مشاريع تطابق معايير البحث"
                  : "لم يتم إنشاء أي مشاريع بعد"
                }
              </p>
            </CardContent>
          </Card>
        )}
      </div>
    </DashboardLayout>
  );
}

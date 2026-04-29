import { useState } from "react";
import { Link } from "wouter";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { HandoverStatusBadge } from "@/components/HandoverStatusBadge";
import { Plus, Search, FileText, Calendar, Building2, CheckCircle2 } from "lucide-react";
import { format } from "date-fns";
import { ar } from "date-fns/locale";

export default function Handovers() {
  const [searchTerm, setSearchTerm] = useState("");
  const [typeFilter, setTypeFilter] = useState<string>("all");
  const [statusFilter, setStatusFilter] = useState<string>("all");

  const { data: handovers, isLoading } = trpc.handovers.list.useQuery();
  const { data: projects } = trpc.projects.getAll.useQuery({ limit: 100 });

  // تصفية الاستلامات
  const filteredHandovers = handovers?.filter((handover) => {
    const matchesSearch = 
      handover.projectNumber?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      handover.notes?.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesType = typeFilter === "all" || handover.type === typeFilter;
    const matchesStatus = statusFilter === "all" || handover.status === statusFilter;
    return matchesSearch && matchesType && matchesStatus;
  });

  // إحصائيات
  const stats = {
    total: handovers?.length || 0,
    pending: handovers?.filter((h) => h.status === "pending").length || 0,
    approved: handovers?.filter((h) => h.status === "approved").length || 0,
    completed: handovers?.filter((h) => h.status === "completed").length || 0,
  };

  const typeLabels: Record<string, string> = {
    preliminary: "استلام أولي",
    warranty: "فترة ضمان",
    final: "استلام نهائي",
  };

  return (
    <div className="container mx-auto py-6 space-y-6">
      {/* العنوان */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold">إدارة الاستلامات</h1>
          <p className="text-muted-foreground mt-1">
            إدارة الاستلامات الأولية، فترات الضمان، والاستلامات النهائية للمشاريع
          </p>
        </div>
        <Link href="/handovers/new">
          <Button>
            <Plus className="ml-2 h-4 w-4" />
            إنشاء استلام جديد
          </Button>
        </Link>
      </div>

      {/* بطاقات الإحصائيات */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">إجمالي الاستلامات</CardTitle>
            <FileText className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.total}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">قيد المراجعة</CardTitle>
            <Calendar className="h-4 w-4 text-yellow-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.pending}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">معتمد</CardTitle>
            <CheckCircle2 className="h-4 w-4 text-green-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.approved}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">مكتمل</CardTitle>
            <Building2 className="h-4 w-4 text-blue-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.completed}</div>
          </CardContent>
        </Card>
      </div>

      {/* البحث والتصفية */}
      <Card>
        <CardHeader>
          <CardTitle>البحث والتصفية</CardTitle>
          <CardDescription>ابحث عن استلام أو صفّ حسب النوع والحالة</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-3">
            <div className="relative">
              <Search className="absolute right-3 top-3 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="ابحث برقم المشروع أو الملاحظات..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pr-10"
              />
            </div>
            <Select value={typeFilter} onValueChange={setTypeFilter}>
              <SelectTrigger>
                <SelectValue placeholder="نوع الاستلام" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">جميع الأنواع</SelectItem>
                <SelectItem value="preliminary">استلام أولي</SelectItem>
                <SelectItem value="warranty">فترة ضمان</SelectItem>
                <SelectItem value="final">استلام نهائي</SelectItem>
              </SelectContent>
            </Select>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger>
                <SelectValue placeholder="الحالة" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">جميع الحالات</SelectItem>
                <SelectItem value="pending">قيد المراجعة</SelectItem>
                <SelectItem value="approved">معتمد</SelectItem>
                <SelectItem value="rejected">مرفوض</SelectItem>
                <SelectItem value="completed">مكتمل</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* جدول الاستلامات */}
      <Card>
        <CardHeader>
          <CardTitle>قائمة الاستلامات</CardTitle>
          <CardDescription>
            {filteredHandovers?.length || 0} استلام
          </CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="text-center py-8 text-muted-foreground">جاري التحميل...</div>
          ) : filteredHandovers && filteredHandovers.length > 0 ? (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>رقم المشروع</TableHead>
                  <TableHead>النوع</TableHead>
                  <TableHead>تاريخ الاستلام</TableHead>
                  <TableHead>نسبة الإنجاز</TableHead>
                  <TableHead>الحالة</TableHead>
                  <TableHead>الإجراءات</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredHandovers.map((handover) => (
                  <TableRow key={handover.id}>
                    <TableCell className="font-medium">
                      {handover.projectNumber || "غير محدد"}
                    </TableCell>
                    <TableCell>{typeLabels[handover.type]}</TableCell>
                    <TableCell>
                      {handover.handoverDate
                        ? format(new Date(handover.handoverDate), "dd MMMM yyyy", { locale: ar })
                        : "غير محدد"}
                    </TableCell>
                    <TableCell>{handover.completionPercentage}%</TableCell>
                    <TableCell>
                      <HandoverStatusBadge status={handover.status} />
                    </TableCell>
                    <TableCell>
                      <Link href={`/handovers/${handover.id}`}>
                        <Button variant="ghost" size="sm">
                          عرض التفاصيل
                        </Button>
                      </Link>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          ) : (
            <div className="text-center py-8 text-muted-foreground">
              لا توجد استلامات مطابقة للبحث
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

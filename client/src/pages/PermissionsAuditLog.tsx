import { useState } from "react";
import DashboardLayout from "@/components/DashboardLayout";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Search, Shield, User, Calendar, Filter, Download, Loader2 } from "lucide-react";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";

const ACTION_LABELS: Record<string, string> = {
  grant: "منح صلاحية",
  revoke: "إلغاء صلاحية",
  update: "تحديث صلاحية",
};

const ACTION_COLORS: Record<string, string> = {
  grant: "bg-green-100 text-green-800",
  revoke: "bg-red-100 text-red-800",
  update: "bg-blue-100 text-blue-800",
};

export default function PermissionsAuditLog() {
  const [search, setSearch] = useState("");
  const [actionFilter, setActionFilter] = useState<string>("all");
  const [userFilter, setUserFilter] = useState<string>("all");
  const [dateFilter, setDateFilter] = useState<string>("all");

  const { data: auditLogs, isLoading } = trpc.permissions.getAuditLog.useQuery({
    targetUserId: userFilter !== "all" ? parseInt(userFilter) : undefined,
    limit: 100,
  });

  const { data: usersResponse } = trpc.users.getAll.useQuery({});

  const logs = auditLogs || [];
  const usersList = usersResponse?.items || [];

  // فلترة محلية للسجلات
  const filteredLogs = logs.filter((log: any) => {
    if (search && !log.actionType?.includes(search) && !log.reason?.includes(search)) return false;
    if (actionFilter !== "all" && log.actionType !== actionFilter) return false;
    if (dateFilter !== "all") {
      const logDate = new Date(log.createdAt);
      const now = new Date();
      const daysDiff = Math.floor((now.getTime() - logDate.getTime()) / (1000 * 60 * 60 * 24));
      if (dateFilter === "today" && daysDiff > 0) return false;
      if (dateFilter === "week" && daysDiff > 7) return false;
      if (dateFilter === "month" && daysDiff > 30) return false;
      if (dateFilter === "year" && daysDiff > 365) return false;
    }
    return true;
  });

  const handleExport = () => {
    toast.info("جاري تصدير سجل التدقيق...");
    // TODO: تنفيذ تصدير السجل
  };

  // مساعد للحصول على اسم المستخدم من معرّفه
  const getUserName = (userId: number | string | null) => {
    if (!userId) return "-";
    const user = usersList.find((u: any) => u.id.toString() === userId.toString());
    return user ? user.name : `مستخدم (#${userId})`;
  };

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* العنوان */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-xl sm:text-2xl font-bold text-foreground">سجل تدقيق الصلاحيات</h1>
            <p className="text-xs sm:text-sm text-muted-foreground mt-1">تتبع جميع التغييرات في صلاحيات المستخدمين</p>
          </div>
          <Button onClick={handleExport} variant="outline" className="w-full sm:w-auto h-9 text-sm">
            <Download className="w-4 h-4 ml-2" />
            تصدير السجل
          </Button>
        </div>

        {/* بطاقات الإحصائيات */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
          <Card className="border-0 shadow-sm">
            <CardContent className="p-4 sm:p-6">
              <div className="flex items-center justify-between gap-2">
                <div className="min-w-0">
                  <p className="text-[10px] sm:text-sm text-muted-foreground truncate">إجمالي السجلات</p>
                  <p className="text-lg sm:text-2xl font-bold text-foreground mt-1">{filteredLogs.length}</p>
                </div>
                <div className="w-8 h-8 sm:w-12 sm:h-12 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                  <Shield className="w-4 h-4 sm:w-6 sm:h-6 text-primary" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="border-0 shadow-sm">
            <CardContent className="p-4 sm:p-6">
              <div className="flex items-center justify-between gap-2">
                <div className="min-w-0">
                  <p className="text-[10px] sm:text-sm text-muted-foreground truncate">منح صلاحيات</p>
                  <p className="text-lg sm:text-2xl font-bold text-foreground mt-1">
                    {filteredLogs.filter((l: any) => l.actionType === "grant").length}
                  </p>
                </div>
                <div className="w-8 h-8 sm:w-12 sm:h-12 rounded-lg bg-green-100 flex items-center justify-center shrink-0">
                  <Shield className="w-4 h-4 sm:w-6 sm:h-6 text-green-600" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="border-0 shadow-sm">
            <CardContent className="p-4 sm:p-6">
              <div className="flex items-center justify-between gap-2">
                <div className="min-w-0">
                  <p className="text-[10px] sm:text-sm text-muted-foreground truncate">إلغاء صلاحيات</p>
                  <p className="text-lg sm:text-2xl font-bold text-foreground mt-1">
                    {filteredLogs.filter((l: any) => l.actionType === "revoke").length}
                  </p>
                </div>
                <div className="w-8 h-8 sm:w-12 sm:h-12 rounded-lg bg-red-100 flex items-center justify-center shrink-0">
                  <Shield className="w-4 h-4 sm:w-6 sm:h-6 text-red-600" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="border-0 shadow-sm">
            <CardContent className="p-4 sm:p-6">
              <div className="flex items-center justify-between gap-2">
                <div className="min-w-0">
                  <p className="text-[10px] sm:text-sm text-muted-foreground truncate">تحديثات</p>
                  <p className="text-lg sm:text-2xl font-bold text-foreground mt-1">
                    {filteredLogs.filter((l: any) => l.actionType === "update").length}
                  </p>
                </div>
                <div className="w-8 h-8 sm:w-12 sm:h-12 rounded-lg bg-blue-100 flex items-center justify-center shrink-0">
                  <Shield className="w-4 h-4 sm:w-6 sm:h-6 text-blue-600" />
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* فلاتر البحث */}
        <Card className="border-0 shadow-sm">
          <CardHeader className="p-4 sm:p-6 pb-2 sm:pb-3">
            <CardTitle className="text-base sm:text-lg flex items-center gap-2">
              <Filter className="w-4 h-4 sm:w-5 sm:h-5" />
              فلترة السجلات
            </CardTitle>
            <CardDescription className="text-xs sm:text-sm">ابحث وفلتر سجلات التدقيق حسب معايير مختلفة</CardDescription>
          </CardHeader>
          <CardContent className="p-4 sm:p-6 pt-0">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              <div className="relative">
                <Search className="absolute right-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
                <Input
                  placeholder="بحث في السجل..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="pr-10 h-9 text-sm"
                />
              </div>

              <Select value={actionFilter} onValueChange={setActionFilter}>
                <SelectTrigger className="h-9 text-sm">
                  <SelectValue placeholder="نوع الإجراء" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">جميع الإجراءات</SelectItem>
                  <SelectItem value="grant">منح صلاحية</SelectItem>
                  <SelectItem value="revoke">إلغاء صلاحية</SelectItem>
                  <SelectItem value="update">تحديث صلاحية</SelectItem>
                </SelectContent>
              </Select>

              <Select value={userFilter} onValueChange={setUserFilter}>
                <SelectTrigger className="h-9 text-sm">
                  <SelectValue placeholder="المستخدم" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">جميع المستخدمين</SelectItem>
                  {usersList.map((user: any) => (
                    <SelectItem key={user.id} value={user.id.toString()}>
                      {user.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <Select value={dateFilter} onValueChange={setDateFilter}>
                <SelectTrigger className="h-9 text-sm">
                  <SelectValue placeholder="الفترة الزمنية" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">جميع الفترات</SelectItem>
                  <SelectItem value="today">اليوم</SelectItem>
                  <SelectItem value="week">آخر أسبوع</SelectItem>
                  <SelectItem value="month">آخر شهر</SelectItem>
                  <SelectItem value="year">آخر سنة</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>

        {/* جدول السجلات */}
        <Card className="border-0 shadow-sm overflow-hidden">
          <CardContent className="p-0">
            {isLoading ? (
              <div className="p-12 text-center">
                <Loader2 className="w-8 h-8 animate-spin text-primary mx-auto mb-4" />
                <p className="text-sm text-muted-foreground">جاري تحميل سجلات التدقيق...</p>
              </div>
            ) : filteredLogs.length > 0 ? (
              <>
                {/* Desktop View Table */}
                <div className="hidden md:block overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="text-right">التاريخ والوقت</TableHead>
                        <TableHead className="text-right">الإجراء</TableHead>
                        <TableHead className="text-right">المستخدم المتأثر</TableHead>
                        <TableHead className="text-right">الصلاحية</TableHead>
                        <TableHead className="text-right">القيمة القديمة</TableHead>
                        <TableHead className="text-right">القيمة الجديدة</TableHead>
                        <TableHead className="text-right">المنفذ</TableHead>
                        <TableHead className="text-right">الملاحظات</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredLogs.map((log: any) => (
                        <TableRow key={log.id}>
                          <TableCell>
                            <div className="flex items-center gap-2">
                              <Calendar className="w-4 h-4 text-muted-foreground" />
                              <div className="text-sm">
                                <div>{new Date(log.createdAt).toLocaleDateString("ar-SA")}</div>
                                <div className="text-xs text-muted-foreground">
                                  {new Date(log.createdAt).toLocaleTimeString("ar-SA")}
                                </div>
                              </div>
                            </div>
                          </TableCell>
                          <TableCell>
                            <Badge className={`${ACTION_COLORS[log.actionType] || "bg-gray-100 text-gray-800"} whitespace-nowrap px-1.5 py-0`}>
                              {ACTION_LABELS[log.actionType] || log.actionType}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center gap-2">
                              <User className="w-4 h-4 text-muted-foreground shrink-0" />
                              <span className="truncate max-w-[120px]">{getUserName(log.targetUserId)}</span>
                            </div>
                          </TableCell>
                          <TableCell>
                            <code className="text-[10px] bg-muted px-1.5 py-0.5 rounded font-mono">
                              {log.permissionId || "-"}
                            </code>
                          </TableCell>
                          <TableCell>
                            <span className="text-sm text-muted-foreground truncate max-w-[100px] block">
                              {log.oldValue || "-"}
                            </span>
                          </TableCell>
                          <TableCell>
                            <span className="text-sm font-medium truncate max-w-[100px] block">
                              {log.newValue || "-"}
                            </span>
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center gap-2">
                              <User className="w-4 h-4 text-muted-foreground shrink-0" />
                              <span className="text-sm truncate max-w-[100px]">{getUserName(log.performedBy)}</span>
                            </div>
                          </TableCell>
                          <TableCell>
                            <span className="text-sm text-muted-foreground truncate max-w-[150px] block">
                              {log.reason || "-"}
                            </span>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>

                {/* Mobile View Cards */}
                <div className="md:hidden divide-y divide-border">
                  {filteredLogs.map((log: any) => (
                    <div key={log.id} className="p-4 space-y-3">
                      <div className="flex items-start justify-between gap-4">
                        <div className="flex items-center gap-2">
                          <Calendar className="w-3.5 h-3.5 text-muted-foreground" />
                          <div className="text-xs">
                            <span className="font-medium">{new Date(log.createdAt).toLocaleDateString("ar-SA")}</span>
                            <span className="mx-1 text-muted-foreground text-[10px]">{new Date(log.createdAt).toLocaleTimeString("ar-SA")}</span>
                          </div>
                        </div>
                        <Badge className={`${ACTION_COLORS[log.actionType] || "bg-gray-100 text-gray-800"} text-[10px] px-1.5 py-0 shrink-0`}>
                          {ACTION_LABELS[log.actionType] || log.actionType}
                        </Badge>
                      </div>

                      <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-1">
                          <p className="text-[10px] text-muted-foreground uppercase tracking-wider">المستخدم المتأثر</p>
                          <div className="flex items-center gap-2">
                            <User className="w-3.5 h-3.5 text-muted-foreground" />
                            <span className="text-xs font-medium">{getUserName(log.targetUserId)}</span>
                          </div>
                        </div>
                        <div className="space-y-1">
                          <p className="text-[10px] text-muted-foreground uppercase tracking-wider">المنفذ</p>
                          <div className="flex items-center gap-2">
                            <User className="w-3.5 h-3.5 text-muted-foreground" />
                            <span className="text-xs font-medium">{getUserName(log.performedBy)}</span>
                          </div>
                        </div>
                      </div>

                      <div className="space-y-1">
                        <p className="text-[10px] text-muted-foreground uppercase tracking-wider">الصلاحية</p>
                        <code className="text-[10px] bg-muted px-1.5 py-0.5 rounded font-mono block w-fit">
                          {log.permissionId || "-"}
                        </code>
                      </div>

                      <div className="grid grid-cols-2 gap-4 pt-1">
                        <div className="space-y-1">
                          <p className="text-[10px] text-muted-foreground">القيمة القديمة</p>
                          <span className="text-xs text-muted-foreground break-all block">{log.oldValue || "-"}</span>
                        </div>
                        <div className="space-y-1">
                          <p className="text-[10px] text-muted-foreground">القيمة الجديدة</p>
                          <span className="text-xs font-bold text-primary break-all block">{log.newValue || "-"}</span>
                        </div>
                      </div>

                      {log.reason && (
                        <div className="pt-2 border-t border-border/50">
                          <p className="text-[10px] text-muted-foreground mb-1">الملاحظات</p>
                          <p className="text-xs italic leading-relaxed">{log.reason}</p>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </>
            ) : (
              <div className="p-12 text-center">
                <Shield className="w-12 h-12 text-muted-foreground mx-auto mb-4 opacity-20" />
                <p className="text-sm text-muted-foreground">لا توجد سجلات تدقيق مطابقة للبحث</p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}

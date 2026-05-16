import { useState, useEffect } from "react";
import { Link } from "wouter";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Pagination,
  PaginationContent,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
  PaginationEllipsis,
} from "@/components/ui/pagination";
import {
  Search,
  MoreVertical,
  UserCheck,
  UserX,
  Edit,
  Trash2,
  UserPlus,
  Loader2,
  Eye,
  EyeOff,
  ChevronRight,
  ChevronLeft,
} from "lucide-react";
import { toast } from "sonner";
import { useAuth } from "@/_core/hooks/useAuth";

const ROLE_OPTIONS = [
  { value: "system_admin", label: "مدير نظام" },
  { value: "projects_office", label: "مكتب المشاريع" },
  { value: "project_manager", label: "مدير المشاريع" },
  { value: "financial", label: "الإدارة المالية" },
  { value: "field_team", label: "فريق ميداني" },
  { value: "quick_response", label: "استجابة سريعة" },
  { value: "corporate_comm", label: "علاقات مؤسسية" },
];

export interface UsersTabProps {
  openAddModal: boolean;
  setOpenAddModal: (open: boolean) => void;
}

export default function UsersTab({ openAddModal, setOpenAddModal }: UsersTabProps) {
  const { user: currentUser } = useAuth();
  const [searchQuery, setSearchQuery] = useState("");
  const [page, setPage] = useState(1);
  const limit = 20;
  const [showPassword, setShowPassword] = useState(false);
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    password: "",
    phone: "",
    role: "",
    status: "active",
    roleIds: [] as string[],
  });

  const { data: usersData, isLoading, isPlaceholderData, refetch } = trpc.users.getAll.useQuery({
    page,
    limit,
    search: searchQuery,
  }, {
    placeholderData: (previousData) => previousData,
  });

  const users = usersData?.items || [];
  const totalCount = usersData?.totalCount || 0;
  const totalPages = usersData?.totalPages || 1;

  const { data: customRoles } = trpc.permissions.getRoles.useQuery();

  useEffect(() => {
    setPage(1);
  }, [searchQuery]);

  const createUser = trpc.users.create.useMutation({
    onSuccess: () => {
      toast.success("تم إنشاء الحساب بنجاح");
      setOpenAddModal(false);
      resetForm();
      refetch();
    },
    onError: (error: any) => {
      let errorMessage = "فشل إنشاء الحساب";
      try {
        const parsedError = JSON.parse(error.message);
        if (Array.isArray(parsedError)) {
          errorMessage = parsedError.map((err: any) => err.message).join("، ");
        } else {
          errorMessage = error.message;
        }
      } catch (e) {
        errorMessage = error.message || "فشل إنشاء الحساب";
      }
      toast.error(errorMessage);
    },
  });

  const toggleStatus = trpc.users.toggleStatus.useMutation({
    onSuccess: () => {
      toast.success("تم تحديث حالة المستخدم");
      refetch();
    },
    onError: (error: any) => {
      toast.error(`خطأ: ${error.message}`);
    },
  });

  const deleteUser = trpc.users.delete.useMutation({
    onSuccess: () => {
      toast.success("تم حذف المستخدم");
      refetch();
    },
    onError: (error: any) => {
      toast.error(`خطأ: ${error.message}`);
    },
  });

  const resetForm = () => {
    setFormData({
      name: "",
      email: "",
      password: "",
      phone: "",
      role: "",
      status: "active",
      roleIds: [],
    });
    setShowPassword(false);
  };

  const handleCreateUser = () => {
    if (!formData.name || !formData.email || !formData.password) {
      toast.error("يرجى تعبئة الحقول المطلوبة (الاسم، البريد، كلمة المرور)");
      return;
    }
    if (!formData.role && formData.roleIds.length === 0) {
      toast.error("يرجى اختيار الدور الوظيفي أو دور مخصص");
      return;
    }
    createUser.mutate({
      name: formData.name,
      email: formData.email,
      password: formData.password,
      phone: formData.phone || undefined,
      // only send role if one is explicitly selected; omit it when using custom roles only
      ...(formData.role ? { role: formData.role as any } : {}),
      status: formData.status as any,
      roleIds: formData.roleIds.length > 0 ? formData.roleIds : undefined,
    });
  };

  const handleToggleStatus = (userId: number, currentStatus: string) => {
    const newStatus = currentStatus === "active" ? "suspended" : "active";
    toggleStatus.mutate({ userId, status: newStatus as any });
  };

  const handleDelete = (userId: number, userName: string) => {
    if (confirm(`هل أنت متأكد من حذف المستخدم "${userName}"؟`)) {
      deleteUser.mutate({ id: userId });
    }
  };

  const toggleRoleId = (roleId: string) => {
    setFormData((prev) => {
      const newRoleIds = prev.roleIds.includes(roleId)
        ? prev.roleIds.filter((id) => id !== roleId)
        : [roleId]; // دور مخصص واحد فقط
      return {
        ...prev,
        role: newRoleIds.length > 0 ? "" : prev.role, // إلغاء الدور الأساسي عند اختيار مخصص
        roleIds: newRoleIds,
      };
    });
  };

  // تصفية الأدوار المخصصة فقط (غير النظامية)
  const filteredCustomRoles = customRoles?.filter(
    (r: any) => !r.isSystem && r.id !== 'service_requester'
  ) || [];

  const getRoleBadge = (user: { role: string; customRole?: { id: string; nameAr: string } | null }) => {
    // إذا كان للمستخدم دور مخصص موجود، نستخدم التنسيق الرمادي الفاتح المطور
    if (user.customRole) {
      return (
        <Badge 
          variant="outline" 
          className="bg-[#f9fafb] text-gray-600 border-gray-200 px-3 py-0.5 rounded-full text-[12px] font-medium whitespace-nowrap transition-colors"
        >
          {user.customRole.nameAr}
        </Badge>
      );
    }

    // الأدوار الأساسية الثابتة - تستخدم التنسيق الزمردي الناعم (Soft Emerald)
    const roleMap: Record<string, string> = {
      system_admin: "مدير نظام",
      super_admin: "المدير العام",
      projects_office: "مكتب المشاريع",
      project_manager: "مدير المشاريع",
      financial: "الإدارة المالية",
      field_team: "فريق ميداني",
      quick_response: "فريق الاستجابة السريعة",
      corporate_comm: "الاتصال المؤسسي",
      service_requester: "طالب خدمة",
    };
    const roleLabel = roleMap[user.role] || user.role;

    return (
      <Badge 
        variant="outline" 
        className="bg-[#e6f4f1] text-[#007055] border-emerald-100 px-3 py-0.5 rounded-full text-[12px] font-medium whitespace-nowrap transition-colors"
      >
        {roleLabel}
      </Badge>
    );
  };

  const getStatusBadge = (status: string) => {
    const statusMap: Record<string, { label: string; className: string }> = {
      active: { label: "نشط", className: "bg-green-100 text-green-800 border-green-200" },
      pending: { label: "قيد المراجعة", className: "bg-yellow-100 text-yellow-800 border-yellow-200" },
      suspended: { label: "موقوف", className: "bg-red-100 text-red-800 border-red-200" },
      blocked: { label: "محظور", className: "bg-gray-100 text-gray-800 border-gray-200" },
    };
    const config = statusMap[status] || { label: status, className: "" };
    return (
      <Badge variant="outline" className={config.className}>
        {config.label}
      </Badge>
    );
  };



  if (isLoading && !isPlaceholderData) {
    return (
      <div className="flex flex-col items-center justify-center h-64 gap-4">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
        <p className="text-muted-foreground animate-pulse">جاري تحميل قائمة الموظفين...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        <Card className="p-4 sm:p-6 transition-all hover:shadow-md">
          <div className="text-xl sm:text-2xl font-bold">{totalCount}</div>
          <div className="text-sm text-muted-foreground">إجمالي الموظفين</div>
        </Card>
        <Card className="p-4 sm:p-6 transition-all hover:shadow-md">
          <div className="text-xl sm:text-2xl font-bold text-green-600">
            {usersData?.activeCount ?? "..."}
          </div>
          <div className="text-sm text-muted-foreground">الحسابات النشطة</div>
        </Card>
        <Card className="p-4 sm:p-6 transition-all hover:shadow-md sm:col-span-2 lg:col-span-1">
          <div className="text-xl sm:text-2xl font-bold text-red-600">
            {usersData?.suspendedCount ?? "..."}
          </div>
          <div className="text-sm text-muted-foreground">الحسابات الموقوفة</div>
        </Card>
      </div>

      {/* Search */}
      <div className="relative group">
        <Search className="absolute right-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4 transition-colors group-focus-within:text-primary" />
        <Input
          placeholder="ابحث عن مستخدم بالاسم أو البريد..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="pr-10 h-11"
        />
      </div>

      {/* Users View (Table for desktop, Cards for mobile) */}
      <div className="space-y-4">
        {/* Desktop Table */}
        <Card className="hidden md:block relative overflow-hidden border-sidebar-border/10">
          {isLoading && isPlaceholderData && (
            <div className="absolute inset-0 bg-white/50 z-10 flex items-center justify-center">
              <Loader2 className="w-6 h-6 animate-spin text-primary" />
            </div>
          )}
          <div className="overflow-x-auto">
            <Table>
              <TableHeader className="bg-muted/30">
                <TableRow>
                  <TableHead className="text-right">الاسم</TableHead>
                  <TableHead className="text-right">البريد الإلكتروني</TableHead>
                  <TableHead className="text-right">الدور</TableHead>
                  <TableHead className="text-right">الحالة</TableHead>
                  <TableHead className="text-right">تاريخ الإنشاء</TableHead>
                  <TableHead className="text-left">إجراءات</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {users.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center py-12 text-muted-foreground">
                      {searchQuery ? "لا توجد نتائج للبحث" : "لا يوجد موظفون مسجلون بعد"}
                    </TableCell>
                  </TableRow>
                ) : (
                  users.map((user: any) => (
                    <TableRow key={user.id} className="hover:bg-muted/20 transition-colors">
                      <TableCell className="font-medium">
                        <Link href={`/users/${user.id}`} className="hover:text-primary hover:underline cursor-pointer flex items-center gap-2">
                          <span className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center text-primary text-xs font-bold">
                            {user.name.charAt(0)}
                          </span>
                          {user.name}
                        </Link>
                      </TableCell>
                      <TableCell>{user.email}</TableCell>
                      <TableCell>{getRoleBadge(user)}</TableCell>
                      <TableCell>{getStatusBadge(user.status)}</TableCell>
                      <TableCell>
                        {new Date(user.createdAt).toLocaleDateString("ar-SA")}
                      </TableCell>
                      <TableCell className="text-left">
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                              <MoreVertical className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end" className="w-48">
                            <DropdownMenuItem asChild>
                              <Link href={`/users/${user.id}/edit`}>
                                <Edit className="ml-2 h-4 w-4" />
                                تعديل البيانات
                              </Link>
                            </DropdownMenuItem>
                            {user.id !== currentUser?.id && (
                              <DropdownMenuItem onClick={() => handleToggleStatus(user.id, user.status)}>
                                {user.status === "active" ? (
                                  <><UserX className="ml-2 h-4 w-4" />إيقاف الحساب</>
                                ) : (
                                  <><UserCheck className="ml-2 h-4 w-4" />تنشيط الحساب</>
                                )}
                              </DropdownMenuItem>
                            )}
                            {user.id !== currentUser?.id && (
                              <DropdownMenuItem
                                onClick={() => handleDelete(user.id, user.name)}
                                className="text-destructive focus:text-destructive"
                              >
                                <Trash2 className="ml-2 h-4 w-4" />
                                حذف
                              </DropdownMenuItem>
                            )}
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </Card>

        {/* Mobile Cards View */}
        <div className="md:hidden space-y-4">
          {users.length === 0 ? (
            <Card className="p-8 text-center text-muted-foreground border-dashed">
              {searchQuery ? "لا توجد نتائج للبحث" : "لا يوجد موظفون مسجلون بعد"}
            </Card>
          ) : (
            users.map((user: any) => (
              <Card key={user.id} className="p-4 space-y-4 border-sidebar-border/10 hover:shadow-md transition-all">
                <div className="flex justify-between items-start">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold">
                      {user.name.charAt(0)}
                    </div>
                    <div>
                      <Link href={`/users/${user.id}`} className="font-bold hover:text-primary transition-colors">
                        {user.name}
                      </Link>
                      <div className="text-xs text-muted-foreground">{user.email}</div>
                    </div>
                  </div>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                        <MoreVertical className="h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end" className="w-48">
                      <DropdownMenuItem asChild>
                        <Link href={`/users/${user.id}/edit`}>
                          <Edit className="ml-2 h-4 w-4" />
                          تعديل البيانات
                        </Link>
                      </DropdownMenuItem>
                      {user.id !== currentUser?.id && (
                        <DropdownMenuItem onClick={() => handleToggleStatus(user.id, user.status)}>
                          {user.status === "active" ? (
                            <><UserX className="ml-2 h-4 w-4" />إيقاف الحساب</>
                          ) : (
                            <><UserCheck className="ml-2 h-4 w-4" />تنشيط الحساب</>
                          )}
                        </DropdownMenuItem>
                      )}
                      {user.id !== currentUser?.id && (
                        <DropdownMenuItem
                          onClick={() => handleDelete(user.id, user.name)}
                          className="text-destructive focus:text-destructive"
                        >
                          <Trash2 className="ml-2 h-4 w-4" />
                          حذف
                        </DropdownMenuItem>
                      )}
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
                
                <div className="grid grid-cols-2 gap-4 py-2 border-y border-dashed">
                  <div className="space-y-1">
                    <div className="text-[10px] text-muted-foreground uppercase">الدور</div>
                    <div>{getRoleBadge(user)}</div>
                  </div>
                  <div className="space-y-1">
                    <div className="text-[10px] text-muted-foreground uppercase">الحالة</div>
                    <div>{getStatusBadge(user.status)}</div>
                  </div>
                </div>

                <div className="flex justify-between items-center pt-1">
                  <div className="text-xs text-muted-foreground">
                    تاريخ الإنشاء: {new Date(user.createdAt).toLocaleDateString("ar-SA")}
                  </div>
                  <Link href={`/users/${user.id}`} className="text-xs text-primary font-medium flex items-center gap-1">
                    عرض التفاصيل
                    <ChevronLeft className="h-3 w-3" />
                  </Link>
                </div>
              </Card>
            ))
          )}
        </div>

        {/* Pagination UI */}
        {totalPages > 1 && (
          <div className="py-6 flex justify-center overflow-x-auto">
            <Pagination className="w-auto">
              <PaginationContent className="flex-nowrap gap-1 sm:gap-2">
                <PaginationItem>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setPage((p) => Math.max(1, p - 1))}
                    disabled={page === 1}
                    className="gap-1 h-9 px-2 sm:px-4"
                  >
                    <ChevronRight className="h-4 w-4" />
                    <span className="hidden sm:inline">السابق</span>
                  </Button>
                </PaginationItem>
                
                <div className="flex items-center gap-1">
                  {Array.from({ length: totalPages }, (_, i) => i + 1).map((p) => {
                    // إظهار الصفحات القريبة من الصفحة الحالية فقط إذا كان العدد كبيراً
                    if (totalPages > 5) {
                      if (p !== 1 && p !== totalPages && Math.abs(p - page) > 1) {
                        if (p === 2 && page > 3) return <PaginationItem key={p}><PaginationEllipsis className="w-6" /></PaginationItem>;
                        if (p === totalPages - 1 && page < totalPages - 2) return <PaginationItem key={p}><PaginationEllipsis className="w-6" /></PaginationItem>;
                        return null;
                      }
                    }
                    
                    return (
                      <PaginationItem key={p}>
                        <PaginationLink
                          onClick={() => setPage(p)}
                          isActive={page === p}
                          className="cursor-pointer w-8 h-8 sm:w-9 sm:h-9 text-xs sm:text-sm p-0 flex items-center justify-center"
                        >
                          {p}
                        </PaginationLink>
                      </PaginationItem>
                    );
                  })}
                </div>

                <PaginationItem>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                    disabled={page === totalPages}
                    className="gap-1 h-9 px-2 sm:px-4"
                  >
                    <span className="hidden sm:inline">التالي</span>
                    <ChevronLeft className="h-4 w-4" />
                  </Button>
                </PaginationItem>
              </PaginationContent>
            </Pagination>
          </div>
        )}
      </div>

      {/* Add User Dialog */}
      <Dialog
        open={openAddModal}
        onOpenChange={(open) => {
          setOpenAddModal(open);
          if (!open) resetForm();
        }}
      >
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-xl flex items-center gap-2">
              <UserPlus className="w-5 h-5 text-primary" />
              إضافة مستخدم جديد
            </DialogTitle>
            <DialogDescription>
              أدخل بيانات الموظف الجديد وحدد صلاحياته
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-6 py-2">
            {/* Basic Info */}
            <div>
              <h3 className="font-semibold text-sm text-muted-foreground uppercase tracking-wide mb-3">
                البيانات الأساسية والصلاحيات
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <Label htmlFor="new-name">
                    الاسم الكامل <span className="text-destructive">*</span>
                  </Label>
                  <Input
                    id="new-name"
                    placeholder="أدخل الاسم الكامل"
                    value={formData.name}
                    onChange={(e) => setFormData((p) => ({ ...p, name: e.target.value }))}
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="new-email">
                    البريد الإلكتروني <span className="text-destructive">*</span>
                  </Label>
                  <Input
                    id="new-email"
                    type="email"
                    placeholder="example@domain.com"
                    dir="ltr"
                    value={formData.email}
                    onChange={(e) => setFormData((p) => ({ ...p, email: e.target.value }))}
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="new-password">
                    كلمة المرور <span className="text-destructive">*</span>
                  </Label>
                  <div className="relative">
                    <Input
                      id="new-password"
                      type={showPassword ? "text" : "password"}
                      placeholder="6 أحرف على الأقل"
                      dir="ltr"
                      value={formData.password}
                      onChange={(e) => setFormData((p) => ({ ...p, password: e.target.value }))}
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                    >
                      {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="new-phone">رقم الجوال</Label>
                  <Input
                    id="new-phone"
                    placeholder="05xxxxxxxx"
                    dir="ltr"
                    value={formData.phone}
                    onChange={(e) => setFormData((p) => ({ ...p, phone: e.target.value }))}
                  />
                </div>
                <div className="space-y-1.5">
                  <Label>الدور الوظيفي</Label>
                  <Select
                    value={formData.role || undefined}
                    onValueChange={(v) => setFormData((p) => ({ ...p, role: v, roleIds: [] }))}
                    disabled={formData.roleIds.length > 0}
                  >
                    <SelectTrigger className={formData.roleIds.length > 0 ? "opacity-40" : ""}>
                      <SelectValue placeholder="اختر الدور الوظيفي" />
                    </SelectTrigger>
                    <SelectContent>
                      {ROLE_OPTIONS.map((opt) => (
                        <SelectItem key={opt.value} value={opt.value}>
                          {opt.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {formData.roleIds.length > 0 && (
                    <p className="text-xs text-amber-600">تم تعطيل هذا الحقل لأنه تم اختيار دور مخصص</p>
                  )}
                </div>
                <div className="space-y-1.5">
                  <Label>حالة الحساب</Label>
                  <Select
                    value={formData.status}
                    onValueChange={(v) => setFormData((p) => ({ ...p, status: v }))}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="اختر الحالة" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="active">نشط</SelectItem>
                      <SelectItem value="suspended">موقوف</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </div>

            {/* Custom Roles */}
            {filteredCustomRoles.length > 0 && (
              <div className={formData.role ? "opacity-50" : ""}>
                <div className="flex items-center justify-between mb-3">
                  <h3 className="font-semibold text-sm text-muted-foreground uppercase tracking-wide">
                    أو اختر دوراً مخصصاً
                  </h3>
                  {formData.role && (
                    <p className="text-xs text-amber-600">أزِل الدور الأساسي أولاً لتفعيل هذا القسم</p>
                  )}
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-2 border rounded-lg p-3 bg-muted/30">
                  {filteredCustomRoles.map((role: any) => (
                    <label
                      key={role.id}
                      htmlFor={`custom-role-${role.id}`}
                      className={`flex items-center gap-3 p-3 rounded-lg border cursor-pointer transition-all select-none ${
                        formData.roleIds.includes(role.id)
                          ? "bg-primary/5 border-primary/30"
                          : "bg-background hover:bg-muted/50 border-transparent"
                      } ${formData.role ? "pointer-events-none" : ""}`}
                    >
                      <Checkbox
                        id={`custom-role-${role.id}`}
                        checked={formData.roleIds.includes(role.id)}
                        onCheckedChange={() => toggleRoleId(role.id)}
                        disabled={!!formData.role}
                        className="pointer-events-none"
                      />
                      <span className="text-sm font-medium truncate">{role.nameAr}</span>
                    </label>
                  ))}
                </div>
              </div>
            )}
          </div>

          <DialogFooter className="gap-2 flex-row-reverse">
            <Button
              onClick={handleCreateUser}
              disabled={createUser.isPending}
              className="gradient-primary text-white"
            >
              {createUser.isPending ? (
                <Loader2 className="w-4 h-4 ml-2 animate-spin" />
              ) : (
                <UserPlus className="w-4 h-4 ml-2" />
              )}
              إنشاء الحساب
            </Button>
            <Button
              variant="outline"
              onClick={() => { setOpenAddModal(false); resetForm(); }}
              disabled={createUser.isPending}
            >
              إلغاء
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

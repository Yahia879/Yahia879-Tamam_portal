import { useState } from "react";
import { trpc } from "../lib/trpc";
import { Button } from "../components/ui/button";
import { Card } from "../components/ui/card";
import { Input } from "../components/ui/input";
import { Label } from "../components/ui/label";
import { Textarea } from "../components/ui/textarea";
import { Badge } from "../components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "../components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "../components/ui/alert-dialog";
import { Switch } from "../components/ui/switch";
import { Briefcase, Plus, Pencil, Trash2, ArrowRight, Loader2, Database } from "lucide-react";
import { toast } from "sonner";
import { useLocation } from "wouter";
import DashboardLayout from "../components/DashboardLayout";

type JobPosition = {
  id: number;
  nameAr: string;
  nameEn?: string | null;
  description?: string | null;
  isActive: boolean;
  sortOrder?: number | null;
};

export default function JobPositions() {
  const [, setLocation] = useLocation();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingPosition, setEditingPosition] = useState<JobPosition | null>(null);
  const [deleteId, setDeleteId] = useState<number | null>(null);

  const [nameAr, setNameAr] = useState("");
  const [nameEn, setNameEn] = useState("");
  const [description, setDescription] = useState("");
  const [sortOrder, setSortOrder] = useState(0);

  const utils = trpc.useUtils();

  const { data: positions, isLoading } = trpc.jobPositions.getAll.useQuery();

  const createMutation = trpc.jobPositions.create.useMutation({
    onSuccess: () => {
      toast.success("تم إضافة الدور الوظيفي بنجاح");
      utils.jobPositions.getAll.invalidate();
      utils.jobPositions.getActive.invalidate();
      handleCloseDialog();
    },
    onError: (e) => toast.error(e.message || "فشل الإضافة"),
  });

  const updateMutation = trpc.jobPositions.update.useMutation({
    onSuccess: () => {
      toast.success("تم تحديث الدور الوظيفي بنجاح");
      utils.jobPositions.getAll.invalidate();
      utils.jobPositions.getActive.invalidate();
      handleCloseDialog();
    },
    onError: (e) => toast.error(e.message || "فشل التحديث"),
  });

  const deleteMutation = trpc.jobPositions.delete.useMutation({
    onSuccess: () => {
      toast.success("تم حذف الدور الوظيفي");
      utils.jobPositions.getAll.invalidate();
      utils.jobPositions.getActive.invalidate();
      setDeleteId(null);
    },
    onError: (e) => toast.error(e.message || "فشل الحذف"),
  });

  const seedMutation = trpc.jobPositions.seed.useMutation({
    onSuccess: (data) => {
      toast.success(`تم إضافة ${data.count} دور وظيفي افتراضي`);
      utils.jobPositions.getAll.invalidate();
      utils.jobPositions.getActive.invalidate();
    },
    onError: (e) => toast.error(e.message || "فشل الإضافة"),
  });

  const toggleActiveMutation = trpc.jobPositions.update.useMutation({
    onSuccess: () => {
      utils.jobPositions.getAll.invalidate();
      utils.jobPositions.getActive.invalidate();
    },
  });

  const handleOpenNew = () => {
    setEditingPosition(null);
    setNameAr("");
    setNameEn("");
    setDescription("");
    setSortOrder(0);
    setIsDialogOpen(true);
  };

  const handleOpenEdit = (pos: JobPosition) => {
    setEditingPosition(pos);
    setNameAr(pos.nameAr);
    setNameEn(pos.nameEn ?? "");
    setDescription(pos.description ?? "");
    setSortOrder(pos.sortOrder ?? 0);
    setIsDialogOpen(true);
  };

  const handleCloseDialog = () => {
    setIsDialogOpen(false);
    setEditingPosition(null);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (editingPosition) {
      updateMutation.mutate({ id: editingPosition.id, nameAr, nameEn: nameEn || undefined, description: description || undefined, sortOrder });
    } else {
      createMutation.mutate({ nameAr, nameEn: nameEn || undefined, description: description || undefined, sortOrder });
    }
  };

  const isPending = createMutation.isPending || updateMutation.isPending;

  return (
    <DashboardLayout>
      <div className="container py-6 sm:py-8 max-w-4xl px-4">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center gap-4 mb-6 sm:mb-8 bg-card/50 p-4 rounded-xl border border-sidebar-border/10 shadow-sm">
          <div className="flex items-center gap-3">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setLocation("/users")}
              className="gap-1 text-muted-foreground hover:text-foreground h-9 px-2 sm:px-3"
            >
              <ArrowRight className="h-4 w-4" />
              <span className="hidden xs:inline">رجوع</span>
            </Button>
            <div className="p-2 bg-primary/10 rounded-lg">
              <Briefcase className="h-5 w-5 sm:h-6 sm:w-6 text-primary" />
            </div>
            <div className="flex-1 min-w-0">
              <h1 className="text-xl sm:text-2xl font-bold truncate">الأدوار الوظيفية</h1>
              <p className="text-muted-foreground text-xs sm:text-sm truncate">إدارة قائمة الأدوار الوظيفية</p>
            </div>
          </div>
          
          <div className="flex flex-wrap gap-2 items-center sm:mr-auto">
            {(!positions || positions.length === 0) && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => seedMutation.mutate()}
                disabled={seedMutation.isPending}
                className="flex-1 sm:flex-none"
              >
                {seedMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin ml-1" /> : <Database className="h-4 w-4 ml-1" />}
                إضافة الافتراضية
              </Button>
            )}
            <Button onClick={handleOpenNew} className="flex-1 sm:flex-none gradient-primary text-white">
              <Plus className="h-4 w-4 ml-1" />
              دور جديد
            </Button>
          </div>
        </div>

        {/* Content */}
        {isLoading ? (
          <div className="flex flex-col items-center justify-center py-20 gap-4">
            <Loader2 className="h-10 w-10 animate-spin text-primary" />
            <p className="text-muted-foreground animate-pulse">جاري تحميل الأدوار...</p>
          </div>
        ) : !positions || positions.length === 0 ? (
          <Card className="p-8 sm:p-12 text-center border-dashed border-2">
            <Briefcase className="h-12 w-12 text-muted-foreground/30 mx-auto mb-4" />
            <h3 className="text-lg font-semibold mb-2">لا توجد أدوار وظيفية</h3>
            <p className="text-muted-foreground mb-6 text-sm max-w-sm mx-auto">أضف الأدوار الوظيفية التي سيتم تعيينها للموظفين لتنظيم الهيكل التنظيمي</p>
            <div className="flex flex-col sm:flex-row gap-3 justify-center">
              <Button variant="outline" onClick={() => seedMutation.mutate()} disabled={seedMutation.isPending}>
                {seedMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin ml-1" /> : <Database className="h-4 w-4 ml-1" />}
                إضافة الأدوار الافتراضية
              </Button>
              <Button onClick={handleOpenNew} className="gradient-primary text-white">
                <Plus className="h-4 w-4 ml-1" />
                إضافة دور جديد
              </Button>
            </div>
          </Card>
        ) : (
          <div className="space-y-3">
            {positions.map((pos) => (
              <Card key={pos.id} className="p-3 sm:p-4 flex items-center gap-3 sm:gap-4 hover:shadow-md transition-all border-sidebar-border/10">
                <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold text-xs sm:text-sm flex-shrink-0">
                  {pos.sortOrder ?? "—"}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
                    <span className="font-bold text-sm sm:text-base">{pos.nameAr}</span>
                    {pos.nameEn && <span className="text-muted-foreground text-xs sm:text-sm">({pos.nameEn})</span>}
                    <Badge variant={pos.isActive ? "default" : "secondary"} className="text-[10px] sm:text-xs h-5 px-1.5 sm:px-2">
                      {pos.isActive ? "نشط" : "معطّل"}
                    </Badge>
                  </div>
                  {pos.description && (
                    <p className="text-xs sm:text-sm text-muted-foreground mt-1 line-clamp-1 sm:line-clamp-2">{pos.description}</p>
                  )}
                </div>
                <div className="flex items-center gap-1 sm:gap-2 flex-shrink-0">
                  <Switch
                    checked={pos.isActive}
                    onCheckedChange={(checked) =>
                      toggleActiveMutation.mutate({ id: pos.id, isActive: checked })
                    }
                    className="scale-75 sm:scale-100"
                  />
                  <Button variant="ghost" size="icon" onClick={() => handleOpenEdit(pos)} className="h-8 w-8 sm:h-10 sm:w-10">
                    <Pencil className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="text-destructive hover:text-destructive h-8 w-8 sm:h-10 sm:w-10"
                    onClick={() => setDeleteId(pos.id)}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </Card>
            ))}
          </div>
        )}
      </div>

      {/* Dialog إضافة/تعديل */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="w-[95vw] max-w-md rounded-xl p-4 sm:p-6 overflow-y-auto max-h-[90vh]">
          <DialogHeader>
            <DialogTitle className="text-right">{editingPosition ? "تعديل الدور الوظيفي" : "إضافة دور وظيفي جديد"}</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4 py-2">
            <div className="space-y-2">
              <Label htmlFor="nameAr">الاسم بالعربية *</Label>
              <Input
                id="nameAr"
                value={nameAr}
                onChange={(e) => setNameAr(e.target.value)}
                required
                placeholder="مثال: مدير المشاريع"
                className="h-11"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="nameEn">الاسم بالإنجليزية</Label>
              <Input
                id="nameEn"
                value={nameEn}
                onChange={(e) => setNameEn(e.target.value)}
                placeholder="Example: Project Manager"
                className="h-11"
                dir="ltr"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="description">الوصف</Label>
              <Textarea
                id="description"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="وصف مختصر للدور"
                rows={3}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="sortOrder">ترتيب العرض</Label>
              <Input
                id="sortOrder"
                type="number"
                value={sortOrder}
                onChange={(e) => setSortOrder(Number(e.target.value))}
                min={0}
                className="h-11"
              />
            </div>
            <DialogFooter className="flex flex-col-reverse sm:flex-row gap-2 mt-6">
              <Button type="button" variant="outline" onClick={handleCloseDialog} className="w-full sm:w-auto">إلغاء</Button>
              <Button type="submit" disabled={isPending} className="w-full sm:w-auto gradient-primary text-white">
                {isPending && <Loader2 className="h-4 w-4 animate-spin ml-1" />}
                {editingPosition ? "حفظ التغييرات" : "إضافة الدور"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* تأكيد الحذف */}
      <AlertDialog open={deleteId !== null} onOpenChange={() => setDeleteId(null)}>
        <AlertDialogContent className="w-[90vw] max-w-md rounded-xl p-6">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-right">تأكيد الحذف</AlertDialogTitle>
            <AlertDialogDescription className="text-right">
              هل أنت متأكد من حذف هذا الدور الوظيفي؟ لا يمكن التراجع عن هذا الإجراء.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="flex flex-col-reverse sm:flex-row-reverse gap-2 mt-4">
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90 w-full sm:w-auto"
              onClick={() => deleteId && deleteMutation.mutate({ id: deleteId })}
            >
              حذف الدور
            </AlertDialogAction>
            <AlertDialogCancel className="w-full sm:w-auto">إلغاء</AlertDialogCancel>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </DashboardLayout>
  );
}

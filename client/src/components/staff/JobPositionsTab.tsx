import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Switch } from "@/components/ui/switch";
import { Briefcase, Plus, Pencil, Trash2, Loader2, Database } from "lucide-react";
import { toast } from "sonner";

type JobPosition = {
  id: number;
  nameAr: string;
  nameEn?: string | null;
  description?: string | null;
  isActive: boolean;
  sortOrder?: number | null;
};

export interface JobPositionsTabProps {
  openAddModal: boolean;
  setOpenAddModal: (open: boolean) => void;
}

export default function JobPositionsTab({ openAddModal, setOpenAddModal }: JobPositionsTabProps) {
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

  const handleOpenEdit = (pos: JobPosition) => {
    setEditingPosition(pos);
    setNameAr(pos.nameAr);
    setNameEn(pos.nameEn ?? "");
    setDescription(pos.description ?? "");
    setSortOrder(pos.sortOrder ?? 0);
    setOpenAddModal(true);
  };

  const handleCloseDialog = () => {
    setOpenAddModal(false);
    setEditingPosition(null);
    setNameAr("");
    setNameEn("");
    setDescription("");
    setSortOrder(0);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (editingPosition) {
      updateMutation.mutate({ id: editingPosition.id, nameAr, nameEn: nameEn || undefined, description: description || undefined, sortOrder });
    } else {
      createMutation.mutate({ nameAr, nameEn: nameEn || undefined, description: description || undefined, sortOrder });
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Seed Actions */}
      {(!positions || positions.length === 0) && (
        <Card className="p-8 text-center border-dashed">
           <Database className="h-10 w-10 text-muted-foreground mx-auto mb-4" />
           <p className="text-muted-foreground mb-4">لا توجد أدوار وظيفية مسجلة. يمكنك البدء بإضافة الأدوار الافتراضية.</p>
           <Button
              variant="outline"
              onClick={() => seedMutation.mutate()}
              disabled={seedMutation.isPending}
            >
              {seedMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin ml-1" /> : <Plus className="h-4 w-4 ml-1" />}
              إضافة الأدوار الافتراضية
            </Button>
        </Card>
      )}

      {/* Positions List */}
      <div className="grid gap-3">
        {positions?.map((pos) => (
          <Card key={pos.id} className="p-4 flex items-center gap-4">
            <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold text-sm flex-shrink-0">
              {pos.sortOrder ?? "—"}
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <span className="font-medium">{pos.nameAr}</span>
                {pos.nameEn && <span className="text-muted-foreground text-sm">({pos.nameEn})</span>}
                <Badge variant={pos.isActive ? "default" : "secondary"} className="text-xs">
                  {pos.isActive ? "نشط" : "معطّل"}
                </Badge>
              </div>
              {pos.description && (
                <p className="text-sm text-muted-foreground mt-0.5 truncate">{pos.description}</p>
              )}
            </div>
            <div className="flex items-center gap-2 flex-shrink-0">
              <Switch
                checked={pos.isActive}
                onCheckedChange={(checked) =>
                  toggleActiveMutation.mutate({ id: pos.id, isActive: checked })
                }
              />
              <Button variant="ghost" size="icon" onClick={() => handleOpenEdit(pos)}>
                <Pencil className="h-4 w-4" />
              </Button>
              <Button
                variant="ghost"
                size="icon"
                className="text-destructive hover:text-destructive"
                onClick={() => setDeleteId(pos.id)}
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            </div>
          </Card>
        ))}
      </div>

      {/* Dialog إضافة/تعديل */}
      <Dialog open={openAddModal} onOpenChange={(open) => { if(!open) handleCloseDialog(); else setOpenAddModal(true); }}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>{editingPosition ? "تعديل الدور الوظيفي" : "إضافة دور وظيفي جديد"}</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <Label htmlFor="nameAr">الاسم بالعربية *</Label>
              <Input
                id="nameAr"
                value={nameAr}
                onChange={(e) => setNameAr(e.target.value)}
                required
                placeholder="مثال: مدير المشاريع"
              />
            </div>
            <div>
              <Label htmlFor="nameEn">الاسم بالإنجليزية</Label>
              <Input
                id="nameEn"
                value={nameEn}
                onChange={(e) => setNameEn(e.target.value)}
                placeholder="Example: Project Manager"
              />
            </div>
            <div>
              <Label htmlFor="description">الوصف</Label>
              <Textarea
                id="description"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="وصف مختصر للدور"
                rows={2}
              />
            </div>
            <div>
              <Label htmlFor="sortOrder">ترتيب العرض</Label>
              <Input
                id="sortOrder"
                type="number"
                value={sortOrder}
                onChange={(e) => setSortOrder(Number(e.target.value))}
                min={0}
              />
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={handleCloseDialog}>إلغاء</Button>
              <Button type="submit" disabled={createMutation.isPending || updateMutation.isPending}>
                {(createMutation.isPending || updateMutation.isPending) && <Loader2 className="h-4 w-4 animate-spin ml-1" />}
                {editingPosition ? "حفظ التغييرات" : "إضافة"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* تأكيد الحذف */}
      <AlertDialog open={deleteId !== null} onOpenChange={() => setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>تأكيد الحذف</AlertDialogTitle>
            <AlertDialogDescription>
              هل أنت متأكد من حذف هذا الدور الوظيفي؟ لا يمكن التراجع عن هذا الإجراء.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>إلغاء</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={() => deleteId && deleteMutation.mutate({ id: deleteId })}
            >
              حذف
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

import { useState, useEffect } from "react";
import { Link } from "wouter";
import { trpc } from "@/lib/trpc";
import DashboardLayout from "@/components/DashboardLayout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { toast } from "sonner";
import { 
  Settings, 
  Plus,
  Edit,
  Trash2,
  Save,
  X,
  Loader2,
  GripVertical,
  ArrowRight,
  CheckCircle,
  Circle,
  RotateCcw,
  ChevronDown,
  ChevronUp
} from "lucide-react";
import { REQUEST_STAGES } from "../../../shared/constants";

// تحويل REQUEST_STAGES إلى مصفوفة STAGES
const STAGES = Object.values(REQUEST_STAGES).map(stage => ({
  code: stage.key,
  label: stage.name,
}));
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";

// أنواع العلاقات
const RELATION_TYPES = [
  { value: "before", label: "يجب أن يكون قبله", color: "text-blue-600" },
  { value: "after", label: "يجب أن يكون بعده", color: "text-green-600" },
  { value: "concurrent", label: "يتزامن معه", color: "text-purple-600" },
  { value: "independent", label: "غير مرتبط", color: "text-gray-600" },
];

// الأدوار المتاحة
const AVAILABLE_ROLES = [
  { value: "system_admin", label: "مدير نظام" },
  { value: "financial_manager", label: "المدير المالي" },
  { value: "projects_office", label: "مكتب المشاريع" },
  { value: "field_team", label: "الفريق الميداني" },
  { value: "quick_response", label: "فريق الاستجابة السريعة" },
  { value: "financial", label: "الإدارة المالية" },
  { value: "project_manager", label: "مدير المشروع" },
  { value: "corporate_comm", label: "الاتصال المؤسسي" },
];

interface ActionForm {
  id?: number;
  actionCode: string;
  actionLabel: string;
  actionDescription: string;
  parentStage: string;
  order: number;
  route: string;
  requiredRoles: string[];
  prerequisiteAction: string;
  nextAction: string;
  relationWithNext: "before" | "after" | "concurrent" | "independent";
  isActive: boolean;
}

export default function ActionSettings() {
  const [expandedStages, setExpandedStages] = useState<Set<string>>(new Set());
  const [editingAction, setEditingAction] = useState<ActionForm | null>(null);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [selectedStage, setSelectedStage] = useState<string | null>(null);

  const { data: actions, isLoading, refetch } = trpc.actions.getAll.useQuery();
  
  const initializeMutation = trpc.actions.initializeDefaults.useMutation({
    onSuccess: (data) => {
      if (data.success) {
        toast.success(data.message);
        refetch();
      } else {
        toast.info(data.message);
      }
    },
    onError: (error) => {
      toast.error(error.message);
    }
  });

  const createMutation = trpc.actions.create.useMutation({
    onSuccess: () => {
      toast.success("تم إنشاء الإجراء بنجاح");
      setIsDialogOpen(false);
      setEditingAction(null);
      refetch();
    },
    onError: (error) => {
      toast.error(error.message);
    }
  });

  const updateMutation = trpc.actions.update.useMutation({
    onSuccess: () => {
      toast.success("تم تحديث الإجراء بنجاح");
      setIsDialogOpen(false);
      setEditingAction(null);
      refetch();
    },
    onError: (error) => {
      toast.error(error.message);
    }
  });

  const deleteMutation = trpc.actions.delete.useMutation({
    onSuccess: () => {
      toast.success("تم حذف الإجراء بنجاح");
      refetch();
    },
    onError: (error) => {
      toast.error(error.message);
    }
  });

  const toggleExpanded = (stageCode: string) => {
    setExpandedStages(prev => {
      const newSet = new Set(prev);
      if (newSet.has(stageCode)) {
        newSet.delete(stageCode);
      } else {
        newSet.add(stageCode);
      }
      return newSet;
    });
  };

  const getActionsByStage = (stageCode: string) => {
    if (!actions) return [];
    return actions.filter((a: any) => a.parentStage === stageCode).sort((a: any, b: any) => a.order - b.order);
  };

  const handleEdit = (action: any) => {
    setEditingAction({
      id: action.id,
      actionCode: action.actionCode,
      actionLabel: action.actionLabel,
      actionDescription: action.actionDescription || "",
      parentStage: action.parentStage,
      order: action.order,
      route: action.route || "",
      requiredRoles: action.requiredRoles || [],
      prerequisiteAction: action.prerequisiteAction || "",
      nextAction: action.nextAction || "",
      relationWithNext: action.relationWithNext || "after",
      isActive: action.isActive ?? true,
    });
    setIsDialogOpen(true);
  };

  const handleCreate = (stageCode: string) => {
    const stageActions = getActionsByStage(stageCode);
    const maxOrder = stageActions.length > 0 ? Math.max(...stageActions.map((a: any) => a.order)) : 0;
    
    setEditingAction({
      actionCode: "",
      actionLabel: "",
      actionDescription: "",
      parentStage: stageCode,
      order: maxOrder + 1,
      route: "",
      requiredRoles: [],
      prerequisiteAction: "",
      nextAction: "",
      relationWithNext: "after",
      isActive: true,
    });
    setSelectedStage(stageCode);
    setIsDialogOpen(true);
  };

  const handleSave = () => {
    if (!editingAction) return;

    if (editingAction.id) {
      // تحديث
      updateMutation.mutate({
        id: editingAction.id,
        data: {
          actionCode: editingAction.actionCode,
          actionLabel: editingAction.actionLabel,
          actionDescription: editingAction.actionDescription,
          parentStage: editingAction.parentStage,
          order: editingAction.order,
          route: editingAction.route,
          requiredRoles: editingAction.requiredRoles,
          prerequisiteAction: editingAction.prerequisiteAction,
          nextAction: editingAction.nextAction,
          relationWithNext: editingAction.relationWithNext,
          isActive: editingAction.isActive,
        }
      });
    } else {
      // إنشاء جديد
      createMutation.mutate(editingAction);
    }
  };

  const handleDelete = (id: number) => {
    if (confirm("هل أنت متأكد من حذف هذا الإجراء؟")) {
      deleteMutation.mutate({ id });
    }
  };

  const getRelationLabel = (relationType: string) => {
    const relation = RELATION_TYPES.find(r => r.value === relationType);
    return relation ? relation.label : relationType;
  };

  const getRelationColor = (relationType: string) => {
    const relation = RELATION_TYPES.find(r => r.value === relationType);
    return relation ? relation.color : "text-gray-600";
  };

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <Link href="/settings">
              <Button variant="ghost" size="icon" type="button">
                <ArrowRight className="w-5 h-5" />
              </Button>
            </Link>
            <div>
              <h1 className="text-xl sm:text-2xl font-bold flex items-center gap-2">
                <Settings className="h-5 w-5 sm:h-6 sm:w-6 text-primary" />
                إعدادات الإجراءات
              </h1>
              <p className="text-xs sm:text-sm text-muted-foreground mt-1">
                إدارة الإجراءات لكل مرحلة وتحديد العلاقات بينها
              </p>
            </div>
          </div>
          <Button 
            onClick={() => initializeMutation.mutate()}
            disabled={initializeMutation.isPending}
            variant="outline"
            className="w-full sm:w-auto text-xs sm:text-sm h-9"
          >
            {initializeMutation.isPending ? (
              <Loader2 className="h-4 w-4 animate-spin ml-2" />
            ) : (
              <RotateCcw className="h-4 w-4 ml-2" />
            )}
            تهيئة الإجراءات الافتراضية
          </Button>
        </div>

        {/* Legend */}
        <Card className="border-0 shadow-sm">
          <CardHeader className="p-4 sm:p-6 pb-2 sm:pb-3">
            <CardTitle className="text-base sm:text-lg font-bold">دليل العلاقات</CardTitle>
          </CardHeader>
          <CardContent className="p-4 sm:p-6 pt-0">
            <div className="flex flex-wrap gap-x-6 gap-y-3">
              {RELATION_TYPES.map(relation => (
                <div key={relation.value} className="flex items-center gap-2">
                  <ArrowRight className={`h-3.5 w-3.5 sm:h-4 sm:w-4 ${relation.color}`} />
                  <span className="text-xs sm:text-sm">{relation.label}</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Stages List */}
        {isLoading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        ) : (
          <div className="grid gap-4">
            {STAGES.map((stage: any, stageIndex: number) => {
              const stageActions = getActionsByStage(stage.code);
              const isExpanded = expandedStages.has(stage.code);

              return (
                <Card key={stage.code} className="border-0 shadow-sm overflow-hidden">
                  <CardHeader className="p-4 sm:p-6 pb-3">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                      <div className="flex items-start gap-3">
                        <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold shrink-0">
                          {stageIndex + 1}
                        </div>
                        <div className="min-w-0">
                          <CardTitle className="text-base sm:text-lg font-bold flex flex-wrap items-center gap-2">
                            {stage.label}
                            <Badge variant="secondary" className="text-[10px] sm:text-xs">
                              {stageActions.length} إجراء
                            </Badge>
                          </CardTitle>
                          <CardDescription className="text-xs sm:text-sm truncate">
                            {stage.code}
                          </CardDescription>
                        </div>
                      </div>
                      <div className="flex items-center gap-2 justify-end">
                        <Button 
                          variant="outline" 
                          size="sm" 
                          onClick={() => handleCreate(stage.code)}
                          className="h-8 text-xs sm:text-sm px-3"
                        >
                          <Plus className="h-4 w-4 ml-2" />
                          إضافة إجراء
                        </Button>
                        <Button 
                          variant="ghost" 
                          size="sm" 
                          onClick={() => toggleExpanded(stage.code)}
                          className="h-8 w-8 p-0"
                        >
                          {isExpanded ? (
                            <ChevronUp className="h-4 w-4" />
                          ) : (
                            <ChevronDown className="h-4 w-4" />
                          )}
                        </Button>
                      </div>
                    </div>
                  </CardHeader>
                  
                  {isExpanded && (
                    <CardContent className="p-4 sm:p-6 pt-0">
                      {stageActions.length === 0 ? (
                        <div className="text-center py-8 text-muted-foreground text-xs sm:text-sm">
                          لا توجد إجراءات لهذه المرحلة
                        </div>
                      ) : (
                        <div className="space-y-3">
                          {stageActions.map((action: any, index: number) => (
                            <div 
                              key={action.id} 
                              className="flex items-start gap-2 sm:gap-3 p-3 sm:p-4 border rounded-lg hover:bg-accent/50 transition-colors"
                            >
                              <GripVertical className="h-4 w-4 sm:h-5 sm:w-5 text-muted-foreground mt-1 cursor-move shrink-0" />
                              
                              <div className="flex-1 min-w-0 space-y-2">
                                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                                  <div className="flex items-center gap-2 flex-wrap min-w-0">
                                    <span className="text-xs sm:text-sm font-medium text-muted-foreground shrink-0">
                                      {action.order}.
                                    </span>
                                    <h4 className="font-semibold text-sm sm:text-base truncate">{action.actionLabel}</h4>
                                    {action.isActive ? (
                                      <Badge variant="outline" className="text-[9px] sm:text-[10px] text-green-600 border-green-600 px-1.5 py-0">
                                        <CheckCircle className="h-2.5 w-2.5 ml-1" />
                                        نشط
                                      </Badge>
                                    ) : (
                                      <Badge variant="outline" className="text-[9px] sm:text-[10px] text-gray-400 px-1.5 py-0">
                                        <Circle className="h-2.5 w-2.5 ml-1" />
                                        غير نشط
                                      </Badge>
                                    )}
                                  </div>
                                  <div className="flex items-center gap-1 self-end sm:self-auto">
                                    <Button 
                                      variant="ghost" 
                                      size="sm" 
                                      onClick={() => handleEdit(action)}
                                      className="h-8 w-8 p-0"
                                    >
                                      <Edit className="h-4 w-4" />
                                    </Button>
                                    <Button 
                                      variant="ghost" 
                                      size="sm" 
                                      onClick={() => handleDelete(action.id)}
                                      className="h-8 w-8 p-0 text-red-600 hover:text-red-700"
                                    >
                                      <Trash2 className="h-4 w-4" />
                                    </Button>
                                  </div>
                                </div>
                                
                                {action.actionDescription && (
                                  <p className="text-xs sm:text-sm text-muted-foreground line-clamp-2">
                                    {action.actionDescription}
                                  </p>
                                )}
                                
                                <div className="flex flex-wrap gap-2 text-[10px] sm:text-xs">
                                  {action.prerequisiteAction && (
                                    <Badge variant="outline" className="text-blue-600 px-1.5 py-0">
                                      يتطلب: {action.prerequisiteAction}
                                    </Badge>
                                  )}
                                  {action.nextAction && (
                                    <Badge variant="outline" className={`${getRelationColor(action.relationWithNext || "after")} px-1.5 py-0`}>
                                      {getRelationLabel(action.relationWithNext || "after")}: {action.nextAction}
                                    </Badge>
                                  )}
                                  {action.requiredRoles && action.requiredRoles.length > 0 && (
                                    <Badge variant="secondary" className="px-1.5 py-0">
                                      {action.requiredRoles.length} صلاحية
                                    </Badge>
                                  )}
                                </div>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </CardContent>
                  )}
                </Card>
              );
            })}
          </div>
        )}

        {/* Edit/Create Dialog */}
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogContent className="w-[95vw] max-w-2xl max-h-[90vh] overflow-y-auto p-4 sm:p-6">
            <DialogHeader>
              <DialogTitle className="text-lg sm:text-xl">
                {editingAction?.id ? "تعديل الإجراء" : "إضافة إجراء جديد"}
              </DialogTitle>
              <DialogDescription className="text-xs sm:text-sm">
                قم بتعديل معلومات الإجراء والعلاقات بينه وبين الإجراءات الأخرى
              </DialogDescription>
            </DialogHeader>
            
            {editingAction && (
              <div className="space-y-4 py-2">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label className="text-xs sm:text-sm">رمز الإجراء *</Label>
                    <Input
                      value={editingAction.actionCode}
                      onChange={(e) => setEditingAction({ ...editingAction, actionCode: e.target.value })}
                      placeholder="schedule_visit"
                      className="h-9 text-sm"
                    />
                  </div>
                  
                  <div className="space-y-2">
                    <Label className="text-xs sm:text-sm">عنوان الإجراء *</Label>
                    <Input
                      value={editingAction.actionLabel}
                      onChange={(e) => setEditingAction({ ...editingAction, actionLabel: e.target.value })}
                      placeholder="جدولة الزيارة الميدانية"
                      className="h-9 text-sm"
                    />
                  </div>
                </div>
                
                <div className="space-y-2">
                  <Label className="text-xs sm:text-sm">الوصف</Label>
                  <Input
                    value={editingAction.actionDescription}
                    onChange={(e) => setEditingAction({ ...editingAction, actionDescription: e.target.value })}
                    placeholder="وصف الإجراء..."
                    className="h-9 text-sm"
                  />
                </div>
                
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label className="text-xs sm:text-sm">المرحلة المرتبطة</Label>
                    <Select
                      value={editingAction.parentStage}
                      onValueChange={(value) => setEditingAction({ ...editingAction, parentStage: value })}
                    >
                      <SelectTrigger className="h-9 text-sm">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {STAGES.map((stage: any) => (
                          <SelectItem key={stage.code} value={stage.code}>
                            {stage.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  
                  <div className="space-y-2">
                    <Label className="text-xs sm:text-sm">الترتيب</Label>
                    <Input
                      type="number"
                      value={editingAction.order}
                      onChange={(e) => setEditingAction({ ...editingAction, order: parseInt(e.target.value) || 0 })}
                      className="h-9 text-sm"
                    />
                  </div>
                </div>
                
                <div className="space-y-2">
                  <Label className="text-xs sm:text-sm">المسار (Route)</Label>
                  <Input
                    value={editingAction.route}
                    onChange={(e) => setEditingAction({ ...editingAction, route: e.target.value })}
                    placeholder="/field-visit/schedule"
                    className="h-9 text-sm"
                  />
                </div>
                
                <div className="space-y-2">
                  <Label className="text-xs sm:text-sm">الإجراء السابق المطلوب</Label>
                  <Input
                    value={editingAction.prerequisiteAction}
                    onChange={(e) => setEditingAction({ ...editingAction, prerequisiteAction: e.target.value })}
                    placeholder="assign_field_team"
                    className="h-9 text-sm"
                  />
                </div>
                
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label className="text-xs sm:text-sm">الإجراء التالي</Label>
                    <Input
                      value={editingAction.nextAction}
                      onChange={(e) => setEditingAction({ ...editingAction, nextAction: e.target.value })}
                      placeholder="execute_visit"
                      className="h-9 text-sm"
                    />
                  </div>
                  
                  <div className="space-y-2">
                    <Label className="text-xs sm:text-sm">نوع العلاقة مع الإجراء التالي</Label>
                    <Select
                      value={editingAction.relationWithNext}
                      onValueChange={(value: any) => setEditingAction({ ...editingAction, relationWithNext: value })}
                    >
                      <SelectTrigger className="h-9 text-sm">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {RELATION_TYPES.map(relation => (
                          <SelectItem key={relation.value} value={relation.value}>
                            {relation.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                
                <div className="flex items-center gap-2 py-2">
                  <Switch
                    checked={editingAction.isActive}
                    onCheckedChange={(checked) => setEditingAction({ ...editingAction, isActive: checked })}
                    id="action-active"
                  />
                  <Label htmlFor="action-active" className="text-xs sm:text-sm">الإجراء نشط</Label>
                </div>
              </div>
            )}
            
            <DialogFooter className="flex flex-col sm:flex-row gap-2">
              <Button variant="outline" onClick={() => setIsDialogOpen(false)} className="w-full sm:w-auto h-9 text-sm">
                <X className="h-4 w-4 ml-2" />
                إلغاء
              </Button>
              <Button 
                onClick={handleSave}
                disabled={createMutation.isPending || updateMutation.isPending}
                className="w-full sm:w-auto h-9 text-sm"
              >
                {(createMutation.isPending || updateMutation.isPending) ? (
                  <Loader2 className="h-4 w-4 animate-spin ml-2" />
                ) : (
                  <Save className="h-4 w-4 ml-2" />
                )}
                حفظ
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </DashboardLayout>
  );
}

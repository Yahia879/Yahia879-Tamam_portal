import { useState, useEffect } from "react";
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
  { value: "super_admin", label: "المدير العام" },
  { value: "system_admin", label: "مدير النظام" },
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
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold flex items-center gap-2">
              <Settings className="h-6 w-6 text-primary" />
              إعدادات الإجراءات
            </h1>
            <p className="text-muted-foreground mt-1">
              إدارة الإجراءات لكل مرحلة وتحديد العلاقات بينها
            </p>
          </div>
          <Button 
            onClick={() => initializeMutation.mutate()}
            disabled={initializeMutation.isPending}
            variant="outline"
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
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-lg">دليل العلاقات</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-6">
              {RELATION_TYPES.map(relation => (
                <div key={relation.value} className="flex items-center gap-2">
                  <ArrowRight className={`h-4 w-4 ${relation.color}`} />
                  <span className="text-sm">{relation.label}</span>
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
                <Card key={stage.code}>
                  <CardHeader className="pb-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold">
                          {stageIndex + 1}
                        </div>
                        <div>
                          <CardTitle className="text-lg flex items-center gap-2">
                            {stage.label}
                            <Badge variant="secondary">
                              {stageActions.length} إجراء
                            </Badge>
                          </CardTitle>
                          <CardDescription>{stage.code}</CardDescription>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <Button 
                          variant="outline" 
                          size="sm" 
                          onClick={() => handleCreate(stage.code)}
                        >
                          <Plus className="h-4 w-4 ml-2" />
                          إضافة إجراء
                        </Button>
                        <Button 
                          variant="ghost" 
                          size="sm" 
                          onClick={() => toggleExpanded(stage.code)}
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
                    <CardContent>
                      {stageActions.length === 0 ? (
                        <div className="text-center py-8 text-muted-foreground">
                          لا توجد إجراءات لهذه المرحلة
                        </div>
                      ) : (
                        <div className="space-y-3">
                          {stageActions.map((action: any, index: number) => (
                            <div 
                              key={action.id} 
                              className="flex items-start gap-3 p-4 border rounded-lg hover:bg-accent/50 transition-colors"
                            >
                              <GripVertical className="h-5 w-5 text-muted-foreground mt-1 cursor-move" />
                              
                              <div className="flex-1 space-y-2">
                                <div className="flex items-center justify-between">
                                  <div className="flex items-center gap-2">
                                    <span className="text-sm font-medium text-muted-foreground">
                                      {action.order}.
                                    </span>
                                    <h4 className="font-semibold">{action.actionLabel}</h4>
                                    {action.isActive ? (
                                      <Badge variant="outline" className="text-green-600 border-green-600">
                                        <CheckCircle className="h-3 w-3 ml-1" />
                                        نشط
                                      </Badge>
                                    ) : (
                                      <Badge variant="outline" className="text-gray-400">
                                        <Circle className="h-3 w-3 ml-1" />
                                        غير نشط
                                      </Badge>
                                    )}
                                  </div>
                                  <div className="flex items-center gap-2">
                                    <Button 
                                      variant="ghost" 
                                      size="sm" 
                                      onClick={() => handleEdit(action)}
                                    >
                                      <Edit className="h-4 w-4" />
                                    </Button>
                                    <Button 
                                      variant="ghost" 
                                      size="sm" 
                                      onClick={() => handleDelete(action.id)}
                                      className="text-red-600 hover:text-red-700"
                                    >
                                      <Trash2 className="h-4 w-4" />
                                    </Button>
                                  </div>
                                </div>
                                
                                {action.actionDescription && (
                                  <p className="text-sm text-muted-foreground">
                                    {action.actionDescription}
                                  </p>
                                )}
                                
                                <div className="flex flex-wrap gap-2 text-sm">
                                  {action.prerequisiteAction && (
                                    <Badge variant="outline" className="text-blue-600">
                                      يتطلب: {action.prerequisiteAction}
                                    </Badge>
                                  )}
                                  {action.nextAction && (
                                    <Badge variant="outline" className={getRelationColor(action.relationWithNext || "after")}>
                                      {getRelationLabel(action.relationWithNext || "after")}: {action.nextAction}
                                    </Badge>
                                  )}
                                  {action.requiredRoles && action.requiredRoles.length > 0 && (
                                    <Badge variant="secondary">
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
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>
                {editingAction?.id ? "تعديل الإجراء" : "إضافة إجراء جديد"}
              </DialogTitle>
              <DialogDescription>
                قم بتعديل معلومات الإجراء والعلاقات بينه وبين الإجراءات الأخرى
              </DialogDescription>
            </DialogHeader>
            
            {editingAction && (
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>رمز الإجراء *</Label>
                    <Input
                      value={editingAction.actionCode}
                      onChange={(e) => setEditingAction({ ...editingAction, actionCode: e.target.value })}
                      placeholder="schedule_visit"
                    />
                  </div>
                  
                  <div className="space-y-2">
                    <Label>عنوان الإجراء *</Label>
                    <Input
                      value={editingAction.actionLabel}
                      onChange={(e) => setEditingAction({ ...editingAction, actionLabel: e.target.value })}
                      placeholder="جدولة الزيارة الميدانية"
                    />
                  </div>
                </div>
                
                <div className="space-y-2">
                  <Label>الوصف</Label>
                  <Input
                    value={editingAction.actionDescription}
                    onChange={(e) => setEditingAction({ ...editingAction, actionDescription: e.target.value })}
                    placeholder="وصف الإجراء..."
                  />
                </div>
                
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>المرحلة المرتبطة</Label>
                    <Select
                      value={editingAction.parentStage}
                      onValueChange={(value) => setEditingAction({ ...editingAction, parentStage: value })}
                    >
                      <SelectTrigger>
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
                    <Label>الترتيب</Label>
                    <Input
                      type="number"
                      value={editingAction.order}
                      onChange={(e) => setEditingAction({ ...editingAction, order: parseInt(e.target.value) || 0 })}
                    />
                  </div>
                </div>
                
                <div className="space-y-2">
                  <Label>المسار (Route)</Label>
                  <Input
                    value={editingAction.route}
                    onChange={(e) => setEditingAction({ ...editingAction, route: e.target.value })}
                    placeholder="/field-visit/schedule"
                  />
                </div>
                
                <div className="space-y-2">
                  <Label>الإجراء السابق المطلوب</Label>
                  <Input
                    value={editingAction.prerequisiteAction}
                    onChange={(e) => setEditingAction({ ...editingAction, prerequisiteAction: e.target.value })}
                    placeholder="assign_field_team"
                  />
                </div>
                
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>الإجراء التالي</Label>
                    <Input
                      value={editingAction.nextAction}
                      onChange={(e) => setEditingAction({ ...editingAction, nextAction: e.target.value })}
                      placeholder="execute_visit"
                    />
                  </div>
                  
                  <div className="space-y-2">
                    <Label>نوع العلاقة مع الإجراء التالي</Label>
                    <Select
                      value={editingAction.relationWithNext}
                      onValueChange={(value: any) => setEditingAction({ ...editingAction, relationWithNext: value })}
                    >
                      <SelectTrigger>
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
                
                <div className="flex items-center gap-2">
                  <Switch
                    checked={editingAction.isActive}
                    onCheckedChange={(checked) => setEditingAction({ ...editingAction, isActive: checked })}
                  />
                  <Label>الإجراء نشط</Label>
                </div>
              </div>
            )}
            
            <DialogFooter>
              <Button variant="outline" onClick={() => setIsDialogOpen(false)}>
                <X className="h-4 w-4 ml-2" />
                إلغاء
              </Button>
              <Button 
                onClick={handleSave}
                disabled={createMutation.isPending || updateMutation.isPending}
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

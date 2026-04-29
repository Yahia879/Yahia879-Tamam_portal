import { useState } from "react";
import { useAuth } from "@/_core/hooks/useAuth";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
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
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import {
  Plus,
  Edit,
  Trash2,
  FileText,
  Copy,
  GripVertical,
  ChevronDown,
  ChevronUp,
  Settings,
  ListOrdered,
} from "lucide-react";
import DashboardLayout from "@/components/DashboardLayout";

// أنواع العقود
const CONTRACT_TYPES = {
  supervision: { label: "إشراف هندسي", color: "bg-blue-100 text-blue-800" },
  construction: { label: "مقاولات", color: "bg-orange-100 text-orange-800" },
  supply: { label: "توريد", color: "bg-green-100 text-green-800" },
  maintenance: { label: "صيانة", color: "bg-purple-100 text-purple-800" },
  services: { label: "خدمات", color: "bg-cyan-100 text-cyan-800" },
  equipment: { label: "تجهيزات", color: "bg-pink-100 text-pink-800" },
  consulting: { label: "استشارات", color: "bg-indigo-100 text-indigo-800" },
  other: { label: "أخرى", color: "bg-gray-100 text-gray-800" },
};

// فئات البنود
const CLAUSE_CATEGORIES = {
  obligations_first_party: "التزامات الطرف الأول",
  obligations_second_party: "التزامات الطرف الثاني",
  financial: "الأحكام المالية",
  duration: "مدة العقد",
  modifications: "تعديل العقد",
  notifications: "الإشعارات والمراسلات",
  general: "أحكام عامة",
  confidentiality: "سرية المعلومات",
  intellectual_property: "حقوق الملكية الفكرية",
  disputes: "حل المنازعات",
  termination: "فسخ العقد",
  penalties: "الغرامات والجزاءات",
  warranty: "الضمان",
  force_majeure: "القوة القاهرة",
  copies: "نسخ الاتفاقية",
  custom: "بند مخصص",
};

export default function ContractTemplates() {
  const { user } = useAuth();
  const [showTemplateDialog, setShowTemplateDialog] = useState(false);
  const [showClauseDialog, setShowClauseDialog] = useState(false);
  const [editingTemplate, setEditingTemplate] = useState<any>(null);
  const [editingClause, setEditingClause] = useState<any>(null);
  const [selectedTemplateId, setSelectedTemplateId] = useState<number | null>(null);
  const [expandedTemplates, setExpandedTemplates] = useState<number[]>([]);

  // نموذج القالب
  const [templateForm, setTemplateForm] = useState({
    name: "",
    nameAr: "",
    type: "supply",
    description: "",
    headerTemplate: "",
    introTemplate: "",
    footerTemplate: "",
    signatureTemplate: "",
    isDefault: false,
  });

  // نموذج البند
  const [clauseForm, setClauseForm] = useState({
    title: "",
    titleAr: "",
    content: "",
    category: "general",
    isRequired: true,
    isEditable: true,
    isGlobal: false,
  });

  // جلب قوالب العقود
  const { data: templates, refetch: refetchTemplates } = trpc.contracts.getTemplates.useQuery();

  // جلب قالب مع بنوده
  const { data: selectedTemplate, refetch: refetchSelectedTemplate } = trpc.contracts.getTemplate.useQuery(
    { id: selectedTemplateId! },
    { enabled: !!selectedTemplateId }
  );

  // إنشاء قالب
  const createTemplateMutation = trpc.contracts.createTemplate.useMutation({
    onSuccess: () => {
      toast.success("تم إنشاء القالب بنجاح");
      setShowTemplateDialog(false);
      resetTemplateForm();
      refetchTemplates();
    },
    onError: (error) => {
      toast.error(error.message || "حدث خطأ أثناء إنشاء القالب");
    },
  });

  // تحديث قالب
  const updateTemplateMutation = trpc.contracts.updateTemplate.useMutation({
    onSuccess: () => {
      toast.success("تم تحديث القالب بنجاح");
      setShowTemplateDialog(false);
      setEditingTemplate(null);
      resetTemplateForm();
      refetchTemplates();
    },
    onError: (error) => {
      toast.error(error.message || "حدث خطأ أثناء تحديث القالب");
    },
  });

  // حذف قالب
  const deleteTemplateMutation = trpc.contracts.deleteTemplate.useMutation({
    onSuccess: () => {
      toast.success("تم حذف القالب بنجاح");
      refetchTemplates();
    },
    onError: (error) => {
      toast.error(error.message || "حدث خطأ أثناء حذف القالب");
    },
  });

  // إنشاء بند
  const createClauseMutation = trpc.contracts.createClause.useMutation({
    onSuccess: () => {
      toast.success("تم إضافة البند بنجاح");
      setShowClauseDialog(false);
      resetClauseForm();
      if (selectedTemplateId) {
        refetchSelectedTemplate();
      }
    },
    onError: (error) => {
      toast.error(error.message || "حدث خطأ أثناء إضافة البند");
    },
  });

  // تحديث بند
  const updateClauseMutation = trpc.contracts.updateClause.useMutation({
    onSuccess: () => {
      toast.success("تم تحديث البند بنجاح");
      setShowClauseDialog(false);
      setEditingClause(null);
      resetClauseForm();
      if (selectedTemplateId) {
        refetchSelectedTemplate();
      }
    },
    onError: (error) => {
      toast.error(error.message || "حدث خطأ أثناء تحديث البند");
    },
  });

  // حذف بند
  const deleteClauseMutation = trpc.contracts.deleteClause.useMutation({
    onSuccess: () => {
      toast.success("تم حذف البند بنجاح");
      if (selectedTemplateId) {
        refetchSelectedTemplate();
      }
    },
    onError: (error) => {
      toast.error(error.message || "حدث خطأ أثناء حذف البند");
    },
  });

  const resetTemplateForm = () => {
    setTemplateForm({
      name: "",
      nameAr: "",
      type: "supply",
      description: "",
      headerTemplate: "",
      introTemplate: "",
      footerTemplate: "",
      signatureTemplate: "",
      isDefault: false,
    });
  };

  const resetClauseForm = () => {
    setClauseForm({
      title: "",
      titleAr: "",
      content: "",
      category: "general",
      isRequired: true,
      isEditable: true,
      isGlobal: false,
    });
  };

  const handleEditTemplate = (template: any) => {
    setEditingTemplate(template);
    setTemplateForm({
      name: template.name || "",
      nameAr: template.nameAr || "",
      type: template.type || "supply",
      description: template.description || "",
      headerTemplate: template.headerTemplate || "",
      introTemplate: template.introTemplate || "",
      footerTemplate: template.footerTemplate || "",
      signatureTemplate: template.signatureTemplate || "",
      isDefault: template.isDefault || false,
    });
    setShowTemplateDialog(true);
  };

  const handleEditClause = (clause: any) => {
    setEditingClause(clause);
    setClauseForm({
      title: clause.title || "",
      titleAr: clause.titleAr || "",
      content: clause.content || "",
      category: clause.category || "general",
      isRequired: clause.isRequired ?? true,
      isEditable: clause.isEditable ?? true,
      isGlobal: clause.isGlobal ?? false,
    });
    setShowClauseDialog(true);
  };

  const handleSubmitTemplate = () => {
    if (!templateForm.name || !templateForm.nameAr) {
      toast.error("يرجى ملء جميع الحقول المطلوبة");
      return;
    }

    if (editingTemplate) {
      updateTemplateMutation.mutate({
        id: editingTemplate.id,
        ...templateForm,
      });
    } else {
      createTemplateMutation.mutate(templateForm);
    }
  };

  const handleSubmitClause = () => {
    if (!clauseForm.title || !clauseForm.titleAr || !clauseForm.content) {
      toast.error("يرجى ملء جميع الحقول المطلوبة");
      return;
    }

    if (editingClause) {
      updateClauseMutation.mutate({
        id: editingClause.id,
        ...clauseForm,
      });
    } else {
      createClauseMutation.mutate({
        templateId: selectedTemplateId!,
        ...clauseForm,
        orderIndex: selectedTemplate?.clauses?.length || 0,
      });
    }
  };

  const toggleTemplateExpand = (templateId: number) => {
    setExpandedTemplates((prev) =>
      prev.includes(templateId)
        ? prev.filter((id) => id !== templateId)
        : [...prev, templateId]
    );
    setSelectedTemplateId(templateId);
  };

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* العنوان */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">قوالب العقود</h1>
            <p className="text-gray-500 mt-1">
              إدارة قوالب العقود وتخصيص البنود
            </p>
          </div>
          <Button
            onClick={() => {
              setEditingTemplate(null);
              resetTemplateForm();
              setShowTemplateDialog(true);
            }}
            className="gap-2"
          >
            <Plus className="h-4 w-4" />
            إضافة قالب جديد
          </Button>
        </div>

        {/* قائمة القوالب */}
        <div className="space-y-4">
          {templates?.length === 0 ? (
            <Card>
              <CardContent className="py-12 text-center">
                <FileText className="h-12 w-12 mx-auto text-gray-400 mb-4" />
                <h3 className="text-lg font-medium text-gray-900 mb-2">
                  لا توجد قوالب
                </h3>
                <p className="text-gray-500 mb-4">
                  ابدأ بإنشاء قالب عقد جديد
                </p>
                <Button
                  onClick={() => {
                    setEditingTemplate(null);
                    resetTemplateForm();
                    setShowTemplateDialog(true);
                  }}
                >
                  <Plus className="h-4 w-4 ml-2" />
                  إضافة قالب
                </Button>
              </CardContent>
            </Card>
          ) : (
            templates?.map((template: any) => (
              <Card key={template.id} className="overflow-hidden">
                <CardHeader
                  className="cursor-pointer hover:bg-gray-50 transition-colors"
                  onClick={() => toggleTemplateExpand(template.id)}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4">
                      <div className="p-2 bg-primary/10 rounded-lg">
                        <FileText className="h-5 w-5 text-primary" />
                      </div>
                      <div>
                        <CardTitle className="text-lg flex items-center gap-2">
                          {template.nameAr}
                          {template.isDefault && (
                            <Badge variant="secondary">افتراضي</Badge>
                          )}
                          {!template.isActive && (
                            <Badge variant="outline" className="text-gray-500">
                              غير نشط
                            </Badge>
                          )}
                        </CardTitle>
                        <CardDescription className="flex items-center gap-2 mt-1">
                          <Badge
                            className={
                              CONTRACT_TYPES[template.type as keyof typeof CONTRACT_TYPES]?.color ||
                              "bg-gray-100 text-gray-800"
                            }
                          >
                            {CONTRACT_TYPES[template.type as keyof typeof CONTRACT_TYPES]?.label ||
                              template.type}
                          </Badge>
                          <span className="text-gray-400">•</span>
                          <span>{template.description || "بدون وصف"}</span>
                        </CardDescription>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleEditTemplate(template);
                        }}
                      >
                        <Edit className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={(e) => {
                          e.stopPropagation();
                          if (confirm("هل أنت متأكد من حذف هذا القالب؟")) {
                            deleteTemplateMutation.mutate({ id: template.id });
                          }
                        }}
                      >
                        <Trash2 className="h-4 w-4 text-red-500" />
                      </Button>
                      {expandedTemplates.includes(template.id) ? (
                        <ChevronUp className="h-5 w-5 text-gray-400" />
                      ) : (
                        <ChevronDown className="h-5 w-5 text-gray-400" />
                      )}
                    </div>
                  </div>
                </CardHeader>

                {expandedTemplates.includes(template.id) && (
                  <CardContent className="border-t bg-gray-50/50">
                    <div className="py-4">
                      <div className="flex items-center justify-between mb-4">
                        <h4 className="font-medium flex items-center gap-2">
                          <ListOrdered className="h-4 w-4" />
                          بنود العقد ({selectedTemplate?.clauses?.length || 0})
                        </h4>
                        <Button
                          size="sm"
                          onClick={() => {
                            setEditingClause(null);
                            resetClauseForm();
                            setShowClauseDialog(true);
                          }}
                        >
                          <Plus className="h-4 w-4 ml-1" />
                          إضافة بند
                        </Button>
                      </div>

                      {selectedTemplate?.clauses?.length === 0 ? (
                        <div className="text-center py-8 text-gray-500">
                          لا توجد بنود في هذا القالب
                        </div>
                      ) : (
                        <Table>
                          <TableHeader>
                            <TableRow>
                              <TableHead className="w-12">#</TableHead>
                              <TableHead>العنوان</TableHead>
                              <TableHead>الفئة</TableHead>
                              <TableHead>إلزامي</TableHead>
                              <TableHead>قابل للتعديل</TableHead>
                              <TableHead className="w-24">الإجراءات</TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {selectedTemplate?.clauses?.map((clause: any, index: number) => (
                              <TableRow key={clause.id}>
                                <TableCell className="font-medium">
                                  {index + 1}
                                </TableCell>
                                <TableCell>
                                  <div>
                                    <div className="font-medium">{clause.titleAr}</div>
                                    <div className="text-sm text-gray-500 line-clamp-1">
                                      {clause.content?.substring(0, 100)}...
                                    </div>
                                  </div>
                                </TableCell>
                                <TableCell>
                                  <Badge variant="outline">
                                    {CLAUSE_CATEGORIES[clause.category as keyof typeof CLAUSE_CATEGORIES] ||
                                      clause.category}
                                  </Badge>
                                </TableCell>
                                <TableCell>
                                  {clause.isRequired ? (
                                    <Badge className="bg-green-100 text-green-800">نعم</Badge>
                                  ) : (
                                    <Badge variant="outline">لا</Badge>
                                  )}
                                </TableCell>
                                <TableCell>
                                  {clause.isEditable ? (
                                    <Badge className="bg-blue-100 text-blue-800">نعم</Badge>
                                  ) : (
                                    <Badge variant="outline">لا</Badge>
                                  )}
                                </TableCell>
                                <TableCell>
                                  <div className="flex items-center gap-1">
                                    <Button
                                      variant="ghost"
                                      size="icon"
                                      onClick={() => handleEditClause(clause)}
                                    >
                                      <Edit className="h-4 w-4" />
                                    </Button>
                                    <Button
                                      variant="ghost"
                                      size="icon"
                                      onClick={() => {
                                        if (confirm("هل أنت متأكد من حذف هذا البند؟")) {
                                          deleteClauseMutation.mutate({ id: clause.id });
                                        }
                                      }}
                                    >
                                      <Trash2 className="h-4 w-4 text-red-500" />
                                    </Button>
                                  </div>
                                </TableCell>
                              </TableRow>
                            ))}
                          </TableBody>
                        </Table>
                      )}
                    </div>
                  </CardContent>
                )}
              </Card>
            ))
          )}
        </div>

        {/* نافذة إضافة/تعديل القالب */}
        <Dialog open={showTemplateDialog} onOpenChange={setShowTemplateDialog}>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>
                {editingTemplate ? "تعديل قالب العقد" : "إضافة قالب عقد جديد"}
              </DialogTitle>
              <DialogDescription>
                {editingTemplate
                  ? "قم بتعديل بيانات قالب العقد"
                  : "أدخل بيانات قالب العقد الجديد"}
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4 py-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="name">اسم القالب (إنجليزي)</Label>
                  <Input
                    id="name"
                    value={templateForm.name}
                    onChange={(e) =>
                      setTemplateForm({ ...templateForm, name: e.target.value })
                    }
                    placeholder="Supply Contract"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="nameAr">اسم القالب (عربي) *</Label>
                  <Input
                    id="nameAr"
                    value={templateForm.nameAr}
                    onChange={(e) =>
                      setTemplateForm({ ...templateForm, nameAr: e.target.value })
                    }
                    placeholder="عقد توريد"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="type">نوع العقد *</Label>
                  <Select
                    value={templateForm.type}
                    onValueChange={(value) =>
                      setTemplateForm({ ...templateForm, type: value })
                    }
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {Object.entries(CONTRACT_TYPES).map(([key, { label }]) => (
                        <SelectItem key={key} value={key}>
                          {label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2 flex items-end">
                  <div className="flex items-center gap-2">
                    <Switch
                      id="isDefault"
                      checked={templateForm.isDefault}
                      onCheckedChange={(checked) =>
                        setTemplateForm({ ...templateForm, isDefault: checked })
                      }
                    />
                    <Label htmlFor="isDefault">قالب افتراضي لهذا النوع</Label>
                  </div>
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="description">وصف القالب</Label>
                <Textarea
                  id="description"
                  value={templateForm.description}
                  onChange={(e) =>
                    setTemplateForm({ ...templateForm, description: e.target.value })
                  }
                  placeholder="وصف مختصر للقالب..."
                  rows={2}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="introTemplate">مقدمة العقد</Label>
                <Textarea
                  id="introTemplate"
                  value={templateForm.introTemplate}
                  onChange={(e) =>
                    setTemplateForm({ ...templateForm, introTemplate: e.target.value })
                  }
                  placeholder="نص مقدمة العقد... يمكن استخدام المتغيرات مثل {{organizationName}}, {{supplierName}}, {{contractDate}}"
                  rows={4}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="footerTemplate">تذييل العقد</Label>
                <Textarea
                  id="footerTemplate"
                  value={templateForm.footerTemplate}
                  onChange={(e) =>
                    setTemplateForm({ ...templateForm, footerTemplate: e.target.value })
                  }
                  placeholder="نص تذييل العقد..."
                  rows={3}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="signatureTemplate">قالب التوقيعات</Label>
                <Textarea
                  id="signatureTemplate"
                  value={templateForm.signatureTemplate}
                  onChange={(e) =>
                    setTemplateForm({ ...templateForm, signatureTemplate: e.target.value })
                  }
                  placeholder="نص منطقة التوقيعات..."
                  rows={3}
                />
              </div>
            </div>

            <DialogFooter>
              <Button
                variant="outline"
                onClick={() => {
                  setShowTemplateDialog(false);
                  setEditingTemplate(null);
                  resetTemplateForm();
                }}
              >
                إلغاء
              </Button>
              <Button
                onClick={handleSubmitTemplate}
                disabled={createTemplateMutation.isPending || updateTemplateMutation.isPending}
              >
                {editingTemplate ? "حفظ التعديلات" : "إنشاء القالب"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* نافذة إضافة/تعديل البند */}
        <Dialog open={showClauseDialog} onOpenChange={setShowClauseDialog}>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>
                {editingClause ? "تعديل بند العقد" : "إضافة بند جديد"}
              </DialogTitle>
              <DialogDescription>
                {editingClause
                  ? "قم بتعديل بيانات البند"
                  : "أدخل بيانات البند الجديد"}
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4 py-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="clauseTitle">عنوان البند (إنجليزي)</Label>
                  <Input
                    id="clauseTitle"
                    value={clauseForm.title}
                    onChange={(e) =>
                      setClauseForm({ ...clauseForm, title: e.target.value })
                    }
                    placeholder="Obligations of First Party"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="clauseTitleAr">عنوان البند (عربي) *</Label>
                  <Input
                    id="clauseTitleAr"
                    value={clauseForm.titleAr}
                    onChange={(e) =>
                      setClauseForm({ ...clauseForm, titleAr: e.target.value })
                    }
                    placeholder="التزامات الطرف الأول"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="clauseCategory">فئة البند</Label>
                <Select
                  value={clauseForm.category}
                  onValueChange={(value) =>
                    setClauseForm({ ...clauseForm, category: value })
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {Object.entries(CLAUSE_CATEGORIES).map(([key, label]) => (
                      <SelectItem key={key} value={key}>
                        {label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="clauseContent">نص البند *</Label>
                <Textarea
                  id="clauseContent"
                  value={clauseForm.content}
                  onChange={(e) =>
                    setClauseForm({ ...clauseForm, content: e.target.value })
                  }
                  placeholder="أدخل نص البند هنا... يمكن استخدام المتغيرات مثل {{contractValue}}, {{duration}}, {{penaltyPercentage}}"
                  rows={8}
                />
              </div>

              <div className="flex items-center gap-6">
                <div className="flex items-center gap-2">
                  <Switch
                    id="isRequired"
                    checked={clauseForm.isRequired}
                    onCheckedChange={(checked) =>
                      setClauseForm({ ...clauseForm, isRequired: checked })
                    }
                  />
                  <Label htmlFor="isRequired">بند إلزامي</Label>
                </div>
                <div className="flex items-center gap-2">
                  <Switch
                    id="isEditable"
                    checked={clauseForm.isEditable}
                    onCheckedChange={(checked) =>
                      setClauseForm({ ...clauseForm, isEditable: checked })
                    }
                  />
                  <Label htmlFor="isEditable">قابل للتعديل</Label>
                </div>
              </div>
            </div>

            <DialogFooter>
              <Button
                variant="outline"
                onClick={() => {
                  setShowClauseDialog(false);
                  setEditingClause(null);
                  resetClauseForm();
                }}
              >
                إلغاء
              </Button>
              <Button
                onClick={handleSubmitClause}
                disabled={createClauseMutation.isPending || updateClauseMutation.isPending}
              >
                {editingClause ? "حفظ التعديلات" : "إضافة البند"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </DashboardLayout>
  );
}

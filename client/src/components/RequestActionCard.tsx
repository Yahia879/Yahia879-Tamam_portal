/**
 * مكون بطاقة الإجراء النشط
 * يعرض الإجراء الحالي المطلوب تنفيذه بناءً على المرحلة وحالة الطلب
 * يقرأ البيانات من قاعدة البيانات بدلاً من الكود الثابت
 */

import { useEffect, useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { trpc } from '@/lib/trpc';
import { useAuth } from '@/_core/hooks/useAuth';
import { 
  CheckCircle2, 
  Clock, 
  AlertCircle,
  ArrowRight,
  Loader2
} from 'lucide-react';

interface RequestActionCardProps {
  requestId: number;
  currentStage: string;
  request: any; // بيانات الطلب الكاملة
}

export function RequestActionCard({ requestId, currentStage, request }: RequestActionCardProps) {
  const { user } = useAuth();
  
  // جلب جميع الإجراءات للمرحلة الحالية
  const { data: actions, isLoading } = trpc.actions.getByStage.useQuery({ stageCode: currentStage });
  
  // حالة الإجراء النشط
  const [activeAction, setActiveAction] = useState<any>(null);
  const [completedActions, setCompletedActions] = useState<string[]>([]);
  const [progress, setProgress] = useState(0);

  // حساب الإجراء النشط والإجراءات المكتملة
  useEffect(() => {
    if (!actions || actions.length === 0) return;

    const completed: string[] = [];
    let active: any = null;

    // ترتيب الإجراءات حسب order
    const sortedActions = [...actions].sort((a, b) => a.order - b.order);

    // البحث عن الإجراءات المكتملة والإجراء النشط
    for (const action of sortedActions) {
      const isCompleted = checkActionCompletion(action.actionCode, request);
      
      if (isCompleted) {
        completed.push(action.actionCode);
      } else if (!active && hasPermission(action)) {
        // أول إجراء غير مكتمل ولديه صلاحية = الإجراء النشط
        active = action;
      }
    }

    setCompletedActions(completed);
    setActiveAction(active);
    
    // حساب نسبة التقدم
    if (sortedActions.length > 0) {
      setProgress(Math.round((completed.length / sortedActions.length) * 100));
    }
  }, [actions, request, user]);

  // دالة للتحقق من إتمام الإجراء
  const checkActionCompletion = (actionCode: string, req: any): boolean => {
    // منطق التحقق من الإتمام حسب نوع الإجراء
    switch (actionCode) {
      case 'schedule_field_visit':
        return !!req.fieldVisitScheduledDate;
      case 'submit_field_report':
        return !!req.fieldVisitReportId;
      case 'technical_decision':
        return !!req.technicalEvalDecision;
      case 'add_quotations':
        return req.quotationsCount > 0;
      case 'select_winning_quotation':
        return !!req.selectedQuotationId;
      case 'create_contract':
        return !!req.contractId;
      case 'sign_contract':
        return req.contractStatus === 'signed';
      case 'submit_quick_response_report':
        return !!req.quickResponseReportId;
      default:
        return false;
    }
  };

  // دالة للتحقق من الصلاحية
  const hasPermission = (action: any): boolean => {
    if (!user || !action.requiredRoles) return false;
    const roles = JSON.parse(action.requiredRoles);
    return roles.includes(user.role);
  };

  // دالة للتعامل مع الضغط على زر الإجراء
  const handleActionClick = () => {
    if (!activeAction || !activeAction.route) return;
    
    // إضافة requestId كـ query parameter
    const route = activeAction.route.includes('?') 
      ? `${activeAction.route}&requestId=${requestId}`
      : `${activeAction.route}?requestId=${requestId}`;
    
    window.location.href = route;
  };

  if (isLoading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center py-8">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </CardContent>
      </Card>
    );
  }

  if (!actions || actions.length === 0) {
    return (
      <Card>
        <CardContent className="py-8">
          <div className="text-center text-muted-foreground">
            <AlertCircle className="h-12 w-12 mx-auto mb-2 opacity-50" />
            <p>لا توجد إجراءات محددة لهذه المرحلة</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!activeAction) {
    return (
      <Card className="border-green-200 bg-green-50">
        <CardHeader>
          <div className="flex items-center gap-2">
            <CheckCircle2 className="h-5 w-5 text-green-600" />
            <CardTitle className="text-green-900">جميع الإجراءات مكتملة</CardTitle>
          </div>
          <CardDescription className="text-green-700">
            تم إتمام جميع الإجراءات المطلوبة في هذه المرحلة ({progress}%)
          </CardDescription>
        </CardHeader>
      </Card>
    );
  }

  return (
    <Card className="border-primary/20 bg-primary/5">
      <CardHeader>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Clock className="h-5 w-5 text-primary" />
            <CardTitle>الإجراء المطلوب</CardTitle>
          </div>
          <Badge variant="outline" className="text-xs">
            {progress}% مكتمل
          </Badge>
        </div>
        <CardDescription>
          {activeAction.actionDescription}
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {/* عرض الإجراءات المكتملة */}
          {completedActions.length > 0 && (
            <div className="text-sm text-muted-foreground">
              <p className="mb-2 font-medium">الإجراءات المكتملة:</p>
              <div className="flex flex-wrap gap-2">
                {actions
                  ?.filter(a => completedActions.includes(a.actionCode))
                  .map(action => (
                    <Badge key={action.id} variant="secondary" className="text-xs">
                      <CheckCircle2 className="h-3 w-3 ml-1" />
                      {action.actionLabel}
                    </Badge>
                  ))}
              </div>
            </div>
          )}

          {/* زر الإجراء النشط */}
          {activeAction.route && hasPermission(activeAction) ? (
            <Button 
              onClick={handleActionClick}
              className="w-full"
              size="lg"
            >
              {activeAction.actionLabel}
              <ArrowRight className="mr-2 h-4 w-4" />
            </Button>
          ) : (
            <div className="text-center p-4 bg-muted rounded-lg">
              <p className="text-sm text-muted-foreground">
                {!hasPermission(activeAction) 
                  ? 'ليس لديك صلاحية لتنفيذ هذا الإجراء'
                  : 'لا يوجد مسار محدد لهذا الإجراء'}
              </p>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

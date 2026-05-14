import React from 'react';
import { FormField } from '@/lib/programFields';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Plus, AlertTriangle } from 'lucide-react';

interface DynamicFieldRendererProps {
  field: FormField;
  value: any;
  onChange: (value: any) => void;
  error?: string;
  disabled?: boolean;
  options?: Array<{ id: number; name: string; city?: string }>;
  onAddMosque?: () => void;
}

export const DynamicFieldRenderer: React.FC<DynamicFieldRendererProps> = ({
  field,
  value,
  onChange,
  error,
  disabled,
  options,
  onAddMosque,
}) => {
  const renderField = () => {
    switch (field.type) {
      case 'text':
      case 'email':
      case 'number':
        return (
          <Input
            type={field.type}
            value={value || ''}
            onChange={(e) => onChange(e.target.value)}
            placeholder={field.placeholder}
            disabled={disabled}
            className={error ? 'border-red-500' : ''}
          />
        );

      case 'textarea':
        return (
          <Textarea
            value={value || ''}
            onChange={(e) => onChange(e.target.value)}
            placeholder={field.placeholder}
            disabled={disabled}
            rows={4}
            className={error ? 'border-red-500' : ''}
          />
        );

      case 'select':
        // معالجة خاصة لحقل المسجد
        if (field.name === 'mosqueId') {
          if (!options || options.length === 0) {
            return (
              <div className="space-y-3">
                <Alert className="bg-amber-50 border-amber-200">
                  <AlertTriangle className="h-4 w-4 text-amber-600" />
                  <AlertDescription className="text-amber-800">
                    <p className="font-medium mb-2">لا توجد مساجد مسجلة</p>
                    <p className="text-sm">هل تريد إضافة مسجد جديد؟</p>
                  </AlertDescription>
                </Alert>
                <Button
                  type="button"
                  className="w-full bg-amber-600 hover:bg-amber-700 text-white"
                  onClick={onAddMosque}
                >
                  <Plus className="w-4 h-4 ml-2" />
                  إضافة مسجد جديد
                </Button>
              </div>
            );
          }
          
          return (
            <Select value={value?.toString() || ''} onValueChange={(val) => onChange(parseInt(val))} disabled={disabled}>
              <SelectTrigger className={error ? 'border-red-500' : ''}>
                <SelectValue placeholder={field.placeholder || 'اختر...'} />
              </SelectTrigger>
              <SelectContent>
                {options.map((option) => (
                  <SelectItem key={option.id} value={option.id.toString()}>
                    {option.name} {option.city ? `- ${option.city}` : ''}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          );
        }

        // الحقول الأخرى
        return (
          <Select value={value || ''} onValueChange={onChange} disabled={disabled}>
            <SelectTrigger className={error ? 'border-red-500' : ''}>
              <SelectValue placeholder={field.placeholder || 'اختر...'} />
            </SelectTrigger>
            <SelectContent>
              {field.options?.map((option) => (
                <SelectItem key={option.value} value={option.value}>
                  {option.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        );

      case 'radio':
        return (
          <div className="space-y-4">
            <RadioGroup value={value || ''} onValueChange={onChange} disabled={disabled}>
              {field.options?.map((option) => (
                <div key={option.value} className="flex items-center gap-2">
                  <RadioGroupItem value={option.value} id={`${field.name}-${option.value}`} disabled={disabled} />
                  <Label htmlFor={`${field.name}-${option.value}`} className="cursor-pointer">
                    {option.label}
                  </Label>
                </div>
              ))}
            </RadioGroup>
            {field.name === 'willingToVolunteer' && value === 'no' && (
              <Alert variant="destructive" className="bg-red-50 border-red-200">
                <AlertTriangle className="h-4 w-4 text-red-600" />
                <AlertDescription className="text-red-800 font-medium">
                  عذراً، لا يمكن إكمال إنشاء الطلب دون وجود فريق تطوعي. يرجى تأمين الفريق للمتابعة.
                </AlertDescription>
              </Alert>
            )}
          </div>
        );

      default:
        return null;
    }
  };

  return (
    <div className="space-y-2">
      <Label className="flex items-center gap-1">
        {field.label}
        {field.required && <span className="text-red-500">*</span>}
      </Label>
      {renderField()}
      {field.help && <p className="text-sm text-gray-500">{field.help}</p>}
      {error && (field.name !== 'willingToVolunteer' || value !== 'no') && (
        <p className="text-sm text-red-500">{error}</p>
      )}
    </div>
  );
};

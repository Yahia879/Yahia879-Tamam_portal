import React from 'react';
import { FormField } from '@/lib/programFields';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { 
  Plus, 
  AlertTriangle, 
  FileText, 
  Ruler, 
  Users, 
  MapPin, 
  Building2, 
  Coins, 
  Check, 
  HelpCircle,
  Clock,
  Sparkles,
  Phone,
  Mail,
} from 'lucide-react';

interface DynamicFieldRendererProps {
  field: FormField;
  value: any;
  onChange: (value: any) => void;
  error?: string;
  disabled?: boolean;
  options?: Array<{ id: number; name: string; city?: string; approvalStatus?: string }>;
  onAddMosque?: () => void;
}

const getFieldIcon = (fieldName: string) => {
  switch (fieldName) {
    case 'workDescription':
    case 'fundingProposals':
    case 'notes':
      return FileText;
    case 'mosqueArea':
    case 'womenPrayerArea':
      return Ruler;
    case 'actualWorshippers':
    case 'womenPrayerCapacity':
      return Users;
    case 'district':
    case 'city':
    case 'address':
      return MapPin;
    case 'mosqueId':
    case 'nearestMosque':
      return Building2;
    case 'hasDonor':
    case 'hasDonorForMaintenance':
    case 'hasLand':
      return Coins;
    case 'distanceToNearestMosque':
      return MapPin;
    case 'phone':
    case 'mobile':
      return Phone;
    case 'email':
      return Mail;
    default:
      return null;
  }
};

const getUnitSuffix = (fieldName: string) => {
  switch (fieldName) {
    case 'mosqueArea':
    case 'womenPrayerArea':
      return 'م²';
    case 'actualWorshippers':
    case 'womenPrayerCapacity':
      return 'مصلي';
    case 'distanceToNearestMosque':
      return 'كم';
    default:
      return null;
  }
};

export const DynamicFieldRenderer: React.FC<DynamicFieldRendererProps> = ({
  field,
  value,
  onChange,
  error,
  disabled,
  options,
  onAddMosque,
}) => {
  const Icon = getFieldIcon(field.name);
  const unitSuffix = getUnitSuffix(field.name);

  const renderField = () => {
    switch (field.type) {
      case 'text':
      case 'email':
      case 'number':
        return (
          <div className="relative flex items-center">
            <Input
              type={field.type}
              value={value !== undefined && value !== null ? value : ''}
              onChange={(e) => onChange(e.target.value)}
              placeholder={field.placeholder}
              disabled={disabled}
              className={`h-11 rounded-xl text-xs sm:text-sm bg-background border-border/80 hover:border-border focus-visible:border-primary focus-visible:ring-2 focus-visible:ring-primary/20 transition-all ${
                unitSuffix ? 'pl-12' : ''
              } ${error ? 'border-red-500 focus-visible:border-red-500 focus-visible:ring-red-500/20' : ''} ${
                disabled ? 'disabled:opacity-100 disabled:text-slate-900 disabled:bg-muted/40 font-bold' : ''
              }`}
            />
            {unitSuffix && (
              <span className="absolute left-3 text-xs font-semibold text-muted-foreground bg-muted/60 px-2 py-0.5 rounded-md select-none pointer-events-none">
                {unitSuffix}
              </span>
            )}
          </div>
        );

      case 'textarea':
        return (
          <Textarea
            value={value !== undefined && value !== null ? value : ''}
            onChange={(e) => onChange(e.target.value)}
            placeholder={field.placeholder}
            disabled={disabled}
            rows={4}
            className={`min-h-[110px] rounded-xl text-xs sm:text-sm bg-background border-border/80 hover:border-border focus-visible:border-primary focus-visible:ring-2 focus-visible:ring-primary/20 transition-all leading-relaxed p-3.5 ${
              error ? 'border-red-500 focus-visible:border-red-500 focus-visible:ring-red-500/20' : ''
            }`}
          />
        );

      case 'select':
        // معالجة خاصة لحقل المسجد
        if (field.name === 'mosqueId') {
          if (!options || options.length === 0) {
            return (
              <div className="p-4 rounded-2xl bg-amber-500/10 border border-amber-500/30 space-y-3">
                <div className="flex items-start gap-3">
                  <AlertTriangle className="h-5 w-5 text-amber-600 shrink-0 mt-0.5" />
                  <div>
                    <p className="font-bold text-xs sm:text-sm text-amber-900 dark:text-amber-200">لا توجد مساجد مسجلة في حسابك</p>
                    <p className="text-[11px] sm:text-xs text-amber-800/80 dark:text-amber-300/80 mt-0.5">
                      لتقديم هذا الطلب، يرجى تسجيل المسجد أولاً.
                    </p>
                  </div>
                </div>
                <Button
                  type="button"
                  size="sm"
                  className="w-full rounded-xl bg-amber-600 hover:bg-amber-700 text-white font-bold text-xs gap-1.5 h-10 shadow-xs"
                  onClick={onAddMosque}
                >
                  <Plus className="w-4 h-4" />
                  <span>تسجيل مسجد جديد الآن</span>
                </Button>
              </div>
            );
          }
          
          return (
            <Select value={value?.toString() || ''} onValueChange={(val) => onChange(parseInt(val))} disabled={disabled}>
              <SelectTrigger className={`w-full h-11 rounded-xl text-xs sm:text-sm bg-background border-border/80 hover:border-border focus-visible:border-primary focus-visible:ring-2 focus-visible:ring-primary/20 transition-all ${error ? 'border-red-500' : ''}`}>
                <SelectValue placeholder={field.placeholder || 'اختر المسجد...'} />
              </SelectTrigger>
              <SelectContent className="rounded-xl border-border shadow-lg max-h-72">
                {options.map((option) => (
                  <SelectItem key={option.id} value={option.id.toString()} className="text-xs sm:text-sm rounded-lg my-1 py-2">
                    <div className="flex items-center justify-between gap-3 w-full">
                      <div className="flex items-center gap-1.5 min-w-0">
                        <span className="font-bold truncate">{option.name}</span>
                        {option.city && <span className="text-muted-foreground text-[11px] shrink-0">({option.city})</span>}
                      </div>
                      <div className="shrink-0 mr-auto">
                        {option.approvalStatus === 'approved' ? (
                          <span className="text-[10px] bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 font-semibold px-2 py-0.5 rounded-md">معتمد</span>
                        ) : option.approvalStatus === 'pending' ? (
                          <span className="text-[10px] bg-amber-500/15 text-amber-700 dark:text-amber-300 font-semibold px-2 py-0.5 rounded-md">قيد المراجعة</span>
                        ) : option.approvalStatus === 'rejected' ? (
                          <span className="text-[10px] bg-red-500/15 text-red-700 dark:text-red-300 font-semibold px-2 py-0.5 rounded-md">مرفوض</span>
                        ) : null}
                      </div>
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          );
        }

        // الحقول الأخرى
        return (
          <Select value={value || ''} onValueChange={onChange} disabled={disabled}>
            <SelectTrigger className={`w-full h-11 rounded-xl text-xs sm:text-sm bg-background border-border/80 hover:border-border focus-visible:border-primary focus-visible:ring-2 focus-visible:ring-primary/20 transition-all ${error ? 'border-red-500' : ''}`}>
              <SelectValue placeholder={field.placeholder || 'اختر...'} />
            </SelectTrigger>
            <SelectContent className="rounded-xl border-border shadow-lg">
              {field.options?.map((option) => (
                <SelectItem key={option.value} value={option.value} className="text-xs sm:text-sm rounded-lg my-0.5 font-medium">
                  {option.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        );

      case 'radio':
        return (
          <div className="space-y-3">
            <RadioGroup
              value={value !== undefined && value !== null ? value : ''}
              onValueChange={onChange}
              disabled={disabled}
              className={`grid ${field.options && field.options.length > 2 ? 'grid-cols-1 sm:grid-cols-3' : 'grid-cols-2'} gap-2.5 sm:gap-3`}
              dir="rtl"
            >
              {field.options?.map((option) => {
                const isSelected = value === option.value;
                const isYes = option.value === 'yes';
                const isNo = option.value === 'no';

                return (
                  <label
                    key={option.value}
                    htmlFor={`${field.name}-${option.value}`}
                    className={`relative flex items-center justify-between p-3 sm:p-4 rounded-xl sm:rounded-2xl border-2 cursor-pointer transition-all duration-200 select-none ${
                      isSelected
                        ? isYes
                          ? 'border-emerald-600 bg-emerald-50/70 dark:bg-emerald-950/30 text-emerald-900 dark:text-emerald-200 shadow-xs ring-2 ring-emerald-500/20'
                          : isNo
                          ? 'border-rose-500 bg-rose-50/70 dark:bg-rose-950/30 text-rose-900 dark:text-rose-200 shadow-xs ring-2 ring-rose-500/20'
                          : 'border-primary bg-primary/10 text-primary shadow-xs ring-2 ring-primary/20'
                        : 'border-border/60 bg-background hover:bg-muted/40 hover:border-border text-foreground'
                    } ${disabled ? 'opacity-50 cursor-not-allowed' : ''}`}
                  >
                    <div className="flex items-center gap-2.5 sm:gap-3">
                      <RadioGroupItem
                        value={option.value}
                        id={`${field.name}-${option.value}`}
                        disabled={disabled}
                        className="border-muted-foreground/40 text-primary"
                      />
                      <span className="font-bold text-xs sm:text-sm">
                        {option.label}
                      </span>
                    </div>
                    {isSelected && (
                      <div className={`w-5 h-5 rounded-full flex items-center justify-center text-white text-xs ${isYes ? 'bg-emerald-600' : isNo ? 'bg-rose-600' : 'bg-primary'}`}>
                        <Check className="w-3 h-3 stroke-[3]" />
                      </div>
                    )}
                  </label>
                );
              })}
            </RadioGroup>
            {field.name === 'willingToVolunteer' && value === 'no' && (
              <Alert variant="destructive" className="bg-rose-50 dark:bg-rose-950/40 border-rose-200 dark:border-rose-900/50 rounded-2xl p-4 animate-in fade-in duration-200">
                <AlertTriangle className="h-4 w-4 text-rose-600 dark:text-rose-400 shrink-0" />
                <AlertDescription className="text-rose-800 dark:text-rose-300 font-medium text-xs sm:text-sm leading-relaxed">
                  عذراً، لا يمكن إكمال إنشاء الطلب دون وجود فريق تطوعي. يرجى تأمين الفريق للمتابعة.
                </AlertDescription>
              </Alert>
            )}
          </div>
        );

      case 'phone':
        return (
          <div className="relative flex items-center">
            <Input
              type="tel"
              value={value !== undefined && value !== null ? value : ''}
              onChange={(e) => onChange(e.target.value)}
              placeholder={field.placeholder || "05xxxxxxxx"}
              disabled={disabled}
              className={`h-11 rounded-xl text-xs sm:text-sm bg-background border-border/80 hover:border-border focus-visible:border-primary focus-visible:ring-2 focus-visible:ring-primary/20 transition-all ${
                error ? 'border-red-500 focus-visible:border-red-500 focus-visible:ring-red-500/20' : ''
              } ${disabled ? 'disabled:opacity-100 disabled:text-slate-900 disabled:bg-muted/40 font-bold' : ''}`}
            />
          </div>
        );

      case 'date':
        return (
          <Input
            type="date"
            value={value !== undefined && value !== null ? value : ''}
            onChange={(e) => onChange(e.target.value)}
            disabled={disabled}
            className={`h-11 rounded-xl text-xs sm:text-sm bg-background border-border/80 hover:border-border focus-visible:border-primary focus-visible:ring-2 focus-visible:ring-primary/20 transition-all ${
              error ? 'border-red-500' : ''
            }`}
          />
        );

      case 'checkbox':
        return (
          <div
            onClick={() => !disabled && onChange(!value)}
            className={`flex items-center gap-3 p-3.5 rounded-xl border cursor-pointer select-none transition-all ${
              value
                ? 'border-primary bg-primary/5 text-primary font-bold shadow-2xs'
                : 'border-border/80 bg-background text-foreground'
            } ${disabled ? 'opacity-50 cursor-not-allowed' : ''}`}
          >
            <input
              type="checkbox"
              checked={!!value}
              onChange={(e) => !disabled && onChange(e.target.checked)}
              disabled={disabled}
              className="h-4 w-4 rounded border-border text-primary focus:ring-primary"
            />
            <span className="text-xs sm:text-sm">{field.placeholder || field.label || "أوافق على هذا الخيار"}</span>
          </div>
        );

      case 'file':
        return (
          <div className="space-y-2">
            <Input
              type="file"
              onChange={(e) => {
                const f = e.target.files?.[0];
                if (f) onChange(f.name);
              }}
              disabled={disabled}
              className="h-11 rounded-xl text-xs sm:text-sm bg-background border-border/80"
            />
            {value && typeof value === 'string' && (
              <p className="text-xs text-muted-foreground font-semibold">الملف المحدد: {value}</p>
            )}
          </div>
        );

      default:
        return (
          <Input
            type="text"
            value={value !== undefined && value !== null ? value : ''}
            onChange={(e) => onChange(e.target.value)}
            placeholder={field.placeholder}
            disabled={disabled}
            className={`h-11 rounded-xl text-xs sm:text-sm bg-background border-border/80 ${
              error ? 'border-red-500' : ''
            }`}
          />
        );
    }
  };

  return (
    <div className="space-y-2">
      <Label className="flex items-center gap-1.5 text-xs sm:text-sm font-bold text-foreground">
        {Icon && <Icon className="w-4 h-4 text-primary/75 shrink-0" />}
        <span>{field.label}</span>
        {field.required && <span className="text-red-500 font-bold">*</span>}
      </Label>
      {renderField()}
      {field.help && (
        <p className="text-[11px] sm:text-xs text-muted-foreground leading-relaxed">
          {field.help}
        </p>
      )}
      {error && (field.name !== 'willingToVolunteer' || value !== 'no') && (
        <p className="text-xs text-red-500 font-medium flex items-center gap-1">
          <span>{error}</span>
        </p>
      )}
    </div>
  );
};

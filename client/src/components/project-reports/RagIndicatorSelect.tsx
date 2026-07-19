import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { CheckCircle2, AlertTriangle, XCircle } from "lucide-react";

interface RagIndicatorSelectProps {
  value: "أخضر" | "أصفر" | "أحمر" | string;
  onChange: (val: string) => void;
  label?: string;
  disabled?: boolean;
}

export function RagIndicatorSelect({ value, onChange, label, disabled = false }: RagIndicatorSelectProps) {
  return (
    <div className="w-full">
      {label && <label className="text-xs font-semibold text-foreground mb-1 block">{label}</label>}
      <Select value={value} onValueChange={onChange} disabled={disabled}>
        <SelectTrigger className="w-full h-10 border-border/80 bg-background">
          <SelectValue placeholder="اختر مؤشر الرصد" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="أخضر" className="text-xs font-medium">
            <div className="flex items-center gap-2 text-emerald-600 dark:text-emerald-400 font-semibold">
              <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" />
              <span>أخضر (ضمن المخطط)</span>
            </div>
          </SelectItem>
          <SelectItem value="أصفر" className="text-xs font-medium">
            <div className="flex items-center gap-2 text-amber-600 dark:text-amber-400 font-semibold">
              <AlertTriangle className="w-4 h-4 text-amber-500 shrink-0" />
              <span>أصفر (انحراف متوسط)</span>
            </div>
          </SelectItem>
          <SelectItem value="أحمر" className="text-xs font-medium">
            <div className="flex items-center gap-2 text-rose-600 dark:text-rose-400 font-semibold">
              <XCircle className="w-4 h-4 text-rose-500 shrink-0" />
              <span>أحمر (حرج / يتطلب تدخل)</span>
            </div>
          </SelectItem>
        </SelectContent>
      </Select>
    </div>
  );
}

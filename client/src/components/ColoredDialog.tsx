import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { X } from "lucide-react";
import { ReactNode } from "react";

interface ColoredDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  children: ReactNode;
  color: "blue" | "green" | "orange" | "purple" | "teal";
  icon?: ReactNode;
  wide?: boolean; // نافذة عريضة لجداول الكميات
}

const colorClasses = {
  blue: {
    bg: "bg-blue-50 dark:bg-blue-950/20",
    border: "border-blue-200 dark:border-blue-800",
    header: "bg-blue-100 dark:bg-blue-900/30",
    text: "text-blue-900 dark:text-blue-100",
    accent: "text-blue-600 dark:text-blue-400",
  },
  green: {
    bg: "bg-green-50 dark:bg-green-950/20",
    border: "border-green-200 dark:border-green-800",
    header: "bg-green-100 dark:bg-green-900/30",
    text: "text-green-900 dark:text-green-100",
    accent: "text-green-600 dark:text-green-400",
  },
  orange: {
    bg: "bg-orange-50 dark:bg-orange-950/20",
    border: "border-orange-200 dark:border-orange-800",
    header: "bg-orange-100 dark:bg-orange-900/30",
    text: "text-orange-900 dark:text-orange-100",
    accent: "text-orange-600 dark:text-orange-400",
  },
  purple: {
    bg: "bg-purple-50 dark:bg-purple-950/20",
    border: "border-purple-200 dark:border-purple-800",
    header: "bg-purple-100 dark:bg-purple-900/30",
    text: "text-purple-900 dark:text-purple-100",
    accent: "text-purple-600 dark:text-purple-400",
  },
  teal: {
    bg: "bg-teal-50 dark:bg-teal-950/20",
    border: "border-teal-200 dark:border-teal-800",
    header: "bg-teal-100 dark:bg-teal-900/30",
    text: "text-teal-900 dark:text-teal-100",
    accent: "text-teal-600 dark:text-teal-400",
  },
};

export function ColoredDialog({ open, onOpenChange, title, children, color, icon, wide }: ColoredDialogProps) {
  const colors = colorClasses[color];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className={`${wide ? 'max-w-6xl w-[95vw]' : 'max-w-3xl'} max-h-[90vh] overflow-hidden flex flex-col p-0 ${colors.border} border-2`}>
        {/* Header with color */}
        <DialogHeader className={`${colors.header} ${colors.text} p-6 pb-4 border-b ${colors.border}`}>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              {icon && <div className={colors.accent}>{icon}</div>}
              <DialogTitle className={`text-2xl font-bold ${colors.text}`}>{title}</DialogTitle>
            </div>
            <Button
              variant="ghost"
              size="icon"
              onClick={() => onOpenChange(false)}
              className={`${colors.accent} hover:bg-white/50 dark:hover:bg-black/20`}
            >
              <X className="w-5 h-5" />
            </Button>
          </div>
        </DialogHeader>

        {/* Content with colored background */}
        <div className={`flex-1 overflow-y-auto p-6 ${colors.bg}`}>
          {children}
        </div>

        {/* Footer with back button */}
        <div className={`${colors.header} p-4 border-t ${colors.border} flex justify-start`}>
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            className={`${colors.accent} border-${color}-300 hover:bg-white/50 dark:hover:bg-black/20`}
          >
            رجوع
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { LucideIcon, FileText } from "lucide-react";
import { motion } from "framer-motion";

interface ActiveActionCardProps {
  title: string;
  description: string;
  icon: LucideIcon;
  iconColor?: string;
  actionButton?: {
    label: string;
    onClick: () => void;
    variant?: "default" | "destructive" | "outline" | "secondary";
    disabled?: boolean;
  };
  secondaryButton?: {
    label: string;
    onClick: () => void;
    variant?: "default" | "destructive" | "outline" | "secondary";
    disabled?: boolean;
    title?: string;
  };
  fieldReportButton?: {
    label: string;
    onClick: () => void;
    variant?: "default" | "destructive" | "outline" | "secondary";
    disabled?: boolean;
  };
  commitmentFormButton?: {
    label: string;
    onClick: () => void;
    variant?: "default" | "destructive" | "outline" | "secondary";
    disabled?: boolean;
  };
  additionalActions?: Array<{
    label: string;
    onClick: () => void;
  }>;
  progress?: {
    current: number;
    total: number;
    percentage: number;
  };
}

export function ActiveActionCard({
  title,
  description,
  icon: Icon,
  iconColor = "text-primary",
  actionButton,
  secondaryButton,
  fieldReportButton,
  commitmentFormButton,
  additionalActions,
  progress,
}: ActiveActionCardProps) {
  return (
    <div className="flex justify-center w-full">
      <motion.div
        initial={{ opacity: 0, y: 20, scale: 0.95 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0, y: -20, scale: 0.95 }}
        transition={{ 
          duration: 0.4, 
          ease: [0.4, 0, 0.2, 1]
        }}
        className="w-full max-w-2xl"
      >
        <Card className="p-4 sm:p-6 md:p-8 shadow-lg">
          {/* Header with Icon */}
          <motion.div 
            className="flex flex-col sm:flex-row items-center sm:items-start text-center sm:text-right gap-3 sm:gap-4 mb-4 sm:mb-6"
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.1, duration: 0.3 }}
          >
            <motion.div 
              className={`p-2 sm:p-3 rounded-lg bg-primary/10 ${iconColor} shrink-0`}
              whileHover={{ scale: 1.05, rotate: 5 }}
              transition={{ type: "spring", stiffness: 400, damping: 10 }}
            >
              <Icon className="w-6 h-6 sm:w-8 sm:h-8" />
            </motion.div>
            <div className="flex-1 min-w-0">
              <h2 className="text-xl sm:text-2xl font-bold text-foreground break-words">{title}</h2>
              {progress && (
                <p className="text-[11px] sm:text-sm text-muted-foreground mt-0.5 sm:mt-1">
                  المرحلة {progress.current} من {progress.total} • {progress.percentage}% مكتمل
                </p>
              )}
            </div>
          </motion.div>

          {/* Progress Bar */}
          {progress && (
            <motion.div 
              className="mb-4 sm:mb-6"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.2, duration: 0.3 }}
            >
              <div className="w-full bg-secondary rounded-full h-1.5 sm:h-2 overflow-hidden">
                <motion.div
                  className="bg-primary h-full rounded-full"
                  initial={{ width: 0 }}
                  animate={{ width: `${progress.percentage}%` }}
                  transition={{ delay: 0.3, duration: 0.8, ease: "easeOut" }}
                />
              </div>
            </motion.div>
          )}

          {/* Description */}
          <motion.p 
            className="text-muted-foreground mb-6 sm:mb-8 text-sm sm:text-lg leading-relaxed text-center sm:text-right"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.3, duration: 0.3 }}
          >
            {description}
          </motion.p>

          {/* Action Buttons */}
          <motion.div 
            className="flex flex-col gap-2 sm:gap-3"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4, duration: 0.3 }}
          >
            {fieldReportButton && (
              <motion.div
                whileHover={{ scale: 1.01 }}
                whileTap={{ scale: 0.99 }}
              >
                <Button
                  size="lg"
                  variant={fieldReportButton.variant || "default"}
                  onClick={fieldReportButton.onClick}
                  disabled={fieldReportButton.disabled}
                  className="w-full text-base sm:text-lg py-5 sm:py-6 flex items-center justify-center gap-2"
                >
                  <FileText className="w-5 h-5 shrink-0" />
                  {fieldReportButton.label}
                </Button>
              </motion.div>
            )}

            {commitmentFormButton && (
              <motion.div
                whileHover={{ scale: 1.01 }}
                whileTap={{ scale: 0.99 }}
              >
                <Button
                  size="lg"
                  variant={commitmentFormButton.variant || "outline"}
                  onClick={commitmentFormButton.onClick}
                  disabled={commitmentFormButton.disabled}
                  className="w-full text-base sm:text-lg py-5 sm:py-6 flex items-center justify-center gap-2 border-primary text-primary hover:bg-primary/5"
                >
                  <FileText className="w-5 h-5 shrink-0" />
                  {commitmentFormButton.label}
                </Button>
              </motion.div>
            )}

            {actionButton && (
              <motion.div
                whileHover={{ scale: 1.01 }}
                whileTap={{ scale: 0.99 }}
              >
                <Button
                  size="lg"
                  variant={actionButton.variant || "default"}
                  onClick={actionButton.onClick}
                  disabled={actionButton.disabled}
                  className="w-full text-base sm:text-lg py-5 sm:py-6"
                >
                  {actionButton.label}
                </Button>
              </motion.div>
            )}

            {secondaryButton && (
              <motion.div
                whileHover={{ scale: 1.01 }}
                whileTap={{ scale: 0.99 }}
              >
                <Button
                  size="lg"
                  variant={secondaryButton.variant || "outline"}
                  onClick={secondaryButton.onClick}
                  disabled={secondaryButton.disabled}
                  title={secondaryButton.title}
                  className="w-full h-11 sm:h-12 text-sm sm:text-base"
                >
                  {secondaryButton.label}
                </Button>
              </motion.div>
            )}
          </motion.div>

          {/* Additional Actions */}
          {additionalActions && additionalActions.length > 0 && (
            <motion.div 
              className="mt-4 sm:mt-6 pt-4 sm:pt-6 border-t"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.5, duration: 0.3 }}
            >
              <p className="text-[11px] sm:text-sm font-medium text-muted-foreground mb-2 sm:mb-3">
                ⚙️ إجراءات إضافية:
              </p>
              <div className="flex flex-wrap gap-2 justify-center sm:justify-start">
                {additionalActions.map((action, index) => (
                  <motion.div
                    key={index}
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                  >
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={action.onClick}
                      className="text-[11px] sm:text-sm h-8 px-2"
                    >
                      {action.label}
                    </Button>
                  </motion.div>
                ))}
              </div>
            </motion.div>
          )}
        </Card>
      </motion.div>
    </div>
  );
}

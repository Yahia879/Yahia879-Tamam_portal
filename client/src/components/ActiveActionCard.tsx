import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { LucideIcon } from "lucide-react";
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
        <Card className="p-8 shadow-lg">
          {/* Header with Icon */}
          <motion.div 
            className="flex items-center gap-4 mb-6"
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.1, duration: 0.3 }}
          >
            <motion.div 
              className={`p-3 rounded-lg bg-primary/10 ${iconColor}`}
              whileHover={{ scale: 1.05, rotate: 5 }}
              transition={{ type: "spring", stiffness: 400, damping: 10 }}
            >
              <Icon className="w-8 h-8" />
            </motion.div>
            <div className="flex-1">
              <h2 className="text-2xl font-bold text-foreground">{title}</h2>
              {progress && (
                <p className="text-sm text-muted-foreground mt-1">
                  المرحلة {progress.current} من {progress.total} • {progress.percentage}% مكتمل
                </p>
              )}
            </div>
          </motion.div>

          {/* Progress Bar */}
          {progress && (
            <motion.div 
              className="mb-6"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.2, duration: 0.3 }}
            >
              <div className="w-full bg-secondary rounded-full h-2 overflow-hidden">
                <motion.div
                  className="bg-primary h-2 rounded-full"
                  initial={{ width: 0 }}
                  animate={{ width: `${progress.percentage}%` }}
                  transition={{ delay: 0.3, duration: 0.8, ease: "easeOut" }}
                />
              </div>
            </motion.div>
          )}

          {/* Description */}
          <motion.p 
            className="text-muted-foreground mb-8 text-lg leading-relaxed"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.3, duration: 0.3 }}
          >
            {description}
          </motion.p>

          {/* Action Buttons */}
          <motion.div 
            className="flex flex-col gap-3"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4, duration: 0.3 }}
          >
            {actionButton && (
              <motion.div
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
              >
                <Button
                  size="lg"
                  variant={actionButton.variant || "default"}
                  onClick={actionButton.onClick}
                  disabled={actionButton.disabled}
                  className="w-full text-lg py-6"
                >
                  {actionButton.label}
                </Button>
              </motion.div>
            )}

            {secondaryButton && (
              <motion.div
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
              >
                <Button
                  size="lg"
                  variant={secondaryButton.variant || "outline"}
                  onClick={secondaryButton.onClick}
                  className="w-full"
                >
                  {secondaryButton.label}
                </Button>
              </motion.div>
            )}
          </motion.div>

          {/* Additional Actions */}
          {additionalActions && additionalActions.length > 0 && (
            <motion.div 
              className="mt-6 pt-6 border-t"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.5, duration: 0.3 }}
            >
              <p className="text-sm font-medium text-muted-foreground mb-3">
                ⚙️ إجراءات إضافية:
              </p>
              <div className="flex flex-wrap gap-2">
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
                      className="text-sm"
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

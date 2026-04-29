import { Check } from "lucide-react";
import { motion } from "framer-motion";

interface Step {
  id: string;
  label: string;
  order: number;
}

interface ProgressStepperProps {
  steps: Step[];
  currentStep: string;
  completedSteps: string[];
}

export function ProgressStepper({
  steps,
  currentStep,
  completedSteps,
}: ProgressStepperProps) {
  const currentStepIndex = steps.findIndex((s) => s.id === currentStep);
  const progress = ((currentStepIndex + 1) / steps.length) * 100;

  return (
    <div className="w-full max-w-4xl mx-auto mb-8">
      {/* Progress Bar */}
      <div className="relative">
        <div className="absolute top-5 left-0 right-0 h-1 bg-secondary rounded-full overflow-hidden">
          <motion.div
            className="h-full bg-primary"
            initial={{ width: 0 }}
            animate={{ width: `${progress}%` }}
            transition={{ duration: 0.8, ease: "easeInOut" }}
          />
        </div>

        {/* Steps */}
        <div className="relative flex justify-between">
          {steps.map((step, index) => {
            const isCompleted = completedSteps.includes(step.id);
            const isCurrent = step.id === currentStep;
            const isPast = index < currentStepIndex;

            return (
              <motion.div 
                key={step.id} 
                className="flex flex-col items-center"
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.1, duration: 0.3 }}
              >
                {/* Circle */}
                <motion.div
                  className={`
                    w-10 h-10 rounded-full flex items-center justify-center
                    border-2 z-10
                    ${
                      isCurrent
                        ? "bg-primary border-primary text-primary-foreground shadow-lg"
                        : isCompleted || isPast
                        ? "bg-primary border-primary text-primary-foreground"
                        : "bg-background border-border text-muted-foreground"
                    }
                  `}
                  animate={{
                    scale: isCurrent ? [1, 1.15, 1.1] : 1,
                  }}
                  transition={{
                    duration: 0.3,
                    ease: "easeOut"
                  }}
                  whileHover={{ scale: 1.15 }}
                >
                  {isCompleted || isPast ? (
                    <motion.div
                      initial={{ scale: 0, rotate: -180 }}
                      animate={{ scale: 1, rotate: 0 }}
                      transition={{ 
                        type: "spring", 
                        stiffness: 300, 
                        damping: 20 
                      }}
                    >
                      <Check className="w-5 h-5" />
                    </motion.div>
                  ) : (
                    <span className="text-sm font-bold">{step.order}</span>
                  )}
                </motion.div>

                {/* Label */}
                <motion.span
                  className={`
                    mt-2 text-xs text-center max-w-[80px]
                    ${
                      isCurrent
                        ? "font-bold text-foreground"
                        : isCompleted || isPast
                        ? "text-muted-foreground"
                        : "text-muted-foreground/50"
                    }
                  `}
                  animate={{
                    scale: isCurrent ? 1.05 : 1,
                  }}
                  transition={{ duration: 0.2 }}
                >
                  {step.label}
                </motion.span>
              </motion.div>
            );
          })}
        </div>
      </div>

      {/* Progress Text */}
      <motion.div 
        className="text-center mt-4"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.5, duration: 0.3 }}
      >
        <p className="text-sm text-muted-foreground">
          المرحلة {currentStepIndex + 1} من {steps.length} • {Math.round(progress)}% مكتمل
        </p>
      </motion.div>
    </div>
  );
}

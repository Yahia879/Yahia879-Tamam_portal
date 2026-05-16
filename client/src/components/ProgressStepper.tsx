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
  const totalSteps = steps.length;
  const progress = ((currentStepIndex + 0.5) / (totalSteps - 1 + 1)) * 100; // Adjusted for better visual alignment

  return (
    <div className="w-full mb-6 sm:mb-8">
      {/* Container for horizontal scroll on small screens */}
      <div className="overflow-x-auto pb-4 -mx-4 px-4 scrollbar-thin scrollbar-thumb-primary/20">
        <div className="relative min-w-[750px] lg:min-w-0 pt-2 pb-2">
          {/* Progress Bar Line */}
          <div className="absolute top-[1.625rem] sm:top-[2.125rem] left-0 right-0 h-0.5 sm:h-1 bg-secondary rounded-full overflow-hidden mx-[40px]">
            <motion.div
              className="h-full bg-primary"
              initial={{ width: 0 }}
              animate={{ width: `${(currentStepIndex / (totalSteps - 1)) * 100}%` }}
              transition={{ duration: 0.8, ease: "easeInOut" }}
            />
          </div>

          {/* Steps */}
          <div className="relative flex justify-between gap-2">
            {steps.map((step, index) => {
              const isCompleted = completedSteps.includes(step.id);
              const isCurrent = step.id === currentStep;
              const isPast = index < currentStepIndex;

              return (
                <motion.div 
                  key={step.id} 
                  className="flex flex-col items-center flex-1 min-w-[80px]"
                  initial={{ opacity: 0, y: -10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.05, duration: 0.3 }}
                >
                  {/* Circle */}
                  <motion.div
                    className={`
                      w-8 h-8 sm:w-11 sm:h-11 rounded-full flex items-center justify-center
                      border-2 z-10 transition-colors duration-300
                      ${
                        isCurrent
                          ? "bg-primary border-primary text-primary-foreground shadow-md ring-4 ring-primary/20"
                          : isCompleted || isPast
                          ? "bg-primary border-primary text-primary-foreground"
                          : "bg-background border-border text-muted-foreground"
                      }
                    `}
                    animate={{
                      scale: isCurrent ? [1, 1.1, 1.05] : 1,
                    }}
                    transition={{
                      duration: 0.3,
                      ease: "easeOut"
                    }}
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
                        <Check className="w-4 h-4 sm:w-6 sm:h-6" />
                      </motion.div>
                    ) : (
                      <span className="text-xs sm:text-base font-bold font-['Cairo'] leading-none">
                        {step.order}
                      </span>
                    )}
                  </motion.div>

                  {/* Label */}
                  <motion.span
                    className={`
                      mt-2.5 sm:mt-3 text-[10px] sm:text-xs text-center px-1 leading-tight font-medium
                      ${
                        isCurrent
                          ? "text-foreground font-bold"
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
      </div>

      {/* Progress Text */}
      <motion.div 
        className="text-center mt-2"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.5, duration: 0.3 }}
      >
        <p className="text-[11px] sm:text-sm text-muted-foreground font-medium">
          المرحلة {currentStepIndex + 1} من {totalSteps} • {Math.round((currentStepIndex / (totalSteps - 1)) * 100)}% مكتمل
        </p>
      </motion.div>
    </div>
  );
}

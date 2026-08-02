import * as React from "react";
import * as ProgressPrimitive from "@radix-ui/react-progress";

import { cn } from "@/lib/utils";

function Progress({
  className,
  value,
  ...props
}: React.ComponentProps<typeof ProgressPrimitive.Root>) {
  const safeValue = Math.min(100, Math.max(0, value || 0));

  return (
    <ProgressPrimitive.Root
      data-slot="progress"
      className={cn(
        "bg-slate-200 dark:bg-slate-700 relative h-2.5 w-full overflow-hidden rounded-full",
        className
      )}
      {...props}
    >
      <ProgressPrimitive.Indicator
        data-slot="progress-indicator"
        className="bg-emerald-600 h-full transition-all duration-500 ease-out rounded-full"
        style={{ width: `${safeValue}%` }}
      />
    </ProgressPrimitive.Root>
  );
}

export { Progress };

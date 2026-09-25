import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";

import { cn } from "@/lib/utils";

const badgeVariants = cva(
  "inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-bold transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 backdrop-blur-md",
  {
    variants: {
      variant: {
        default:
          "border-white/30 bg-primary/90 text-primary-foreground shadow-[0_2px_10px_rgba(0,113,227,0.35)]",
        secondary:
          "border-white/20 dark:border-white/10 bg-secondary/80 text-secondary-foreground shadow-xs",
        destructive:
          "border-white/30 bg-destructive/90 text-destructive-foreground shadow-[0_2px_10px_rgba(239,68,68,0.35)]",
        outline:
          "border-white/30 dark:border-white/10 bg-white/40 dark:bg-white/5 text-foreground shadow-xs",
        glass:
          "border-white/30 dark:border-white/15 bg-white/60 dark:bg-white/10 text-foreground shadow-xs",
        success:
          "border-emerald-400/40 bg-emerald-500/80 text-white shadow-[0_2px_10px_rgba(16,185,129,0.35)]",
        warning:
          "border-amber-400/40 bg-amber-500/80 text-black font-bold shadow-[0_2px_10px_rgba(245,158,11,0.35)]",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  },
);

export interface BadgeProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof badgeVariants> {}

function Badge({ className, variant, ...props }: BadgeProps) {
  return (
    <div className={cn(badgeVariants({ variant }), className)} {...props} />
  );
}

export { Badge, badgeVariants };

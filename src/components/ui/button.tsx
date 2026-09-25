import * as React from "react";
import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";

import { cn } from "@/lib/utils";

const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-xl text-sm font-bold ring-offset-background transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 active:scale-[0.97] [&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0 select-none",
  {
    variants: {
      variant: {
        default:
          "bg-primary text-primary-foreground shadow-[0_8px_20px_-4px_rgba(0,113,227,0.4)] hover:shadow-[0_12px_24px_-4px_rgba(0,113,227,0.55)] hover:bg-primary/90 border border-white/20 active:translate-y-0.5",
        destructive:
          "bg-destructive text-destructive-foreground shadow-[0_8px_20px_-4px_rgba(239,68,68,0.4)] hover:shadow-[0_12px_24px_-4px_rgba(239,68,68,0.55)] hover:bg-destructive/90 border border-white/20 active:translate-y-0.5",
        outline:
          "border border-white/30 dark:border-white/10 bg-white/40 dark:bg-white/5 backdrop-blur-md hover:bg-white/70 dark:hover:bg-white/15 text-foreground shadow-xs hover:shadow-md",
        secondary:
          "bg-secondary/90 backdrop-blur-md text-secondary-foreground hover:bg-secondary border border-white/20 dark:border-white/5 shadow-xs",
        ghost:
          "hover:bg-white/40 dark:hover:bg-white/10 hover:text-foreground text-muted-foreground",
        link: "text-primary underline-offset-4 hover:underline",
        glass:
          "bg-white/60 dark:bg-white/10 backdrop-blur-xl border border-white/40 dark:border-white/15 text-foreground shadow-[0_4px_16px_rgba(0,0,0,0.06)] hover:bg-white/80 dark:hover:bg-white/20 hover:shadow-[0_8px_24px_rgba(0,0,0,0.12)]",
        "glass-primary":
          "bg-primary/85 backdrop-blur-xl border border-white/30 text-white shadow-[0_8px_25px_-5px_rgba(0,113,227,0.5)] hover:bg-primary hover:shadow-[0_12px_30px_-5px_rgba(0,113,227,0.65)]",
      },
      size: {
        default: "h-10 px-4 py-2",
        sm: "h-8.5 rounded-lg px-3 text-xs",
        lg: "h-11.5 rounded-2xl px-8 text-base",
        icon: "h-10 w-10 rounded-xl",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  },
);

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean;
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, asChild = false, ...props }, ref) => {
    const Comp = asChild ? Slot : "button";
    return (
      <Comp
        className={cn(buttonVariants({ variant, size, className }))}
        ref={ref}
        {...props}
      />
    );
  },
);
Button.displayName = "Button";

export { Button, buttonVariants };

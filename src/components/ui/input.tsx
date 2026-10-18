import * as React from "react";

import { cn } from "@/lib/utils";

const Input = React.forwardRef<HTMLInputElement, React.ComponentProps<"input">>(
  ({ className, type, dir, ...props }, ref) => {
    const isDhivehi =
      dir === 'rtl' ||
      className?.includes('font-faruma') ||
      props.name?.includes('_dv') ||
      props.id?.includes('_dv');

    const isNumericOrCode =
      type === 'number' ||
      type === 'tel' ||
      type === 'date' ||
      type === 'time' ||
      type === 'datetime-local' ||
      props.inputMode === 'numeric' ||
      props.inputMode === 'decimal' ||
      className?.includes('font-mono') ||
      className?.includes('cart-qty-input');

    // Force LTR for all numeric/code inputs; default to LTR unless marked Dhivehi
    const resolvedDir = isNumericOrCode ? 'ltr' : (dir ?? (isDhivehi ? 'rtl' : 'ltr'));

    return (
      <input
        type={type}
        dir={resolvedDir}
        className={cn(
          "flex h-10 w-full rounded-xl apple-glass-input px-3.5 py-2 text-base ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium file:text-foreground placeholder:text-muted-foreground/60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 md:text-sm font-semibold text-foreground transition-all duration-200",
          isNumericOrCode && "[direction:ltr!important]",
          className,
        )}
        ref={ref}
        {...props}
      />
    );
  },
);
Input.displayName = "Input";

export { Input };

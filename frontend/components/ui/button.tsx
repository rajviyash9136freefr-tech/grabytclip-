import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@frontend/lib/utils";

const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 rounded-sm font-medium transition-colors duration-150 focus-visible:outline-2 focus-visible:outline-offset-2 disabled:pointer-events-none disabled:opacity-50 select-none whitespace-nowrap",
  {
    variants: {
      variant: {
        accent:
          "bg-[var(--accent)] text-[var(--on-accent)] hover:bg-[var(--accent-hover)] active:bg-[var(--accent-pressed)]",
        secondary:
          "bg-[var(--surface-3)] text-[var(--text-primary)] hover:bg-[var(--surface-4)] border border-[var(--border-default)]",
        ghost: "text-[var(--text-primary)] hover:bg-[var(--surface-3)]",
        outline:
          "border border-[var(--border-default)] text-[var(--text-primary)] hover:bg-[var(--surface-3)]",
        danger: "bg-[var(--danger)] text-[var(--text-inverse)] hover:opacity-90",
        link: "text-[var(--accent)] underline-offset-2 hover:underline",
      },
      size: {
        sm: "h-7 px-3 text-[13px]",
        md: "h-9 px-4 text-[13px]",
        lg: "h-12 px-6 text-[16px]",
        icon: "h-8 w-8",
        "icon-sm": "h-6 w-6",
      },
    },
    defaultVariants: {
      variant: "accent",
      size: "md",
    },
  },
);

export interface ButtonProps
  extends
    React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, ...props }, ref) => (
    <button
      ref={ref}
      className={cn(buttonVariants({ variant, size }), className)}
      {...props}
    />
  ),
);
Button.displayName = "Button";

export { Button, buttonVariants };

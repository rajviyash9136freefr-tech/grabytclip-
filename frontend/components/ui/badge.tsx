import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@frontend/lib/utils";

const badgeVariants = cva(
  "inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-[11px] font-medium leading-4",
  {
    variants: {
      variant: {
        default: "bg-[var(--surface-3)] text-[var(--text-primary)]",
        accent: "bg-[var(--accent-subtle)] text-[var(--text-primary)]",
        success: "bg-[rgba(31,169,104,0.14)] text-[var(--success-strong)]",
        warning: "bg-[rgba(245,158,11,0.14)] text-[var(--warning-strong)]",
        danger: "bg-[rgba(229,72,77,0.14)] text-[var(--danger-strong)]",
        info: "bg-[rgba(46,144,250,0.14)] text-[var(--info-strong)]",
        outline: "border border-[var(--border-default)] text-[var(--text-secondary)]",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  },
);

export interface BadgeProps
  extends React.HTMLAttributes<HTMLSpanElement>, VariantProps<typeof badgeVariants> {}

function Badge({ className, variant, ...props }: BadgeProps) {
  return <span className={cn(badgeVariants({ variant }), className)} {...props} />;
}

export { Badge, badgeVariants };

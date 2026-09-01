import * as React from "react";
import { cn } from "@/lib/utils";

export type InputProps = React.InputHTMLAttributes<HTMLInputElement>;

const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ className, type, ...props }, ref) => (
    <input
      type={type}
      ref={ref}
      className={cn(
        "flex h-9 w-full rounded-sm border border-[var(--border-default)] bg-[var(--surface-2)] px-3 py-1 text-[13px] text-[var(--text-primary)] transition-colors duration-150",
        "placeholder:text-[var(--text-tertiary)]",
        "hover:border-[var(--border-strong)]",
        "focus:border-[var(--border-focus)] focus:outline-2 focus:outline-offset-2 focus:outline-[var(--border-focus)]",
        "disabled:cursor-not-allowed disabled:opacity-50",
        className,
      )}
      {...props}
    />
  ),
);
Input.displayName = "Input";

export { Input };

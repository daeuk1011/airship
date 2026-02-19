import { type ButtonHTMLAttributes } from "react";
import { Spinner } from "@/shared/ui/spinner";

const variants = {
  primary:
    "bg-accent text-[#08090d] font-medium hover:bg-accent-bright hover:shadow-[0_0_20px_rgba(6,182,212,0.3)] disabled:opacity-50",
  destructive:
    "bg-error/10 text-error border border-error/30 hover:bg-error/20 disabled:opacity-50",
  outline:
    "border border-white/10 text-foreground-2 hover:text-foreground hover:border-white/20 hover:bg-white/[0.04]",
  ghost:
    "text-foreground-2 hover:text-foreground hover:bg-white/[0.06]",
} as const;

const sizes = {
  sm: "px-3 py-1 text-sm rounded-md",
  md: "px-4 py-2 text-sm rounded-lg",
} as const;

type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: keyof typeof variants;
  size?: "sm" | "md";
  loading?: boolean;
};

export function Button({
  variant = "primary",
  size = "md",
  loading,
  className = "",
  disabled,
  children,
  ...props
}: ButtonProps) {
  return (
    <button
      className={`inline-flex items-center justify-center gap-2 ${sizes[size]} ${variants[variant]} transition-all cursor-pointer ${className}`}
      disabled={disabled || loading}
      {...props}
    >
      {loading && <Spinner size="sm" />}
      {children}
    </button>
  );
}

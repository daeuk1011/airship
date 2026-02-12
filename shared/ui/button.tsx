import { type ButtonHTMLAttributes } from "react";

const variants = {
  primary:
    "bg-foreground text-background hover:bg-foreground/90 disabled:opacity-50",
  destructive:
    "bg-red-600 text-white hover:bg-red-700 disabled:opacity-50",
  outline: "border border-foreground/20 hover:bg-foreground/5",
  ghost: "text-foreground/50 hover:text-foreground hover:bg-foreground/5",
} as const;

const sizes = {
  sm: "px-3 py-1 text-sm rounded",
  md: "px-4 py-2 text-sm rounded-md",
} as const;

type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: keyof typeof variants;
  size?: "sm" | "md";
};

export function Button({
  variant = "primary",
  size = "md",
  className = "",
  ...props
}: ButtonProps) {
  return (
    <button
      className={`${sizes[size]} ${variants[variant]} transition-colors ${className}`}
      {...props}
    />
  );
}

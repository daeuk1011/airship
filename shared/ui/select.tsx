import { type SelectHTMLAttributes } from "react";

type SelectProps = SelectHTMLAttributes<HTMLSelectElement>;

export function Select({ className = "", ...props }: SelectProps) {
  return (
    <select
      className={`px-2 py-1 text-sm border border-foreground/20 rounded bg-background ${className}`}
      {...props}
    />
  );
}

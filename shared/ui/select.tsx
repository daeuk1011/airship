import { type SelectHTMLAttributes } from "react";

type SelectProps = SelectHTMLAttributes<HTMLSelectElement>;

export function Select({ className = "", ...props }: SelectProps) {
  return (
    <select
      className={`px-2 py-1 text-sm border border-white/10 rounded-md bg-[#0d1117] focus:outline-none focus:border-accent/50 focus:ring-1 focus:ring-accent/30 transition-colors ${className}`}
      {...props}
    />
  );
}

import { forwardRef, type InputHTMLAttributes } from "react";

const inputSizes = {
  sm: "px-2 py-1 text-sm border border-white/10 rounded-md bg-white/[0.04] focus:outline-none focus:border-accent/50 focus:ring-1 focus:ring-accent/30 transition-colors placeholder:text-foreground-3",
  md: "px-3 py-2 text-sm border border-white/10 rounded-lg bg-white/[0.04] focus:outline-none focus:border-accent/50 focus:ring-2 focus:ring-accent/30 transition-colors placeholder:text-foreground-3",
} as const;

type InputProps = InputHTMLAttributes<HTMLInputElement> & {
  inputSize?: "sm" | "md";
};

export const Input = forwardRef<HTMLInputElement, InputProps>(
  function Input({ inputSize = "md", className = "", ...props }, ref) {
    return (
      <input
        ref={ref}
        className={`${inputSizes[inputSize]} ${className}`}
        {...props}
      />
    );
  }
);

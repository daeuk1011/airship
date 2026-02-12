import { forwardRef, type InputHTMLAttributes } from "react";

const inputSizes = {
  sm: "px-2 py-1 text-sm border border-foreground/20 rounded bg-background",
  md: "px-3 py-2 text-sm border border-foreground/20 rounded-md bg-background focus:outline-none focus:ring-2 focus:ring-foreground/20",
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

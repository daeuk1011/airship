import { type InputHTMLAttributes } from "react";

const inputSizes = {
  sm: "px-2 py-1 text-sm border border-foreground/20 rounded bg-background",
  md: "px-3 py-2 text-sm border border-foreground/20 rounded-md bg-background focus:outline-none focus:ring-2 focus:ring-foreground/20",
} as const;

type InputProps = InputHTMLAttributes<HTMLInputElement> & {
  inputSize?: "sm" | "md";
};

export function Input({
  inputSize = "md",
  className = "",
  ...props
}: InputProps) {
  return (
    <input
      className={`${inputSizes[inputSize]} ${className}`}
      {...props}
    />
  );
}

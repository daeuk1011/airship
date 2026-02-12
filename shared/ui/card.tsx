import { type HTMLAttributes } from "react";

type DivProps = HTMLAttributes<HTMLDivElement>;

export function Card({ className = "", ...props }: DivProps) {
  return (
    <div
      className={`border border-foreground/10 rounded-lg p-5 ${className}`}
      {...props}
    />
  );
}

export function CardList({ className = "", ...props }: DivProps) {
  return (
    <div
      className={`border border-foreground/10 rounded-lg divide-y divide-foreground/10 ${className}`}
      {...props}
    />
  );
}

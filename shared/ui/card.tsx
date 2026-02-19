import { type HTMLAttributes } from "react";

type DivProps = HTMLAttributes<HTMLDivElement>;

export function Card({ className = "", ...props }: DivProps) {
  return (
    <div
      className={`glass rounded-xl p-5 animate-fade-in ${className}`}
      {...props}
    />
  );
}

export function CardList({ className = "", ...props }: DivProps) {
  return (
    <div
      className={`glass rounded-xl divide-y divide-white/[0.06] overflow-hidden ${className}`}
      {...props}
    />
  );
}

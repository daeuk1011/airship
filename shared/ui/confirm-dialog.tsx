"use client";

import { useState, useEffect, useRef, type ReactNode } from "react";
import { Button } from "@/shared/ui/button";

const variants = {
  danger: "destructive",
  default: "primary",
} as const;

export function ConfirmDialog({
  title,
  description,
  confirmLabel = "Confirm",
  variant = "default",
  onConfirm,
  children,
}: {
  title: string;
  description?: string;
  confirmLabel?: string;
  variant?: "danger" | "default";
  onConfirm: () => void;
  children: (open: () => void) => ReactNode;
}) {
  const [isOpen, setIsOpen] = useState(false);
  const dialogRef = useRef<HTMLDialogElement>(null);

  useEffect(() => {
    const el = dialogRef.current;
    if (!el) return;
    if (isOpen) {
      el.showModal();
    } else {
      el.close();
    }
  }, [isOpen]);

  useEffect(() => {
    const el = dialogRef.current;
    if (!el) return;
    const handleClose = () => setIsOpen(false);
    el.addEventListener("close", handleClose);
    return () => el.removeEventListener("close", handleClose);
  }, []);

  return (
    <>
      {children(() => setIsOpen(true))}
      <dialog
        ref={dialogRef}
        className="m-auto rounded-xl border border-white/[0.08] bg-[#0d1117]/95 backdrop-blur-xl p-0 shadow-2xl backdrop:bg-black/60 backdrop:backdrop-blur-sm max-w-sm w-full animate-scale-in"
        onClick={(e) => {
          if (e.target === dialogRef.current) setIsOpen(false);
        }}
      >
        <div className="p-6">
          <h3 className="text-lg font-semibold text-foreground">{title}</h3>
          {description && (
            <p className="text-sm text-foreground-2 mt-2">{description}</p>
          )}
          <div className="flex justify-end gap-2 mt-6">
            <Button variant="outline" size="sm" onClick={() => setIsOpen(false)}>
              Cancel
            </Button>
            <Button
              variant={variants[variant]}
              size="sm"
              onClick={() => {
                setIsOpen(false);
                onConfirm();
              }}
            >
              {confirmLabel}
            </Button>
          </div>
        </div>
      </dialog>
    </>
  );
}

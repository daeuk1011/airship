"use client";

import { useRef, useCallback, type ReactNode } from "react";
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
  const dialogRef = useRef<HTMLDialogElement>(null);

  const open = useCallback(() => {
    dialogRef.current?.showModal();
  }, []);

  const close = useCallback(() => {
    dialogRef.current?.close();
  }, []);

  return (
    <>
      {children(open)}
      <dialog
        ref={dialogRef}
        className="rounded-xl border border-foreground/10 bg-background p-0 shadow-xl backdrop:bg-black/50 max-w-sm w-full"
        onClick={(e) => {
          if (e.target === dialogRef.current) close();
        }}
      >
        <div className="p-6">
          <h3 className="text-lg font-semibold">{title}</h3>
          {description && (
            <p className="text-sm text-foreground/60 mt-2">{description}</p>
          )}
          <div className="flex justify-end gap-2 mt-6">
            <Button variant="outline" size="sm" onClick={close}>
              Cancel
            </Button>
            <Button
              variant={variants[variant]}
              size="sm"
              onClick={() => {
                close();
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

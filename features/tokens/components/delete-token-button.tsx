"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Button } from "@/shared/ui/button";
import { ConfirmDialog } from "@/shared/ui/confirm-dialog";
import { useToast } from "@/shared/ui/toast";

export function DeleteTokenButton({
  tokenId,
  tokenName,
}: {
  tokenId: string;
  tokenName: string;
}) {
  const router = useRouter();
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);

  async function handleDelete() {
    setLoading(true);
    try {
      const res = await fetch(`/api/tokens/${tokenId}`, { method: "DELETE" });
      if (res.ok) {
        toast(`Token "${tokenName}" revoked`, "success");
        router.refresh();
      } else {
        toast("Failed to revoke token", "error");
      }
    } catch {
      toast("Network error", "error");
    } finally {
      setLoading(false);
    }
  }

  return (
    <ConfirmDialog
      title="Revoke Token"
      description={`Are you sure you want to revoke "${tokenName}"? This action cannot be undone.`}
      confirmLabel="Revoke"
      variant="danger"
      onConfirm={handleDelete}
    >
      {(open) => (
        <Button
          variant="ghost"
          size="sm"
          onClick={open}
          loading={loading}
          className="text-error/70 hover:text-error"
        >
          Revoke
        </Button>
      )}
    </ConfirmDialog>
  );
}

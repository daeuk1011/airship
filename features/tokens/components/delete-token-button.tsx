"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Button } from "@/shared/ui/button";

export function DeleteTokenButton({
  tokenId,
  tokenName,
}: {
  tokenId: string;
  tokenName: string;
}) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  async function handleDelete() {
    if (!confirm(`Revoke token "${tokenName}"?`)) return;

    setLoading(true);
    try {
      const res = await fetch(`/api/tokens/${tokenId}`, { method: "DELETE" });
      if (res.ok) {
        router.refresh();
      }
    } catch {
      // ignore
    } finally {
      setLoading(false);
    }
  }

  return (
    <Button
      variant="ghost"
      size="sm"
      onClick={handleDelete}
      disabled={loading}
      className="text-red-500 hover:text-red-600"
    >
      {loading ? "..." : "Revoke"}
    </Button>
  );
}

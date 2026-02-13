"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Button } from "@/shared/ui/button";

export function ToggleUpdateButton({
  appKey,
  updateId,
  enabled,
}: {
  appKey: string;
  updateId: string;
  enabled: boolean;
}) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  async function handleToggle() {
    const action = enabled ? "disable" : "enable";
    if (!confirm(`${enabled ? "Disable" : "Enable"} this update?`)) return;

    setLoading(true);
    try {
      const res = await fetch(
        `/api/apps/${appKey}/updates/${updateId}/toggle`,
        { method: "POST" }
      );
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
    <div className="space-y-2">
      <p className="text-sm font-medium">Status</p>
      <Button
        variant={enabled ? "outline" : "primary"}
        size="sm"
        onClick={handleToggle}
        disabled={loading}
      >
        {loading ? "..." : enabled ? "Disable Update" : "Enable Update"}
      </Button>
    </div>
  );
}

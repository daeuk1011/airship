"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Button } from "@/shared/ui/button";

export function DeleteAppButton({
  appKey,
  appName,
}: {
  appKey: string;
  appName: string;
}) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  async function handleDelete() {
    if (!confirm(`Delete "${appName}" and all its data?`)) return;

    setLoading(true);
    try {
      const res = await fetch(`/api/apps/${appKey}`, { method: "DELETE" });
      if (res.ok) {
        router.push("/dashboard/apps");
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
      variant="destructive"
      size="sm"
      onClick={handleDelete}
      disabled={loading}
    >
      {loading ? "..." : "Delete App"}
    </Button>
  );
}

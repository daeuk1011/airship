"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Button } from "@/shared/ui/button";
import { Input } from "@/shared/ui/input";

export function DeleteAppButton({
  appKey,
  appName,
}: {
  appKey: string;
  appName: string;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [confirmName, setConfirmName] = useState("");
  const [deleteS3, setDeleteS3] = useState(false);
  const [loading, setLoading] = useState(false);

  const nameMatches = confirmName === appName;

  async function handleDelete() {
    if (!nameMatches) return;

    setLoading(true);
    try {
      const res = await fetch(`/api/apps/${appKey}`, {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ deleteS3 }),
      });
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

  if (!open) {
    return (
      <Button variant="destructive" size="sm" onClick={() => setOpen(true)}>
        Delete App
      </Button>
    );
  }

  return (
    <div className="border border-red-500/30 rounded-lg p-4 space-y-3 bg-red-500/[0.03]">
      <p className="text-sm text-foreground/70">
        Type <span className="font-mono font-semibold text-foreground">{appName}</span> to confirm deletion.
      </p>
      <Input
        inputSize="sm"
        value={confirmName}
        onChange={(e) => setConfirmName(e.target.value)}
        placeholder={appName}
        autoFocus
      />
      <label className="flex items-center gap-2 text-sm text-foreground/60 cursor-pointer select-none">
        <input
          type="checkbox"
          checked={deleteS3}
          onChange={(e) => setDeleteS3(e.target.checked)}
          className="accent-red-600"
        />
        Also delete S3 objects
      </label>
      <div className="flex gap-2">
        <Button
          variant="destructive"
          size="sm"
          onClick={handleDelete}
          disabled={!nameMatches || loading}
        >
          {loading ? "Deleting..." : "Delete"}
        </Button>
        <Button
          variant="outline"
          size="sm"
          onClick={() => {
            setOpen(false);
            setConfirmName("");
            setDeleteS3(false);
          }}
          disabled={loading}
        >
          Cancel
        </Button>
      </div>
    </div>
  );
}

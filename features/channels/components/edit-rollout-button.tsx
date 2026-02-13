"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Button } from "@/shared/ui/button";
import { Input } from "@/shared/ui/input";

export function EditRolloutButton({
  appKey,
  channelId,
  assignmentId,
  currentPercent,
}: {
  appKey: string;
  channelId: string;
  assignmentId: string;
  currentPercent: number;
}) {
  const router = useRouter();
  const [editing, setEditing] = useState(false);
  const [value, setValue] = useState(String(currentPercent));
  const [loading, setLoading] = useState(false);

  async function handleSave() {
    const num = Number(value);
    if (isNaN(num) || num < 0 || num > 100) return;

    setLoading(true);
    try {
      const res = await fetch(
        `/api/apps/${appKey}/channels/${channelId}/rollout`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ assignmentId, rolloutPercent: num }),
        }
      );
      if (res.ok) {
        setEditing(false);
        router.refresh();
      }
    } catch {
      // ignore
    } finally {
      setLoading(false);
    }
  }

  if (!editing) {
    return (
      <button
        onClick={() => setEditing(true)}
        className="text-xs text-foreground/50 hover:text-foreground transition-colors cursor-pointer"
      >
        {currentPercent}%
      </button>
    );
  }

  return (
    <div className="flex items-center gap-1">
      <Input
        inputSize="sm"
        type="number"
        min={0}
        max={100}
        value={value}
        onChange={(e) => setValue(e.target.value)}
        className="w-16"
      />
      <Button size="sm" onClick={handleSave} disabled={loading}>
        {loading ? "..." : "Save"}
      </Button>
      <Button
        size="sm"
        variant="ghost"
        onClick={() => {
          setEditing(false);
          setValue(String(currentPercent));
        }}
      >
        Cancel
      </Button>
    </div>
  );
}

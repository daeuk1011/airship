"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Button } from "@/shared/ui/button";
import { Input } from "@/shared/ui/input";
import { Select } from "@/shared/ui/select";

export function RollbackButton({
  appKey,
  updateId,
  channels,
}: {
  appKey: string;
  updateId: string;
  channels: string[];
}) {
  const router = useRouter();
  const [channel, setChannel] = useState(channels[0] ?? "production");
  const [reason, setReason] = useState("");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState("");

  async function handleRollback() {
    if (!confirm(`Rollback ${channel} channel to this update?`)) return;

    setLoading(true);
    setResult("");

    try {
      const res = await fetch(
        `/api/apps/${appKey}/updates/${updateId}/rollback`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ channelName: channel, reason }),
        }
      );

      const data = await res.json();
      if (res.ok) {
        setResult("Rollback successful");
        router.refresh();
      } else {
        setResult(data.error ?? "Rollback failed");
      }
    } catch {
      setResult("Network error");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="space-y-2">
      <p className="text-sm font-medium">Rollback</p>
      <div className="flex items-center gap-2">
        <Select
          value={channel}
          onChange={(e) => setChannel(e.target.value)}
        >
          {channels.map((ch) => (
            <option key={ch} value={ch}>
              {ch}
            </option>
          ))}
        </Select>
        <Input
          inputSize="sm"
          type="text"
          value={reason}
          onChange={(e) => setReason(e.target.value)}
          placeholder="Reason (optional)"
          className="flex-1"
        />
        <Button
          variant="destructive"
          size="sm"
          onClick={handleRollback}
          disabled={loading}
        >
          {loading ? "..." : "Rollback"}
        </Button>
      </div>
      {result && (
        <p className="text-xs text-foreground/60">{result}</p>
      )}
    </div>
  );
}

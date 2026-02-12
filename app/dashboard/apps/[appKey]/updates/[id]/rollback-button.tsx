"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

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
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${getSecret()}`,
          },
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
        <select
          value={channel}
          onChange={(e) => setChannel(e.target.value)}
          className="px-2 py-1 text-sm border border-foreground/20 rounded bg-background"
        >
          {channels.map((ch) => (
            <option key={ch} value={ch}>
              {ch}
            </option>
          ))}
        </select>
        <input
          type="text"
          value={reason}
          onChange={(e) => setReason(e.target.value)}
          placeholder="Reason (optional)"
          className="px-2 py-1 text-sm border border-foreground/20 rounded bg-background flex-1"
        />
        <button
          onClick={handleRollback}
          disabled={loading}
          className="px-3 py-1 text-sm bg-red-600 text-white rounded hover:bg-red-700 disabled:opacity-50 transition-colors"
        >
          {loading ? "..." : "Rollback"}
        </button>
      </div>
      {result && (
        <p className="text-xs text-foreground/60">{result}</p>
      )}
    </div>
  );
}

function getSecret(): string {
  if (typeof window !== "undefined") {
    let secret = localStorage.getItem("airship_admin_secret");
    if (!secret) {
      secret = prompt("Enter admin secret:") ?? "";
      if (secret) localStorage.setItem("airship_admin_secret", secret);
    }
    return secret;
  }
  return "";
}

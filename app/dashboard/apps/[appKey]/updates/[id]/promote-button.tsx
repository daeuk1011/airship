"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

export function PromoteButton({
  appKey,
  updateId,
  channels,
}: {
  appKey: string;
  updateId: string;
  channels: string[];
}) {
  const router = useRouter();
  const [fromChannel, setFromChannel] = useState(
    channels.includes("staging") ? "staging" : channels[0] ?? ""
  );
  const [toChannel, setToChannel] = useState(
    channels.includes("production") ? "production" : channels[1] ?? ""
  );
  const [rollout, setRollout] = useState("100");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState("");

  async function handlePromote() {
    if (!confirm(`Promote this update from ${fromChannel} to ${toChannel}?`))
      return;

    setLoading(true);
    setResult("");

    try {
      const res = await fetch(
        `/api/apps/${appKey}/updates/${updateId}/promote`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${getSecret()}`,
          },
          body: JSON.stringify({
            fromChannel,
            toChannel,
            rolloutPercent: Number(rollout),
          }),
        }
      );

      const data = await res.json();
      if (res.ok) {
        setResult("Promote successful");
        router.refresh();
      } else {
        setResult(data.error ?? "Promote failed");
      }
    } catch {
      setResult("Network error");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="space-y-2">
      <p className="text-sm font-medium">Promote</p>
      <div className="flex items-center gap-2 flex-wrap">
        <select
          value={fromChannel}
          onChange={(e) => setFromChannel(e.target.value)}
          className="px-2 py-1 text-sm border border-foreground/20 rounded bg-background"
        >
          {channels.map((ch) => (
            <option key={ch} value={ch}>
              {ch}
            </option>
          ))}
        </select>
        <span className="text-foreground/40 text-sm">&rarr;</span>
        <select
          value={toChannel}
          onChange={(e) => setToChannel(e.target.value)}
          className="px-2 py-1 text-sm border border-foreground/20 rounded bg-background"
        >
          {channels.map((ch) => (
            <option key={ch} value={ch}>
              {ch}
            </option>
          ))}
        </select>
        <input
          type="number"
          min="0"
          max="100"
          value={rollout}
          onChange={(e) => setRollout(e.target.value)}
          className="w-16 px-2 py-1 text-sm border border-foreground/20 rounded bg-background"
        />
        <span className="text-xs text-foreground/50">%</span>
        <button
          onClick={handlePromote}
          disabled={loading}
          className="px-3 py-1 text-sm bg-foreground text-background rounded hover:bg-foreground/90 disabled:opacity-50 transition-colors"
        >
          {loading ? "..." : "Promote"}
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

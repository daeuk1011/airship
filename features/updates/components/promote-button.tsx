"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Button } from "@/shared/ui/button";
import { Input } from "@/shared/ui/input";
import { Select } from "@/shared/ui/select";
import { ConfirmDialog } from "@/shared/ui/confirm-dialog";
import { useToast } from "@/shared/ui/toast";

export function PromoteButton({
  appKey,
  updateId,
  channels,
  assignedChannels = [],
}: {
  appKey: string;
  updateId: string;
  channels: string[];
  assignedChannels?: string[];
}) {
  const router = useRouter();
  const { toast } = useToast();
  const [fromChannel, setFromChannel] = useState(
    assignedChannels.includes("staging")
      ? "staging"
      : assignedChannels[0] ?? channels[0] ?? ""
  );
  const [toChannel, setToChannel] = useState(
    channels.includes("production") ? "production" : channels[1] ?? ""
  );
  const [rollout, setRollout] = useState("100");
  const [loading, setLoading] = useState(false);

  async function handlePromote() {
    setLoading(true);

    try {
      const res = await fetch(
        `/api/apps/${appKey}/updates/${updateId}/promote`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            fromChannel,
            toChannel,
            rolloutPercent: Number(rollout),
          }),
        }
      );

      const data = await res.json();
      if (res.ok) {
        toast("Promote successful", "success");
        router.refresh();
      } else {
        toast(data.error ?? "Promote failed", "error");
      }
    } catch {
      toast("Network error", "error");
    } finally {
      setLoading(false);
    }
  }

  const noAssignment = assignedChannels.length === 0;

  return (
    <div className="space-y-2">
      <p className="text-sm font-medium">Promote</p>
      {noAssignment && (
        <p className="text-xs text-foreground/50">
          This update is not assigned to any channel yet.
        </p>
      )}
      <div className="flex items-center gap-2 flex-wrap">
        <Select
          value={fromChannel}
          onChange={(e) => setFromChannel(e.target.value)}
        >
          {channels.map((ch) => (
            <option key={ch} value={ch}>
              {ch}
            </option>
          ))}
        </Select>
        <span className="text-foreground/40 text-sm">&rarr;</span>
        <Select
          value={toChannel}
          onChange={(e) => setToChannel(e.target.value)}
        >
          {channels.map((ch) => (
            <option key={ch} value={ch}>
              {ch}
            </option>
          ))}
        </Select>
        <Input
          inputSize="sm"
          type="number"
          min="0"
          max="100"
          value={rollout}
          onChange={(e) => setRollout(e.target.value)}
          className="w-16"
        />
        <span className="text-xs text-foreground/50">%</span>
        <ConfirmDialog
          title="Promote Update"
          description={`Promote this update from ${fromChannel} to ${toChannel}?`}
          confirmLabel="Promote"
          onConfirm={handlePromote}
        >
          {(open) => (
            <Button
              size="sm"
              onClick={open}
              loading={loading}
              disabled={noAssignment}
            >
              Promote
            </Button>
          )}
        </ConfirmDialog>
      </div>
    </div>
  );
}

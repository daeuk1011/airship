"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Button } from "@/shared/ui/button";
import { Input } from "@/shared/ui/input";
import { Select } from "@/shared/ui/select";
import { ConfirmDialog } from "@/shared/ui/confirm-dialog";
import { useToast } from "@/shared/ui/toast";

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
  const { toast } = useToast();
  const [channel, setChannel] = useState(channels[0] ?? "production");
  const [reason, setReason] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleRollback() {
    setLoading(true);

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
        toast("Rollback successful", "success");
        router.refresh();
      } else {
        toast(data.error ?? "Rollback failed", "error");
      }
    } catch {
      toast("Network error", "error");
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
        <ConfirmDialog
          title="Rollback Channel"
          description={`Rollback ${channel} channel to this update?`}
          confirmLabel="Rollback"
          variant="danger"
          onConfirm={handleRollback}
        >
          {(open) => (
            <Button
              variant="destructive"
              size="sm"
              onClick={open}
              loading={loading}
            >
              Rollback
            </Button>
          )}
        </ConfirmDialog>
      </div>
    </div>
  );
}

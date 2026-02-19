"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Button } from "@/shared/ui/button";
import { ConfirmDialog } from "@/shared/ui/confirm-dialog";
import { useToast } from "@/shared/ui/toast";

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
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);

  async function handleToggle() {
    setLoading(true);
    try {
      const res = await fetch(
        `/api/apps/${appKey}/updates/${updateId}/toggle`,
        { method: "POST" }
      );
      if (res.ok) {
        toast(
          enabled ? "Update disabled" : "Update enabled",
          "success"
        );
        router.refresh();
      } else {
        toast("Failed to toggle update", "error");
      }
    } catch {
      toast("Network error", "error");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="space-y-2">
      <p className="text-sm font-medium">Status</p>
      <ConfirmDialog
        title={enabled ? "Disable Update" : "Enable Update"}
        description={`Are you sure you want to ${enabled ? "disable" : "enable"} this update?`}
        confirmLabel={enabled ? "Disable" : "Enable"}
        variant={enabled ? "danger" : "default"}
        onConfirm={handleToggle}
      >
        {(open) => (
          <Button
            variant={enabled ? "outline" : "primary"}
            size="sm"
            onClick={open}
            loading={loading}
          >
            {enabled ? "Disable Update" : "Enable Update"}
          </Button>
        )}
      </ConfirmDialog>
    </div>
  );
}

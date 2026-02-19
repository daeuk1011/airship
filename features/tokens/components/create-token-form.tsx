"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Button } from "@/shared/ui/button";
import { Input } from "@/shared/ui/input";
import { CopyButton } from "@/shared/ui/copy-button";
import { useToast } from "@/shared/ui/toast";

export function CreateTokenForm() {
  const router = useRouter();
  const { toast } = useToast();
  const [name, setName] = useState("");
  const [loading, setLoading] = useState(false);
  const [createdToken, setCreatedToken] = useState<string | null>(null);

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim()) return;

    setLoading(true);
    try {
      const res = await fetch("/api/tokens", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: name.trim() }),
      });
      if (res.ok) {
        const data = await res.json();
        setCreatedToken(data.token);
        setName("");
        router.refresh();
      } else {
        toast("Failed to create token", "error");
      }
    } catch {
      toast("Network error", "error");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="space-y-3">
      <form onSubmit={handleCreate} className="flex items-center gap-2">
        <Input
          inputSize="sm"
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Token name"
          className="flex-1"
        />
        <Button size="sm" type="submit" disabled={!name.trim()} loading={loading}>
          Create Token
        </Button>
      </form>

      {createdToken && (
        <div className="p-3 rounded-lg bg-success/[0.06] border border-success/20">
          <p className="text-xs text-foreground-2 mb-1">
            Copy this token now. It won&apos;t be shown again.
          </p>
          <div className="flex items-center gap-2">
            <code className="text-xs font-mono flex-1 break-all bg-black/20 rounded px-2 py-1">
              {createdToken}
            </code>
            <CopyButton text={createdToken} />
          </div>
          <button
            onClick={() => setCreatedToken(null)}
            className="text-xs text-foreground-3 hover:text-foreground-2 mt-2 cursor-pointer transition-colors"
          >
            Dismiss
          </button>
        </div>
      )}
    </div>
  );
}

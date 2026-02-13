"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Button } from "@/shared/ui/button";
import { Input } from "@/shared/ui/input";
import { CopyButton } from "@/shared/ui/copy-button";

export function CreateTokenForm() {
  const router = useRouter();
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
      }
    } catch {
      // ignore
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
        <Button size="sm" type="submit" disabled={loading || !name.trim()}>
          {loading ? "..." : "Create Token"}
        </Button>
      </form>

      {createdToken && (
        <div className="p-3 rounded-md bg-green-500/10 border border-green-500/20">
          <p className="text-xs text-foreground/60 mb-1">
            Copy this token now. It won&apos;t be shown again.
          </p>
          <div className="flex items-center gap-2">
            <code className="text-xs font-mono flex-1 break-all">
              {createdToken}
            </code>
            <CopyButton text={createdToken} />
          </div>
          <button
            onClick={() => setCreatedToken(null)}
            className="text-xs text-foreground/40 hover:text-foreground/60 mt-2 cursor-pointer"
          >
            Dismiss
          </button>
        </div>
      )}
    </div>
  );
}

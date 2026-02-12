"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Button } from "@/shared/ui/button";
import { Input } from "@/shared/ui/input";

export function CreateAppForm() {
  const router = useRouter();
  const [appKey, setAppKey] = useState("");
  const [name, setName] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      const res = await fetch("/api/apps", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ appKey, name }),
      });

      if (!res.ok) {
        const data = await res.json();
        setError(data.error ?? "Failed to create app");
        return;
      }

      setAppKey("");
      setName("");
      router.refresh();
    } catch {
      setError("Network error");
    } finally {
      setLoading(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="flex items-end gap-3">
      <div>
        <label className="block text-xs text-foreground/50 mb-1">
          App Key
        </label>
        <Input
          type="text"
          value={appKey}
          onChange={(e) => setAppKey(e.target.value)}
          placeholder="my-app"
          required
          pattern="[a-z0-9-]+"
        />
      </div>
      <div>
        <label className="block text-xs text-foreground/50 mb-1">
          Display Name
        </label>
        <Input
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="My App"
          required
        />
      </div>
      <Button type="submit" disabled={loading}>
        {loading ? "Creating..." : "Create App"}
      </Button>
      {error && <p className="text-sm text-red-500">{error}</p>}
    </form>
  );
}

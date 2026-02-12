"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

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
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${getAdminSecret()}`,
        },
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
        <input
          type="text"
          value={appKey}
          onChange={(e) => setAppKey(e.target.value)}
          placeholder="my-app"
          required
          pattern="[a-z0-9-]+"
          className="px-3 py-1.5 text-sm border border-foreground/20 rounded-md bg-background focus:outline-none focus:ring-1 focus:ring-foreground/30"
        />
      </div>
      <div>
        <label className="block text-xs text-foreground/50 mb-1">
          Display Name
        </label>
        <input
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="My App"
          required
          className="px-3 py-1.5 text-sm border border-foreground/20 rounded-md bg-background focus:outline-none focus:ring-1 focus:ring-foreground/30"
        />
      </div>
      <button
        type="submit"
        disabled={loading}
        className="px-4 py-1.5 text-sm bg-foreground text-background rounded-md hover:bg-foreground/90 disabled:opacity-50 transition-colors"
      >
        {loading ? "Creating..." : "Create App"}
      </button>
      {error && <p className="text-sm text-red-500">{error}</p>}
    </form>
  );
}

function getAdminSecret(): string {
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

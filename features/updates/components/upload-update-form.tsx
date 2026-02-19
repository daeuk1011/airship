"use client";

import { useRouter } from "next/navigation";
import { useState, useRef } from "react";
import { Button } from "@/shared/ui/button";
import { Input } from "@/shared/ui/input";
import { Select } from "@/shared/ui/select";

type UploadStep = "idle" | "presigning" | "uploading" | "committing" | "done" | "error";

const STEP_LABELS: Record<UploadStep, string> = {
  idle: "",
  presigning: "Getting upload URL...",
  uploading: "Uploading bundle to S3...",
  committing: "Committing update...",
  done: "Upload complete!",
  error: "Upload failed",
};

async function computeSha256Hex(file: File): Promise<string> {
  const buffer = await file.arrayBuffer();
  const hash = await crypto.subtle.digest("SHA-256", buffer);
  return Array.from(new Uint8Array(hash))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

export function UploadUpdateForm({ appKey }: { appKey: string }) {
  const router = useRouter();
  const fileRef = useRef<HTMLInputElement>(null);
  const [platform, setPlatform] = useState("ios");
  const [runtimeVersion, setRuntimeVersion] = useState("1.0.0");
  const [channelName, setChannelName] = useState("staging");
  const [step, setStep] = useState<UploadStep>("idle");
  const [error, setError] = useState("");
  const [resultId, setResultId] = useState("");

  const isLoading = step !== "idle" && step !== "done" && step !== "error";

  async function handleUpload() {
    const file = fileRef.current?.files?.[0];
    if (!file) {
      setError("Select a bundle file");
      return;
    }

    setError("");
    setResultId("");

    try {
      // Step 1: Presign
      setStep("presigning");
      const presignRes = await fetch(`/api/apps/${appKey}/uploads/presign`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          runtimeVersion,
          platform,
          bundleFilename: file.name,
          assets: [],
        }),
      });

      if (!presignRes.ok) {
        const data = await presignRes.json().catch(() => null);
        throw new Error(data?.error ?? `Presign failed (${presignRes.status})`);
      }

      const presign = await presignRes.json();

      // Step 2: Upload to S3
      setStep("uploading");
      const uploadRes = await fetch(presign.bundle.presignedUrl, {
        method: "PUT",
        headers: { "Content-Type": "application/javascript" },
        body: file,
      });

      if (!uploadRes.ok) {
        throw new Error(`S3 upload failed (${uploadRes.status})`);
      }

      // Step 3: Commit
      setStep("committing");
      const hash = await computeSha256Hex(file);

      const commitRes = await fetch(`/api/apps/${appKey}/uploads/commit`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          updateGroupId: presign.updateGroupId,
          runtimeVersion,
          platform,
          channelName,
          bundle: {
            s3Key: presign.bundle.s3Key,
            hash,
            size: file.size,
          },
          assets: [],
        }),
      });

      if (!commitRes.ok) {
        const data = await commitRes.json().catch(() => null);
        throw new Error(data?.error ?? `Commit failed (${commitRes.status})`);
      }

      const result = await commitRes.json();
      setResultId(result.updateId);
      setStep("done");
      router.refresh();
    } catch (e) {
      setStep("error");
      setError(e instanceof Error ? e.message : String(e));
    }
  }

  function handleReset() {
    setStep("idle");
    setError("");
    setResultId("");
    if (fileRef.current) fileRef.current.value = "";
  }

  return (
    <div className="space-y-3">
      <p className="text-sm font-medium">Upload Update</p>

      <div className="space-y-2">
        <input
          ref={fileRef}
          type="file"
          accept=".hbc,.bundle,.js"
          disabled={isLoading}
          className="block w-full text-sm text-foreground-2 file:mr-3 file:px-3 file:py-1 file:text-sm file:border file:border-white/10 file:rounded-md file:bg-white/[0.04] file:text-foreground-2 file:cursor-pointer hover:file:bg-white/[0.08] file:transition-colors disabled:opacity-50"
        />

        <div className="flex items-center gap-2 flex-wrap">
          <Select
            value={platform}
            onChange={(e) => setPlatform(e.target.value)}
            disabled={isLoading}
          >
            <option value="ios">iOS</option>
            <option value="android">Android</option>
          </Select>

          <Input
            inputSize="sm"
            placeholder="Runtime version"
            value={runtimeVersion}
            onChange={(e) => setRuntimeVersion(e.target.value)}
            disabled={isLoading}
            className="w-24"
          />

          <Input
            inputSize="sm"
            placeholder="Channel"
            value={channelName}
            onChange={(e) => setChannelName(e.target.value)}
            disabled={isLoading}
            className="w-24"
          />

          {step === "done" ? (
            <Button size="sm" variant="outline" onClick={handleReset}>
              Upload another
            </Button>
          ) : (
            <Button size="sm" onClick={handleUpload} disabled={isLoading}>
              {isLoading ? STEP_LABELS[step] : "Upload"}
            </Button>
          )}
        </div>
      </div>

      {step !== "idle" && step !== "error" && (
        <p className="text-xs text-accent">{STEP_LABELS[step]}</p>
      )}

      {error && <p className="text-xs text-error">{error}</p>}

      {resultId && (
        <p className="text-xs text-success">
          Update created: {resultId.slice(0, 8)}...
        </p>
      )}
    </div>
  );
}

"use client";

import { useRouter } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";
import { Button } from "@/shared/ui/button";
import { Input } from "@/shared/ui/input";
import { Select } from "@/shared/ui/select";

type Platform = "ios" | "android";
type UploadStep =
  | "idle"
  | "preflight"
  | "presigning"
  | "uploading"
  | "committing"
  | "done"
  | "error";
type PreflightCheck = {
  id: string;
  status: "pass" | "warn" | "fail";
  message: string;
};
type PreflightResponse = {
  ok: boolean;
  suggested?: {
    runtimeVersion?: string;
    channelName?: string;
  };
  availableChannels?: string[];
  checks?: PreflightCheck[];
};

const STEP_LABELS: Record<UploadStep, string> = {
  idle: "",
  preflight: "Running preflight checks...",
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
  const runtimeEditedRef = useRef(false);
  const channelEditedRef = useRef(false);

  const [platform, setPlatform] = useState<Platform>("ios");
  const [runtimeVersion, setRuntimeVersion] = useState("1.0.0");
  const [channelName, setChannelName] = useState("staging");
  const [availableChannels, setAvailableChannels] = useState<string[]>([]);
  const [preflightChecks, setPreflightChecks] = useState<PreflightCheck[]>([]);
  const [step, setStep] = useState<UploadStep>("idle");
  const [error, setError] = useState("");
  const [resultId, setResultId] = useState("");

  const isLoading = step !== "idle" && step !== "done" && step !== "error";

  const loadSuggestions = useCallback(async (targetPlatform: Platform) => {
    try {
      const response = await fetch(`/api/apps/${appKey}/uploads/preflight`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ platform: targetPlatform }),
      });

      if (!response.ok) return;

      const data = (await response.json()) as PreflightResponse;
      setAvailableChannels(data.availableChannels ?? []);

      const suggestedRuntime = data.suggested?.runtimeVersion;
      const suggestedChannel = data.suggested?.channelName;

      if (suggestedRuntime) {
        setRuntimeVersion((current) => {
          if (runtimeEditedRef.current && current.trim()) return current;
          return suggestedRuntime;
        });
      }

      if (suggestedChannel) {
        setChannelName((current) => {
          if (channelEditedRef.current && current.trim()) return current;
          return suggestedChannel;
        });
      }
    } catch {
      // Keep local defaults if suggestion request fails.
    }
  }, [appKey]);

  useEffect(() => {
    void loadSuggestions(platform);
  }, [platform, loadSuggestions]);

  async function runPreflight(file: File) {
    const response = await fetch(`/api/apps/${appKey}/uploads/preflight`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        platform,
        runtimeVersion,
        channelName,
        bundleFilename: file.name,
        bundleSize: file.size,
      }),
    });

    if (!response.ok) {
      const data = await response.json().catch(() => null);
      throw new Error(data?.error ?? `Preflight failed (${response.status})`);
    }

    const data = (await response.json()) as PreflightResponse;
    const checks = data.checks ?? [];
    setPreflightChecks(checks);
    setAvailableChannels(data.availableChannels ?? []);

    const failed = checks.find((check) => check.status === "fail");
    if (!data.ok || failed) {
      throw new Error(failed?.message ?? "Preflight checks failed");
    }
  }

  async function handleCheck() {
    const file = fileRef.current?.files?.[0];
    if (!file) {
      setError("Select a bundle file");
      return;
    }

    setError("");
    setStep("preflight");

    try {
      await runPreflight(file);
      setStep("idle");
    } catch (e) {
      setStep("error");
      setError(e instanceof Error ? e.message : String(e));
    }
  }

  async function handleUpload() {
    const file = fileRef.current?.files?.[0];
    if (!file) {
      setError("Select a bundle file");
      return;
    }

    setError("");
    setResultId("");

    try {
      // Step 0: Preflight
      setStep("preflight");
      await runPreflight(file);

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
    setPreflightChecks([]);
    runtimeEditedRef.current = false;
    channelEditedRef.current = false;
    if (fileRef.current) fileRef.current.value = "";
    void loadSuggestions(platform);
  }

  function statusClassName(status: PreflightCheck["status"]) {
    if (status === "pass") return "text-success";
    if (status === "warn") return "text-warning";
    return "text-error";
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
            onChange={(e) => setPlatform(e.target.value as Platform)}
            disabled={isLoading}
          >
            <option value="ios">iOS</option>
            <option value="android">Android</option>
          </Select>

          <Input
            inputSize="sm"
            placeholder="Runtime version"
            value={runtimeVersion}
            onChange={(e) => {
              runtimeEditedRef.current = true;
              setRuntimeVersion(e.target.value);
            }}
            disabled={isLoading}
            className="w-24"
          />

          <Input
            inputSize="sm"
            placeholder="Channel"
            value={channelName}
            onChange={(e) => {
              channelEditedRef.current = true;
              setChannelName(e.target.value);
            }}
            list={`channel-options-${appKey}`}
            disabled={isLoading}
            className="w-24"
          />
          <datalist id={`channel-options-${appKey}`}>
            {availableChannels.map((channel) => (
              <option key={channel} value={channel} />
            ))}
          </datalist>

          {step === "done" ? (
            <Button size="sm" variant="outline" onClick={handleReset}>
              Upload another
            </Button>
          ) : (
            <>
              <Button
                size="sm"
                variant="outline"
                onClick={handleCheck}
                disabled={isLoading}
              >
                Check
              </Button>
              <Button size="sm" onClick={handleUpload} disabled={isLoading}>
                {isLoading ? STEP_LABELS[step] : "Upload"}
              </Button>
            </>
          )}
        </div>
        {availableChannels.length > 0 && (
          <p className="text-xs text-foreground-3">
            Suggested channels: {availableChannels.join(", ")}
          </p>
        )}
      </div>

      {step !== "idle" && step !== "error" && (
        <p className="text-xs text-accent">{STEP_LABELS[step]}</p>
      )}

      {preflightChecks.length > 0 && (
        <div className="rounded-md border border-white/10 bg-white/[0.03] p-3 space-y-1">
          <p className="text-xs font-medium text-foreground-2">
            Preflight results
          </p>
          {preflightChecks.map((check) => (
            <p
              key={check.id}
              className={`text-xs ${statusClassName(check.status)}`}
            >
              {check.status.toUpperCase()}: {check.message}
            </p>
          ))}
        </div>
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

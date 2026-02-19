"use client";

import { useRouter } from "next/navigation";
import { useCallback, useRef, useState } from "react";
import { Button } from "@/shared/ui/button";
import { Input } from "@/shared/ui/input";
import { Select } from "@/shared/ui/select";

type Platform = "ios" | "android";
type PlatformMode = Platform | "both";
type UploadStep =
  | "idle"
  | "preflight"
  | "presigning"
  | "uploading"
  | "committing"
  | "promoting"
  | "done"
  | "error";
type PreflightCheck = {
  id: string;
  status: "pass" | "warn" | "fail";
  message: string;
};
type PreflightCheckWithPlatform = PreflightCheck & { platform: Platform };
type PreflightResponse = {
  ok: boolean;
  suggested?: {
    runtimeVersion?: string;
    channelName?: string;
  };
  availableChannels?: string[];
  checks?: PreflightCheck[];
};
type UploadTarget = {
  platform: Platform;
  file: File;
};
type UploadResult = {
  platform: Platform;
  updateId: string;
};
type PromotionResult = {
  platform: Platform;
  updateId: string;
  toChannel: string;
};

const STEP_LABELS: Record<UploadStep, string> = {
  idle: "",
  preflight: "Running preflight checks...",
  presigning: "Getting upload URL...",
  uploading: "Uploading bundle to S3...",
  committing: "Committing update...",
  promoting: "Promoting update...",
  done: "Upload complete!",
  error: "Upload failed",
};

function platformLabel(platform: Platform): string {
  return platform === "ios" ? "iOS" : "Android";
}

async function computeSha256Hex(file: File): Promise<string> {
  const buffer = await file.arrayBuffer();
  const hash = await crypto.subtle.digest("SHA-256", buffer);
  return Array.from(new Uint8Array(hash))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

export function UploadUpdateForm({ appKey }: { appKey: string }) {
  const router = useRouter();
  const singleFileRef = useRef<HTMLInputElement>(null);
  const iosFileRef = useRef<HTMLInputElement>(null);
  const androidFileRef = useRef<HTMLInputElement>(null);
  const runtimeEditedRef = useRef(false);
  const channelEditedRef = useRef(false);

  const [platformMode, setPlatformMode] = useState<PlatformMode>("ios");
  const [runtimeVersion, setRuntimeVersion] = useState("1.0.0");
  const [channelName, setChannelName] = useState("staging");
  const [autoPromoteEnabled, setAutoPromoteEnabled] = useState(false);
  const [promoteToChannel, setPromoteToChannel] = useState("production");
  const [promoteRollout, setPromoteRollout] = useState("100");
  const [availableChannels, setAvailableChannels] = useState<string[]>([]);
  const [preflightChecks, setPreflightChecks] =
    useState<PreflightCheckWithPlatform[]>([]);
  const [step, setStep] = useState<UploadStep>("idle");
  const [stepDetail, setStepDetail] = useState("");
  const [error, setError] = useState("");
  const [results, setResults] = useState<UploadResult[]>([]);
  const [promotionResults, setPromotionResults] = useState<PromotionResult[]>(
    []
  );

  const isLoading = step !== "idle" && step !== "done" && step !== "error";

  const suggestionPlatform: Platform =
    platformMode === "android" ? "android" : "ios";

  const loadSuggestions = useCallback(
    async (targetPlatform: Platform) => {
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
    },
    [appKey]
  );

  function handlePlatformModeChange(nextMode: PlatformMode) {
    setPlatformMode(nextMode);
    const nextSuggestionPlatform: Platform =
      nextMode === "android" ? "android" : "ios";
    void loadSuggestions(nextSuggestionPlatform);
  }

  function getTargets(): UploadTarget[] {
    if (platformMode === "both") {
      const iosFile = iosFileRef.current?.files?.[0];
      const androidFile = androidFileRef.current?.files?.[0];

      if (!iosFile || !androidFile) {
        throw new Error("Select both iOS and Android bundle files");
      }

      return [
        { platform: "ios", file: iosFile },
        { platform: "android", file: androidFile },
      ];
    }

    const singleFile = singleFileRef.current?.files?.[0];
    if (!singleFile) {
      throw new Error("Select a bundle file");
    }

    return [{ platform: platformMode, file: singleFile }];
  }

  async function requestPreflight(target: UploadTarget): Promise<PreflightResponse> {
    const response = await fetch(`/api/apps/${appKey}/uploads/preflight`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        platform: target.platform,
        runtimeVersion,
        channelName,
        bundleFilename: target.file.name,
        bundleSize: target.file.size,
      }),
    });

    if (!response.ok) {
      const data = await response.json().catch(() => null);
      throw new Error(data?.error ?? `Preflight failed (${response.status})`);
    }

    return (await response.json()) as PreflightResponse;
  }

  async function runPreflight(targets: UploadTarget[]) {
    const collectedChecks: PreflightCheckWithPlatform[] = [];
    let firstFail: { platform: Platform; message: string } | null = null;

    for (const target of targets) {
      const result = await requestPreflight(target);
      if (result.availableChannels) {
        setAvailableChannels(result.availableChannels);
      }

      const checks = (result.checks ?? []).map((check) => ({
        ...check,
        platform: target.platform,
      }));
      collectedChecks.push(...checks);

      const fail = checks.find((check) => check.status === "fail");
      if (fail && !firstFail) {
        firstFail = { platform: target.platform, message: fail.message };
      }

      if (!result.ok && !firstFail) {
        firstFail = {
          platform: target.platform,
          message: "Preflight checks failed",
        };
      }
    }

    setPreflightChecks(collectedChecks);

    if (firstFail) {
      throw new Error(`[${platformLabel(firstFail.platform)}] ${firstFail.message}`);
    }
  }

  async function publishTarget(target: UploadTarget): Promise<UploadResult> {
    const platformText = platformLabel(target.platform);

    setStep("presigning");
    setStepDetail(`[${platformText}] ${STEP_LABELS.presigning}`);
    const presignRes = await fetch(`/api/apps/${appKey}/uploads/presign`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        runtimeVersion,
        platform: target.platform,
        bundleFilename: target.file.name,
        assets: [],
      }),
    });

    if (!presignRes.ok) {
      const data = await presignRes.json().catch(() => null);
      throw new Error(
        `[${platformText}] ${data?.error ?? `Presign failed (${presignRes.status})`}`
      );
    }

    const presign = await presignRes.json();

    setStep("uploading");
    setStepDetail(`[${platformText}] ${STEP_LABELS.uploading}`);
    const uploadRes = await fetch(presign.bundle.presignedUrl, {
      method: "PUT",
      headers: { "Content-Type": "application/javascript" },
      body: target.file,
    });

    if (!uploadRes.ok) {
      throw new Error(`[${platformText}] S3 upload failed (${uploadRes.status})`);
    }

    setStep("committing");
    setStepDetail(`[${platformText}] ${STEP_LABELS.committing}`);
    const hash = await computeSha256Hex(target.file);

    const commitRes = await fetch(`/api/apps/${appKey}/uploads/commit`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        updateGroupId: presign.updateGroupId,
        runtimeVersion,
        platform: target.platform,
        channelName,
        bundle: {
          s3Key: presign.bundle.s3Key,
          hash,
          size: target.file.size,
        },
        assets: [],
      }),
    });

    if (!commitRes.ok) {
      const data = await commitRes.json().catch(() => null);
      throw new Error(
        `[${platformText}] ${data?.error ?? `Commit failed (${commitRes.status})`}`
      );
    }

    const result = await commitRes.json();
    return { platform: target.platform, updateId: result.updateId };
  }

  async function promoteTarget(uploaded: UploadResult): Promise<PromotionResult> {
    const platformText = platformLabel(uploaded.platform);
    const fromChannel = channelName.trim();
    const toChannel = promoteToChannel.trim();
    const rolloutPercent = Number(promoteRollout);

    if (!fromChannel) {
      throw new Error("Source channel is required for promotion");
    }
    if (!toChannel) {
      throw new Error("Target channel is required for promotion");
    }
    if (fromChannel === toChannel) {
      throw new Error("Source and target channels must be different");
    }
    if (Number.isNaN(rolloutPercent) || rolloutPercent < 0 || rolloutPercent > 100) {
      throw new Error("Promotion rollout must be between 0 and 100");
    }

    setStep("promoting");
    setStepDetail(`[${platformText}] Promoting to ${toChannel}...`);

    const promoteRes = await fetch(
      `/api/apps/${appKey}/updates/${uploaded.updateId}/promote`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          fromChannel,
          toChannel,
          rolloutPercent,
        }),
      }
    );

    if (!promoteRes.ok) {
      const data = await promoteRes.json().catch(() => null);
      throw new Error(
        `[${platformText}] ${data?.error ?? `Promote failed (${promoteRes.status})`}`
      );
    }

    return {
      platform: uploaded.platform,
      updateId: uploaded.updateId,
      toChannel,
    };
  }

  async function handleCheck() {
    setError("");

    try {
      const targets = getTargets();

      if (autoPromoteEnabled && channelName.trim() === promoteToChannel.trim()) {
        throw new Error("Auto promotion requires different source and target channels");
      }

      setStep("preflight");
      setStepDetail(STEP_LABELS.preflight);
      await runPreflight(targets);
      setStep("idle");
      setStepDetail("");
    } catch (e) {
      setStep("error");
      setStepDetail("");
      setError(e instanceof Error ? e.message : String(e));
    }
  }

  async function handleUpload() {
    setError("");
    setResults([]);
    setPromotionResults([]);

    const completed: UploadResult[] = [];
    const promoted: PromotionResult[] = [];

    try {
      const targets = getTargets();

      if (autoPromoteEnabled && channelName.trim() === promoteToChannel.trim()) {
        throw new Error("Auto promotion requires different source and target channels");
      }

      setStep("preflight");
      setStepDetail(STEP_LABELS.preflight);
      await runPreflight(targets);

      for (const target of targets) {
        const uploaded = await publishTarget(target);
        completed.push(uploaded);
        setResults([...completed]);

        if (autoPromoteEnabled) {
          const promotedItem = await promoteTarget(uploaded);
          promoted.push(promotedItem);
          setPromotionResults([...promoted]);
        }
      }

      setStep("done");
      setStepDetail("");
      router.refresh();
    } catch (e) {
      setStep("error");
      setStepDetail("");
      const message = e instanceof Error ? e.message : String(e);

      if (completed.length > 0 || promoted.length > 0) {
        const doneText = completed
          .map((item) => `${platformLabel(item.platform)} ${item.updateId.slice(0, 8)}...`)
          .join(", ");
        const promotedText = promoted
          .map((item) => `${platformLabel(item.platform)} -> ${item.toChannel}`)
          .join(", ");

        const parts = [message];
        if (doneText) parts.push(`uploaded: ${doneText}`);
        if (promotedText) parts.push(`promoted: ${promotedText}`);

        setError(parts.join(" | "));
      } else {
        setError(message);
      }
    }
  }

  function handleReset() {
    setStep("idle");
    setStepDetail("");
    setError("");
    setResults([]);
    setPromotionResults([]);
    setPreflightChecks([]);
    setAutoPromoteEnabled(false);
    setPromoteToChannel("production");
    setPromoteRollout("100");
    runtimeEditedRef.current = false;
    channelEditedRef.current = false;

    if (singleFileRef.current) singleFileRef.current.value = "";
    if (iosFileRef.current) iosFileRef.current.value = "";
    if (androidFileRef.current) androidFileRef.current.value = "";

    void loadSuggestions(suggestionPlatform);
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
        <div className="flex items-center gap-2 flex-wrap">
          <Select
            value={platformMode}
            onChange={(e) => handlePlatformModeChange(e.target.value as PlatformMode)}
            disabled={isLoading}
          >
            <option value="ios">iOS</option>
            <option value="android">Android</option>
            <option value="both">iOS + Android</option>
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

        <div className="rounded-md border border-white/10 bg-white/[0.03] p-3 space-y-2">
          <label className="inline-flex items-center gap-2 text-xs text-foreground-2">
            <input
              type="checkbox"
              checked={autoPromoteEnabled}
              onChange={(e) => setAutoPromoteEnabled(e.target.checked)}
              disabled={isLoading}
              className="accent-accent"
            />
            Auto promote after upload (default: OFF)
          </label>

          {autoPromoteEnabled && (
            <div className="flex items-center gap-2 flex-wrap">
              <Input
                inputSize="sm"
                placeholder="Target channel"
                value={promoteToChannel}
                onChange={(e) => setPromoteToChannel(e.target.value)}
                list={`promote-channel-options-${appKey}`}
                disabled={isLoading}
                className="w-32"
              />
              <datalist id={`promote-channel-options-${appKey}`}>
                {availableChannels.map((channel) => (
                  <option key={channel} value={channel} />
                ))}
                <option value="production" />
              </datalist>

              <Input
                inputSize="sm"
                type="number"
                min="0"
                max="100"
                value={promoteRollout}
                onChange={(e) => setPromoteRollout(e.target.value)}
                disabled={isLoading}
                className="w-20"
              />
              <span className="text-xs text-foreground-2">rollout %</span>
            </div>
          )}
        </div>

        {platformMode === "both" ? (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
            <label className="block space-y-1">
              <span className="text-xs text-foreground-2">iOS bundle</span>
              <input
                ref={iosFileRef}
                type="file"
                accept=".hbc,.bundle,.js"
                disabled={isLoading}
                className="block w-full text-sm text-foreground-2 file:mr-3 file:px-3 file:py-1 file:text-sm file:border file:border-white/10 file:rounded-md file:bg-white/[0.04] file:text-foreground-2 file:cursor-pointer hover:file:bg-white/[0.08] file:transition-colors disabled:opacity-50"
              />
            </label>

            <label className="block space-y-1">
              <span className="text-xs text-foreground-2">Android bundle</span>
              <input
                ref={androidFileRef}
                type="file"
                accept=".hbc,.bundle,.js"
                disabled={isLoading}
                className="block w-full text-sm text-foreground-2 file:mr-3 file:px-3 file:py-1 file:text-sm file:border file:border-white/10 file:rounded-md file:bg-white/[0.04] file:text-foreground-2 file:cursor-pointer hover:file:bg-white/[0.08] file:transition-colors disabled:opacity-50"
              />
            </label>
          </div>
        ) : (
          <input
            ref={singleFileRef}
            type="file"
            accept=".hbc,.bundle,.js"
            disabled={isLoading}
            className="block w-full text-sm text-foreground-2 file:mr-3 file:px-3 file:py-1 file:text-sm file:border file:border-white/10 file:rounded-md file:bg-white/[0.04] file:text-foreground-2 file:cursor-pointer hover:file:bg-white/[0.08] file:transition-colors disabled:opacity-50"
          />
        )}

        {platformMode === "both" && (
          <p className="text-xs text-foreground-3">
            One click publishes both platforms with the same runtime/channel.
          </p>
        )}

        {availableChannels.length > 0 && (
          <p className="text-xs text-foreground-3">
            Suggested channels: {availableChannels.join(", ")}
          </p>
        )}
      </div>

      {step !== "idle" && step !== "error" && (
        <p className="text-xs text-accent">{stepDetail || STEP_LABELS[step]}</p>
      )}

      {preflightChecks.length > 0 && (
        <div className="rounded-md border border-white/10 bg-white/[0.03] p-3 space-y-1">
          <p className="text-xs font-medium text-foreground-2">
            Preflight results
          </p>
          {preflightChecks.map((check, index) => (
            <p
              key={`${check.platform}-${check.id}-${index}`}
              className={`text-xs ${statusClassName(check.status)}`}
            >
              [{platformLabel(check.platform)}] {check.status.toUpperCase()}: {check.message}
            </p>
          ))}
        </div>
      )}

      {error && <p className="text-xs text-error">{error}</p>}

      {results.length > 0 && (
        <div className="rounded-md border border-success/30 bg-success/10 p-3 space-y-1">
          <p className="text-xs font-medium text-success">Updates created</p>
          {results.map((result) => (
            <p key={`${result.platform}-${result.updateId}`} className="text-xs text-success">
              [{platformLabel(result.platform)}] {result.updateId.slice(0, 8)}...
            </p>
          ))}
        </div>
      )}

      {promotionResults.length > 0 && (
        <div className="rounded-md border border-accent/30 bg-accent/10 p-3 space-y-1">
          <p className="text-xs font-medium text-accent">Auto promotion done</p>
          {promotionResults.map((result) => (
            <p key={`${result.platform}-${result.updateId}-promote`} className="text-xs text-accent">
              [{platformLabel(result.platform)}] {result.updateId.slice(0, 8)}... {"->"} {result.toChannel}
            </p>
          ))}
        </div>
      )}
    </div>
  );
}

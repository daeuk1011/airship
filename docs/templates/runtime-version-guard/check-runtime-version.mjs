#!/usr/bin/env node
import { execFileSync } from "node:child_process";
import process from "node:process";

const baseRef = process.argv[2];
const headRef = process.argv[3];

if (!baseRef || !headRef) {
  console.error("Usage: node check-runtime-version.mjs <base-ref> <head-ref>");
  process.exit(2);
}

const runtimeVersionFile = process.env.RUNTIME_VERSION_FILE ?? "app.json";
const runtimeVersionJsonPath =
  process.env.RUNTIME_VERSION_JSON_PATH ?? "expo.runtimeVersion";
const nativePatterns = (
  process.env.NATIVE_CHANGE_PATTERNS ??
  [
    "ios/",
    "android/",
    "app.json",
    "app.config.js",
    "app.config.ts",
    "app.config.mjs",
    "app.config.cjs",
    "eas.json",
    "plugins/",
    "package.json",
  ].join(",")
)
  .split(",")
  .map((entry) => entry.trim())
  .filter(Boolean);

function runGit(args) {
  return execFileSync("git", args, { encoding: "utf8" }).trim();
}

function getChangedFiles(base, head) {
  const output = runGit(["diff", "--name-only", `${base}...${head}`]);
  if (!output) return [];
  return output.split("\n").map((line) => line.trim()).filter(Boolean);
}

function isNativeRelated(filePath) {
  return nativePatterns.some((pattern) =>
    pattern.endsWith("/") ? filePath.startsWith(pattern) : filePath === pattern
  );
}

function getJsonAtRef(ref, filePath) {
  try {
    const raw = runGit(["show", `${ref}:${filePath}`]);
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

function getByPath(value, path) {
  return path.reduce((acc, key) => {
    if (acc && typeof acc === "object" && key in acc) {
      return acc[key];
    }
    return undefined;
  }, value);
}

function readRuntimeVersion(ref) {
  const parsed = getJsonAtRef(ref, runtimeVersionFile);
  if (!parsed) return null;

  const path = runtimeVersionJsonPath.split(".").filter(Boolean);
  const resolved = getByPath(parsed, path);
  if (typeof resolved !== "string") return null;
  return resolved.trim();
}

const changedFiles = getChangedFiles(baseRef, headRef);
const nativeChangedFiles = changedFiles.filter(isNativeRelated);

if (nativeChangedFiles.length === 0) {
  console.log("[runtime-guard] PASS: no native-related changes detected");
  process.exit(0);
}

const baseRuntimeVersion = readRuntimeVersion(baseRef);
const headRuntimeVersion = readRuntimeVersion(headRef);

if (!baseRuntimeVersion || !headRuntimeVersion) {
  console.error("[runtime-guard] FAIL: unable to read runtimeVersion");
  console.error(`- file: ${runtimeVersionFile}`);
  console.error(`- json path: ${runtimeVersionJsonPath}`);
  console.error("- tip: set RUNTIME_VERSION_FILE / RUNTIME_VERSION_JSON_PATH env vars");
  process.exit(1);
}

if (baseRuntimeVersion === headRuntimeVersion) {
  console.error("[runtime-guard] FAIL: native changes detected but runtimeVersion did not change");
  console.error(`- base: ${baseRuntimeVersion}`);
  console.error(`- head: ${headRuntimeVersion}`);
  console.error("- native-related changed files:");
  nativeChangedFiles.forEach((filePath) => console.error(`  - ${filePath}`));
  process.exit(1);
}

console.log("[runtime-guard] PASS: runtimeVersion changed for native-related changes");
console.log(`- base: ${baseRuntimeVersion}`);
console.log(`- head: ${headRuntimeVersion}`);
console.log("- native-related changed files:");
nativeChangedFiles.forEach((filePath) => console.log(`  - ${filePath}`));
process.exit(0);

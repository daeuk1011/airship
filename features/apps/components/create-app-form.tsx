"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { useRouter } from "next/navigation";
import { Button } from "@/shared/ui/button";
import { Input } from "@/shared/ui/input";
import { createAppSchema, type CreateAppInput } from "@/shared/validation/apps";

export function CreateAppForm() {
  const router = useRouter();
  const {
    register,
    handleSubmit,
    reset,
    setError,
    formState: { errors, isSubmitting },
  } = useForm<CreateAppInput>({
    resolver: zodResolver(createAppSchema),
    defaultValues: {
      appKey: "",
      name: "",
    },
  });

  async function onSubmit(values: CreateAppInput) {
    try {
      const res = await fetch("/api/apps", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(values),
      });

      if (!res.ok) {
        const data = (await res.json().catch(() => null)) as { error?: string } | null;
        setError("root", { message: data?.error ?? "Failed to create app" });
        return;
      }

      reset();
      router.refresh();
    } catch {
      setError("root", { message: "Network error" });
    }
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="flex items-end gap-3">
      <div>
        <label className="block text-xs text-foreground-2 mb-1 uppercase tracking-wider">
          App Key
        </label>
        <Input
          type="text"
          {...register("appKey")}
          placeholder="my-app"
        />
        {errors.appKey && (
          <p className="mt-1 text-sm text-error">{errors.appKey.message}</p>
        )}
      </div>
      <div>
        <label className="block text-xs text-foreground-2 mb-1 uppercase tracking-wider">
          Display Name
        </label>
        <Input
          type="text"
          {...register("name")}
          placeholder="My App"
        />
        {errors.name && (
          <p className="mt-1 text-sm text-error">{errors.name.message}</p>
        )}
      </div>
      <Button type="submit" disabled={isSubmitting}>
        {isSubmitting ? "Creating..." : "Create App"}
      </Button>
      {errors.root?.message && <p className="text-sm text-error">{errors.root.message}</p>}
    </form>
  );
}

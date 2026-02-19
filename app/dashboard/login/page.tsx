"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { useRouter } from "next/navigation";
import { Button } from "@/shared/ui/button";
import { Input } from "@/shared/ui/input";
import { Logo } from "@/shared/ui/logo";
import { loginSchema, type LoginInput } from "@/shared/validation/auth";

export default function LoginPage() {
  const router = useRouter();
  const {
    register,
    handleSubmit,
    setError,
    formState: { errors, isSubmitting },
  } = useForm<LoginInput>({
    resolver: zodResolver(loginSchema),
    defaultValues: { password: "" },
  });

  async function onSubmit(values: LoginInput) {
    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(values),
      });

      if (res.ok) {
        router.push("/dashboard");
      } else {
        setError("root", { message: "Invalid password" });
      }
    } catch {
      setError("root", { message: "Network error" });
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-background bg-[radial-gradient(ellipse_at_center,rgba(6,182,212,0.06),transparent_60%)]">
      <div className="w-full max-w-sm glass-elevated rounded-2xl p-8 animate-scale-in">
        <div className="flex flex-col items-center gap-3 mb-8">
          <Logo size={56} />
          <div className="text-center">
            <h1 className="text-2xl font-bold tracking-tight">Airship</h1>
            <p className="text-sm text-foreground-2 mt-1">
              Sign in to the dashboard
            </p>
          </div>
        </div>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div>
            <label
              htmlFor="password"
              className="block text-sm text-foreground-2 mb-1.5"
            >
              Password
            </label>
            <Input
              id="password"
              type="password"
              {...register("password")}
              autoFocus
              className="w-full"
            />
            {errors.password && (
              <p className="mt-1 text-sm text-error">{errors.password.message}</p>
            )}
          </div>
          {errors.root?.message && (
            <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-error/10 border border-error/20 text-sm text-error">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="12" cy="12" r="10" />
                <line x1="15" y1="9" x2="9" y2="15" />
                <line x1="9" y1="9" x2="15" y2="15" />
              </svg>
              {errors.root.message}
            </div>
          )}
          <Button
            type="submit"
            disabled={isSubmitting}
            className="w-full"
          >
            {isSubmitting ? "Signing in..." : "Sign in"}
          </Button>
        </form>
      </div>
    </div>
  );
}

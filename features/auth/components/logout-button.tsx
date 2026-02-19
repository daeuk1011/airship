"use client";

import { useRouter } from "next/navigation";
import { Button } from "@/shared/ui/button";

export function LogoutButton() {
  const router = useRouter();

  async function handleLogout() {
    await fetch("/api/auth/logout", { method: "POST" });
    router.push("/dashboard/login");
  }

  return (
    <Button
      variant="ghost"
      onClick={handleLogout}
      className="w-full text-left hover:text-error hover:bg-error/[0.06]"
    >
      Logout
    </Button>
  );
}

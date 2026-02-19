import Link from "next/link";
import { LogoutButton } from "@/features/auth/components/logout-button";
import { Logo } from "@/shared/ui/logo";
import { NavLinks } from "./nav-links";
import { ToastProvider } from "@/shared/ui/toast";

export default function MainDashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex h-screen bg-background">
      <aside className="w-56 shrink-0 border-r border-white/[0.06] bg-[#050608] flex flex-col relative overflow-hidden">
        <div className="absolute inset-x-0 top-0 h-32 bg-gradient-to-b from-accent/[0.04] to-transparent pointer-events-none" />
        <div className="p-4 border-b border-white/[0.06] relative">
          <Link href="/dashboard" className="flex items-center gap-2">
            <Logo size={28} />
            <div>
              <span className="text-lg font-bold tracking-tight">Airship</span>
              <p className="font-mono text-[10px] text-foreground-3 -mt-0.5">OTA Update Server</p>
            </div>
          </Link>
        </div>
        <nav className="p-2 flex flex-col gap-0.5 flex-1 relative">
          <NavLinks />
        </nav>
        <div className="p-2 border-t border-white/[0.06] relative">
          <LogoutButton />
        </div>
      </aside>
      <main className="flex-1 overflow-y-auto bg-[radial-gradient(ellipse_at_top,rgba(6,182,212,0.03),transparent_60%)]">
        <ToastProvider>{children}</ToastProvider>
      </main>
    </div>
  );
}

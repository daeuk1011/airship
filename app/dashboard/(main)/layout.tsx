import Link from "next/link";
import { LogoutButton } from "@/features/auth/components/logout-button";
import { Logo } from "@/shared/ui/logo";

export default function MainDashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex h-screen bg-background">
      <aside className="w-56 shrink-0 border-r border-foreground/10 bg-foreground/[0.02] flex flex-col">
        <div className="p-4 border-b border-foreground/10">
          <Link href="/dashboard" className="flex items-center gap-2">
            <Logo size={28} />
            <div>
              <span className="text-lg font-bold tracking-tight">Airship</span>
              <p className="text-xs text-foreground/50 -mt-0.5">OTA Update Server</p>
            </div>
          </Link>
        </div>
        <nav className="p-2 flex flex-col gap-0.5 flex-1">
          <NavLink href="/dashboard">Overview</NavLink>
          <NavLink href="/dashboard/apps">Apps</NavLink>
        </nav>
        <div className="p-2 border-t border-foreground/10">
          <LogoutButton />
        </div>
      </aside>
      <main className="flex-1 overflow-y-auto">{children}</main>
    </div>
  );
}

function NavLink({
  href,
  children,
}: {
  href: string;
  children: React.ReactNode;
}) {
  return (
    <Link
      href={href}
      className="block px-3 py-2 rounded-md text-sm text-foreground/70 hover:text-foreground hover:bg-foreground/5 transition-colors"
    >
      {children}
    </Link>
  );
}

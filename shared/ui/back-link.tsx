import Link from "next/link";

export function BackLink({
  href,
  children,
}: {
  href: string;
  children: React.ReactNode;
}) {
  return (
    <Link
      href={href}
      className="text-sm text-foreground/50 hover:text-foreground"
    >
      &larr; {children}
    </Link>
  );
}

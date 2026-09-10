import { Link } from "@tanstack/react-router";
import type { SiteSettings } from "@/lib/public.functions";

export function SiteFooter({ settings }: { settings?: SiteSettings | null }) {
  const links = [
    { label: "Discord", href: settings?.discord_url },
    { label: "YouTube", href: settings?.youtube_url },
    { label: "X", href: settings?.twitter_url },
  ].filter((link) => !!link.href);

  return (
    <footer className="mt-20 border-t border-border bg-surface/40">
      <div className="mx-auto flex max-w-7xl flex-col gap-4 px-4 py-10 sm:px-6 md:flex-row md:items-center md:justify-between">
        <div>
          <p className="font-mono text-sm font-bold uppercase tracking-[0.18em] text-foreground">
            {settings?.site_name ?? "ARIO SCRIPTS"}
          </p>
          <p className="mt-1 text-sm text-muted-foreground">
            {settings?.tagline ?? "The script database built for players."}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-4 text-sm text-muted-foreground">
          <Link to="/" className="hover:text-foreground">
            Scripts
          </Link>
          <Link to="/categories" className="hover:text-foreground">
            Categories
          </Link>
          {links.map((link) => (
            <a
              key={link.label}
              href={link.href!}
              target="_blank"
              rel="noreferrer noopener"
              className="hover:text-foreground"
            >
              {link.label}
            </a>
          ))}
        </div>
      </div>
      <div className="border-t border-border px-4 py-4 text-center font-mono text-[11px] text-muted-foreground sm:px-6">
        © {new Date().getFullYear()} {settings?.site_name ?? "ARIO SCRIPTS"} — for educational use.
      </div>
    </footer>
  );
}

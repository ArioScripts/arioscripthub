import { Link } from "@tanstack/react-router";
import { BadgeCheck, Copy, Download, Eye, Heart, Terminal } from "lucide-react";
import type { ScriptCard as ScriptCardType } from "@/lib/public.functions";

function compact(value: number) {
  return new Intl.NumberFormat("en", { notation: "compact", maximumFractionDigits: 1 }).format(value);
}

export function ScriptCard({ script }: { script: ScriptCardType }) {
  return (
    <Link
      to="/scripts/$slug"
      params={{ slug: script.slug }}
      className="group relative flex flex-col overflow-hidden rounded-xl border border-border bg-card transition-all hover:-translate-y-1 hover:border-primary/40 hover:shadow-[0_18px_50px_-24px_var(--primary-glow)]"
    >
      <div className="relative aspect-[16/9] overflow-hidden bg-surface">
        {script.thumbnail_url ? (
          <img
            src={script.thumbnail_url}
            alt={`${script.title} preview`}
            loading="lazy"
            className="size-full object-cover transition-transform duration-500 group-hover:scale-105"
          />
        ) : (
          <div className="grid-backdrop flex size-full items-center justify-center">
            <Terminal className="size-8 text-primary/60" />
          </div>
        )}
        {script.game && (
          <span className="absolute left-3 top-3 rounded-md border border-border bg-background/80 px-2 py-1 font-mono text-[11px] uppercase tracking-wide text-muted-foreground backdrop-blur">
            {script.game.name}
          </span>
        )}
        {script.is_verified && (
          <span className="absolute right-3 top-3 inline-flex items-center gap-1 rounded-md bg-primary px-2 py-1 text-[11px] font-semibold text-primary-foreground">
            <BadgeCheck className="size-3" /> Verified
          </span>
        )}
      </div>

      <div className="flex flex-1 flex-col gap-3 p-4">
        <div className="flex items-start justify-between gap-3">
          <h3 className="text-base font-semibold leading-tight text-foreground group-hover:text-primary">
            {script.title}
          </h3>
        </div>
        {script.description && (
          <p className="line-clamp-2 text-sm text-muted-foreground">{script.description}</p>
        )}

        <div className="mt-auto flex flex-wrap items-center gap-3 pt-2 font-mono text-[11px] text-muted-foreground">
          {script.category && (
            <span className="rounded border border-border px-1.5 py-0.5 text-foreground/80">
              {script.category.name}
            </span>
          )}
          <span className="inline-flex items-center gap-1">
            <Copy className="size-3" /> {compact(script.copy_count)}
          </span>
          <span className="inline-flex items-center gap-1">
            <Download className="size-3" /> {compact(script.download_count)}
          </span>
          <span className="inline-flex items-center gap-1">
            <Eye className="size-3" /> {compact(script.view_count)}
          </span>
          <span className="inline-flex items-center gap-1">
            <Heart className="size-3" /> {compact(script.favorite_count)}
          </span>
        </div>
      </div>
    </Link>
  );
}

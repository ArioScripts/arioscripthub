import { useEffect, useState } from "react";
import { createFileRoute, Link, notFound } from "@tanstack/react-router";
import { BadgeCheck, Copy, Download, Eye, Heart, PlayCircle } from "lucide-react";
import { getScriptBySlug, trackScriptMetric } from "@/lib/public.functions";
import { SiteShell } from "@/components/site-shell";
import { LuaCodeViewer } from "@/components/lua-code-viewer";
import { FavoriteButton } from "@/components/favorite-button";
import { ReportDialog } from "@/components/report-dialog";

export const Route = createFileRoute("/scripts/$slug")({
  loader: async ({ params }) => {
    const { script } = await getScriptBySlug({ data: { slug: params.slug } });
    if (!script) throw notFound();
    return { script };
  },
  head: ({ loaderData }) => {
    const script = loaderData?.script;
    if (!script) {
      return { meta: [{ title: "Script unavailable — ARIO SCRIPTS" }, { name: "robots", content: "noindex" }] };
    }
    const title = `${script.title} — ARIO SCRIPTS`;
    const description =
      script.description?.slice(0, 155) ?? `Copy or download the ${script.title} Lua script.`;
    const meta = [
      { title },
      { name: "description", content: description },
      { property: "og:title", content: title },
      { property: "og:description", content: description },
    ];
    if (script.thumbnail_url?.startsWith("https://")) {
      meta.push(
        { property: "og:image", content: script.thumbnail_url },
        { name: "twitter:image", content: script.thumbnail_url },
      );
    }
    return { meta };
  },
  component: ScriptDetail,
  errorComponent: () => (
    <SiteShell>
      <div className="mx-auto max-w-3xl px-4 py-24 text-center">
        <h1 className="text-2xl font-semibold text-foreground">This script didn't load</h1>
        <Link to="/" search={{}} className="mt-4 inline-block text-primary">
          Browse all scripts
        </Link>
      </div>
    </SiteShell>
  ),
  notFoundComponent: () => (
    <SiteShell>
      <div className="mx-auto max-w-3xl px-4 py-24 text-center">
        <h1 className="text-2xl font-semibold text-foreground">Script not found</h1>
        <p className="mt-2 text-muted-foreground">It may have been unpublished or removed.</p>
        <Link to="/" search={{}} className="mt-4 inline-block text-primary">
          Browse all scripts
        </Link>
      </div>
    </SiteShell>
  ),
});

function youtubeId(url?: string | null) {
  if (!url) return null;
  const match = url.match(/(?:youtu\.be\/|v=|embed\/|shorts\/)([\w-]{11})/);
  return match?.[1] ?? null;
}

function ScriptDetail() {
  const { script } = Route.useLoaderData();
  const [copyCount, setCopyCount] = useState(script.copy_count);
  const [downloadCount, setDownloadCount] = useState(script.download_count);
  const videoId = youtubeId(script.youtube_url);
  const gallery = [script.thumbnail_url, ...(script.images ?? [])].filter(Boolean) as string[];

  useEffect(() => {
    void trackScriptMetric({ data: { scriptId: script.id, metric: "view" } });
  }, [script.id]);

  return (
    <SiteShell>
      <div className="mx-auto max-w-6xl px-4 py-10 sm:px-6">
        <nav className="flex flex-wrap items-center gap-2 font-mono text-xs text-muted-foreground">
          <Link to="/" search={{}} className="hover:text-primary">
            Scripts
          </Link>
          {script.category && (
            <>
              <span>/</span>
              <Link
                to="/category/$slug"
                params={{ slug: script.category.slug }}
                className="hover:text-primary"
              >
                {script.category.name}
              </Link>
            </>
          )}
          <span>/</span>
          <span className="text-foreground">{script.title}</span>
        </nav>

        <header className="mt-6 flex flex-wrap items-start justify-between gap-6">
          <div className="max-w-2xl">
            <div className="flex flex-wrap items-center gap-2">
              {script.game && (
                <span className="rounded-md border border-border px-2 py-1 font-mono text-[11px] uppercase tracking-wide text-muted-foreground">
                  {script.game.name}
                </span>
              )}
              {script.is_verified && (
                <span className="inline-flex items-center gap-1 rounded-md bg-primary px-2 py-1 text-[11px] font-semibold text-primary-foreground">
                  <BadgeCheck className="size-3" /> Verified
                </span>
              )}
            </div>
            <h1 className="mt-3 text-3xl font-bold tracking-tight text-foreground sm:text-4xl">
              {script.title}
            </h1>
            {script.description && (
              <p className="mt-3 text-muted-foreground">{script.description}</p>
            )}
            {script.tags.length > 0 && (
              <div className="mt-4 flex flex-wrap gap-2">
                {script.tags.map((tag) => (
                  <span
                    key={tag}
                    className="rounded-md bg-secondary px-2 py-1 font-mono text-[11px] text-secondary-foreground"
                  >
                    #{tag}
                  </span>
                ))}
              </div>
            )}
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <FavoriteButton scriptId={script.id} count={script.favorite_count} />
            <ReportDialog scriptId={script.id} />
          </div>
        </header>

        <dl className="mt-8 grid grid-cols-2 gap-3 sm:grid-cols-4">
          <Stat icon={<Copy className="size-4" />} label="Copies" value={copyCount} />
          <Stat icon={<Download className="size-4" />} label="Downloads" value={downloadCount} />
          <Stat icon={<Eye className="size-4" />} label="Views" value={script.view_count} />
          <Stat icon={<Heart className="size-4" />} label="Favorites" value={script.favorite_count} />
        </dl>

        <section className="mt-10">
          <h2 className="mb-3 font-mono text-xs uppercase tracking-[0.2em] text-muted-foreground">
            Source
          </h2>
          <LuaCodeViewer
            code={script.code}
            fileName={script.slug}
            copyCount={copyCount}
            downloadCount={downloadCount}
            onCopy={() => {
              setCopyCount((value) => value + 1);
              void trackScriptMetric({ data: { scriptId: script.id, metric: "copy" } });
            }}
            onDownload={() => {
              setDownloadCount((value) => value + 1);
              void trackScriptMetric({ data: { scriptId: script.id, metric: "download" } });
            }}
          />
        </section>

        {videoId && (
          <section className="mt-12">
            <h2 className="mb-3 flex items-center gap-2 font-mono text-xs uppercase tracking-[0.2em] text-muted-foreground">
              <PlayCircle className="size-4" /> Showcase
            </h2>
            <div className="aspect-video overflow-hidden rounded-xl border border-border bg-code-bg">
              <iframe
                src={`https://www.youtube-nocookie.com/embed/${videoId}`}
                title={`${script.title} showcase`}
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; picture-in-picture"
                allowFullScreen
                loading="lazy"
                className="size-full"
              />
            </div>
          </section>
        )}

        {gallery.length > 0 && (
          <section className="mt-12">
            <h2 className="mb-3 font-mono text-xs uppercase tracking-[0.2em] text-muted-foreground">
              Screenshots
            </h2>
            <div className="grid gap-4 sm:grid-cols-2">
              {gallery.map((image) => (
                <img
                  key={image}
                  src={image}
                  alt={`${script.title} screenshot`}
                  loading="lazy"
                  className="w-full rounded-xl border border-border object-cover"
                />
              ))}
            </div>
          </section>
        )}
      </div>
    </SiteShell>
  );
}

function Stat({ icon, label, value }: { icon: React.ReactNode; label: string; value: number }) {
  return (
    <div className="rounded-xl border border-border bg-card p-4">
      <dt className="flex items-center gap-2 font-mono text-[11px] uppercase tracking-wider text-muted-foreground">
        {icon} {label}
      </dt>
      <dd className="mt-1 font-mono text-xl font-bold text-foreground">{value.toLocaleString()}</dd>
    </div>
  );
}

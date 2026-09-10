import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { Folder } from "lucide-react";
import { getFilters } from "@/lib/public.functions";
import { SiteShell } from "@/components/site-shell";

export const Route = createFileRoute("/categories")({
  head: () => ({
    meta: [
      { title: "Script Categories — ARIO SCRIPTS" },
      {
        name: "description",
        content:
          "Browse every script category: auto farm, combat, ESP and visuals, movement, hubs, simulators and more.",
      },
      { property: "og:title", content: "Script Categories — ARIO SCRIPTS" },
      { property: "og:description", content: "Every ARIO SCRIPTS category in one place." },
    ],
  }),
  component: Categories,
});

function Categories() {
  const filters = useQuery({ queryKey: ["filters"], queryFn: () => getFilters(), staleTime: 300_000 });

  return (
    <SiteShell>
      <div className="mx-auto max-w-7xl px-4 py-14 sm:px-6">
        <h1 className="text-3xl font-bold tracking-tight text-foreground sm:text-4xl">Categories</h1>
        <p className="mt-2 max-w-xl text-muted-foreground">
          Pick a lane. Every category page lists its scripts with live copy and download counts.
        </p>

        <div className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {(filters.data?.categories ?? []).map((category) => (
            <Link
              key={category.id}
              to="/category/$slug"
              params={{ slug: category.slug }}
              className="group rounded-xl border border-border bg-card p-5 transition-all hover:-translate-y-1 hover:border-primary/40"
            >
              <span className="grid size-10 place-items-center rounded-lg bg-primary/15 text-primary">
                <Folder className="size-5" />
              </span>
              <h2 className="mt-4 text-lg font-semibold text-foreground group-hover:text-primary">
                {category.name}
              </h2>
              {category.description && (
                <p className="mt-1 text-sm text-muted-foreground">{category.description}</p>
              )}
            </Link>
          ))}
        </div>
      </div>
    </SiteShell>
  );
}

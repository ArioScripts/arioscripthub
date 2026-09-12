import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { HeartOff } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { SiteShell } from "@/components/site-shell";
import { ScriptCard } from "@/components/script-card";
import type { ScriptCard as ScriptCardType } from "@/lib/public.functions";

export const Route = createFileRoute("/_authenticated/favorites")({
  head: () => ({
    meta: [
      { title: "Your favorites — ARIO SCRIPTS" },
      { name: "description", content: "Every script you saved on ARIO SCRIPTS, in one place." },
      { property: "og:title", content: "Your favorites — ARIO SCRIPTS" },
      { property: "og:description", content: "Every script you saved on ARIO SCRIPTS." },
    ],
  }),
  component: FavoritesPage,
});

function FavoritesPage() {
  const favorites = useQuery({
    queryKey: ["my-favorites"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("favorites")
        .select(
          "script:scripts(id, title, slug, description, thumbnail_url, youtube_url, tags, is_verified, copy_count, download_count, view_count, favorite_count, created_at, category:categories(id, name, slug), game:games(id, name, slug))",
        )
        .order("created_at", { ascending: false });
      if (error) throw new Error(error.message);
      return (data ?? [])
        .map((row) => row.script)
        .filter(Boolean) as unknown as ScriptCardType[];
    },
  });

  return (
    <SiteShell>
      <div className="mx-auto max-w-7xl px-4 py-10 sm:px-6">
        <h1 className="text-3xl font-bold tracking-tight text-foreground">Your favorites</h1>
        <p className="mt-2 text-muted-foreground">Scripts you saved for later.</p>

        {favorites.isLoading ? (
          <div className="mt-8 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {Array.from({ length: 3 }).map((_, index) => (
              <div key={index} className="h-64 animate-pulse rounded-xl border border-border bg-card" />
            ))}
          </div>
        ) : (favorites.data ?? []).length === 0 ? (
          <div className="mt-10 rounded-xl border border-border bg-card p-10 text-center">
            <HeartOff className="mx-auto size-8 text-muted-foreground" />
            <p className="mt-3 text-foreground">No favorites yet.</p>
            <Link to="/" search={{}} className="mt-2 inline-block text-sm text-primary">
              Browse scripts
            </Link>
          </div>
        ) : (
          <div className="mt-8 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {(favorites.data ?? []).map((script) => (
              <ScriptCard key={script.id} script={script} />
            ))}
          </div>
        )}
      </div>
    </SiteShell>
  );
}

import { createServerFn } from "@tanstack/react-start";
import { createClient } from "@supabase/supabase-js";
import { z } from "zod";
import type { Database } from "@/integrations/supabase/types";

function publicClient() {
  const key = process.env["SUPABASE_PUBLISHABLE_KEY"]!;
  const url = process.env["SUPABASE_URL"]!;
  return createClient<Database>(url, key, {
    auth: { storage: undefined, persistSession: false, autoRefreshToken: false },
    global: {
      fetch: (input, init) => {
        const headers = new Headers(init?.headers);
        if (key.startsWith("sb_") && headers.get("Authorization") === `Bearer ${key}`) {
          headers.delete("Authorization");
        }
        headers.set("apikey", key);
        return fetch(input, { ...init, headers });
      },
    },
  });
}

const SCRIPT_CARD_COLUMNS =
  "id, title, slug, description, thumbnail_url, youtube_url, tags, is_verified, copy_count, download_count, view_count, favorite_count, created_at, category:categories(id, name, slug), game:games(id, name, slug)";

export const SORT_OPTIONS = ["newest", "oldest", "copies", "downloads", "favorites", "views"] as const;
export type SortOption = (typeof SORT_OPTIONS)[number];

const listInput = z.object({
  search: z.string().trim().max(120).optional().default(""),
  category: z.string().trim().max(80).optional().default(""),
  game: z.string().trim().max(80).optional().default(""),
  sort: z.enum(SORT_OPTIONS).optional().default("newest"),
  page: z.number().int().min(1).max(500).optional().default(1),
  perPage: z.number().int().min(1).max(48).optional().default(12),
});

export type ListScriptsInput = z.input<typeof listInput>;

export const listScripts = createServerFn({ method: "GET" })
  .inputValidator((input: unknown) => listInput.parse(input ?? {}))
  .handler(async ({ data }) => {
    const supabase = publicClient();
    const from = (data.page - 1) * data.perPage;
    let query = supabase
      .from("scripts")
      .select(SCRIPT_CARD_COLUMNS, { count: "exact" })
      .eq("is_published", true);

    if (data.search) {
      const term = data.search.replace(/[%,]/g, " ");
      query = query.or(`title.ilike.%${term}%,description.ilike.%${term}%`);
    }
    if (data.category) {
      const { data: cat } = await supabase
        .from("categories")
        .select("id")
        .eq("slug", data.category)
        .maybeSingle();
      query = query.eq("category_id", cat?.id ?? "00000000-0000-0000-0000-000000000000");
    }
    if (data.game) {
      const { data: game } = await supabase
        .from("games")
        .select("id")
        .eq("slug", data.game)
        .maybeSingle();
      query = query.eq("game_id", game?.id ?? "00000000-0000-0000-0000-000000000000");
    }

    const sorts: Record<SortOption, { column: string; ascending: boolean }> = {
      newest: { column: "created_at", ascending: false },
      oldest: { column: "created_at", ascending: true },
      copies: { column: "copy_count", ascending: false },
      downloads: { column: "download_count", ascending: false },
      favorites: { column: "favorite_count", ascending: false },
      views: { column: "view_count", ascending: false },
    };
    const sort = sorts[data.sort];

    const { data: rows, count, error } = await query
      .order(sort.column, { ascending: sort.ascending })
      .range(from, from + data.perPage - 1);

    if (error) throw new Error(error.message);
    return {
      scripts: rows ?? [],
      total: count ?? 0,
      page: data.page,
      perPage: data.perPage,
      pageCount: Math.max(1, Math.ceil((count ?? 0) / data.perPage)),
    };
  });

export type ScriptCard = Awaited<ReturnType<typeof listScripts>>["scripts"][number];

export const getScriptBySlug = createServerFn({ method: "GET" })
  .inputValidator((input: unknown) => z.object({ slug: z.string().min(1).max(160) }).parse(input))
  .handler(async ({ data }) => {
    const supabase = publicClient();
    const { data: script, error } = await supabase
      .from("scripts")
      .select(`${SCRIPT_CARD_COLUMNS}, code, images`)
      .eq("slug", data.slug)
      .eq("is_published", true)
      .maybeSingle();
    if (error) throw new Error(error.message);
    return { script };
  });

export type ScriptDetail = NonNullable<Awaited<ReturnType<typeof getScriptBySlug>>["script"]>;

export const getFilters = createServerFn({ method: "GET" }).handler(async () => {
  const supabase = publicClient();
  const [categories, games] = await Promise.all([
    supabase.from("categories").select("id, name, slug, description, icon, sort_order").order("sort_order"),
    supabase.from("games").select("id, name, slug").order("name"),
  ]);
  return { categories: categories.data ?? [], games: games.data ?? [] };
});

export const getSiteSettings = createServerFn({ method: "GET" }).handler(async () => {
  const { data } = await publicClient()
    .from("site_settings")
    .select(
      "site_name, tagline, announcement, announcement_enabled, discord_url, youtube_url, twitter_url, maintenance_mode",
    )
    .maybeSingle();
  return { settings: data };
});

export type SiteSettings = NonNullable<Awaited<ReturnType<typeof getSiteSettings>>["settings"]>;

export const trackScriptMetric = createServerFn({ method: "POST" })
  .inputValidator((input: unknown) =>
    z.object({ scriptId: z.string().uuid(), metric: z.enum(["copy", "download", "view"]) }).parse(input),
  )
  .handler(async ({ data }) => {
    const supabase = publicClient();
    const { error } = await supabase.rpc("increment_script_metric", {
      _script_id: data.scriptId,
      _metric: data.metric,
    });
    if (error) return { ok: false };
    return { ok: true };
  });

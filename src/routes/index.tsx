import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { keepPreviousData, useQuery } from "@tanstack/react-query";
import { useEffect, useState, type ReactNode } from "react";
import { ChevronLeft, ChevronRight, Search, Terminal } from "lucide-react";
import { getFilters, listScripts, SORT_OPTIONS, type SortOption } from "@/lib/public.functions";
import { SiteShell } from "@/components/site-shell";
import { ScriptCard } from "@/components/script-card";

type SearchState = {
  q?: string | undefined;
  category?: string | undefined;
  game?: string | undefined;
  sort?: SortOption | undefined;
  page?: number | undefined;
};

export const Route = createFileRoute("/")({
  validateSearch: (search: Record<string, unknown>): SearchState => ({
    q: typeof search["q"] === "string" ? (search["q"] as string) : undefined,
    category: typeof search["category"] === "string" ? (search["category"] as string) : undefined,
    game: typeof search["game"] === "string" ? (search["game"] as string) : undefined,
    sort: SORT_OPTIONS.includes(search["sort"] as SortOption)
      ? (search["sort"] as SortOption)
      : undefined,
    page: Number(search["page"]) > 1 ? Number(search["page"]) : undefined,
  }),
  head: () => ({
    meta: [
      { title: "ARIO SCRIPTS — Browse Game Scripts" },
      {
        name: "description",
        content:
          "Search hundreds of working game scripts. Filter by game and category, copy the Lua source or download the .lua file instantly.",
      },
      { property: "og:title", content: "ARIO SCRIPTS — Browse Game Scripts" },
      {
        property: "og:description",
        content: "Search, copy and download working game scripts with showcases and previews.",
      },
    ],
  }),
  component: Discover,
});

const SORT_LABELS: Record<SortOption, string> = {
  newest: "Newest",
  oldest: "Oldest",
  copies: "Most copied",
  downloads: "Most downloaded",
  favorites: "Most favorited",
  views: "Most viewed",
};

function Discover() {
  const raw = Route.useSearch();
  const navigate = useNavigate({ from: "/" });

  const q = raw.q ?? "";
  const category = raw.category ?? "";
  const game = raw.game ?? "";
  const sort = raw.sort ?? "newest";
  const page = raw.page ?? 1;

  const [term, setTerm] = useState(q);
  useEffect(() => setTerm(q), [q]);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      if (term !== q) {
        navigate({ search: (prev) => ({ ...prev, q: term || undefined, page: undefined }) });
      }
    }, 350);
    return () => window.clearTimeout(timer);
  }, [term, q, navigate]);

  const filters = useQuery({ queryKey: ["filters"], queryFn: () => getFilters(), staleTime: 300_000 });
  const results = useQuery({
    queryKey: ["scripts", { q, category, game, sort, page }],
    placeholderData: keepPreviousData,
    queryFn: () =>
      listScripts({ data: { search: q, category, game, sort, page, perPage: 12 } }),
  });

  const setFilter = (patch: SearchState) =>
    navigate({ search: (prev) => ({ ...prev, page: undefined, ...patch }) });

  const data = results.data;

  return (
    <SiteShell>
      <section className="grid-backdrop border-b border-border">
        <div className="mx-auto max-w-7xl px-4 py-16 sm:px-6 sm:py-20">
          <p className="inline-flex items-center gap-2 rounded-full border border-border bg-card px-3 py-1 font-mono text-[11px] uppercase tracking-[0.2em] text-primary">
            <Terminal className="size-3" /> script database
          </p>
          <h1 className="mt-5 max-w-3xl text-4xl font-bold leading-[1.05] tracking-tight text-foreground sm:text-6xl">
            Every script you need, <span className="text-glow text-primary">one clean loader.</span>
          </h1>
          <p className="mt-4 max-w-xl text-base text-muted-foreground">
            Verified, tested and updated. Copy the Lua straight from the viewer or grab the .lua file.
          </p>

          <div className="mt-8 flex max-w-xl items-center gap-2 rounded-xl border border-border bg-card px-3 py-2 focus-within:border-primary/50">
            <Search className="size-4 text-muted-foreground" />
            <input
              value={term}
              onChange={(event) => setTerm(event.target.value)}
              placeholder="Search scripts, games, features…"
              aria-label="Search scripts"
              className="w-full bg-transparent py-1.5 text-sm text-foreground outline-none placeholder:text-muted-foreground"
            />
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-4 py-10 sm:px-6">
        <div className="flex flex-wrap items-center gap-2">
          <FilterSelect
            label="Category"
            value={category}
            onChange={(value) => setFilter({ category: value || undefined })}
            options={(filters.data?.categories ?? []).map((item) => ({
              value: item.slug,
              label: item.name,
            }))}
          />
          <FilterSelect
            label="Game"
            value={game}
            onChange={(value) => setFilter({ game: value || undefined })}
            options={(filters.data?.games ?? []).map((item) => ({
              value: item.slug,
              label: item.name,
            }))}
          />
          <FilterSelect
            label="Sort"
            value={sort}
            allowAll={false}
            onChange={(value) => setFilter({ sort: value as SortOption })}
            options={SORT_OPTIONS.map((option) => ({ value: option, label: SORT_LABELS[option] }))}
          />
          <span className="ml-auto font-mono text-xs text-muted-foreground">
            {data ? `${data.total.toLocaleString()} scripts` : "loading…"}
          </span>
        </div>

        {results.isLoading ? (
          <div className="mt-8 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {Array.from({ length: 6 }).map((_, index) => (
              <div key={index} className="h-72 animate-pulse rounded-xl border border-border bg-card" />
            ))}
          </div>
        ) : data && data.scripts.length > 0 ? (
          <div className="mt-8 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {data.scripts.map((script) => (
              <ScriptCard key={script.id} script={script} />
            ))}
          </div>
        ) : (
          <div className="mt-10 rounded-xl border border-border bg-card p-12 text-center">
            <p className="text-lg font-semibold text-foreground">No scripts matched</p>
            <p className="mt-1 text-sm text-muted-foreground">
              Try clearing a filter or searching something broader.
            </p>
            <Link
              to="/"
              search={{}}
              className="mt-5 inline-flex rounded-md border border-border px-4 py-2 text-sm text-foreground hover:border-primary/50"
            >
              Reset filters
            </Link>
          </div>
        )}

        {data && data.pageCount > 1 && (
          <div className="mt-10 flex flex-wrap items-center justify-center gap-2">
            <PageButton
              disabled={page <= 1}
              onClick={() => setFilter({ page: page - 1 })}
              label="Previous page"
            >
              <ChevronLeft className="size-4" />
            </PageButton>
            {Array.from({ length: data.pageCount })
              .map((_, index) => index + 1)
              .filter(
                (item) => item === 1 || item === data.pageCount || Math.abs(item - page) <= 1,
              )
              .map((item, index, pages) => (
                <span key={item} className="flex items-center gap-2">
                  {index > 0 && pages[index - 1]! < item - 1 && (
                    <span className="font-mono text-xs text-muted-foreground">…</span>
                  )}
                  <button
                    type="button"
                    onClick={() => setFilter({ page: item })}
                    className={
                      item === page
                        ? "rounded-md bg-primary px-3 py-1.5 font-mono text-xs font-bold text-primary-foreground"
                        : "rounded-md border border-border px-3 py-1.5 font-mono text-xs text-muted-foreground hover:text-foreground"
                    }
                  >
                    {item}
                  </button>
                </span>
              ))}
            <PageButton
              disabled={page >= data.pageCount}
              onClick={() => setFilter({ page: page + 1 })}
              label="Next page"
            >
              <ChevronRight className="size-4" />
            </PageButton>
          </div>
        )}
      </section>
    </SiteShell>
  );
}

function FilterSelect({
  label,
  value,
  onChange,
  options,
  allowAll = true,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  options: { value: string; label: string }[];
  allowAll?: boolean;
}) {
  return (
    <label className="inline-flex items-center gap-2 rounded-lg border border-border bg-card px-3 py-2">
      <span className="font-mono text-[11px] uppercase tracking-wider text-muted-foreground">
        {label}
      </span>
      <select
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className="bg-transparent text-sm text-foreground outline-none"
      >
        {allowAll && <option value="">All</option>}
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
    </label>
  );
}

function PageButton({
  children,
  onClick,
  disabled,
  label,
}: {
  children: ReactNode;
  onClick: () => void;
  disabled: boolean;
  label: string;
}) {
  return (
    <button
      type="button"
      aria-label={label}
      onClick={onClick}
      disabled={disabled}
      className="rounded-md border border-border p-2 text-muted-foreground transition-colors hover:text-foreground disabled:opacity-40"
    >
      {children}
    </button>
  );
}

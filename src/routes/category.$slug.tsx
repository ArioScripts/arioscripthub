import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { getFilters, listScripts } from "@/lib/public.functions";
import { SiteShell } from "@/components/site-shell";
import { ScriptCard } from "@/components/script-card";

export const Route = createFileRoute("/category/$slug")({
  loader: async ({ params }) => {
    const { categories } = await getFilters();
    const category = categories.find((item) => item.slug === params.slug) ?? null;
    return { category };
  },
  head: ({ loaderData }) => {
    const category = loaderData?.category;
    if (!category) {
      return {
        meta: [{ title: "Category — ARIO SCRIPTS" }, { name: "robots", content: "noindex" }],
      };
    }
    const title = `${category.name} Scripts — ARIO SCRIPTS`;
    const description =
      category.description ?? `Every ${category.name} script in the ARIO SCRIPTS database.`;
    return {
      meta: [
        { title },
        { name: "description", content: description },
        { property: "og:title", content: title },
        { property: "og:description", content: description },
      ],
    };
  },
  component: CategoryPage,
  errorComponent: () => (
    <SiteShell>
      <div className="mx-auto max-w-3xl px-4 py-24 text-center">
        <h1 className="text-2xl font-semibold text-foreground">Category didn't load</h1>
        <Link to="/categories" className="mt-4 inline-block text-primary">
          Back to categories
        </Link>
      </div>
    </SiteShell>
  ),
  notFoundComponent: () => (
    <SiteShell>
      <div className="mx-auto max-w-3xl px-4 py-24 text-center">
        <h1 className="text-2xl font-semibold text-foreground">Category not found</h1>
      </div>
    </SiteShell>
  ),
});

function CategoryPage() {
  const { slug } = Route.useParams();
  const { category } = Route.useLoaderData();
  const results = useQuery({
    queryKey: ["category-scripts", slug],
    queryFn: () => listScripts({ data: { category: slug, perPage: 24, sort: "copies" } }),
  });

  return (
    <SiteShell>
      <div className="mx-auto max-w-7xl px-4 py-14 sm:px-6">
        <Link to="/categories" className="font-mono text-xs text-muted-foreground hover:text-primary">
          ← All categories
        </Link>
        <h1 className="mt-4 text-3xl font-bold tracking-tight text-foreground sm:text-4xl">
          {category?.name ?? slug}
        </h1>
        {category?.description && <p className="mt-2 text-muted-foreground">{category.description}</p>}

        <div className="mt-10 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {(results.data?.scripts ?? []).map((script) => (
            <ScriptCard key={script.id} script={script} />
          ))}
        </div>
        {results.data && results.data.scripts.length === 0 && (
          <p className="mt-10 text-muted-foreground">No scripts in this category yet.</p>
        )}
      </div>
    </SiteShell>
  );
}

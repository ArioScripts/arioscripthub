import { useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { logAdminAction } from "@/lib/admin.functions";

export const Route = createFileRoute("/_authenticated/admin/categories")({
  component: AdminCategories,
});

function slugify(value: string) {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
}

function AdminCategories() {
  const queryClient = useQueryClient();
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");

  const categories = useQuery({
    queryKey: ["admin-categories"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("categories")
        .select("id, name, slug, description, sort_order")
        .order("sort_order");
      if (error) throw new Error(error.message);
      return data ?? [];
    },
  });

  const create = useMutation({
    mutationFn: async () => {
      const { data, error } = await supabase
        .from("categories")
        .insert({
          name: name.trim(),
          slug: slugify(name),
          description: description.trim() || null,
          sort_order: (categories.data?.length ?? 0) + 1,
        })
        .select("id")
        .single();
      if (error) throw new Error(error.message);
      await logAdminAction({
        data: { action: "category.create", targetType: "category", targetId: data.id },
      });
    },
    onSuccess: () => {
      toast.success("Category added");
      setName("");
      setDescription("");
      void queryClient.invalidateQueries({ queryKey: ["admin-categories"] });
    },
    onError: (error: Error) => toast.error(error.message),
  });

  const remove = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("categories").delete().eq("id", id);
      if (error) throw new Error(error.message);
      await logAdminAction({
        data: { action: "category.delete", targetType: "category", targetId: id },
      });
    },
    onSuccess: () => {
      toast.success("Category removed");
      void queryClient.invalidateQueries({ queryKey: ["admin-categories"] });
    },
    onError: (error: Error) => toast.error(error.message),
  });

  return (
    <div>
      <h2 className="text-lg font-semibold text-foreground">Categories</h2>

      <form
        onSubmit={(event) => {
          event.preventDefault();
          create.mutate();
        }}
        className="mt-5 flex flex-wrap items-end gap-3 rounded-xl border border-border bg-card p-4"
      >
        <label className="text-sm text-muted-foreground">
          Name
          <input
            value={name}
            onChange={(event) => setName(event.target.value)}
            required
            className="mt-1.5 block w-48 rounded-lg border border-input bg-background px-3 py-2 text-sm text-foreground outline-none focus:border-primary/50"
          />
        </label>
        <label className="flex-1 text-sm text-muted-foreground">
          Description
          <input
            value={description}
            onChange={(event) => setDescription(event.target.value)}
            className="mt-1.5 block w-full rounded-lg border border-input bg-background px-3 py-2 text-sm text-foreground outline-none focus:border-primary/50"
          />
        </label>
        <button
          type="submit"
          disabled={create.isPending}
          className="inline-flex items-center gap-1.5 rounded-lg bg-primary px-3 py-2 text-sm font-semibold text-primary-foreground disabled:opacity-60"
        >
          <Plus className="size-4" /> Add
        </button>
      </form>

      <ul className="mt-6 divide-y divide-border rounded-xl border border-border">
        {(categories.data ?? []).map((category) => (
          <li key={category.id} className="flex items-center justify-between gap-4 px-4 py-3">
            <div>
              <p className="text-sm text-foreground">{category.name}</p>
              <p className="font-mono text-[11px] text-muted-foreground">/{category.slug}</p>
            </div>
            <button
              type="button"
              onClick={() => {
                if (confirm(`Delete category "${category.name}"?`)) remove.mutate(category.id);
              }}
              aria-label="Delete category"
              className="rounded-md p-2 text-muted-foreground hover:text-destructive"
            >
              <Trash2 className="size-4" />
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
}

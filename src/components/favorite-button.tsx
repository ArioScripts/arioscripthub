import { useNavigate } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Heart } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { cn } from "@/lib/utils";

export function FavoriteButton({ scriptId, count }: { scriptId: string; count?: number }) {
  const { user, isBanned } = useAuth();
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const favorite = useQuery({
    queryKey: ["favorite", scriptId, user?.id],
    enabled: !!user,
    queryFn: async () => {
      const { data } = await supabase
        .from("favorites")
        .select("id")
        .eq("script_id", scriptId)
        .eq("user_id", user!.id)
        .maybeSingle();
      return data?.id ?? null;
    },
  });

  const toggle = useMutation({
    mutationFn: async () => {
      if (!user) throw new Error("not-signed-in");
      if (favorite.data) {
        const { error } = await supabase.from("favorites").delete().eq("id", favorite.data);
        if (error) throw new Error(error.message);
        return "removed" as const;
      }
      const { error } = await supabase
        .from("favorites")
        .insert({ script_id: scriptId, user_id: user.id });
      if (error) throw new Error(error.message);
      return "added" as const;
    },
    onSuccess: (result) => {
      toast.success(result === "added" ? "Saved to favorites" : "Removed from favorites");
      queryClient.invalidateQueries({ queryKey: ["favorite", scriptId, user?.id] });
      queryClient.invalidateQueries({ queryKey: ["my-favorites"] });
      queryClient.invalidateQueries({ queryKey: ["script"] });
    },
    onError: () => toast.error("Couldn't update favorites"),
  });

  const active = !!favorite.data;

  return (
    <button
      type="button"
      onClick={() => {
        if (!user) {
          navigate({ to: "/auth" });
          return;
        }
        if (isBanned) {
          toast.error("Your account is suspended");
          return;
        }
        toggle.mutate();
      }}
      disabled={toggle.isPending}
      className={cn(
        "inline-flex items-center gap-2 rounded-lg border px-4 py-2.5 text-sm font-medium transition-colors",
        active
          ? "border-primary/50 bg-primary/10 text-primary"
          : "border-border text-foreground hover:border-primary/40",
      )}
    >
      <Heart className={cn("size-4", active && "fill-current")} />
      {active ? "Favorited" : "Favorite"}
      {typeof count === "number" && (
        <span className="font-mono text-xs text-muted-foreground">{count.toLocaleString()}</span>
      )}
    </button>
  );
}

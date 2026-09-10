import { useState } from "react";
import { Link, useNavigate } from "@tanstack/react-router";
import { useQueryClient } from "@tanstack/react-query";
import { Heart, LogOut, Menu, Shield, Terminal, User as UserIcon, X } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { cn } from "@/lib/utils";

const NAV = [
  { to: "/", label: "Scripts" },
  { to: "/categories", label: "Categories" },
] as const;

export function SiteHeader({ siteName = "ARIO SCRIPTS" }: { siteName?: string }) {
  const { user, isAdmin, profile } = useAuth();
  const [open, setOpen] = useState(false);
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const signOut = async () => {
    await queryClient.cancelQueries();
    queryClient.clear();
    await supabase.auth.signOut();
    navigate({ to: "/auth", replace: true });
  };

  return (
    <header className="sticky top-0 z-50 border-b border-border bg-background/85 backdrop-blur-xl">
      <div className="mx-auto flex h-16 max-w-7xl items-center gap-4 px-4 sm:px-6">
        <Link to="/" className="flex items-center gap-2">
          <span className="grid size-8 place-items-center rounded-md bg-primary text-primary-foreground">
            <Terminal className="size-4" />
          </span>
          <span className="font-mono text-sm font-bold uppercase tracking-[0.18em] text-foreground">
            {siteName}
          </span>
        </Link>

        <nav className="ml-6 hidden items-center gap-1 md:flex">
          {NAV.map((item) => (
            <Link
              key={item.to}
              to={item.to}
              className="rounded-md px-3 py-2 text-sm text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
              activeProps={{ className: "text-primary bg-accent/60" }}
              activeOptions={{ exact: item.to === "/" }}
            >
              {item.label}
            </Link>
          ))}
        </nav>

        <div className="ml-auto hidden items-center gap-2 md:flex">
          {user ? (
            <>
              {isAdmin && (
                <Link
                  to="/admin"
                  className="inline-flex items-center gap-1.5 rounded-md border border-border px-3 py-2 text-sm text-foreground transition-colors hover:border-primary/50 hover:text-primary"
                >
                  <Shield className="size-4" /> Admin
                </Link>
              )}
              <Link
                to="/favorites"
                className="inline-flex items-center gap-1.5 rounded-md px-3 py-2 text-sm text-muted-foreground transition-colors hover:text-foreground"
              >
                <Heart className="size-4" /> Favorites
              </Link>
              <Link
                to="/profile"
                className="inline-flex items-center gap-2 rounded-md border border-border px-3 py-2 text-sm text-foreground transition-colors hover:border-primary/50"
              >
                <UserIcon className="size-4" />
                <span className="max-w-28 truncate">{profile?.display_name ?? "Profile"}</span>
              </Link>
              <button
                type="button"
                onClick={signOut}
                aria-label="Sign out"
                className="rounded-md p-2 text-muted-foreground transition-colors hover:text-destructive"
              >
                <LogOut className="size-4" />
              </button>
            </>
          ) : (
            <Link
              to="/auth"
              className="rounded-md bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground transition-opacity hover:opacity-90"
            >
              Sign in
            </Link>
          )}
        </div>

        <button
          type="button"
          onClick={() => setOpen((value) => !value)}
          className="ml-auto rounded-md p-2 text-foreground md:hidden"
          aria-label="Toggle menu"
        >
          {open ? <X className="size-5" /> : <Menu className="size-5" />}
        </button>
      </div>

      <div className={cn("border-t border-border md:hidden", open ? "block" : "hidden")}>
        <div className="flex flex-col gap-1 px-4 py-3">
          {NAV.map((item) => (
            <Link
              key={item.to}
              to={item.to}
              onClick={() => setOpen(false)}
              className="rounded-md px-3 py-2 text-sm text-muted-foreground hover:bg-accent hover:text-foreground"
            >
              {item.label}
            </Link>
          ))}
          {user ? (
            <>
              <Link to="/favorites" onClick={() => setOpen(false)} className="rounded-md px-3 py-2 text-sm text-muted-foreground">
                Favorites
              </Link>
              <Link to="/profile" onClick={() => setOpen(false)} className="rounded-md px-3 py-2 text-sm text-muted-foreground">
                Profile
              </Link>
              {isAdmin && (
                <Link to="/admin" onClick={() => setOpen(false)} className="rounded-md px-3 py-2 text-sm text-primary">
                  Admin dashboard
                </Link>
              )}
              <button
                type="button"
                onClick={signOut}
                className="rounded-md px-3 py-2 text-left text-sm text-destructive"
              >
                Sign out
              </button>
            </>
          ) : (
            <Link
              to="/auth"
              onClick={() => setOpen(false)}
              className="rounded-md bg-primary px-3 py-2 text-center text-sm font-semibold text-primary-foreground"
            >
              Sign in
            </Link>
          )}
        </div>
      </div>
    </header>
  );
}

import type { ReactNode } from "react";
import { useQuery } from "@tanstack/react-query";
import { Megaphone } from "lucide-react";
import { getSiteSettings } from "@/lib/public.functions";
import { SiteHeader } from "./site-header";
import { SiteFooter } from "./site-footer";

export function useSiteSettings() {
  return useQuery({
    queryKey: ["site-settings"],
    queryFn: () => getSiteSettings(),
    staleTime: 60_000,
  });
}

export function SiteShell({ children }: { children: ReactNode }) {
  const { data } = useSiteSettings();
  const settings = data?.settings ?? null;

  return (
    <div className="flex min-h-screen flex-col bg-background">
      {settings?.announcement_enabled && settings.announcement && (
        <div className="flex items-center justify-center gap-2 bg-primary px-4 py-2 text-center text-sm font-medium text-primary-foreground">
          <Megaphone className="size-4 shrink-0" />
          <span>{settings.announcement}</span>
        </div>
      )}
      <SiteHeader siteName={settings?.site_name ?? "ARIO SCRIPTS"} />
      <main className="flex-1">{children}</main>
      <SiteFooter settings={settings} />
    </div>
  );
}

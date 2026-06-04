import { QueryClient, QueryClientProvider, useQueryClient } from "@tanstack/react-query";
import {
  Outlet,
  Link,
  createRootRouteWithContext,
  useRouter,
  useRouterState,
  HeadContent,
  Scripts,
} from "@tanstack/react-router";
import { useState, useEffect } from "react";
import { Toaster } from "@/components/ui/sonner";
import { AuthProvider, useAuth } from "@/lib/auth";
import { useSiteSettings, s } from "@/lib/site-settings";
import { LanguageProvider, useLanguage, useT } from "@/lib/i18n";
import { ThemeProvider, useTheme, NO_FLASH_SCRIPT } from "@/lib/theme";
import { WhatsAppFab } from "@/components/WhatsAppFab";
import { Gavel, Shield, Eye, ShieldAlert, Menu, X, Sun, Moon } from "lucide-react";

import appCss from "../styles.css?url";

function NotFoundComponent() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="max-w-md text-center">
        <h1 className="text-7xl font-bold text-foreground">404</h1>
        <h2 className="mt-4 text-xl font-semibold">Page not found</h2>
        <p className="mt-2 text-sm text-muted-foreground">
          The page you're looking for doesn't exist.
        </p>
        <div className="mt-6">
          <Link to="/" className="inline-flex items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90">
            Go home
          </Link>
        </div>
      </div>
    </div>
  );
}

function ErrorComponent({ error, reset }: { error: Error; reset: () => void }) {
  console.error(error);
  const router = useRouter();
  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="max-w-md text-center">
        <h1 className="text-xl font-semibold">Something went wrong</h1>
        <p className="mt-2 text-sm text-muted-foreground">{error.message}</p>
        <div className="mt-6 flex gap-2 justify-center">
          <button
            onClick={() => { router.invalidate(); reset(); }}
            className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90"
          >
            Try again
          </button>
          <a href="/" className="rounded-md border border-input bg-background px-4 py-2 text-sm font-medium hover:bg-accent">
            Go home
          </a>
        </div>
      </div>
    </div>
  );
}

export const Route = createRootRouteWithContext<{ queryClient: QueryClient }>()({
  head: () => ({
    meta: [
      { charSet: "utf-8" },
      { name: "viewport", content: "width=device-width, initial-scale=1" },
      { title: "Property Auction House — Premier Real Estate Auctions" },
      { name: "description", content: "Discover, bid, and win exclusive properties at Property Auction House." },
    ],
    links: [
      { rel: "stylesheet", href: appCss },
      { rel: "preconnect", href: "https://fonts.googleapis.com" },
      { rel: "preconnect", href: "https://fonts.gstatic.com", crossOrigin: "anonymous" },
      { rel: "stylesheet", href: "https://fonts.googleapis.com/css2?family=Playfair+Display:wght@500;600;700;800&family=Inter:wght@400;500;600;700&display=swap" },
    ],
    scripts: [{ children: NO_FLASH_SCRIPT }],
  }),
  shellComponent: RootShell,
  component: RootComponent,
  notFoundComponent: NotFoundComponent,
  errorComponent: ErrorComponent,
});

function RootShell({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <head><HeadContent /></head>
      <body>
        {children}
        <Scripts />
      </body>
    </html>
  );
}

function LangToggle({ onClick }: { onClick?: () => void }) {
  const { lang, toggle } = useLanguage();
  return (
    <button
      onClick={() => { toggle(); onClick?.(); }}
      title="Toggle language"
      className="inline-flex items-center justify-center rounded-md border border-border bg-card px-3 py-2 text-xs font-bold text-primary hover:bg-accent min-w-[44px]"
    >
      {lang === "en" ? "BM" : "EN"}
    </button>
  );
}

function ThemeToggle({ onClick }: { onClick?: () => void }) {
  const { theme, toggle } = useTheme();
  return (
    <button
      onClick={() => { toggle(); onClick?.(); }}
      title="Toggle theme"
      aria-label="Toggle theme"
      className="inline-flex items-center justify-center rounded-md border border-border bg-card px-3 py-2 text-primary hover:bg-accent"
    >
      {theme === "dark" ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
    </button>
  );
}

function NavItems({ onItemClick }: { onItemClick?: () => void }) {
  const { user, signOut, isAdmin, viewMode, setViewMode } = useAuth();
  const qc = useQueryClient();
  const router = useRouter();
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const t = useT();

  function handleToggleView() {
    const next = viewMode === "admin" ? "public" : "admin";
    qc.clear();
    setViewMode(next);
    if (next === "public" && pathname.startsWith("/admin")) {
      router.navigate({ to: "/" });
    }
    onItemClick?.();
  }

  return (
    <>
      <LangToggle onClick={onItemClick} />
      <ThemeToggle onClick={onItemClick} />
      <Link
        to="/notice"
        onClick={onItemClick}
        className="inline-flex items-center gap-1.5 rounded-md border border-primary/40 bg-secondary/60 px-3 py-2 text-xs font-semibold uppercase tracking-wider text-primary hover:bg-primary hover:text-primary-foreground transition-colors"
      >
        <ShieldAlert className="h-3.5 w-3.5" />
        <span>{t("Important Notice")}</span>
      </Link>
      {isAdmin && (
        <button
          onClick={handleToggleView}
          title="Toggle Admin / Public view"
          className="inline-flex items-center gap-1.5 rounded-md border border-gold bg-gold/10 px-3 py-2 text-xs font-semibold uppercase tracking-wider text-primary hover:bg-gold/20"
        >
          {viewMode === "admin" ? <Shield className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
          {viewMode === "admin" ? "Admin view" : "Public view"}
        </button>
      )}
      {isAdmin && viewMode === "admin" && (
        <Link to="/admin" onClick={onItemClick} className="rounded-md bg-primary px-3 py-2 text-xs font-semibold text-primary-foreground hover:bg-primary/90">
          Dashboard
        </Link>
      )}
      {user ? (
        <button
          onClick={() => { signOut(); onItemClick?.(); }}
          className="rounded-md border border-border bg-card px-4 py-2 text-sm font-medium hover:bg-accent"
        >
          {t("Sign out")}
        </button>
      ) : (
        <>
          <Link to="/login" onClick={onItemClick} className="rounded-md px-4 py-2 text-sm font-medium hover:bg-accent">{t("Log in")}</Link>
          <Link to="/signup" onClick={onItemClick} className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90">
            {t("Sign up")}
          </Link>
        </>
      )}
    </>
  );
}

function Header() {
  const { data: settings } = useSiteSettings();
  const t = useT();
  const companyName = s(settings, "company_name", "Property Auction House");
  const logoUrl = s(settings, "company_logo_url", "");
  const [open, setOpen] = useState(false);

  // close drawer on route change
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  useEffect(() => { setOpen(false); }, [pathname]);

  return (
    <header className="sticky top-0 z-40 border-b border-border bg-background/90 backdrop-blur no-print">
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6">
        <Link to="/" className="flex items-center gap-2.5 group">
          {logoUrl ? (
            <img src={logoUrl} alt={companyName} className="h-9 w-9 rounded-md object-cover" />
          ) : (
            <div className="flex h-9 w-9 items-center justify-center rounded-md bg-primary text-primary-foreground">
              <Gavel className="h-5 w-5" />
            </div>
          )}
          <div className="leading-tight">
            <div className="font-display text-base sm:text-lg font-bold text-primary">{companyName}</div>
            <div className="text-[10px] uppercase tracking-[0.18em] text-muted-foreground">Est. Trusted Bidding</div>
          </div>
        </Link>

        {/* Desktop nav */}
        <nav className="hidden md:flex items-center gap-2 text-sm">
          <Link to="/privacy" className="text-xs text-muted-foreground hover:text-primary mr-1">
            {t("Privacy Policy")}
          </Link>
          <NavItems />
        </nav>

        {/* Mobile hamburger */}
        <button
          onClick={() => setOpen((v) => !v)}
          aria-label="Open menu"
          className="md:hidden inline-flex h-11 w-11 items-center justify-center rounded-md border border-border bg-card text-primary"
        >
          {open ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
        </button>
      </div>

      {/* Mobile drawer */}
      {open && (
        <div className="md:hidden border-t border-border bg-background">
          <div className="mx-auto flex max-w-7xl flex-col gap-2 px-4 py-4">
            <NavItems onItemClick={() => setOpen(false)} />
            <Link
              to="/privacy"
              onClick={() => setOpen(false)}
              className="mt-2 rounded-md px-3 py-2 text-xs font-medium text-muted-foreground hover:bg-accent text-center"
            >
              {t("Privacy Policy")}
            </Link>
          </div>
        </div>
      )}
    </header>
  );
}

function RootComponent() {
  const { queryClient } = Route.useRouteContext();
  return (
    <QueryClientProvider client={queryClient}>
      <ThemeProvider>
        <LanguageProvider>
          <AuthProvider>
            <Header />
            <Outlet />
            <WhatsAppFab />
            <Toaster richColors position="top-center" />
          </AuthProvider>
        </LanguageProvider>
      </ThemeProvider>
    </QueryClientProvider>
  );
}
